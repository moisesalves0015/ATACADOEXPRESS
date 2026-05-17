import React from 'react';
import { X, Download, MessageCircle, ShieldCheck, Globe, History, Package, Image as ImageIcon, Share2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Order, OrderStatus } from '../../types';
import { cn } from '../../lib/utils';
import { statusConfig, fmt } from '../../lib/order-utils';
import { generateOrderPDF } from '../../lib/pdf-utils';
import OrderReceiptTemplate from './OrderReceiptTemplate';
import { captureReceiptImage, shareReceiptImage } from '../../lib/receipt-image-utils';

interface OrderDetailsModalProps {
  order: Order;
  onClose: () => void;
  onUpdateItemStatus: (orderId: string, itemIdx: number, newStatus: OrderStatus, currentStatus: OrderStatus) => void;
  onAssumeAndApprove?: (order: Order) => void;
}

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({ order, onClose, onUpdateItemStatus, onAssumeAndApprove }) => {
  const [isGeneratingImage, setIsGeneratingImage] = React.useState(false);

  const handleGenerateImage = async () => {
    setIsGeneratingImage(true);
    try {
      await captureReceiptImage('receipt-capture-area', `recibo_pedido_${order.id.slice(-6)}`);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleShareWhatsApp = async () => {
    setIsGeneratingImage(true);
    try {
      const dataUrl = await captureReceiptImage('receipt-capture-area');
      if (dataUrl) {
        await shareReceiptImage(dataUrl, order.id);
      }
    } finally {
      setIsGeneratingImage(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[95vh] animate-in slide-in-from-bottom duration-300 overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-white z-10 shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-black text-gray-900 tracking-tight">Pedido #{order.id.slice(-6).toUpperCase()}</h2>
            <div className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border bg-gray-50 border-gray-100 text-gray-400">
              {order.items.length} itens
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleGenerateImage}
              disabled={isGeneratingImage}
              className="hidden sm:flex items-center justify-center p-2.5 bg-white text-gray-900 rounded-xl hover:bg-gray-50 transition-all border border-gray-200 shadow-sm disabled:opacity-50"
              title="Baixar Imagem"
            >
              {isGeneratingImage ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
            </button>
            <button 
              onClick={handleShareWhatsApp}
              disabled={isGeneratingImage}
              className="flex items-center justify-center p-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
              title="Compartilhar WhatsApp"
            >
              {isGeneratingImage ? <Loader2 className="w-5 h-5 animate-spin" /> : <Share2 className="w-5 h-5" />}
            </button>
            <button 
              onClick={() => generateOrderPDF(order)}
              className="hidden sm:flex items-center justify-center p-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-all shadow-lg shadow-gray-200"
              title="Gerar PDF"
            >
              <Download className="w-5 h-5" />
            </button>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-all">
              <X className="w-7 h-7" />
            </button>
          </div>

          {/* Hidden area for receipt capture */}
          <div className="fixed -left-[2000px] top-0 pointer-events-none opacity-0 overflow-hidden">
             <OrderReceiptTemplate order={order} />
          </div>
        </div>

        <div className="flex-grow overflow-y-auto p-5 sm:p-8 space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Information Column */}
            <div className="lg:col-span-2 space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Dados do Cliente</h3>
                  <div className="space-y-1">
                    <p className="font-black text-gray-900 text-xl leading-tight">{order.clientName}</p>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{order.clientEmail || 'Sem email'}</p>
                    {order.clientPhone && (
                      <div className="mt-3">
                         <a 
                           href={`https://wa.me/55${order.clientPhone.replace(/\D/g, '')}`} 
                           target="_blank" 
                           rel="noopener noreferrer"
                           className="inline-flex items-center gap-2 text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 uppercase tracking-widest"
                         >
                           <MessageCircle className="w-4 h-4" /> WhatsApp
                         </a>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Informações da Venda</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-black text-gray-900 uppercase tracking-widest">{format(new Date(order.orderDate), "dd 'de' MMMM", { locale: ptBR })}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{format(new Date(order.orderDate), "HH:mm")}</p>
                    </div>
                    {order.sellerId && (
                      <div className="pt-3 border-t border-gray-50">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Vendedor Responsável</p>
                        <p className="text-sm font-black text-emerald-600">{order.sellerName}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className={cn(
                'rounded-2xl px-6 py-5 flex items-start gap-4 border shadow-sm',
                order.orderOrigin === 'admin' ? 'bg-purple-50/50 border-purple-100' : 'bg-blue-50/50 border-blue-100'
              )}>
                <div className={cn("p-2.5 rounded-xl shadow-lg", order.orderOrigin === 'admin' ? "bg-purple-600 shadow-purple-100" : "bg-blue-600 shadow-blue-100")}>
                  {order.orderOrigin === 'admin' ? <ShieldCheck className="w-5 h-5 text-white" /> : <Globe className="w-5 h-5 text-white" />}
                </div>
                <div>
                  <p className={cn('text-[10px] font-black uppercase tracking-widest', order.orderOrigin === 'admin' ? 'text-purple-700' : 'text-blue-700')}>
                    Origem: {order.orderOrigin === 'admin' ? 'Registro Administrativo' : 'E-commerce (Cliente)'}
                  </p>
                  {order.orderOrigin === 'admin' && order.registeredByAdminName && (
                    <p className="text-xs text-purple-600 mt-1">Registrado por <strong>{order.registeredByAdminName}</strong></p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center justify-between">
                   Itens do Pedido
                   <span className="text-gray-300">Resumo Detalhado</span>
                </h3>
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50/50 text-gray-400 text-[9px] font-black uppercase tracking-widest border-b border-gray-100">
                          <tr>
                            <th className="px-5 py-4">Produto</th>
                            <th className="px-5 py-4 text-center">Qtd</th>
                            <th className="px-5 py-4 text-right">Subtotal</th>
                            <th className="px-5 py-4 text-center">Status / Ação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {order.items.map((item, idx) => {
                            const sConf = statusConfig[item.status || order.status || 'aguardando_pagamento'];
                            
                            return (
                              <tr key={idx} className="hover:bg-gray-50/30 transition-all">
                                <td className="px-5 py-4">
                                  <div className="flex flex-col gap-1.5">
                                    <span className="font-black text-gray-900 leading-tight">{item.productName}</span>
                                    {item.stockType === 'previsao_meta' && (
                                      <span className="text-[8px] bg-orange-50 text-orange-600 border border-orange-100 px-2 py-0.5 rounded-md font-black uppercase tracking-widest w-fit">
                                        Previsão Meta
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-5 py-4 text-center">
                                   <span className="text-xs font-black text-gray-400">x{item.quantity}</span>
                                </td>
                                <td className="px-5 py-4 text-right font-black text-gray-900">
                                  {fmt(item.unitPrice * item.quantity)}
                                </td>
                                <td className="px-5 py-4">
                                  <div className="flex justify-center">
                                    <select
                                      value={item.status || order.status || 'aguardando_pagamento'}
                                      onChange={(e) => onUpdateItemStatus(order.id, idx, e.target.value as OrderStatus, (item.status || order.status || 'aguardando_pagamento') as OrderStatus)}
                                      className={cn(
                                        "w-36 text-[9px] font-black uppercase tracking-widest border rounded-xl px-3 py-2.5 outline-none transition-all shadow-sm",
                                        sConf?.color, sConf?.bg, sConf?.border
                                      )}
                                    >
                                      {Object.entries(statusConfig).map(([key, val]) => (
                                        <option key={key} value={key} className="bg-white text-gray-900 uppercase font-black">{val.label}</option>
                                      ))}
                                    </select>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="p-6 bg-gray-50 flex flex-col items-end gap-3 border-t border-gray-100">
                       <div className="w-full max-w-[320px] space-y-2">
                         <div className="flex justify-between items-center text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-100/50 px-3 py-2 rounded-xl border border-blue-100/50">
                           <span>Já Cobrado (Pronta):</span>
                           <span className="text-sm">{fmt(order.totalReady || 0)}</span>
                         </div>

                         {(order.totalPending || 0) > 0 && (
                           <div className="flex justify-between items-center text-[10px] font-black text-orange-600 uppercase tracking-widest bg-orange-100/50 px-3 py-2 rounded-xl border border-orange-100/50">
                             <span>Pendente (Meta):</span>
                             <span className="text-sm">{fmt(order.totalPending || 0)}</span>
                           </div>
                         )}

                         <div className="flex justify-between items-center w-full pt-4 border-t border-gray-200">
                           <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Valor Total</span>
                           <span className="text-2xl font-black text-brand-pink">{fmt(order.totalValue)}</span>
                         </div>

                         {order.status === 'aguardando_aprovacao' && onAssumeAndApprove && (
                           <button
                             onClick={() => onAssumeAndApprove(order)}
                             className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-xs tracking-widest rounded-xl transition-all shadow-lg shadow-blue-100 active:scale-95 cursor-pointer"
                           >
                             <ShieldCheck className="w-4 h-4" /> Assumir &amp; Aprovar Pedido
                           </button>
                         )}
                       </div>
                    </div>
                </div>
              </div>

              {order.observations && (
                <div className="space-y-3">
                   <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Observações Internas</h3>
                   <div className="p-5 bg-gray-50 rounded-2xl text-sm font-medium text-gray-600 italic border border-gray-100 shadow-inner">
                     "{order.observations}"
                   </div>
                </div>
              )}
            </div>

            {/* History Column */}
            <div className="space-y-6">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <History className="w-4 h-4 text-gray-300" strokeWidth={3} /> Histórico do Pedido
              </h3>
              
              <div className="relative pl-6 space-y-8 before:absolute before:left-[27px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
                {/* Creation entry */}
                <div className="relative">
                  <div className="absolute -left-[32px] top-1 w-8 h-8 rounded-xl bg-white border border-gray-100 z-10 flex items-center justify-center shadow-sm">
                    <History className="w-4 h-4 text-gray-300" strokeWidth={3} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-black text-gray-900 uppercase tracking-tight">Pedido Criado</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">{format(new Date(order.orderDate), "dd MMM · HH:mm", { locale: ptBR })}</p>
                  </div>
                </div>

                {/* Dynamic history entries */}
                {(order.statusHistory || []).map((h, i) => (
                  <div key={i} className="relative">
                    <div className={cn(
                      "absolute -left-[32px] top-1 w-8 h-8 rounded-xl bg-white border z-10 flex items-center justify-center shadow-md",
                      statusConfig[h.status]?.border || "border-gray-100"
                    )}>
                      {(() => {
                        const Icon = statusConfig[h.status]?.icon || Package;
                        return <Icon className={cn("w-4 h-4", statusConfig[h.status]?.color || "text-gray-400")} strokeWidth={3} />;
                      })()}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className={cn("text-[11px] font-black uppercase tracking-tight", statusConfig[h.status]?.color || "text-gray-900")}>
                          {statusConfig[h.status]?.label || h.status}
                        </p>
                        {h.isInternal && (
                          <Lock className="w-2.5 h-2.5 text-amber-500" />
                        )}
                      </div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase">
                        {format(new Date(h.updatedAt), "dd MMM · HH:mm", { locale: ptBR })} · {h.updatedBy}
                      </p>
                      {h.comment && (
                        <p className="text-[11px] text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100 mt-1 italic">
                          "{h.comment}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Sticky Actions */}
        <div className="sm:hidden p-4 bg-white border-t border-gray-100 flex gap-4 shrink-0 justify-center">
          <button 
            onClick={handleGenerateImage}
            disabled={isGeneratingImage}
            className="w-14 h-14 flex items-center justify-center bg-gray-50 text-gray-900 rounded-2xl border border-gray-200 disabled:opacity-50 shadow-sm"
            title="Recibo Imagem"
          >
            {isGeneratingImage ? <Loader2 className="w-6 h-6 animate-spin" /> : <ImageIcon className="w-6 h-6" />}
          </button>
          <button 
            onClick={handleShareWhatsApp}
            disabled={isGeneratingImage}
            className="w-14 h-14 flex items-center justify-center bg-emerald-600 text-white rounded-2xl shadow-xl shadow-emerald-100 disabled:opacity-50"
            title="Compartilhar WhatsApp"
          >
            {isGeneratingImage ? <Loader2 className="w-6 h-6 animate-spin" /> : <Share2 className="w-6 h-6" />}
          </button>
          <button 
            onClick={() => generateOrderPDF(order)}
            className="w-14 h-14 flex items-center justify-center bg-gray-900 text-white rounded-2xl shadow-xl shadow-gray-200"
            title="Recibo PDF"
          >
            <Download className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Simple Lock icon since it's not imported from lucide-react in this block
const Lock = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
);

export default OrderDetailsModal;
