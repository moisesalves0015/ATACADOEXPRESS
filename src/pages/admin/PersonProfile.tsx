import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, onSnapshot, addDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { UserProfile, SystemLog, CommissionPayout, Order, Product } from '../../types';
import { logSystemAction } from '../../lib/logger';
import { 
  ArrowLeft, User, MapPin, Phone, Mail, Calendar, CreditCard, 
  ShoppingBag, TrendingUp, BarChart2, Activity, Shield, Box,
  DollarSign, Settings, Clock, CheckCircle2, AlertCircle, RefreshCw
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, Legend
} from 'recharts';

type TabType = 'overview' | 'history' | 'sales' | 'products' | 'orders' | 'settings';

export default function PersonProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Data states
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [ordersAsSeller, setOrdersAsSeller] = useState<Order[]>([]);
  const [payouts, setPayouts] = useState<CommissionPayout[]>([]);
  const [productsAsSupplier, setProductsAsSupplier] = useState<Product[]>([]);
  const [ordersAsClient, setOrdersAsClient] = useState<Order[]>([]);

  // Fetch Core Profile
  useEffect(() => {
    if (!id) return;
    const fetchUser = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', id));
        if (userDoc.exists()) {
          setUser({ uid: userDoc.id, ...userDoc.data() } as UserProfile);
        } else {
          alert('Usuário não encontrado.');
          navigate('/admin/pessoas');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [id, navigate]);

  // Fetch Tab Data
  useEffect(() => {
    if (!user) return;

    const unsubs: (() => void)[] = [];

    // History (Logs)
    if (activeTab === 'history') {
      const qLogs = query(collection(db, 'system_logs'), where('targetId', '==', user.uid));
      unsubs.push(onSnapshot(qLogs, (snap) => {
        setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as SystemLog)).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      }));
    }

    // Sales & Commissions (Sellers)
    if (activeTab === 'sales' && (user.role === 'seller' || user.isSeller)) {
      const qOrders = query(collection(db, 'orders'), where('sellerId', '==', user.uid));
      unsubs.push(onSnapshot(qOrders, (snap) => {
        setOrdersAsSeller(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
      }));

      const qPayouts = query(collection(db, 'payouts'), where('sellerId', '==', user.uid));
      unsubs.push(onSnapshot(qPayouts, (snap) => {
        setPayouts(snap.docs.map(d => ({ id: d.id, ...d.data() } as CommissionPayout)));
      }));
    }

    // Products (Suppliers)
    if (activeTab === 'products' && (user.role === 'supplier' || user.isSupplier)) {
      const qProducts = query(collection(db, 'products'), where('supplierId', '==', user.uid));
      unsubs.push(onSnapshot(qProducts, (snap) => {
        setProductsAsSupplier(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
      }));
    }

    // Orders (Clients)
    if (activeTab === 'orders' && (user.role === 'client' || user.role === 'admin')) {
      const qClientOrders = query(collection(db, 'orders'), where('clientId', '==', user.uid));
      unsubs.push(onSnapshot(qClientOrders, (snap) => {
        setOrdersAsClient(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
      }));
    }

    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, [user, activeTab]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-pink"></div>
      </div>
    );
  }

  const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    client: 'Cliente',
    seller: 'Vendedor',
    supplier: 'Fornecedor'
  };

  const roleColors: Record<string, string> = {
    admin: 'bg-purple-50 text-purple-700 border-purple-100',
    client: 'bg-blue-50 text-blue-700 border-blue-100',
    seller: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    supplier: 'bg-orange-50 text-orange-700 border-orange-100'
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Top Bar */}
      <div className="flex items-center gap-4 border-b border-gray-100 pb-6">
        <button 
          onClick={() => navigate('/admin/pessoas')}
          className="w-10 h-10 flex items-center justify-center bg-white border border-gray-200 rounded-xl text-gray-500 hover:text-gray-900 hover:border-gray-900 transition-all shadow-sm"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Perfil <span className="text-gray-400 font-normal">CRM</span></h1>
          <p className="text-xs text-gray-500 font-medium mt-1">Gestão centralizada de entidade</p>
        </div>
      </div>

      {/* Header Profile Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col md:flex-row items-stretch">
        <div className="bg-gray-50 p-8 md:w-1/3 flex flex-col items-center justify-center text-center relative overflow-hidden border-r border-gray-100">
           <div className="absolute top-0 right-0 p-3 flex gap-2">
             {user.status !== 'inactive' ? (
               <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest bg-white text-gray-900 border border-gray-200 px-2 py-1 rounded-lg"><CheckCircle2 className="w-3 h-3"/> Ativo</span>
             ) : (
               <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest bg-gray-100 text-gray-500 border border-gray-200 px-2 py-1 rounded-lg"><AlertCircle className="w-3 h-3"/> Inativo</span>
             )}
           </div>
           <div className="w-24 h-24 bg-white rounded-xl flex items-center justify-center border border-gray-200 mb-4 shadow-sm">
             <User className="w-10 h-10 text-gray-400" />
           </div>
           <h2 className="text-xl font-bold text-gray-900 mb-1">{user.name}</h2>
           <p className="text-gray-500 text-sm">{user.email}</p>
           
           <div className="mt-6 flex flex-wrap justify-center gap-2">
              <span className="px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border bg-white text-gray-900 border-gray-200 shadow-sm">
                {roleLabels[user.role]}
              </span>
              {user.isSeller && user.role !== 'seller' && (
                <span className="px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border bg-gray-900 text-white border-gray-900 shadow-sm">+ Vendedor</span>
              )}
              {user.isSupplier && user.role !== 'supplier' && (
                <span className="px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border bg-gray-900 text-white border-gray-900 shadow-sm">+ Fornecedor</span>
              )}
           </div>
        </div>
        
        <div className="p-8 md:w-2/3 grid grid-cols-2 lg:grid-cols-4 gap-6 bg-white">
           <div className="col-span-2 lg:col-span-4 border-b border-gray-100 pb-4 mb-2">
             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Activity className="w-4 h-4"/> Ações Rápidas</p>
             <div className="flex flex-wrap gap-3">
               {user.phone && (
                 <a href={`https://wa.me/55${user.phone}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 text-gray-900 px-4 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest transition-all border border-gray-200 shadow-sm">
                   <Phone className="w-4 h-4" /> WhatsApp
                 </a>
               )}
               <a href={`mailto:${user.email}`} className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 text-gray-900 px-4 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest transition-all border border-gray-200 shadow-sm">
                 <Mail className="w-4 h-4" /> E-mail
               </a>
             </div>
           </div>
           
           <div>
             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Cadastrado</p>
             <p className="text-xs font-bold text-gray-900">{new Date(user.createdAt).toLocaleDateString()}</p>
           </div>
           <div>
             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Telefone</p>
             <p className="text-xs font-bold text-gray-900">{user.phone || 'Não inf.'}</p>
           </div>
           <div>
             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Documento</p>
             <p className="text-xs font-bold text-gray-900">{user.cnpj || user.cpf || 'Não inf.'}</p>
           </div>
           <div>
             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">ID Único</p>
             <p className="text-[10px] font-mono bg-gray-50 border border-gray-100 px-2 py-1 rounded-lg text-gray-600 truncate" title={user.uid}>{user.uid}</p>
           </div>
        </div>
      </div>

      {/* Tabs & Content - Catalog Page Style */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
          <div className="flex items-center gap-3 w-full">
            <div className="p-1.5 bg-gray-100 rounded-lg flex items-center overflow-x-auto no-scrollbar w-full md:w-auto">
              <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} label="Visão Geral" icon={MapPin} />
              
              {(user.role === 'seller' || user.isSeller) && (
                <TabButton active={activeTab === 'sales'} onClick={() => setActiveTab('sales')} label="Vendas & Comissões" icon={TrendingUp} />
              )}
              
              {(user.role === 'supplier' || user.isSupplier) && (
                <TabButton active={activeTab === 'products'} onClick={() => setActiveTab('products')} label="Produtos" icon={Box} />
              )}
              
              {(user.role === 'client' || user.role === 'admin') && (
                <TabButton active={activeTab === 'orders'} onClick={() => setActiveTab('orders')} label="Pedidos" icon={ShoppingBag} />
              )}
              
              <TabButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} label="Histórico" icon={Clock} />
              <TabButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} label="Configurações" icon={Settings} />
            </div>
          </div>
        </div>

        {/* Tab Contents */}
        <div className="p-8 bg-gray-50/10 min-h-[400px]">
          {activeTab === 'overview' && <OverviewTab user={user} />}
          {activeTab === 'history' && <HistoryTab logs={logs} />}
          {activeTab === 'sales' && <SalesTab user={user} orders={ordersAsSeller} payouts={payouts} />}
          {activeTab === 'products' && <ProductsTab products={productsAsSupplier} />}
          {activeTab === 'orders' && <OrdersTab orders={ordersAsClient} />}
          {activeTab === 'settings' && <SettingsTab user={user} />}
        </div>
      </div>
    </div>
  );
}

// Sub-components for Tabs
function TabButton({ active, onClick, label, icon: Icon }: { active: boolean, onClick: () => void, label: string, icon: any }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap",
        active ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
      )}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

// --- TAB: VISÃO GERAL ---
function OverviewTab({ user }: { user: UserProfile }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-white rounded-xl p-8 border border-gray-200 shadow-sm">
        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
          <MapPin className="w-4 h-4" /> Localização
        </h3>
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Endereço Completo</p>
            <p className="text-sm font-bold text-gray-800">{user.address || 'Não informado'}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Cidade</p>
              <p className="text-sm font-bold text-gray-800">{user.city || 'N/A'}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Estado</p>
              <p className="text-sm font-bold text-gray-800">{user.state || 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-8 border border-gray-200 shadow-sm">
        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
          <Calendar className="w-4 h-4" /> Notas Internas
        </h3>
        <div className="bg-gray-50 rounded-xl p-6 border border-gray-100 min-h-[140px]">
          <p className="text-sm text-gray-600 leading-relaxed italic font-medium">
            {user.observations || 'Nenhuma observação registrada. Adicione notas nas configurações.'}
          </p>
        </div>
      </div>
    </div>
  );
}

// --- TAB: HISTÓRICO ---
function HistoryTab({ logs }: { logs: SystemLog[] }) {
  if (logs.length === 0) {
    return (
      <div className="bg-white rounded-xl p-12 border border-gray-200 shadow-sm text-center">
        <Clock className="w-12 h-12 text-gray-200 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-gray-900 mb-2">Nenhum histórico</h3>
        <p className="text-gray-500 text-sm max-w-md mx-auto">As alterações feitas no perfil, cargo ou dados financeiros desta pessoa aparecerão aqui.</p>
      </div>
    );
  }

  const getActionColor = (type: string) => {
    switch (type) {
      case 'CREATE': return 'bg-white text-gray-900 border-gray-300';
      case 'UPDATE': return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'ROLE_CHANGE': return 'bg-gray-900 text-white border-gray-900';
      case 'STATUS_CHANGE': return 'bg-gray-800 text-white border-gray-800';
      case 'FINANCE_CHANGE': return 'bg-white text-gray-900 border-gray-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-xl p-8 border border-gray-200 shadow-sm">
      <div className="relative border-l-2 border-gray-100 ml-4 space-y-8 pb-4">
        {logs.map((log) => (
          <div key={log.id} className="relative pl-8">
            <div className={cn("absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2", getActionColor(log.actionType).split(' ').slice(0, 2).join(' '), "border-white")}></div>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <div className="flex justify-between items-start mb-2">
                <span className={cn("text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-lg border", getActionColor(log.actionType))}>
                  {log.actionType.replace('_', ' ')}
                </span>
                <span className="text-[10px] text-gray-400 font-bold">{new Date(log.timestamp).toLocaleString()}</span>
              </div>
              <p className="text-sm text-gray-800 font-medium mb-2">{log.description}</p>
              <p className="text-[10px] text-gray-400 font-bold uppercase">Por: {log.performedByEmail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- TAB: VENDAS & COMISSÕES ---
function SalesTab({ user, orders, payouts }: { user: UserProfile, orders: Order[], payouts: CommissionPayout[] }) {
  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const allItems = orders.flatMap(o => o.items.map(i => ({ ...i, orderDate: o.orderDate, orderStatus: o.status })));
  
  // Calculate commission logic (only confirmed)
  const confirmedItems = allItems.filter(i => {
    const currentStatus = i.status || i.orderStatus;
    return ['pagamento_confirmado', 'separacao', 'entregue'].includes(currentStatus || '');
  });
  
  const totalCommissionGenerated = confirmedItems.reduce((acc, i) => acc + (i.commissionValue || 0), 0);
  const totalPaid = payouts.reduce((acc, p) => acc + (p.amount || 0), 0);
  const balanceToPay = totalCommissionGenerated - totalPaid;
  const totalSalesVolume = confirmedItems.reduce((acc, i) => acc + (i.unitPrice * i.quantity), 0);

  // Chart Data preparation (Sales by day)
  const salesByDate: Record<string, number> = {};
  confirmedItems.forEach(i => {
    const d = new Date(i.orderDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    salesByDate[d] = (salesByDate[d] || 0) + (i.unitPrice * i.quantity);
  });
  const chartData = Object.keys(salesByDate).map(date => ({ date, vendas: salesByDate[date] }));

  const handlePay = async () => {
    if (balanceToPay <= 0) return alert('Sem saldo.');
    if (!window.confirm(`Registrar pagamento de ${fmt(balanceToPay)}?`)) return;
    try {
      await addDoc(collection(db, 'payouts'), {
        sellerId: user.uid,
        amount: balanceToPay,
        paidAt: new Date().toISOString(),
        paidBy: auth.currentUser?.email || 'Admin'
      });
      await logSystemAction(user.uid, user.name, 'FINANCE_CHANGE', `Pagamento de comissão no valor de ${fmt(balanceToPay)} registrado.`);
      alert('Pago!');
    } catch(e) { console.error(e); alert('Erro'); }
  };

  return (
    <div className="space-y-6">
      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-900 rounded-xl p-6 text-white relative overflow-hidden shadow-xl border border-gray-900">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 relative z-10">Saldo a Receber</p>
          <h3 className="text-3xl font-bold relative z-10">{fmt(balanceToPay)}</h3>
          <button onClick={handlePay} disabled={balanceToPay <= 0} className="mt-4 w-full bg-white text-gray-900 hover:bg-gray-100 text-[10px] font-bold uppercase tracking-widest py-3 rounded-xl transition-all relative z-10 disabled:opacity-50">
            Pagar Agora
          </button>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Comissão Gerada</p>
          <h3 className="text-2xl font-bold text-gray-900">{fmt(totalCommissionGenerated)}</h3>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Volume de Vendas</p>
          <h3 className="text-2xl font-bold text-gray-900">{fmt(totalSalesVolume)}</h3>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Itens Vendidos</p>
          <h3 className="text-2xl font-bold text-gray-900">{confirmedItems.reduce((acc, i) => acc + i.quantity, 0)} un</h3>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
         <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6">Evolução de Vendas</h3>
         <div className="h-[300px] w-full">
           {chartData.length > 0 ? (
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={chartData}>
                 <defs>
                   <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#111827" stopOpacity={0.1}/>
                     <stop offset="95%" stopColor="#111827" stopOpacity={0}/>
                   </linearGradient>
                 </defs>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                 <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af', fontWeight: 700}} />
                 <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af', fontWeight: 700}} tickFormatter={(v) => `R$${v}`} />
                 <RechartsTooltip cursor={{stroke: '#111827', strokeWidth: 1, strokeDasharray: '3 3'}} contentStyle={{borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}} />
                 <Area type="monotone" dataKey="vendas" stroke="#111827" strokeWidth={3} fillOpacity={1} fill="url(#colorVendas)" />
               </AreaChart>
             </ResponsiveContainer>
           ) : (
             <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm font-bold">Sem dados de vendas suficientes para o gráfico.</div>
           )}
         </div>
      </div>
    </div>
  );
}

// --- TAB: PRODUTOS ---
function ProductsTab({ products }: { products: Product[] }) {
  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6">Inventário do Fornecedor</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map(p => (
            <div key={p.id} className="group border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all bg-white">
              <div className="aspect-square relative overflow-hidden bg-gray-50">
                <img src={p.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={p.name} />
                <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-[10px] font-bold uppercase text-gray-900 shadow-sm">
                  {p.availableQuantity} em estoque
                </div>
              </div>
              <div className="p-4">
                <p className="text-sm font-bold text-gray-900 line-clamp-1">{p.name}</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase mb-2">{p.category}</p>
                <div className="flex justify-between items-end">
                  <p className="text-lg font-bold text-gray-900">{fmt(p.unitPrice)}</p>
                </div>
              </div>
            </div>
          ))}
          {products.length === 0 && <div className="col-span-full py-10 text-center text-gray-400 text-[10px] uppercase font-bold">Nenhum produto cadastrado para este fornecedor.</div>}
        </div>
      </div>
    </div>
  );
}

// --- TAB: PEDIDOS ---
function OrdersTab({ orders }: { orders: Order[] }) {
  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50/50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-[10px] font-bold uppercase text-gray-400">Pedido</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase text-gray-400">Data</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase text-gray-400">Total</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase text-gray-400">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {orders.length === 0 ? (
               <tr><td colSpan={4} className="px-6 py-10 text-center text-gray-400 italic text-[10px] font-bold uppercase">Nenhum pedido encontrado.</td></tr>
            ) : (
              orders.map(o => (
                <tr key={o.id} className="hover:bg-gray-50/30">
                  <td className="px-6 py-4 text-xs font-bold font-mono text-gray-900">#{o.id.slice(-6).toUpperCase()}</td>
                  <td className="px-6 py-4 text-xs font-bold text-gray-500">{new Date(o.orderDate).toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900">
                    {fmt(o.items.reduce((s, i) => s + (i.quantity * i.unitPrice), 0))}
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "inline-block text-[10px] font-bold uppercase px-2 py-1 rounded-lg border tracking-widest",
                      o.items.some(i => (i.status || o.status) === 'aguardando_pagamento') ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-gray-50 text-gray-600 border-gray-200'
                    )}>
                      {o.items.length} itens
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- TAB: CONFIGURAÇÕES ---
function SettingsTab({ user }: { user: UserProfile }) {
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState({
    commissionDefault: user.commissionDefault || 0,
    commissionType: user.commissionType || 'percentage',
    monthlyGoal: user.monthlyGoal || 0,
    observations: user.observations || ''
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), data);
      await logSystemAction(user.uid, user.name, 'UPDATE', 'Configurações do perfil atualizadas.');
      alert('Configurações salvas!');
    } catch(e) {
      console.error(e);
      alert('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl p-8 border border-gray-200 shadow-sm max-w-2xl">
      <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6">Configurações Avançadas</h3>
      <div className="space-y-6">
        {user.role !== 'client' && (
          <div className="grid grid-cols-2 gap-4">
             <div>
               <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Comissão Padrão</label>
               <input type="number" value={data.commissionDefault} onChange={e => setData({...data, commissionDefault: Number(e.target.value)})} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold focus:bg-white focus:border-gray-900 transition-all outline-none" />
             </div>
             <div>
               <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Tipo Comissão</label>
               <select value={data.commissionType} onChange={e => setData({...data, commissionType: e.target.value as any})} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold focus:bg-white focus:border-gray-900 transition-all outline-none">
                 <option value="percentage">Porcentagem (%)</option>
                 <option value="fixed">Valor Fixo (R$)</option>
               </select>
             </div>
          </div>
        )}
        
        {user.role !== 'client' && (
           <div>
             <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Meta Mensal</label>
             <input type="number" value={data.monthlyGoal} onChange={e => setData({...data, monthlyGoal: Number(e.target.value)})} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold focus:bg-white focus:border-gray-900 transition-all outline-none" />
           </div>
        )}

        <div>
           <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Observações Internas</label>
           <textarea value={data.observations} onChange={e => setData({...data, observations: e.target.value})} rows={4} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold focus:bg-white focus:border-gray-900 transition-all outline-none resize-none"></textarea>
        </div>

        <button onClick={handleSave} disabled={saving} className="w-full px-6 py-3 bg-gray-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-gray-200 hover:bg-gray-800 transition-all disabled:opacity-50 flex items-center justify-center">
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </div>
    </div>
  );
}
