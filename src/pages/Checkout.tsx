import { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { QrCode, Copy, CheckCircle2, Upload, AlertCircle, ArrowLeft, Package, Info, Search } from 'lucide-react';

export default function Checkout() {
  const { items, totalValue, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paymentProofUrl, setPaymentProofUrl] = useState('');
  const navigate = useNavigate();

  const handleFinalizeOrder = async () => {
    if (!auth.currentUser || loading) return;
    setLoading(true);
    try {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      const userData = userDoc.data();

      const orderData = {
        clientId: auth.currentUser.uid,
        clientName: userData?.name || 'Cliente',
        clientEmail: userData?.email || auth.currentUser.email || '',
        clientPhone: userData?.phone || '',
        orderDate: new Date().toISOString(),
        totalValue: totalValue + 15,
        status: 'aguardando_pagamento',
        items,
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

      setOrderId(docRef.id);
      clearCart();
    } catch (err) {
      console.error(err);
      alert('Erro ao processar pedido. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadProof = async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        paymentProofUrl: paymentProofUrl || 'https://via.placeholder.com/150?text=Comprovante+Enviado',
        status: 'confirmando_pagamento'
      });
      alert('Comprovante enviado! O status foi alterado para Confirmando Pagamento.');
      navigate('/my-orders');
    } catch (err) {
      console.error(err);
      alert('Erro ao enviar comprovante.');
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

            <div className="border-t border-gray-100 pt-6">
              <div className="flex justify-between items-end">
                <span className="text-gray-500 font-medium">Total a pagar</span>
                <span className="text-3xl font-bold text-blue-600">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue + 15)}
                </span>
              </div>
            </div>

            <button
              onClick={handleFinalizeOrder}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50 active:scale-95"
            >
              {loading ? 'Processando...' : 'Confirmar e Gerar PIX'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-100 rounded-xl p-8 text-center">
            <div className="bg-green-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-100">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-green-900">Pedido Realizado!</h2>
            <p className="text-green-700 mt-2">Seu pedido #{orderId.slice(-6).toUpperCase()} foi registrado com sucesso.</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-xl p-8">
            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="bg-gray-50 p-6 rounded-2xl border-2 border-dashed border-gray-200">
                <QrCode className="w-48 h-48 text-gray-900" />
                <p className="text-center text-xs text-gray-400 mt-4 font-mono">PIX_SALDOMANAGER_MOCK_CODE</p>
              </div>
              
              <div className="flex-grow space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Pague com PIX</h3>
                  <p className="text-gray-500 text-sm">
                    Escaneie o QR Code ao lado ou utilize a chave abaixo para realizar o pagamento.
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl flex items-center justify-between border border-gray-100">
                  <code className="text-sm font-mono text-blue-600">pix@saldomanager.com.br</code>
                  <button className="p-2 hover:bg-white rounded-lg transition-colors text-gray-400 hover:text-blue-600" title="Copiar Chave">
                    <Copy className="w-5 h-5" />
                  </button>
                </div>

                <div className="bg-blue-50 p-4 rounded-xl flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700 leading-relaxed">
                    Após o pagamento, anexe o comprovante abaixo para agilizarmos a confirmação e separação do seu pedido.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-10 pt-10 border-t border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-600" /> Enviar Comprovante
              </h3>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Cole aqui o link do comprovante ou anexo"
                  value={paymentProofUrl}
                  onChange={(e) => setPaymentProofUrl(e.target.value)}
                  className="block w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                <div className="flex gap-4">
                  <button
                    onClick={handleUploadProof}
                    disabled={loading}
                    className="flex-grow bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-100"
                  >
                    Enviar Comprovante
                  </button>
                  <button
                    onClick={() => navigate('/my-orders')}
                    className="px-6 py-3 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition-all"
                  >
                    Pular por agora
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
