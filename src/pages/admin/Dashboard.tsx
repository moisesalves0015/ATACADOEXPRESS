import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, limit, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Order, Product, UserProfile } from '../../types';
import { BarChart3, TrendingUp, Users, Package, ClipboardList, ArrowUpRight, ArrowDownRight, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
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
  const goalProducts = products.filter(p => p.stockType === 'previsao_meta');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Painel Administrativo</h1>
          <p className="text-gray-500 text-sm">Bem-vindo de volta! Aqui está o resumo do seu negócio.</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm text-sm font-medium text-gray-600 flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-600" />
          {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col justify-between hover:border-gray-300 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                 <stat.icon className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
                 <p className="text-xs font-medium text-gray-500 uppercase tracking-widest">{stat.label}</p>
              </div>
            </div>
            <div className="flex items-end justify-between mt-1">
              <h3 className="text-xl font-medium text-gray-800 tracking-tight">{stat.value}</h3>
              {stat.trendText && (
                <span className="flex items-center gap-1 text-[10px] font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                  {!stat.isNeutral && !stat.isAlert && (
                    stat.isPositive ? <ArrowUpRight className="w-3 h-3 opacity-70" strokeWidth={1.5} /> : <ArrowDownRight className="w-3 h-3 opacity-70" strokeWidth={1.5} />
                  )}
                  {stat.isAlert && <AlertCircle className="w-3 h-3 opacity-70" strokeWidth={1.5} />}
                  {stat.trendText}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Orders */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-50 flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-blue-600" /> Pedidos Recentes
            </h2>
            <Link to="/admin/orders" className="text-sm font-bold text-blue-600 hover:underline">Ver todos</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {orders.slice(0, 5).map((order) => (
              <div key={order.id} className="p-6 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 font-bold text-xs">
                    {order.clientName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{order.clientName}</p>
                    <p className="text-xs text-gray-500">#{order.id.slice(-6).toUpperCase()} • {format(new Date(order.orderDate), 'HH:mm')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.totalValue)}</p>
                  <span className={cn(
                    "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full",
                    order.status === 'aguardando_pagamento' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'
                  )}>
                    {order.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
            {orders.length === 0 && (
              <div className="p-12 text-center text-gray-400 italic">Nenhum pedido realizado ainda.</div>
            )}
          </div>
        </div>

        {/* Goal Tracking */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-600" /> Metas de Produtos
            </h2>
            <Link to="/admin/products" className="text-sm font-bold text-blue-600 hover:underline">Gerenciar</Link>
          </div>
          <div className="p-6 space-y-6">
            {goalProducts.slice(0, 4).map((product) => (
              <div key={product.id} className="space-y-2">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{product.name}</p>
                    <p className="text-xs text-gray-500">Meta: {product.requiredGoal} unidades</p>
                  </div>
                  <span className="text-xs font-black text-orange-600">
                    {Math.round(((product.currentGoalProgress || 0) / (product.requiredGoal || 1)) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-orange-500 h-full transition-all duration-1000" 
                    style={{ width: `${Math.min(100, ((product.currentGoalProgress || 0) / (product.requiredGoal || 1)) * 100)}%` }}
                  ></div>
                </div>
                {product.goalReached && (
                  <p className="text-[10px] text-green-600 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Meta atingida! Pronto para entrega.
                  </p>
                )}
              </div>
            ))}
            {goalProducts.length === 0 && (
              <div className="p-12 text-center text-gray-400 italic">Nenhum produto com meta cadastrado.</div>
            )}
          </div>
        </div>
      </div>

      {/* Alerts / Pending Actions */}
      {pendingOrders.length > 0 && (
        <div className="bg-orange-50 border border-orange-100 rounded-xl p-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-orange-500 p-2 rounded-lg shadow-sm shadow-orange-100/50">
              <AlertCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-orange-900">Atenção!</h3>
              <p className="text-sm text-orange-700">Você tem {pendingOrders.length} pedidos aguardando confirmação de pagamento.</p>
            </div>
          </div>
          <Link to="/admin/orders?status=aguardando_pagamento" className="bg-white text-orange-600 px-6 py-2 rounded-xl font-bold text-sm shadow-sm hover:bg-orange-100 transition-colors">
            Ver Pedidos
          </Link>
        </div>
      )}
    </div>
  );
}
