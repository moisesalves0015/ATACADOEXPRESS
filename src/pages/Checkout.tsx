import { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '../firebase';
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

      const orderData = {
        clientId: auth.currentUser.uid,
        clientName: userData?.name || 'Cliente',
        clientEmail: userData?.email || auth.currentUser.email || '',
        clientPhone: userData?.phone || '',
        orderDate: new Date().toISOString(),
        totalValue: totalValue + deliveryFee,
        totalReady: initialPaymentTotal,
        totalPending: totalPendingValue,
        status: initialPaymentTotal > 0 ? 'aguardando_pagamento' : 'aguardando_comprovante', // If nothing to pay now, skip payment wait? No, maybe a better status. 
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

  const handleFileUpload = async (file: File) => {
    if (!orderId) return;
    setLoading(true);
    try {
      const extension = file.name.split('.').pop();
      const storageRef = ref(storage, `payment_proofs/${orderId}_${Date.now()}.${extension}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      await updateDoc(doc(db, 'orders', orderId), {
        paymentProofUrl: url,
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
                  <div className="space-y-1">
                    <p className="text-xs text-blue-700 leading-relaxed font-bold">
                      Valor a pagar agora: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(confirmedTotal)}
                    </p>
                    <p className="text-[10px] text-blue-600 leading-relaxed">
                      Após o pagamento, anexe o comprovante abaixo para agilizarmos a confirmação e separação do seu pedido.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 pt-10 border-t border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-600" /> Enviar Comprovante
              </h3>
              <div className="space-y-4">
                <label className={cn(
                  "w-full flex-col flex items-center justify-center min-h-[140px] px-6 py-4 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 transition-all font-medium",
                  loading ? 'opacity-50 pointer-events-none' : ''
                )}>
                  {loading ? (
                    <>
                       <Loader2 className="w-8 h-8 text-blue-600 mb-2 animate-spin" />
                       <span className="text-gray-900 font-bold">Enviando...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-blue-600 mb-2" />
                      <span className="text-gray-900 text-sm font-bold">Clique para anexar arquivo da galeria</span>
                      <span className="text-gray-500 text-[10px] mt-1">Imagens ou Documentos</span>
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
                    disabled={loading}
                  />
                </label>
                <button
                  onClick={() => navigate('/my-orders')}
                  disabled={loading}
                  className="w-full px-6 py-4 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition-all"
                >
                  Pular por agora
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
