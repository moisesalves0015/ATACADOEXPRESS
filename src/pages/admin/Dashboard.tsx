import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, limit, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Order, Product, UserProfile } from '../../types';
import { 
  BarChart3, TrendingUp, Users, Package, ClipboardList, 
  ArrowUpRight, ArrowDownRight, Clock, CheckCircle2, 
  AlertCircle, Trophy, ShoppingBag, UserCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { format, subDays, startOfDay, endOfDay, startOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubOrders = onSnapshot(query(collection(db, 'orders'), orderBy('orderDate', 'desc')), (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });

    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
    });

    const unsubUsers = onSnapshot(query(collection(db, 'users'), where('role', '==', 'client')), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as unknown as UserProfile)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    return () => {
      unsubOrders();
      unsubProducts();
      unsubUsers();
    };
  }, []);

  const now = new Date();

  const todayOrders = orders.filter(o => {
    const date = new Date(o.orderDate);
    return date >= startOfDay(now) && date <= endOfDay(now);
  });
  
  const yesterdayOrders = orders.filter(o => {
    const date = new Date(o.orderDate);
    const yesterday = subDays(now, 1);
    return date >= startOfDay(yesterday) && date <= endOfDay(yesterday);
  });

  const monthStart = startOfMonth(now);
  const prevMonthStart = startOfMonth(subMonths(now, 1));
  
  const currentMonthOrders = orders.filter(o => new Date(o.orderDate) >= monthStart);
  const previousMonthOrders = orders.filter(o => {
    const d = new Date(o.orderDate);
    return d >= prevMonthStart && d < monthStart;
  });

  const totalRevenue = orders.reduce((sum, o) => sum + o.totalValue, 0);
  const todayRevenue = todayOrders.reduce((sum, o) => sum + o.totalValue, 0);
  const yesterdayRevenue = yesterdayOrders.reduce((sum, o) => sum + o.totalValue, 0);
  
  const currentMonthRevenue = currentMonthOrders.reduce((sum, o) => sum + o.totalValue, 0);
  const previousMonthRevenue = previousMonthOrders.reduce((sum, o) => sum + o.totalValue, 0);

  const todayTrend = yesterdayRevenue === 0 
    ? (todayRevenue > 0 ? 100 : 0) 
    : Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100);

  const monthTrend = previousMonthRevenue === 0 
    ? (currentMonthRevenue > 0 ? 100 : 0) 
    : Math.round(((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100);

  const activeProducts = products.filter(p => p.status === 'active');
  const outOfStockCount = activeProducts.filter(p => p.stockType === 'pronta_entrega' && (p.availableQuantity || 0) <= 0).length;

  const newUsersThisMonth = users.filter(u => {
    if (!u.createdAt) return false;
    const d = new Date(typeof u.createdAt === 'string' ? u.createdAt : (u.createdAt as any).seconds ? (u.createdAt as any).seconds * 1000 : now);
    return d >= monthStart;
  }).length;

  // Top Products Logic
  const topProducts = useMemo(() => {
    const sales: Record<string, { name: string, qty: number, revenue: number }> = {};
    orders.forEach(order => {
      if (order.status === 'cancelado') return;
      order.items.forEach(item => {
        if (!sales[item.productId]) {
          sales[item.productId] = { name: item.productName, qty: 0, revenue: 0 };
        }
        sales[item.productId].qty += item.quantity;
        sales[item.productId].revenue += item.quantity * item.unitPrice;
      });
    });
    return Object.entries(sales)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [orders]);

  // Top Clients Logic
  const topClients = useMemo(() => {
    const clients: Record<string, { name: string, qty: number, revenue: number }> = {};
    orders.forEach(order => {
      if (order.status === 'cancelado') return;
      if (!clients[order.clientId]) {
        clients[order.clientId] = { name: order.clientName, qty: 0, revenue: 0 };
      }
      clients[order.clientId].qty += 1;
      clients[order.clientId].revenue += order.totalValue;
    });
    return Object.entries(clients)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [orders]);

  const stats = [
    { 
      label: 'Vendas Totais', 
      value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRevenue), 
      icon: TrendingUp, 
      trendValue: monthTrend,
      trendText: `${monthTrend}% no mês`,
      isPositive: monthTrend >= 0,
      isNeutral: monthTrend === 0
    },
    { 
      label: 'Vendas Hoje', 
      value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(todayRevenue), 
      icon: BarChart3, 
      trendValue: todayTrend,
      trendText: `${todayTrend}% hoje`,
      isPositive: todayTrend >= 0,
      isNeutral: todayTrend === 0
    },
    { 
      label: 'Clientes Ativos', 
      value: users.length, 
      icon: Users, 
      trendValue: newUsersThisMonth,
      trendText: `+${newUsersThisMonth} novos`,
      isPositive: true,
      isNeutral: newUsersThisMonth === 0
    },
    { 
      label: 'Produtos Ativos', 
      value: activeProducts.length, 
      icon: Package, 
      trendValue: outOfStockCount,
      trendText: `${outOfStockCount} sem estoque`,
      isPositive: outOfStockCount === 0,
      isNeutral: outOfStockCount === 0,
      isAlert: outOfStockCount > 0
    },
  ];

  const pendingOrders = orders.filter(o => o.status === 'aguardando_pagamento');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-gray-100 pb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            Dashboard <span className="text-gray-400 font-normal">Principal</span>
          </h1>
          <p className="text-gray-500 text-sm mt-1">Bem-vindo à central de inteligência do Saldo da Kricia.</p>
        </div>
        <div className="bg-gray-50 px-4 py-2 rounded-xl border border-gray-200 text-[10px] font-black text-gray-400 flex items-center gap-3 uppercase tracking-widest">
          <Clock className="w-3.5 h-3.5" />
          {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
        </div>
      </div>

      {/* Stats Grid - Professional Clean */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:border-gray-300 transition-all flex flex-col justify-between h-40">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-900 border border-gray-100">
                <stat.icon size={18} strokeWidth={2} />
              </div>
              {stat.trendText && (
                <span className={cn(
                  "text-[9px] font-bold px-2 py-0.5 rounded-md border",
                  stat.isNeutral ? "bg-gray-50 text-gray-400 border-gray-100" :
                  stat.isAlert ? "bg-orange-50 text-orange-600 border-orange-100" :
                  stat.isPositive ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-red-50 text-red-600 border-red-100"
                )}>
                  {stat.trendText}
                </span>
              )}
            </div>
            
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
              <h3 className="text-2xl font-bold text-gray-900 tracking-tight">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Recent Orders - Minimalist List */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2 uppercase tracking-widest">
              <ClipboardList className="w-4 h-4" /> Últimos Pedidos
            </h2>
            <Link to="/admin/orders" className="text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors">
              Ver todos
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {orders.slice(0, 5).map((order) => (
              <div key={order.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/30 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 font-bold text-xs">
                    {order.clientName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{order.clientName}</p>
                    <p className="text-[10px] font-medium text-gray-400">#{order.id.slice(-6).toUpperCase()} · {format(new Date(order.orderDate), 'HH:mm')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.totalValue)}</p>
                  <span className={cn(
                    "inline-block mt-0.5 text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border tracking-widest",
                    order.status === 'aguardando_pagamento' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                  )}>
                    {order.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Goals / Active Metas */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2 uppercase tracking-widest">
              <TrendingUp className="w-4 h-4" /> Metas em Andamento
            </h2>
          </div>
          <div className="p-6 space-y-6">
            {products.filter(p => p.stockType === 'previsao_meta').slice(0, 4).map((p) => (
              <div key={p.id} className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-gray-700">{p.name}</span>
                  <span className="font-bold text-gray-400">{p.currentGoalProgress}/{p.requiredGoal} <span className="text-[10px] ml-1">({Math.round(((p.currentGoalProgress || 0) / (p.requiredGoal || 1)) * 100)}%)</span></span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div 
                    className="bg-gray-900 h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, ((p.currentGoalProgress || 0) / (p.requiredGoal || 1)) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Mais Vendidos */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3 bg-gray-50/30">
            <div className="p-2 bg-brand-pink/10 rounded-xl text-brand-pink">
              <Trophy size={16} />
            </div>
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Mais Vendidos</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {topProducts.map((p, i) => (
              <div key={p.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/30 transition-all">
                <div className="flex items-center gap-4">
                  <span className="text-xs font-black text-gray-300">0{i+1}</span>
                  <p className="text-sm font-bold text-gray-900 truncate max-w-[150px]">{p.name}</p>
                </div>
                <div className="flex items-center gap-6">
                   <div className="text-right">
                      <p className="text-[10px] text-gray-400 font-bold uppercase">Volume</p>
                      <p className="text-sm font-bold text-gray-900">{p.qty} un</p>
                   </div>
                   <div className="text-right min-w-[80px]">
                      <p className="text-[10px] text-gray-400 font-bold uppercase">Receita</p>
                      <p className="text-sm font-bold text-brand-pink">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.revenue)}</p>
                   </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Melhores Clientes */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3 bg-gray-50/30">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <UserCircle size={16} />
            </div>
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Top Clientes</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {topClients.map((c, i) => (
              <div key={c.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/30 transition-all">
                <div className="flex items-center gap-4">
                  <span className="text-xs font-black text-gray-300">0{i+1}</span>
                  <p className="text-sm font-bold text-gray-900 truncate max-w-[150px]">{c.name}</p>
                </div>
                <div className="flex items-center gap-6">
                   <div className="text-right">
                      <p className="text-[10px] text-gray-400 font-bold uppercase">Pedidos</p>
                      <p className="text-sm font-bold text-gray-900">{c.qty}</p>
                   </div>
                   <div className="text-right min-w-[80px]">
                      <p className="text-[10px] text-gray-400 font-bold uppercase">Total</p>
                      <p className="text-sm font-bold text-indigo-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.revenue)}</p>
                   </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pending Action Alert */}
      {pendingOrders.length > 0 && (
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6 overflow-hidden relative">
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-brand-pink/10 blur-[50px]"></div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="bg-brand-pink p-3 rounded-xl shadow-lg shadow-brand-pink/20">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Pendências Financeiras</h3>
              <p className="text-gray-400 text-xs">Existem {pendingOrders.length} pedidos aguardando confirmação de pagamento.</p>
            </div>
          </div>
          <Link to="/admin/orders?status=aguardando_pagamento" className="bg-white text-gray-900 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-100 transition-all relative z-10">
            Verificar Agora
          </Link>
        </div>
      )}
    </div>
  );
}
