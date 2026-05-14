import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, limit, where, updateDoc, doc, arrayUnion, getDoc, runTransaction } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth } from '../../firebase';
import { Order, Product, UserProfile, OrderStatus, StatusUpdate } from '../../types';
import { 
  BarChart3, TrendingUp, Users, Package, ClipboardList, 
  ArrowUpRight, ArrowDownRight, Clock, CheckCircle2, 
  AlertCircle, Trophy, ShoppingBag, UserCircle, ExternalLink, ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { format, subDays, startOfDay, endOfDay, startOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { statusConfig, fmt, canTransitionTo } from '../../lib/order-utils';
import OrderDetailsModal from '../../components/admin/OrderDetailsModal';

export default function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    const unsubOrders = onSnapshot(query(collection(db, 'orders'), orderBy('orderDate', 'desc')), (snapshot) => {
      // RISCO-04: filter soft-deleted orders so they don't affect any metric
      setOrders(snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Order))
        .filter(o => !(o as any).deletedAt)
      );
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });

    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
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

  const getItemRevenue = (orderList: Order[], onlyPaid: boolean) => {
    return orderList.reduce((sum, order) => {
      let orderSum = 0;
      order.items.forEach(item => {
        // Fallback to order.status if item.status is somehow missing (legacy orders)
        const currentStatus = item.status || order.status;
        
        if (currentStatus !== 'cancelado') {
          if (onlyPaid) {
            if (['pagamento_confirmado', 'separacao', 'entregue'].includes(currentStatus)) {
              orderSum += item.quantity * item.unitPrice;
            }
          } else {
            orderSum += item.quantity * item.unitPrice;
          }
        }
      });
      return sum + orderSum;
    }, 0);
  };

  const totalRevenue = getItemRevenue(orders, true);
  const todayRevenue = getItemRevenue(todayOrders, true);
  const yesterdayRevenue = getItemRevenue(yesterdayOrders, true);
  
  const currentMonthRevenue = getItemRevenue(currentMonthOrders, true);
  const previousMonthRevenue = getItemRevenue(previousMonthOrders, true);

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
      order.items.forEach(item => {
        const currentStatus = item.status || order.status;
        if (currentStatus === 'cancelado') return;
        
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
      let validOrderRevenue = 0;
      let validItems = 0;
      order.items.forEach(item => {
         const currentStatus = item.status || order.status;
         if (currentStatus !== 'cancelado') {
           validOrderRevenue += item.quantity * item.unitPrice;
           validItems += item.quantity;
         }
      });
      
      if (validItems > 0) {
        if (!clients[order.clientId]) {
          clients[order.clientId] = { name: order.clientName, qty: 0, revenue: 0 };
        }
        clients[order.clientId].qty += 1;
        clients[order.clientId].revenue += validOrderRevenue;
      }
    });
    return Object.entries(clients)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [orders]);

  // Top Suppliers Logic
  const topSuppliers = useMemo(() => {
    const suppliersMap: Record<string, { name: string, qty: number, revenue: number }> = {};
    orders.forEach(order => {
      order.items.forEach(item => {
        const currentStatus = item.status || order.status;
        if (currentStatus === 'cancelado') return;

        const p = products.find(prod => prod.id === item.productId);
        if (p?.supplierId) {
          if (!suppliersMap[p.supplierId]) {
            suppliersMap[p.supplierId] = { name: p.supplierName || 'Desconhecido', qty: 0, revenue: 0 };
          }
          suppliersMap[p.supplierId].qty += item.quantity;
          suppliersMap[p.supplierId].revenue += item.quantity * item.unitPrice;
        }
      });
    });
    return Object.entries(suppliersMap)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [orders, products]);

  // Top Sellers Logic
  const topSellers = useMemo(() => {
    const sellersMap: Record<string, { name: string, qty: number, revenue: number, commission: number }> = {};
    orders.forEach(order => {
      if (order.sellerId) {
        if (!sellersMap[order.sellerId]) {
          sellersMap[order.sellerId] = { name: order.sellerName || 'Desconhecido', qty: 0, revenue: 0, commission: 0 };
        }
        
        order.items.forEach(item => {
          const currentStatus = item.status || order.status;
          const isConfirmed = ['pagamento_confirmado', 'separacao', 'entregue'].includes(currentStatus);
            
          if (isConfirmed) {
            sellersMap[order.sellerId!].revenue += item.quantity * item.unitPrice;
            sellersMap[order.sellerId!].commission += item.commissionValue || 0;
            sellersMap[order.sellerId!].qty += item.quantity;
          }
        });
      }
    });
    return Object.entries(sellersMap)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [orders]);

  const handleUpdateItemStatus = async (orderId: string, itemIdx: number, newStatus: OrderStatus, currentStatus: OrderStatus) => {
    if (!auth.currentUser) return;

    if (!canTransitionTo(currentStatus, newStatus)) {
      alert(`Ação não permitida. Não é possível mudar de "${statusConfig[currentStatus]?.label}" para "${statusConfig[newStatus]?.label}". Para cancelamentos com devolução de estoque, use a página de pedidos.`);
      return;
    }

    setIsUpdatingStatus(true);
    try {
      const orderRef = doc(db, 'orders', orderId);
      const orderSnap = await getDoc(orderRef);
      if (!orderSnap.exists()) return;

      const orderData = orderSnap.data() as Order;
      const updatedItems = [...orderData.items];
      const item = updatedItems[itemIdx];
      const itemName = item.productName;

      const adminDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      const adminName = adminDoc.data()?.name || auth.currentUser.email || 'Admin';

      const newHistoryEntry = {
        timestamp: new Date().toISOString(),
        actionType: 'STATUS_CHANGE',
        description: `Status alterado de "${statusConfig[item.status]?.label}" para "${statusConfig[newStatus]?.label}" via Dashboard.`,
        userEmail: adminName,
      };

      updatedItems[itemIdx] = {
        ...item,
        status: newStatus,
        history: [...(item.history || []), newHistoryEntry],
      };

      const updateEntry: StatusUpdate = {
        status: newStatus,
        comment: `Item [${itemName}]: Status alterado para ${statusConfig[newStatus]?.label} via Dashboard`,
        isInternal: true,
        updatedAt: new Date().toISOString(),
        updatedBy: adminName,
      };

      await updateDoc(orderRef, {
        items: updatedItems,
        statusHistory: arrayUnion(updateEntry),
      });

      if (selectedOrder?.id === orderId) {
        setSelectedOrder({
          ...selectedOrder,
          items: updatedItems,
          statusHistory: [...(selectedOrder.statusHistory || []), updateEntry],
        });
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar status do item.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

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
      value: users.filter(u => u.role === 'client').length, 
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm relative group flex flex-col justify-between h-32 transition-all hover:shadow-md">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
                  <stat.icon className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-tight">{stat.label}</span>
              </div>
              
              {stat.trendText && (
                <span className={cn(
                  "text-[9px] font-black px-2 py-1 rounded-lg border uppercase tracking-widest",
                  stat.isNeutral ? "bg-gray-50 text-gray-400 border-gray-100" :
                  stat.isAlert ? "bg-orange-50 text-orange-600 border-orange-100" :
                  stat.isPositive ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-red-50 text-red-600 border-red-100"
                )}>
                  {stat.trendText}
                </span>
              )}
            </div>
            
            <div className="mt-auto">
              <h3 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight leading-tight">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Recent Orders - Minimalist List */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
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
              <div 
                key={order.id} 
                onClick={() => setSelectedOrder(order)}
                className="px-5 py-5 flex items-center justify-between hover:bg-gray-50/50 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 font-black text-xs shrink-0 group-hover:border-brand-pink transition-colors">
                    {order.clientName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-gray-900 truncate group-hover:text-brand-pink transition-colors">{order.clientName}</p>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      #{order.id.slice(-6).toUpperCase()} · {format(new Date(order.orderDate), 'HH:mm')}
                      <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-black text-gray-900">{fmt(order.totalValue)}</p>
                  <span className="inline-block mt-1 text-[8px] font-black uppercase px-2 py-0.5 rounded-md border tracking-widest bg-emerald-50 text-emerald-600 border-emerald-100">
                    {order.items.reduce((sum, item) => sum + item.quantity, 0)} produtos
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Goals / Active Metas */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2 uppercase tracking-widest">
              <TrendingUp className="w-4 h-4" /> Metas em Andamento
            </h2>
          </div>
          <div className="p-4 sm:p-6 space-y-5">
            {/* RISCO-05/14: only active products with unfinished goals */}
            {products
              .filter(p =>
                p.status === 'active' &&
                p.stockType === 'previsao_meta' &&
                (p.requiredGoal || 0) > 0 &&
                !p.goalReached &&
                (p.currentGoalProgress || 0) < (p.requiredGoal || 0)
              )
              .slice(0, 4)
              .map((p) => {
                const progress = p.currentGoalProgress || 0;
                const goal = p.requiredGoal || 1;
                // RISCO-16: never show negative remaining
                const remaining = Math.max(0, goal - progress);
                const pct = Math.min(100, Math.round((progress / goal) * 100));

                // RISCO-08/16: safe WhatsApp message
                const handleIncentive = () => {
                  const msg =
                    `🔥 *META EM ANDAMENTO* 🔥\n\n` +
                    `Olá, pessoal! Estamos chegando lá! 🚀\n\n` +
                    `Faltam apenas *${remaining} unidade${remaining !== 1 ? 's' : ''}* do produto *${p.name}* para batermos a meta!\n\n` +
                    `Já vendemos *${progress} de ${goal}* unidades (${pct}% da meta). \n\n` +
                    `Vamos acelerar as vendas e fechar essa meta juntos! 📣💪`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                };

                return (
                  <div key={p.id} className="space-y-2">
                    <div className="flex justify-between items-start text-xs gap-2">
                      <span className="font-bold text-gray-700 truncate flex-1" title={p.name}>{p.name}</span>
                      <span className="font-bold text-gray-400 shrink-0">
                        {progress}/{goal}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 sm:h-2">
                      <div
                        className="bg-gray-900 h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] sm:text-[9px] font-bold text-orange-600 uppercase tracking-widest">
                        Faltam {remaining} un
                      </span>
                      <button
                        onClick={handleIncentive}
                        className="flex items-center gap-1 text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-lg transition-all border border-emerald-100"
                        title="Gerar mensagem de incentivo para WhatsApp"
                      >
                        <ShoppingBag className="w-2.5 h-2.5" /> Incentivar
                      </button>
                    </div>
                  </div>
                );
              })
            }
            {products.filter(p =>
              p.status === 'active' &&
              p.stockType === 'previsao_meta' &&
              (p.requiredGoal || 0) > 0 &&
              !p.goalReached &&
              (p.currentGoalProgress || 0) < (p.requiredGoal || 0)
            ).length === 0 && (
              <div className="text-center py-8 text-gray-400 text-[10px] font-bold uppercase tracking-widest">
                Nenhuma meta ativa
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Top Products */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2 uppercase tracking-widest">
              <ShoppingBag className="w-4 h-4 text-brand-pink" /> Produtos em Destaque
            </h2>
          </div>
          <div className="divide-y divide-gray-50">
            {topProducts.map((product, i) => (
              <div key={product.id} className="flex items-center justify-between p-4 hover:bg-gray-50/50 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100 overflow-hidden relative group-hover:border-brand-pink transition-all">
                    {products.find(p => p.id === product.id)?.imageUrl ? (
                      <img src={products.find(p => p.id === product.id)?.imageUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-5 h-5 text-gray-300" />
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <ExternalLink className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <div>
                    <Link 
                      to={`/admin/products?search=${encodeURIComponent(product.name)}`}
                      className="text-xs font-black text-gray-900 uppercase tracking-tight hover:text-brand-pink transition-colors block"
                    >
                      {product.name}
                    </Link>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{product.qty} unidades vendidas</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-gray-900">{fmt(product.revenue)}</p>
                  <div className="flex items-center justify-end gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md mt-1">
                    <TrendingUp className="w-2.5 h-2.5" />
                    TOP {i + 1}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Clients */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2 uppercase tracking-widest">
              <Trophy className="w-4 h-4 text-amber-500" /> Melhores Clientes
            </h2>
          </div>
          <div className="divide-y divide-gray-50">
            {topClients.map((client, i) => (
              <div key={client.id} className="flex items-center justify-between p-4 hover:bg-gray-50/50 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center border border-gray-100 group-hover:from-brand-pink/5 group-hover:to-brand-pink/10 transition-all">
                    <UserCircle className="w-7 h-7 text-gray-400 group-hover:text-brand-pink/50 transition-all" />
                  </div>
                  <div>
                    <Link 
                      to={`/admin/pessoas/${client.id}`}
                      className="text-xs font-black text-gray-900 uppercase tracking-tight hover:text-brand-pink transition-colors block"
                    >
                      {client.name}
                    </Link>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{client.qty} pedidos realizados</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-gray-900">{fmt(client.revenue)}</p>
                  <div className="flex items-center justify-end gap-1 text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md mt-1">
                    <Trophy className="w-2.5 h-2.5" />
                    TOP {i + 1}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Desempenho por Fornecedor */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3 bg-gray-50/30">
            <div className="p-2 bg-orange-50 text-orange-600 rounded-xl">
              <Package size={16} />
            </div>
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Desempenho por Fornecedor</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {topSuppliers.length === 0 ? (
              <div className="p-10 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">Nenhum dado disponível</div>
            ) : topSuppliers.map((s, i) => (
              <div key={s.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/30 transition-all">
                <div className="flex items-center gap-4">
                  <span className="text-xs font-black text-gray-300">0{i+1}</span>
                  <p className="text-sm font-bold text-gray-900 truncate max-w-[150px]">{s.name}</p>
                </div>
                <div className="flex items-center gap-6">
                   <div className="text-right">
                      <p className="text-[10px] text-gray-400 font-bold uppercase">Volume</p>
                      <p className="text-sm font-bold text-gray-900">{s.qty} un</p>
                   </div>
                   <div className="text-right min-w-[80px]">
                      <p className="text-[10px] text-gray-400 font-bold uppercase">Total Vendido</p>
                      <p className="text-sm font-bold text-orange-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(s.revenue)}</p>
                   </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ranking de Vendedores */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3 bg-gray-50/30">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <TrendingUp size={16} />
            </div>
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Ranking de Vendedores</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {topSellers.length === 0 ? (
              <div className="p-10 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">Nenhum dado disponível</div>
            ) : topSellers.map((sel, i) => (
              <div key={sel.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/30 transition-all">
                <div className="flex items-center gap-4">
                  <span className="text-xs font-black text-gray-300">0{i+1}</span>
                  <div>
                    <p className="text-sm font-bold text-gray-900 truncate max-w-[120px]">{sel.name}</p>
                    <p className="text-[9px] font-black text-emerald-600 uppercase">Comissão: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sel.commission)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                   <div className="text-right">
                      <p className="text-[10px] text-gray-400 font-bold uppercase">Vendas</p>
                      <p className="text-sm font-bold text-gray-900">{sel.qty}</p>
                   </div>
                   <div className="text-right min-w-[80px]">
                      <p className="text-[10px] text-gray-400 font-bold uppercase">Total</p>
                      <p className="text-sm font-bold text-emerald-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sel.revenue)}</p>
                   </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pending Action Alert */}
      {pendingOrders.length > 0 && (
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6 overflow-hidden relative">
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-white/10 blur-[50px]"></div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="bg-gray-800 p-3 rounded-xl border border-gray-700 shadow-lg">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Pendências em Itens</h3>
              <p className="text-gray-400 text-xs">Existem {pendingOrders.length} pedidos com itens aguardando confirmação de pagamento.</p>
            </div>
          </div>
          <Link to="/admin/orders" className="bg-white text-gray-900 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-100 transition-all relative z-10">
            Verificar Agora
          </Link>
        </div>
      )}
      {/* Order Details Modal */}
      {selectedOrder && (
        <OrderDetailsModal 
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onUpdateItemStatus={handleUpdateItemStatus}
        />
      )}
    </div>
  );
}
