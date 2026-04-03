import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, onSnapshot, updateDoc, arrayUnion } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, handleFirestoreError, OperationType } from '../firebase';
import { Order, OrderStatus, StatusUpdate } from '../types';
import { ArrowLeft, Clock, CheckCircle2, Truck, Package, XCircle, FileText, ExternalLink, MapPin, User, Upload, Search, History, MessageSquare, Loader2 } from 'lucide-react';
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

export default function OrderDetails() {
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!id) return;
    const unsubscribe = onSnapshot(doc(db, 'orders', id), (doc) => {
      if (doc.exists()) {
        setOrder({ id: doc.id, ...doc.data() } as Order);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `orders/${id}`);
    });
    return () => unsubscribe();
  }, [id]);

  const handleFileUpload = async (file: File) => {
    if (!order) return;
    setUploading(true);
    try {
      const extension = file.name.split('.').pop();
      const storageRef = ref(storage, `payment_proofs/${order.id}_${Date.now()}.${extension}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      const updateEntry: StatusUpdate = {
        status: 'confirmando_pagamento',
        comment: 'Comprovante enviado pelo cliente.',
        isInternal: false,
        updatedAt: new Date().toISOString(),
        updatedBy: order.clientName,
      };

      await updateDoc(doc(db, 'orders', order.id), {
        paymentProofUrl: url,
        status: 'confirmando_pagamento',
        statusHistory: arrayUnion(updateEntry)
      });
      alert('Comprovante enviado com sucesso! Nosso time irá validar o pagamento.');
    } catch (err) {
      console.error(err);
      alert('Erro ao enviar comprovante.');
    } finally {
      setUploading(false);
    }
  };

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

      <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
        {/* Status Banner */}
        <div className={cn("p-8 flex items-center justify-between border-b", config.bg, config.border)}>
          <div className="flex items-center gap-6">
            <div className={cn("p-4 rounded-2xl bg-white shadow-lg", config.color)}>
              <config.icon className="w-8 h-8" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] opacity-50 mb-1">Status do seu pedido</p>
              <h2 className={cn("text-2xl font-black", config.color)}>{config.label}</h2>
            </div>
          </div>
          {order.paymentProofUrl && (
            <a 
              href={order.paymentProofUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-white px-5 py-3 rounded-2xl text-sm font-bold text-gray-700 shadow-md hover:shadow-lg transition-all active:scale-95"
            >
              <FileText className="w-4 h-4 text-blue-600" /> Ver Comprovante
            </a>
          )}
        </div>

        <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-12">
          
          {/* Main Info Columns */}
          <div className="lg:col-span-2 space-y-10">
            {/* Items List */}
            <div className="space-y-6">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-500" /> Itens Adquiridos
              </h3>
              <div className="bg-gray-50/50 rounded-2xl p-6 border border-gray-100 space-y-4">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white border border-gray-100 rounded-xl flex items-center justify-center text-gray-400 group-hover:scale-105 transition-all">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt="" className="w-full h-full object-cover rounded-xl" referrerPolicy="no-referrer" />
                        ) : (
                          <Package className="w-6 h-6 opacity-30" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{item.productName}</p>
                        <p className="text-xs text-gray-500 font-medium">{item.quantity}x {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.unitPrice)}</p>
                      </div>
                    </div>
                    <span className="font-black text-gray-900">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.unitPrice * item.quantity)}
                    </span>
                  </div>
                ))}
                
                <div className="pt-6 border-t border-gray-200 mt-4 space-y-3">
                   <div className="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-widest">
                     <span>Subtotal</span>
                     <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.totalValue - 15)}</span>
                   </div>
                   <div className="flex justify-between text-xs font-bold text-blue-500 uppercase tracking-widest">
                     <span>Taxas e Separação</span>
                     <span>+ R$ 15,00</span>
                   </div>
                   <div className="flex justify-between items-center pt-2">
                     <span className="text-sm font-black text-gray-600 uppercase">Total do Pedido</span>
                     <span className="text-3xl font-black text-blue-600">
                       {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.totalValue)}
                     </span>
                   </div>
                </div>
              </div>
            </div>

            {/* Proof Upload interface for Client (Only if pending) */}
            {(order.status === 'aguardando_comprovante' || order.status === 'aguardando_pagamento') && (
              <div className="bg-blue-600 p-8 rounded-3xl text-white shadow-xl shadow-blue-100 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                   <Upload className="w-32 h-32" />
                </div>
                <div className="relative z-10 space-y-6">
                  <div>
                    <h3 className="text-xl font-bold mb-2 flex items-center gap-3">
                      <Upload className="w-6 h-6" /> Enviar Comprovante
                    </h3>
                    <p className="text-blue-100 text-sm opacity-80">Nos envie o link do seu comprovante de pagamento para confirmarmos seu pedido.</p>
                  </div>
                  
                  <div className="space-y-4">
                    <label className={cn(
                      "w-full flex-col flex items-center justify-center min-h-[140px] px-6 py-4 bg-white/20 border-2 border-dashed border-white/60 rounded-2xl cursor-pointer hover:bg-white/30 transition-all font-medium",
                      uploading ? 'opacity-50 pointer-events-none' : ''
                    )}>
                      {uploading ? (
                        <>
                           <Loader2 className="w-8 h-8 text-white mb-2 animate-spin" />
                           <span className="text-white font-bold">Enviando...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-white mb-2" />
                          <span className="text-white text-sm font-bold">Clique para anexar arquivo da galeria</span>
                          <span className="text-blue-100 text-[10px] mt-1">Imagens ou Documentos</span>
                        </>
                      )}
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*,.pdf"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            handleFileUpload(e.target.files[0]);
                          }
                        }}
                        disabled={uploading}
                      />
                    </label>
                    <p className="text-[10px] text-white/60 text-center uppercase font-black tracking-[0.2em]">
                      Confirmação 100% segura e manual
                    </p>
                  </div>
                </div>
              </div>
            )}
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
                        <div className="flex items-start gap-2 text-[11px] text-gray-600 bg-gray-50 p-3 rounded-2xl border border-gray-100 italic">
                           <MessageSquare className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                           "{h.comment}"
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 space-y-4">
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
              <div className="bg-amber-50/50 p-6 rounded-3xl border border-amber-100/50">
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

// Dummy Plus icon since it was used but not imported
const Plus = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);
