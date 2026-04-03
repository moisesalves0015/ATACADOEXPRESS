import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { Order } from '../types';
import { Link } from 'react-router-dom';
import { ClipboardList, Clock, CheckCircle2, Package, XCircle, ChevronRight, Upload, Search } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusConfig = {
  aguardando_pagamento: { label: 'Aguardando Pagamento', icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
  aguardando_comprovante: { label: 'Aguardando Comprovante', icon: Upload, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
  confirmando_pagamento: { label: 'Confirmando Pagamento', icon: Search, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
  pagamento_confirmado: { label: 'Pagamento Confirmado', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  separacao: { label: 'Em Separação', icon: Package, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
  entregue: { label: 'Entregue', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
  cancelado: { label: 'Cancelado', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
};

export default function MyOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'orders'),
      where('clientId', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      // Sort client-side to avoid missing index errors
      ordersData.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
      setOrders(ordersData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });

    return () => unsubscribe();
  }, []);

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
          <ClipboardList className="w-7 h-7 text-blue-600" /> Meus Pedidos
        </h1>
        <div className="text-sm text-gray-500">
          Total de {orders.length} pedidos realizados
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-200">
          <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <ClipboardList className="w-8 h-8 text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Você ainda não tem pedidos</h3>
          <p className="text-gray-500 mb-6">Comece a abastecer seu estoque hoje mesmo!</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-xl font-semibold hover:bg-blue-700 transition-all"
          >
            Ver Catálogo
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const config = statusConfig[order.status] || statusConfig.aguardando_pagamento;
            return (
              <Link
                key={order.id}
                to={`/orders/${order.id}`}
                className="block bg-white rounded-xl border border-gray-100 p-6 hover:shadow-lg transition-all group"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-start gap-4">
                    <div className={cn("p-3 rounded-xl", config.bg)}>
                      <config.icon className={cn("w-6 h-6", config.color)} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                          Pedido #{order.id.slice(-6).toUpperCase()}
                        </span>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border",
                          config.color, config.bg, config.border
                        )}>
                          {config.label}
                        </span>
                      </div>
                      <h3 className="font-bold text-gray-900">
                        {order.items.length} {order.items.length === 1 ? 'item' : 'itens'} • {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.totalValue)}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Realizado em {format(new Date(order.orderDate), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-4 md:pt-0">
                    <div className="flex -space-x-2">
                      {order.items.slice(0, 3).map((item, idx) => (
                        <div key={idx} className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-gray-500">
                          {item.productName.charAt(0)}
                        </div>
                      ))}
                      {order.items.length > 3 && (
                        <div className="w-8 h-8 rounded-full bg-gray-50 border-2 border-white flex items-center justify-center text-[10px] font-bold text-gray-400">
                          +{order.items.length - 3}
                        </div>
                      )}
                    </div>
                    <div className="bg-gray-50 p-2 rounded-full group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
