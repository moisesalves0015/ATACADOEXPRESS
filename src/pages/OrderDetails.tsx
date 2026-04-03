import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Order } from '../types';
import { ArrowLeft, Clock, CheckCircle2, Truck, Package, XCircle, FileText, ExternalLink, MapPin, User } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusConfig = {
  aguardando_pagamento: { label: 'Aguardando Pagamento', icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
  pagamento_confirmado: { label: 'Pagamento Confirmado', icon: CheckCircle2, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
  separacao: { label: 'Em Separação', icon: Package, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
  enviado: { label: 'Enviado', icon: Truck, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
  entregue: { label: 'Entregue', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
  cancelado: { label: 'Cancelado', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
};

export default function OrderDetails() {
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

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

  const config = statusConfig[order.status];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <Link to="/my-orders" className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors font-medium">
          <ArrowLeft className="w-5 h-5" /> Voltar
        </Link>
        <div className="text-right">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pedido #{order.id.slice(-6).toUpperCase()}</span>
          <p className="text-sm text-gray-500">{format(new Date(order.orderDate), "dd 'de' MMMM, yyyy", { locale: ptBR })}</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
        {/* Status Banner */}
        <div className={cn("p-6 flex items-center justify-between border-b", config.bg, config.border)}>
          <div className="flex items-center gap-4">
            <div className={cn("p-3 rounded-2xl bg-white shadow-sm", config.color)}>
              <config.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest opacity-60">Status Atual</p>
              <h2 className={cn("text-xl font-black", config.color)}>{config.label}</h2>
            </div>
          </div>
          {order.paymentProofUrl && (
            <a 
              href={order.paymentProofUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
            >
              <FileText className="w-4 h-4 text-blue-600" /> Ver Comprovante
            </a>
          )}
        </div>

        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Items List */}
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-gray-900 border-b border-gray-50 pb-4">Itens do Pedido</h3>
            <div className="space-y-4">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400">
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{item.productName}</p>
                      <p className="text-xs text-gray-500">{item.quantity}x {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.unitPrice)}</p>
                    </div>
                  </div>
                  <span className="font-bold text-gray-900">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.unitPrice * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
            <div className="pt-6 border-t border-gray-50 flex justify-between items-end">
              <span className="text-gray-500 font-medium">Valor Total</span>
              <span className="text-2xl font-black text-blue-600">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.totalValue)}
              </span>
            </div>
          </div>

          {/* Order Info */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" /> Dados do Cliente
              </h3>
              <div className="bg-gray-50 p-4 rounded-2xl space-y-2">
                <p className="text-sm font-bold text-gray-900">{order.clientName}</p>
                <p className="text-xs text-gray-500 flex items-center gap-2">
                  <MapPin className="w-3 h-3" /> Endereço de entrega cadastrado no perfil
                </p>
              </div>
            </div>

            {order.observations && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-900">Observações</h3>
                <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                  <p className="text-sm text-orange-800">{order.observations}</p>
                </div>
              </div>
            )}

            <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-100">
              <h4 className="font-bold mb-2">Precisa de ajuda?</h4>
              <p className="text-xs text-blue-100 mb-4">Entre em contato conosco via WhatsApp para suporte rápido sobre seu pedido.</p>
              <button className="w-full bg-white text-blue-600 py-2 rounded-xl text-sm font-bold hover:bg-blue-50 transition-colors flex items-center justify-center gap-2">
                Suporte WhatsApp <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
