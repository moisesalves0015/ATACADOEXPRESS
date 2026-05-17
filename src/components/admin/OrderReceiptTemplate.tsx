import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Order } from '../../types';
import { statusConfig, fmt } from '../../lib/order-utils';
import { ShoppingBag, Timer, ShieldCheck, MapPin, Globe } from 'lucide-react';

interface OrderReceiptTemplateProps {
  order: Order;
  brandName?: string;
}

const getImageUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('data:') || url.includes('images.weserv.nl')) return url;
  return `https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=200&h=200&fit=cover&output=jpg`;
};

const OrderReceiptTemplate: React.FC<OrderReceiptTemplateProps> = ({ 
  order, 
  brandName = "Saldo da Kricia" 
}) => {
  const totalItems = order.items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div 
      id="receipt-capture-area"
      className="w-[450px] bg-white flex flex-col font-mono text-gray-800 p-6 shadow-sm"
      style={{ minHeight: '600px', backgroundColor: '#fffdf9' }} // Subtle paper yellow/white
    >
      {/* Header - Brand Info */}
      <div className="flex flex-col items-center text-center space-y-2 mb-4">
        <div className="w-12 h-12 bg-[#F72585] rounded-full flex items-center justify-center text-white mb-1 shadow-lg shadow-pink-100">
          <ShoppingBag className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-black uppercase tracking-tighter text-gray-900 leading-none">{brandName}</h1>
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
          <div className="text-[11px] font-bold text-gray-400 flex items-center gap-1">
             <MapPin size={10} /> SP · Boutique Online
          </div>
          <div className="text-[11px] font-bold text-gray-400 flex items-center gap-1">
             <Globe size={10} /> saldodakricia.com.br
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t-2 border-dashed border-gray-200 my-3 w-full" />

      {/* Order Info */}
      <div className="space-y-1 text-base mb-4">
        <div className="flex justify-between">
          <span className="font-bold text-[13px]">CUPOM:</span>
          <span className="font-black text-gray-900">#{order.id.slice(-6).toUpperCase()}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-bold text-[13px]">DATA:</span>
          <span>{format(new Date(order.orderDate), "dd/MM/yyyy HH:mm")}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-bold text-[13px]">CLIENTE:</span>
          <span className="truncate max-w-[240px]">{order.clientName.toUpperCase()}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-bold text-[13px]">VEND.:</span>
          <span>{(order.sellerName || 'ADMIN').toUpperCase()}</span>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t-2 border-dashed border-gray-200 my-3 w-full" />

      {/* Items Table - Classic Receipt Style */}
      <div className="space-y-3 mb-4">
        <div className="flex justify-between text-[11px] font-black text-gray-400 uppercase tracking-widest pb-1 border-b border-gray-100">
          <span>DESCRIÇÃO</span>
          <span>VALOR</span>
        </div>
        
        {order.items.map((item, idx) => {
          const itemStatus = item.status || 'aguardando_pagamento';
          const itemStatusConf = statusConfig[itemStatus] || statusConfig.aguardando_pagamento;
          const imageUrl = item.imageUrl || (item.imageUrls && item.imageUrls[0]);

          return (
            <div key={idx} className="flex gap-3 items-center py-2 border-b border-gray-100/50">
              {/* Product Image Thumbnail */}
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden border border-gray-200/50 flex items-center justify-center">
                {imageUrl ? (
                  <img 
                    src={getImageUrl(imageUrl)} 
                    alt="" 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="text-[9px] text-gray-400 font-bold uppercase tracking-widest text-center leading-none">FOTO</div>
                )}
              </div>
              
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex justify-between text-base font-bold text-gray-900 leading-none gap-2">
                  <span className="truncate">{item.productName.toUpperCase()}</span>
                  <span className="shrink-0 font-mono">{fmt(item.unitPrice * item.quantity)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-400 italic items-center gap-1">
                   <span className="shrink-0">{item.quantity} un x {fmt(item.unitPrice)}</span>
                   <div className="flex gap-1 items-center overflow-hidden">
                      <span className={`text-[8px] font-black uppercase px-1 py-0.5 rounded leading-none shrink-0 border ${
                        itemStatusConf.bg
                      } ${itemStatusConf.color} ${itemStatusConf.border}`}>
                        {itemStatusConf.label}
                      </span>
                      <span className={`text-[8px] font-black uppercase px-1 py-0.5 rounded leading-none shrink-0 border ${
                        item.stockType === 'previsao_meta' 
                          ? 'bg-orange-50 text-orange-700 border-orange-100' 
                          : 'bg-blue-50 text-blue-700 border-blue-100'
                      }`}>
                        {item.stockType === 'previsao_meta' ? 'LISTA ABERTA' : 'PRONTA ENTREGA'}
                      </span>
                   </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Divider */}
      <div className="border-t-2 border-dashed border-gray-200 my-3 w-full" />

      {/* Totals Section */}
      <div className="space-y-1.5">
        {typeof order.totalReady === 'number' && order.totalReady > 0 && (
          <div className="flex justify-between text-base font-bold text-blue-700">
            <span className="text-[13px]">SUBTOTAL PRONTA:</span>
            <span>{fmt(order.totalReady)}</span>
          </div>
        )}
        {typeof order.totalPending === 'number' && order.totalPending > 0 && (
          <div className="flex justify-between text-base font-bold text-orange-700">
            <span className="text-[13px]">SUBTOTAL META:</span>
            <span>{fmt(order.totalPending)}</span>
          </div>
        )}
        
        <div className="pt-2 flex justify-between items-center">
          <span className="text-base font-black uppercase tracking-tighter">TOTAL:</span>
          <span className="text-4xl font-black text-gray-900 tracking-tighter leading-none">{fmt(order.totalValue)}</span>
        </div>
      </div>

      {/* Final Note / Terms */}
      <div className="mt-6 pt-4 border-t border-gray-100 text-center space-y-3">
        <div className="inline-block px-4 py-1.5 border-2 border-gray-900 rounded-xl">
          <p className="text-[11px] font-black uppercase tracking-[0.2em]">CUPOM NÃO FISCAL</p>
        </div>
        
        <div className="space-y-1 px-1">
          <p className="text-[11px] font-bold text-gray-900 uppercase">
            Obrigado pela preferência!
          </p>
          <p className="text-[10px] font-bold text-gray-500 uppercase leading-tight">
            Qualquer dúvida, entre em contato conosco.
          </p>
          <p className="text-[9px] font-bold text-gray-400 uppercase leading-tight italic">
            Cores e tamanhos variam conforme disponibilidade.
          </p>
        </div>

        <div className="flex flex-col items-center gap-2 pt-2 opacity-20 scale-y-75">
          <div className="w-full flex gap-1.5 justify-center">
            {Array.from({ length: 22 }).map((_, i) => (
              <div key={i} className="w-2 h-8 bg-gray-900 rounded-sm" />
            ))}
          </div>
          <p className="text-[10px] font-black tracking-[0.6em]">SALDODAKRICIA</p>
        </div>
      </div>
    </div>
  );
};

export default OrderReceiptTemplate;
