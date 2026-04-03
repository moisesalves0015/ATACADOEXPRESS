import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, updateDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Order, OrderStatus } from '../../types';
import { ClipboardList, Search, Filter, Eye, CheckCircle2, Truck, Package, XCircle, Clock, FileText, ExternalLink, Plus, User, ShieldCheck } from 'lucide-react';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

const statusConfig = {
  aguardando_pagamento: { label: 'Aguardando Pagamento', icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
  pagamento_confirmado: { label: 'Pagamento Confirmado', icon: CheckCircle2, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
  separacao: { label: 'Em Separação', icon: Package, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
  enviado: { label: 'Enviado', icon: Truck, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
  entregue: { label: 'Entregue', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
  cancelado: { label: 'Cancelado', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
};

export default function AdminOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('orderDate', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });
    return () => unsubscribe();
  }, []);

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: newStatus });
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar status.');
    }
  };

  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         o.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
          <ClipboardList className="w-7 h-7 text-blue-600" /> Gestão de Pedidos
        </h1>
        <button
          onClick={() => navigate('/admin/new-order')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white text-sm transition-all shadow-md"
          style={{ background: 'linear-gradient(135deg, #F72585 0%, #b5179e 100%)' }}
        >
          <Plus className="w-4 h-4" /> Novo Pedido
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por cliente ou ID do pedido..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-3 pr-10 py-2 text-base border-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-xl"
          >
            <option value="all">Todos Status</option>
            {Object.entries(statusConfig).map(([key, value]) => (
              <option key={key} value={key}>{value.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">ID / Data</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Total</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Origem</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Comprovante</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredOrders.map((order) => {
                const config = statusConfig[order.status];
                return (
                  <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-gray-900">#{order.id.slice(-6).toUpperCase()}</p>
                      <p className="text-[10px] text-gray-400">{format(new Date(order.orderDate), 'dd/MM/yyyy HH:mm')}</p>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-700">{order.clientName}</td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.totalValue)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border",
                        config.color, config.bg, config.border
                      )}>
                        {config.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {order.orderOrigin === 'admin' ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-purple-600 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-full w-fit">
                          <ShieldCheck className="w-3 h-3" /> Admin
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full w-fit">
                          <User className="w-3 h-3" /> Cliente
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {order.paymentProofUrl ? (
                        <a 
                          href={order.paymentProofUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-xs font-bold"
                        >
                          <FileText className="w-3 h-3" /> Ver <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-xs text-gray-300 italic">Pendente</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-xl">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-gray-900">Detalhes do Pedido #{selectedOrder.id.slice(-6).toUpperCase()}</h2>
              <button onClick={() => setSelectedOrder(null)} className="p-2 text-gray-400 hover:text-gray-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 space-y-8">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Cliente</h3>
                  <p className="font-bold text-gray-900">{selectedOrder.clientName}</p>
                  {selectedOrder.clientEmail && <p className="text-sm text-gray-500">{selectedOrder.clientEmail}</p>}
                  {selectedOrder.clientPhone && <p className="text-sm text-gray-500">{selectedOrder.clientPhone}</p>}
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Data do Pedido</h3>
                  <p className="font-bold text-gray-900">{format(new Date(selectedOrder.orderDate), "dd 'de' MMMM, yyyy", { locale: ptBR })}</p>
                  <p className="text-sm text-gray-500">{format(new Date(selectedOrder.orderDate), "HH:mm")}</p>
                </div>
              </div>

              {/* Origin info */}
              <div className={cn(
                'rounded-2xl px-5 py-4 flex items-start gap-3 border',
                selectedOrder.orderOrigin === 'admin'
                  ? 'bg-purple-50 border-purple-100'
                  : 'bg-blue-50 border-blue-100'
              )}>
                {selectedOrder.orderOrigin === 'admin' ? (
                  <ShieldCheck className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <User className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <p className={cn('text-xs font-bold uppercase tracking-widest', selectedOrder.orderOrigin === 'admin' ? 'text-purple-700' : 'text-blue-700')}>
                    {selectedOrder.orderOrigin === 'admin' ? 'Pedido registrado pela vendedora' : 'Pedido feito pelo cliente'}
                  </p>
                  {selectedOrder.orderOrigin === 'admin' && selectedOrder.registeredByAdminName && (
                    <p className="text-sm text-purple-600 mt-0.5">Responsável: <strong>{selectedOrder.registeredByAdminName}</strong></p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Itens</h3>
                <div className="space-y-3">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-gray-700 font-medium">{item.quantity}x {item.productName}</span>
                      <span className="font-bold text-gray-900">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.unitPrice * item.quantity)}</span>
                    </div>
                  ))}
                  <div className="pt-3 border-t border-gray-50 flex justify-between items-end">
                    <span className="text-gray-500 font-bold">Total</span>
                    <span className="text-xl font-bold text-blue-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedOrder.totalValue)}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Atualizar Status</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <button
                      key={key}
                      onClick={() => handleUpdateStatus(selectedOrder.id, key as OrderStatus)}
                      className={cn(
                        "flex items-center gap-2 p-3 rounded-xl border text-[10px] font-bold uppercase transition-all",
                        selectedOrder.status === key 
                          ? cn(config.bg, config.color, config.border) 
                          : "bg-white text-gray-400 border-gray-100 hover:bg-gray-50"
                      )}
                    >
                      <config.icon className="w-4 h-4" />
                      {config.label}
                    </button>
                  ))}
                </div>
              </div>

              {selectedOrder.paymentProofUrl && (
                <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                  <h3 className="text-sm font-bold text-blue-900 mb-4 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Comprovante de Pagamento
                  </h3>
                  <a 
                    href={selectedOrder.paymentProofUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block aspect-video bg-white rounded-xl border border-blue-200 overflow-hidden relative group"
                  >
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-all">
                      <ExternalLink className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-all" />
                    </div>
                    <img src={selectedOrder.paymentProofUrl} alt="Comprovante" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
