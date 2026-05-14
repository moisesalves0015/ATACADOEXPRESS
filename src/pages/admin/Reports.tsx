import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Order, Product, FinanceEntry, FinanceCategory, FinanceType } from '../../types';
import { 
  Plus, Trash2, LayoutDashboard, ArrowRightLeft, 
  TrendingUp, Wallet, DollarSign, Percent, Activity,
  ArrowUpRight, ArrowDownRight, Clock, Info, Users
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
import { cn } from '../../lib/utils';
import { 
  format, startOfMonth, endOfMonth, subMonths, isWithinInterval, 
  eachDayOfInterval, startOfDay, endOfDay, subDays, isSameDay 
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

const COLORS = ['#111827', '#4B5563', '#9CA3AF', '#F72585', '#4361EE', '#10B981'];
const CATEGORIES: FinanceCategory[] = ['Fornecedor', 'Marketing', 'Infraestrutura', 'Logística', 'Pessoal', 'Outros', 'Ganho Extra'];

export default function AdminReports() {
  const [activeTab, setActiveTab] = useState<'overview' | 'entries'>('overview');
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [finances, setFinances] = useState<FinanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30days');
  
  // New entry form state
  const [newEntry, setNewEntry] = useState({
    description: '',
    amount: '',
    category: 'Outros' as FinanceCategory,
    date: format(new Date(), 'yyyy-MM-dd'),
    type: 'expense' as FinanceType
  });

  useEffect(() => {
    const unsubOrders = onSnapshot(query(collection(db, 'orders'), orderBy('orderDate', 'desc')), (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
    }, (error) => { handleFirestoreError(error, OperationType.LIST, 'orders'); });

    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    }, (error) => { handleFirestoreError(error, OperationType.LIST, 'products'); });

    const unsubFinances = onSnapshot(query(collection(db, 'finances'), orderBy('date', 'desc')), (snapshot) => {
      setFinances(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FinanceEntry)));
      setLoading(false);
    }, (error) => { handleFirestoreError(error, OperationType.LIST, 'finances'); });

    return () => { unsubOrders(); unsubProducts(); unsubFinances(); };
  }, []);

  const dateFilter = useMemo(() => {
    const now = new Date();
    let start = startOfMonth(now);
    let end = endOfDay(now);

    if (dateRange === '7days') {
      start = startOfDay(subDays(now, 7));
    } else if (dateRange === '30days') {
      start = startOfDay(subDays(now, 30));
    } else if (dateRange === 'month') {
      start = startOfMonth(now);
      end = endOfMonth(now);
    } else if (dateRange === 'last-month') {
      start = startOfMonth(subMonths(now, 1));
      end = endOfMonth(subMonths(now, 1));
    }
    return { start, end };
  }, [dateRange]);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => isWithinInterval(new Date(o.orderDate), dateFilter) && o.status !== 'cancelado');
  }, [orders, dateFilter]);

  const filteredFinances = useMemo(() => {
    return finances.filter(f => isWithinInterval(new Date(f.date), dateFilter));
  }, [finances, dateFilter]);

  const totals = useMemo(() => {
    let salesRevenue = 0;
    let cogs = 0;
    filteredOrders.forEach(order => {
      salesRevenue += order.totalValue;
      order.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        cogs += (product?.costPrice || 0) * item.quantity;
      });
    });

    const otherGains = filteredFinances.filter(f => f.type === 'gain').reduce((sum, f) => sum + f.amount, 0);
    const expenses = filteredFinances.filter(f => f.type === 'expense').reduce((sum, f) => sum + f.amount, 0);
    const totalCommissions = filteredOrders.reduce((sum, o) => sum + (o.commissionValue || 0), 0);

    const totalRevenue = salesRevenue + otherGains;
    const grossProfit = salesRevenue - cogs;
    const netProfit = grossProfit + otherGains - expenses - totalCommissions;

    return { salesRevenue, otherGains, totalRevenue, cogs, expenses, totalCommissions, grossProfit, netProfit };
  }, [filteredOrders, filteredFinances, products]);

  const timeSeriesData = useMemo(() => {
    const days = eachDayOfInterval({ start: dateFilter.start, end: dateFilter.end });
    return days.map(day => {
      const dayOrders = filteredOrders.filter(o => isSameDay(new Date(o.orderDate), day));
      const rev = dayOrders.reduce((sum, o) => sum + o.totalValue, 0);
      let dayCogs = 0;
      dayOrders.forEach(o => o.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        dayCogs += (product?.costPrice || 0) * item.quantity;
      }));

      const dayFin = filteredFinances.filter(f => isSameDay(new Date(f.date), day));
      const exp = dayFin.filter(f => f.type === 'expense').reduce((sum, f) => sum + f.amount, 0);
      const gain = dayFin.filter(f => f.type === 'gain').reduce((sum, f) => sum + f.amount, 0);

      return {
        date: format(day, 'dd/MM'),
        receita: rev + gain,
        lucro: (rev - dayCogs) + gain - exp
      };
    });
  }, [filteredOrders, filteredFinances, products, dateFilter]);

  const handleAddEntry = async () => {
    if (!newEntry.description || !newEntry.amount) return;
    try {
      await addDoc(collection(db, 'finances'), {
        ...newEntry,
        amount: parseFloat(newEntry.amount),
        createdAt: new Date().toISOString()
      });
      setNewEntry({ ...newEntry, description: '', amount: '' });
    } catch (error) {
       console.error("Error adding entry:", error);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (confirm('Deseja excluir este lançamento?')) {
      await deleteDoc(doc(db, 'finances', id));
    }
  };

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
    </div>
  );

  return (
    <div className="space-y-8 pb-10">
      {/* Professional Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6 border-b border-gray-100 pb-6 sm:pb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            Gestão <span className="text-gray-400 font-normal">Financeira</span>
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-1">Acompanhamento de fluxo de caixa e rentabilidade.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="bg-gray-100 p-1 rounded-xl flex items-center">
            <button
              onClick={() => setActiveTab('overview')}
              className={cn(
                "flex-1 sm:flex-none px-4 sm:px-5 py-2 rounded-lg text-[10px] sm:text-xs font-bold transition-all flex items-center justify-center gap-2 uppercase tracking-widest",
                activeTab === 'overview' ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <LayoutDashboard size={14} /> <span className="hidden sm:inline">Visão Geral</span><span className="sm:hidden">Geral</span>
            </button>
            <button
              onClick={() => setActiveTab('entries')}
              className={cn(
                "flex-1 sm:flex-none px-4 sm:px-5 py-2 rounded-lg text-[10px] sm:text-xs font-bold transition-all flex items-center justify-center gap-2 uppercase tracking-widest",
                activeTab === 'entries' ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <ArrowRightLeft size={14} /> <span className="hidden sm:inline">Lançamentos</span><span className="sm:hidden">Lançar</span>
            </button>
          </div>
          
          <select 
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="bg-white border border-gray-200 px-4 py-2 rounded-xl text-[10px] sm:text-xs font-bold text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-900/5 transition-all h-[38px] sm:h-auto"
          >
            <option value="7days">Últimos 7 dias</option>
            <option value="30days">Últimos 30 dias</option>
            <option value="month">Este Mês</option>
            <option value="last-month">Mês Passado</option>
          </select>
        </div>
      </div>

      {activeTab === 'overview' ? (
        <div className="space-y-8">
          {/* Primary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[
              { 
                label: 'Receita Bruta', 
                value: totals.totalRevenue, 
                icon: DollarSign, 
                color: 'text-gray-900',
                tooltip: `Você arrecadou R$ ${fmt(totals.totalRevenue).replace('R$', '')}, sendo ${fmt(totals.salesRevenue)} em vendas e ${fmt(totals.otherGains)} em ganhos extras.`
              },
              { 
                label: 'Lucro Real', 
                value: totals.netProfit, 
                icon: TrendingUp, 
                color: totals.netProfit >= 0 ? 'text-emerald-600' : 'text-red-500',
                tooltip: `Seu lucro foi de ${fmt(totals.netProfit)} porque suas vendas totais foram ${fmt(totals.totalRevenue)}, mas você teve ${fmt(totals.cogs + totals.expenses)} em custos totais.`
              },
              { 
                label: 'Custos Totais', 
                value: totals.cogs + totals.expenses, 
                icon: Wallet, 
                color: 'text-orange-600',
                tooltip: `Você teve um gasto de ${fmt(totals.cogs + totals.expenses)}, sendo ${fmt(totals.cogs)} em custo de mercadoria (CMV) e ${fmt(totals.expenses)} em despesas fixas/extras.`
              },
              { 
                label: 'Margem Líquida', 
                value: `${totals.totalRevenue > 0 ? ((totals.netProfit / totals.totalRevenue) * 100).toFixed(1) : 0}%`, 
                icon: Percent, 
                color: 'text-indigo-600',
                tooltip: `De cada R$ 100,00 que entram na empresa, ${fmt(Math.max(0, (totals.netProfit / (totals.totalRevenue || 1)) * 100))} é o que sobra livre de verdade.`
              },
            ].map((kpi, idx) => (
              <div key={idx} className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-200 shadow-sm relative group flex flex-col justify-between h-32 sm:h-auto">
                <div className="flex items-center justify-between mb-2 sm:mb-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
                      <kpi.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                    <span className="text-[8px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-tight">{kpi.label}</span>
                  </div>
                  
                  {/* Tooltip trigger */}
                  <div className="hidden sm:flex items-center cursor-help">
                    <Info 
                      size={14} 
                      className="text-gray-300 hover:text-gray-600 transition-colors peer" 
                      tabIndex={0}
                    />
                    <div className="absolute bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2 w-56 p-3 bg-gray-900 text-white text-[11px] font-medium leading-relaxed rounded-xl shadow-xl opacity-0 invisible peer-hover:opacity-100 peer-hover:visible peer-focus:opacity-100 peer-focus:visible transition-all z-50 pointer-events-none">
                      {kpi.tooltip}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-gray-900" />
                    </div>
                  </div>
                </div>
                <h3 className={cn("text-lg sm:text-2xl font-bold tracking-tight", kpi.color)}>
                  {typeof kpi.value === 'string' ? kpi.value : fmt(kpi.value)}
                </h3>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            <div className="lg:col-span-2 bg-white p-5 sm:p-8 rounded-2xl border border-gray-200 shadow-sm">
              <h2 className="text-[10px] sm:text-sm font-bold text-gray-900 uppercase tracking-widest mb-6 sm:mb-8 flex items-center gap-2">
                <Activity size={16} className="text-brand-pink" /> Evolução Financeira
              </h2>
              <div className="h-[250px] sm:h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 'bold' }} />
                    <YAxis hide />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }}
                    />
                    <Area type="monotone" dataKey="receita" stroke="#111827" strokeWidth={2} fillOpacity={0.05} fill="#111827" />
                    <Area type="monotone" dataKey="lucro" stroke="#F72585" strokeWidth={2} fillOpacity={0.05} fill="#F72585" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-8 mt-4">
                <div className="flex items-center gap-2">
                   <div className="w-3 h-3 bg-gray-900 rounded-full" />
                   <span className="text-[10px] font-bold text-gray-500 uppercase">Receita</span>
                </div>
                <div className="flex items-center gap-2">
                   <div className="w-3 h-3 bg-brand-pink rounded-full" />
                   <span className="text-[10px] font-bold text-gray-500 uppercase">Lucro Líquido</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center">
               <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-8 self-start">Comprometimento</h2>
               <div className="flex-1 w-full flex items-center justify-center relative">
                  <div className="absolute text-center">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Custos / Rec</p>
                    <p className="text-2xl font-black text-gray-900">{totals.totalRevenue > 0 ? Math.round(((totals.cogs + totals.expenses) / totals.totalRevenue) * 100) : 0}%</p>
                  </div>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Custos', value: totals.cogs + totals.expenses },
                          { name: 'Lucro', value: Math.max(0, totals.netProfit) }
                        ]}
                        innerRadius={70}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                      >
                         <Cell fill="#E2E8F0" />
                         <Cell fill="#111827" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
               </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
            <div className="bg-white p-4 sm:p-8 rounded-xl border border-gray-100 shadow-sm space-y-4 h-fit">
              <h2 className="text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
                 <Plus size={16} /> Novo Lançamento
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5">Descrição</label>
                  <input 
                    type="text" 
                    value={newEntry.description}
                    onChange={e => setNewEntry({ ...newEntry, description: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:border-gray-900 transition-all outline-none text-sm font-bold"
                    placeholder="Ex: Aluguel"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5">Valor</label>
                      <input 
                        type="number" 
                        value={newEntry.amount}
                        onChange={e => setNewEntry({ ...newEntry, amount: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:border-gray-900 transition-all outline-none text-sm font-bold"
                        placeholder="0.00"
                      />
                   </div>
                   <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5">Data</label>
                      <input 
                        type="date" 
                        value={newEntry.date}
                        onChange={e => setNewEntry({ ...newEntry, date: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:border-gray-900 transition-all outline-none text-sm font-bold uppercase"
                      />
                   </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5">Categoria</label>
                  <select 
                    value={newEntry.category}
                    onChange={e => {
                      const cat = e.target.value as FinanceCategory;
                      setNewEntry({ ...newEntry, category: cat, type: cat === 'Ganho Extra' ? 'gain' : 'expense' });
                    }}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:border-gray-900 transition-all outline-none text-sm font-bold"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <button 
                  onClick={handleAddEntry}
                  className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-widest hover:bg-gray-800 transition-all mt-2"
                >
                  Salvar Lançamento
                </button>
              </div>
            </div>

          {/* List */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden text-gray-900">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Histórico do Período</h2>
              <div className="text-[10px] font-bold text-gray-400 uppercase">
                {filteredFinances.length} Lançamentos
              </div>
            </div>
            <div className="divide-y divide-gray-50">
              {filteredFinances.map(entry => (
                <div key={entry.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/30 transition-all">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center border",
                      entry.type === 'gain' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-red-50 text-red-500 border-red-100"
                    )}>
                      {entry.type === 'gain' ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{entry.description}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{entry.category} · {format(new Date(entry.date), 'dd MMM yyyy', { locale: ptBR })}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className={cn("text-sm font-black tracking-tight", entry.type === 'gain' ? "text-emerald-600" : "text-gray-900")}>
                      {entry.type === 'expense' ? '-' : '+'} {fmt(entry.amount)}
                    </span>
                    <button onClick={() => handleDeleteEntry(entry.id)} className="text-gray-300 hover:text-red-500 transition-colors p-2">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              {filteredFinances.length === 0 && (
                <div className="py-20 text-center opacity-30 italic text-sm font-medium">Nenhum lançamento no período selecionado.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
