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

const OrderReceiptTemplate: React.FC<OrderReceiptTemplateProps> = ({ 
  order, 
  brandName = "Saldo da Kricia" 
}) => {
  const status = statusConfig[order.status] || statusConfig.aguardando_pagamento;
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

      {/* Status & Deadline Header */}
      <div className="bg-gray-100/50 p-3 rounded-xl mb-4 text-center space-y-1">
        <p className={`text-sm font-black uppercase tracking-widest ${status.color}`}>
          {status.label}
        </p>
        {order.status === 'aguardando_pagamento' && (
           <div className="flex items-center justify-center gap-2 text-orange-600">
             <Timer size={14} className="animate-pulse" />
             <p className="text-[10px] font-black uppercase tracking-tight">
               PRAZO: 5 HORAS PARA PAGAMENTO
             </p>
           </div>
        )}
      </div>

      {/* Items Table - Classic Receipt Style */}
      <div className="space-y-3 mb-4">
        <div className="flex justify-between text-[11px] font-black text-gray-400 uppercase tracking-widest pb-1 border-b border-gray-100">
          <span>DESCRIÇÃO</span>
          <span>VALOR</span>
        </div>
        
        {order.items.map((item, idx) => (
          <div key={idx} className="space-y-0.5">
            <div className="flex justify-between text-base font-bold text-gray-900 leading-none">
              <span className="truncate pr-4">{item.productName.toUpperCase()}</span>
              <span>{fmt(item.unitPrice * item.quantity)}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-400 italic">
               <span>{item.quantity} un x {fmt(item.unitPrice)}</span>
               <span className="text-[9px] font-black uppercase bg-gray-50 px-1.5 py-0.5 rounded">
                 {item.stockType === 'previsao_meta' ? 'VARIADO' : 'PRONTA'}
               </span>
            </div>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="border-t-2 border-dashed border-gray-200 my-3 w-full" />

      {/* Totals Section */}
      <div className="space-y-1.5">
        {order.totalReady && order.totalReady > 0 && (
          <div className="flex justify-between text-base font-bold text-blue-700">
            <span className="text-[13px]">SUBTOTAL PRONTA:</span>
            <span>{fmt(order.totalReady)}</span>
          </div>
        )}
        {order.totalPending && order.totalPending > 0 && (
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
