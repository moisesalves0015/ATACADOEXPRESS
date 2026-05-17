import { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { QrCode, Copy, CheckCircle2, Upload, AlertCircle, ArrowLeft, Package, Info, Search, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Checkout() {
  const { items, totalValue, totalReadyValue, totalPendingValue, clearCart } = useCart();
  
  const readyItemsCount = items.filter(i => !i.stockType || i.stockType === 'pronta_entrega').length;
  const deliveryFee = readyItemsCount > 0 ? 15 : 0;
  const initialPaymentTotal = totalReadyValue + deliveryFee;
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [confirmedTotal, setConfirmedTotal] = useState<number>(0);
  const navigate = useNavigate();

  const handleFinalizeOrder = async () => {
    if (!auth.currentUser || loading) return;
    setLoading(true);
    try {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      const userData = userDoc.data();

      const itemsWithStatus = items.map(item => ({
        ...item,
        status: 'aguardando_aprovacao' as const,
        discount: 0,
        amountPaid: 0,
        paymentDate: '',
        paymentMethod: '',
        history: [{
          timestamp: new Date().toISOString(),
          actionType: 'CREATE',
          description: 'Item adicionado ao pedido.',
          userEmail: userData?.email || auth.currentUser.email || 'Cliente',
        }]
      }));

      const orderData = {
        clientId: auth.currentUser.uid,
        clientName: userData?.name || 'Cliente',
        clientEmail: userData?.email || auth.currentUser.email || '',
        clientPhone: userData?.phone || '',
        orderDate: new Date().toISOString(),
        totalValue: totalValue + deliveryFee,
        totalReady: initialPaymentTotal,
        totalPending: totalPendingValue,
        status: 'aguardando_aprovacao',
        items: itemsWithStatus,
        observations: '',
        orderOrigin: 'cliente' as const,
      };

      const docRef = await addDoc(collection(db, 'orders'), orderData);

      // Update product stock/goal progress
      for (const item of items) {
        const productRef = doc(db, 'products', item.productId);
        const productSnap = await getDoc(productRef);
        if (productSnap.exists()) {
          const pData = productSnap.data();
          if (pData.stockType === 'previsao_meta') {
            const newProgress = (pData.currentGoalProgress || 0) + item.quantity;
            await updateDoc(productRef, {
              currentGoalProgress: increment(item.quantity),
              goalReached: newProgress >= (pData.requiredGoal || 0),
            });
          } else if (pData.stockType === 'pronta_entrega') {
            await updateDoc(productRef, {
              availableQuantity: increment(-item.quantity),
            });
          }
        }
      }

      setConfirmedTotal(initialPaymentTotal);
      setOrderId(docRef.id);
      clearCart();
    } catch (err) {
      console.error(err);
      alert('Erro ao processar pedido. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0 && !orderId) {
    navigate('/cart');
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto">
      {!orderId ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-xl overflow-hidden">
          <div className="p-8 border-b border-gray-50 bg-gray-50/50">
            <h1 className="text-2xl font-bold text-gray-900">Finalizar Pedido</h1>
            <p className="text-gray-500 mt-1">Confira os itens e confirme sua compra.</p>
          </div>

          <div className="p-8 space-y-6">
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.productId} className="flex justify-between items-center py-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{item.productName}</p>
                      <p className="text-xs text-gray-500">{item.quantity}x {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.unitPrice)}</p>
                    </div>
                  </div>
                  <span className="font-bold text-gray-900">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.unitPrice * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-100 pt-6 space-y-4">
              {totalPendingValue > 0 && (
                <div className="flex justify-between items-center bg-orange-50 p-4 rounded-xl border border-orange-100">
                  <div className="flex items-center gap-3">
                    <Package className="w-5 h-5 text-orange-600" />
                    <div>
                      <p className="text-xs font-black text-orange-800 uppercase tracking-widest">Valor sob Encomenda</p>
                      <p className="text-[10px] text-orange-600 leading-tight">Será cobrado apenas quando a meta for atingida.</p>
                    </div>
                  </div>
                  <span className="font-bold text-orange-900">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPendingValue)}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-end px-2">
                <div>
                  <span className="text-gray-500 font-medium block">Total a pagar AGORA</span>
                  <p className="text-[10px] text-gray-400">Itens em estoque + Taxa de separação</p>
                </div>
                <span className="text-3xl font-bold text-blue-600">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(initialPaymentTotal)}
                </span>
              </div>
            </div>

            <button
              onClick={handleFinalizeOrder}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50 active:scale-95"
            >
              {loading ? 'Processando...' : 'Confirmar e Gerar PIX'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-8 text-center shadow-lg">
            <div className="bg-blue-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-100">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-black text-blue-900 tracking-tight">Pedido Enviado para Análise!</h2>
            <p className="text-blue-700 text-sm mt-2 font-medium">Seu pedido #{orderId.slice(-6).toUpperCase()} foi recebido com sucesso pela nossa equipe.</p>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-8 text-center space-y-6">
            <div className="max-w-md mx-auto">
              <h3 className="text-lg font-black text-gray-900 mb-2">Aguardando Aprovação</h3>
              <p className="text-gray-500 text-sm leading-relaxed font-medium">
                Para garantir a disponibilidade das peças e validar a grade com os fornecedores do Brás, um vendedor irá assumir e aprovar o seu pedido em instantes.
              </p>
            </div>

            <div className="bg-blue-50/50 p-5 rounded-2xl flex items-start gap-3 max-w-md mx-auto text-left border border-blue-100/50">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-blue-800 leading-relaxed font-bold">
                  Você receberá uma notificação em tempo real assim que o seu pedido for aprovado, liberando o PIX para pagamento e reserva imediata do lote.
                </p>
              </div>
            </div>

            <div className="pt-6 flex justify-center">
              <button
                onClick={() => navigate('/my-orders')}
                className="w-full max-w-sm px-6 py-4 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95"
              >
                Acompanhar Meus Pedidos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
