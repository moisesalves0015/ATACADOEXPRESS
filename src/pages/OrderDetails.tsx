import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, onSnapshot, updateDoc, arrayUnion } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Order, OrderStatus, StatusUpdate } from '../types';
import { ArrowLeft, Clock, CheckCircle2, Truck, Package, XCircle, FileText, ExternalLink, MapPin, User, Upload, Search, History, MessageSquare, Loader2, Plus } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusConfig = {
  aguardando_aprovacao: { label: 'Aguardando Aprovação', icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
  aguardando_pagamento: { label: 'Aguardando Pagamento', icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
  aguardando_comprovante: { label: 'Aguardando Comprovante', icon: Clock, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
  confirmando_pagamento: { label: 'Confirmando Pagamento', icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-100' },
  pagamento_confirmado: { label: 'Pagamento Confirmado', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  separacao: { label: 'Em Separação', icon: Package, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
  entregue: { label: 'Entregue', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
  cancelado: { label: 'Cancelado', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
};

export default function OrderDetails() {
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    
    const unsub = onSnapshot(doc(db, 'orders', id), (snapshot) => {
      if (snapshot.exists()) {
        setOrder({ id: snapshot.id, ...snapshot.data() } as Order);
      } else {
        setOrder(null);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'orders');
      setLoading(false);
    });
    
    return () => unsub();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-gray-900">Pedido não encontrado</h2>
        <Link to="/my-orders" className="text-blue-600 hover:underline mt-4 inline-block">Voltar para meus pedidos</Link>
      </div>
    );
  }

  const config = statusConfig[order.status] || statusConfig.aguardando_pagamento;
  const publicHistory = (order.statusHistory || []).filter(h => !h.isInternal);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <Link to="/my-orders" className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors font-medium">
          <ArrowLeft className="w-5 h-5" /> Voltar
        </Link>
        <div className="text-right">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pedido #{order.id.slice(-6).toUpperCase()}</span>
          <p className="text-sm text-gray-500 font-medium">{format(new Date(order.orderDate), "dd 'de' MMMM, yyyy", { locale: ptBR })}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-xl overflow-hidden">
        {/* Status Banner */}
        <div className="p-8 flex items-center justify-between border-b bg-gray-50 border-gray-100">
          <div className="flex items-center gap-6">
            <div className="p-4 rounded-xl bg-white shadow-lg text-blue-600 border border-gray-100">
              <Package className="w-8 h-8" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] opacity-50 mb-1">Acompanhamento dos itens</p>
              <h2 className="text-2xl font-black text-gray-900">Itens Monitorados Individualmente</h2>
            </div>
          </div>
        </div>

        <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-12">
          
          {/* Main Info Columns */}
          <div className="lg:col-span-2 space-y-10">
            {/* Items List */}
            <div className="space-y-6">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-500" /> Itens Adquiridos
              </h3>
              <div className="bg-gray-50/50 rounded-xl p-6 border border-gray-100 space-y-4">
                {order.items.map((item, idx) => {
                  const itemStatus = item.status || 'aguardando_pagamento';
                  const itemConf = statusConfig[itemStatus as keyof typeof statusConfig] || statusConfig.aguardando_pagamento;
                  return (
                    <div key={idx} className="flex justify-between items-center group">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white border border-gray-100 rounded-xl flex items-center justify-center text-gray-400 group-hover:scale-105 transition-all relative shrink-0">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt="" className="w-full h-full object-cover rounded-xl" referrerPolicy="no-referrer" />
                          ) : (
                            <Package className="w-6 h-6 opacity-30" />
                          )}
                          {item.stockType === 'previsao_meta' && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center border-2 border-white" title="Sob Encomenda">
                              <Clock className="w-2 h-2 text-white" />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-bold text-gray-900 leading-tight">{item.productName}</p>
                            <span className={cn(
                              "text-[8px] border px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider leading-none shrink-0",
                              itemConf.color, itemConf.bg, itemConf.border
                            )}>
                              {itemConf.label}
                            </span>
                            {item.stockType === 'previsao_meta' && (
                              <span className="text-[8px] bg-orange-50 text-orange-600 border border-orange-100 px-1.5 py-0.5 rounded-full font-black uppercase shrink-0 leading-none">
                                Meta
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 font-medium mt-1">{item.quantity}x {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.unitPrice)}</p>
                        </div>
                      </div>
                      <span className="font-black text-gray-900 ml-4 shrink-0">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.unitPrice * item.quantity)}
                      </span>
                    </div>
                  );
                })}
                
                 <div className="pt-6 border-t border-gray-200 mt-4 space-y-4">
                    {/* Breakdown section */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-bold text-blue-600 uppercase tracking-widest">
                        <span>Pronta Entrega</span>
                        <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.totalReady ? order.totalReady - (order.totalReady > 0 ? 15 : 0) : 0)}</span>
                      </div>
                      <div className="flex justify-between text-xs font-bold text-blue-400 uppercase tracking-widest">
                        <span>Taxas e Separação</span>
                        <span>+ {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.totalReady && order.totalReady > 0 ? 15 : 0)}</span>
                      </div>
                      <div className="flex justify-between items-center bg-blue-50/50 p-3 rounded-xl border border-blue-100/30">
                        <span className="text-[10px] font-black text-blue-800 uppercase">Total já cobrado</span>
                        <span className="text-lg font-black text-blue-600">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.totalReady || 0)}
                        </span>
                      </div>
                    </div>

                    {(order.totalPending || 0) > 0 && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-bold text-orange-600 uppercase tracking-widest">
                          <span>Sob Encomenda (Meta)</span>
                          <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.totalPending || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center bg-orange-50/50 p-3 rounded-xl border border-orange-100/30">
                          <span className="text-[10px] font-black text-orange-800 uppercase">Pagar após atingir meta</span>
                          <span className="text-lg font-black text-orange-600">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.totalPending || 0)}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="pt-4 border-t-2 border-dashed border-gray-100 flex justify-between items-center">
                      <span className="text-sm font-black text-gray-400 uppercase">Total Geral</span>
                      <span className="text-xl font-black text-gray-900">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.totalValue)}
                      </span>
                    </div>
                 </div>
              </div>
            </div>

          </div>

          {/* Sidebar Info & History */}
          <div className="space-y-8">
            {/* History / Timeline */}
            <div className="space-y-6">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                <History className="w-4 h-4 text-blue-500" /> Linha do Tempo
              </h3>
              
              <div className="relative pl-4 space-y-8 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
                {/* Initial entry */}
                <div className="relative">
                  <div className="absolute -left-[30px] top-1 w-6 h-6 rounded-full bg-white border-2 border-gray-200 z-10 flex items-center justify-center">
                    <Plus className="w-3 h-3 text-gray-400" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-black text-gray-900 uppercase">Pedido Realizado</p>
                    <p className="text-[10px] text-gray-400 font-medium">{format(new Date(order.orderDate), "dd MMM, HH:mm", { locale: ptBR })}</p>
                  </div>
                </div>

                {/* Public History entries */}
                {publicHistory.map((h, i) => (
                  <div key={i} className="relative">
                    <div className={cn(
                      "absolute -left-[30px] top-1 w-6 h-6 rounded-full bg-white border-2 z-10 flex items-center justify-center",
                      statusConfig[h.status]?.border || "border-gray-200"
                    )}>
                      {(() => {
                        const Icon = statusConfig[h.status]?.icon || Package;
                        return <Icon className={cn("w-3 h-3", statusConfig[h.status]?.color || "text-gray-400")} />;
                      })()}
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                         <p className={cn("text-xs font-black uppercase tracking-tight", statusConfig[h.status]?.color)}>
                           {statusConfig[h.status]?.label}
                         </p>
                      </div>
                      <p className="text-[10px] text-gray-400 font-medium">
                         {format(new Date(h.updatedAt), "dd MMM - HH:mm", { locale: ptBR })}
                      </p>
                      {h.comment && (
                        <div className="flex items-start gap-2 text-[11px] text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100 italic">
                           <MessageSquare className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                           "{h.comment}"
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 space-y-4">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Entrega e Dados</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <User className="w-4 h-4 text-blue-500 mt-1" />
                  <div>
                    <p className="text-sm font-bold text-gray-900">{order.clientName}</p>
                    <p className="text-xs text-gray-500">{order.clientPhone || 'Sem telefone'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-blue-500 mt-1" />
                  <p className="text-xs text-gray-500 italic leading-relaxed">
                    Entrega vinculada ao endereço principal cadastrado em seu perfil.
                  </p>
                </div>
              </div>
            </div>

            {order.observations && (
              <div className="bg-amber-50/50 p-6 rounded-xl border border-amber-100/50">
                <h3 className="text-xs font-black text-amber-600 uppercase tracking-widest mb-3">Sua Observação</h3>
                <p className="text-xs text-amber-800 italic leading-relaxed">"{order.observations}"</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

