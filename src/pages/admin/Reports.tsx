import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Order, Product } from '../../types';
import { BarChart3, Download, Calendar, Filter, Package, TrendingUp, Users, DollarSign } from 'lucide-react';
import { cn } from '../../lib/utils';
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AdminReports() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('month');

  useEffect(() => {
    const unsubOrders = onSnapshot(query(collection(db, 'orders'), orderBy('orderDate', 'desc')), (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });
    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
    });
    return () => { unsubOrders(); unsubProducts(); };
  }, []);

  const getFilteredOrders = () => {
    const now = new Date();
    let start, end;
    if (dateRange === 'month') {
      start = startOfMonth(now);
      end = endOfMonth(now);
    } else if (dateRange === 'last-month') {
      start = startOfMonth(subMonths(now, 1));
      end = endOfMonth(subMonths(now, 1));
    } else {
      return orders;
    }
    return orders.filter(o => isWithinInterval(new Date(o.orderDate), { start, end }));
  };

  const filteredOrders = getFilteredOrders();
  const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.totalValue, 0);
  
  // Top Products
  const productSales: Record<string, { name: string, qty: number, revenue: number }> = {};
  filteredOrders.forEach(order => {
    order.items.forEach(item => {
      if (!productSales[item.productId]) {
        productSales[item.productId] = { name: item.productName, qty: 0, revenue: 0 };
      }
      productSales[item.productId].qty += item.quantity;
      productSales[item.productId].revenue += item.quantity * item.unitPrice;
    });
  });

  const topProducts = Object.values(productSales).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  // Top Clients
  const clientSales: Record<string, { name: string, orders: number, revenue: number }> = {};
  filteredOrders.forEach(order => {
    if (!clientSales[order.clientId]) {
      clientSales[order.clientId] = { name: order.clientName, orders: 0, revenue: 0 };
    }
    clientSales[order.clientId].orders += 1;
    clientSales[order.clientId].revenue += order.totalValue;
  });

  const topClients = Object.values(clientSales).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

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
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <BarChart3 className="w-7 h-7 text-blue-600" /> Relatórios e Indicadores
        </h1>
        <div className="flex items-center gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="pl-3 pr-10 py-2 text-base border-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-xl"
          >
            <option value="month">Este Mês</option>
            <option value="last-month">Mês Passado</option>
            <option value="all">Todo Período</option>
          </select>
          <button className="bg-white border border-gray-200 p-2 rounded-xl hover:bg-gray-50 transition-colors text-gray-500" title="Exportar PDF">
            <Download className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-50 p-2 rounded-xl">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm font-bold text-gray-500">Receita Total</span>
          </div>
          <h3 className="text-2xl font-black text-gray-900">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRevenue)}
          </h3>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-green-50 p-2 rounded-xl">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-sm font-bold text-gray-500">Total de Pedidos</span>
          </div>
          <h3 className="text-2xl font-black text-gray-900">{filteredOrders.length}</h3>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-purple-50 p-2 rounded-xl">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-sm font-bold text-gray-500">Ticket Médio</span>
          </div>
          <h3 className="text-2xl font-black text-gray-900">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(filteredOrders.length > 0 ? totalRevenue / filteredOrders.length : 0)}
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Products Table */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-50">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" /> Produtos Mais Vendidos
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  <th className="px-6 py-3">Produto</th>
                  <th className="px-6 py-3 text-center">Qtd</th>
                  <th className="px-6 py-3 text-right">Receita</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {topProducts.map((p, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">{p.name}</td>
                    <td className="px-6 py-4 text-sm text-center text-gray-500">{p.qty}</td>
                    <td className="px-6 py-4 text-sm font-black text-right text-blue-600">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Clients Table */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-50">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" /> Clientes Fiéis
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  <th className="px-6 py-3">Cliente</th>
                  <th className="px-6 py-3 text-center">Pedidos</th>
                  <th className="px-6 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {topClients.map((c, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">{c.name}</td>
                    <td className="px-6 py-4 text-sm text-center text-gray-500">{c.orders}</td>
                    <td className="px-6 py-4 text-sm font-black text-right text-purple-600">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
