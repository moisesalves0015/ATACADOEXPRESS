import React, { useState, useEffect } from 'react';
import {
  collection, onSnapshot, addDoc, query, where,
  doc, getDoc, runTransaction, updateDoc, increment
} from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { Product, UserProfile, OrderItem, OrderStatus } from '../../types';
import {
  UserSearch, Package, Plus, Minus, ArrowLeft, CheckCircle2,
  X, Search, ShoppingBag, AlertCircle, Info, User
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);



export default function AdminNewOrder() {
  const navigate = useNavigate();

  const [clients, setClients] = useState<UserProfile[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<UserProfile | null>(null);

  const [productSearch, setProductSearch] = useState('');
  const [cartItems, setCartItems] = useState<OrderItem[]>([]);

  const [observations, setObservations] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState('');
  
  const [sellers, setSellers] = useState<UserProfile[]>([]);
  const [selectedSeller, setSelectedSeller] = useState<UserProfile | null>(null);
  const [commissionRate, setCommissionRate] = useState(0);
  const [commissionType, setCommissionType] = useState<'percentage' | 'fixed'>('percentage');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const unsub1 = onSnapshot(
      query(collection(db, 'users'), where('role', '==', 'client')),
      snap => {
        setClients(snap.docs.map(d => ({ ...d.data(), uid: d.id } as UserProfile)));
        setLoadingData(false);
      }
    );
    const unsub2 = onSnapshot(
      query(collection(db, 'products'), where('status', '==', 'active')),
      snap => setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)))
    );

    // Fetch sellers
    const unsub3 = onSnapshot(
      query(collection(db, 'users'), where('role', '==', 'seller')),
      snap => setSellers(snap.docs.map(d => ({ ...d.data(), uid: d.id } as UserProfile)))
    );

    // Fetch current user
    const fetchMe = async () => {
      if (auth.currentUser) {
        const d = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (d.exists()) {
          const profile = { ...d.data(), uid: d.id } as UserProfile;
          setCurrentUser(profile);
          setSelectedSeller(profile);
          setCommissionRate(profile.commissionDefault || 0);
          setCommissionType(profile.commissionType || 'percentage');
        }
      }
    };
    fetchMe();

    return () => { unsub1(); unsub2(); unsub3(); };
  }, []);

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.email.toLowerCase().includes(clientSearch.toLowerCase()) ||
    (c.phone || '').includes(clientSearch)
  );

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.category.toLowerCase().includes(productSearch.toLowerCase())
  );

  const addProduct = (product: Product) => {
    // For pronta_entrega, enforce stock ceiling
    if (product.stockType === 'pronta_entrega') {
      const available = product.availableQuantity || 0;
      if (available <= 0) return; // Already blocked by outOfStock UI, but guard here too
      setCartItems(prev => {
        const existing = prev.find(i => i.productId === product.id);
        if (existing) {
          if (existing.quantity >= available) {
            setError(`Quantidade máxima atingida. Apenas ${available} unidade${available !== 1 ? 's' : ''} disponível${available !== 1 ? 'is' : ''}`);
            return prev;
          }
          setError('');
          return prev.map(i =>
            i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
          );
        }
        setError('');
        return [...prev, {
          productId: product.id,
          productName: product.name,
          quantity: 1,
          unitPrice: product.unitPrice,
          stockType: product.stockType,
          imageUrl: product.imageUrls?.[0] || product.imageUrl || '',
        }];
      });
    } else {
      // previsao_meta: no stock ceiling
      setCartItems(prev => {
        const existing = prev.find(i => i.productId === product.id);
        if (existing) {
          return prev.map(i =>
            i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
          );
        }
        return [...prev, {
          productId: product.id,
          productName: product.name,
          quantity: 1,
          unitPrice: product.unitPrice,
          stockType: product.stockType,
          imageUrl: product.imageUrls?.[0] || product.imageUrl || '',
        }];
      });
    }
  };

  const updateQty = (productId: string, qty: number) => {
    const product = products.find(p => p.id === productId);
    if (qty <= 0) {
      setCartItems(prev => prev.filter(i => i.productId !== productId));
      setError('');
    } else {
      // Enforce stock ceiling for pronta_entrega
      if (product?.stockType === 'pronta_entrega') {
        const available = product.availableQuantity || 0;
        if (qty > available) {
          setError(`Quantidade indisponível. Estoque atual: ${available} unidade${available !== 1 ? 's' : ''}`);
          return;
        }
      }
      setError('');
      setCartItems(prev => prev.map(i => i.productId === productId ? { ...i, quantity: qty } : i));
    }
  };

  const subtotalValue = cartItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  
  const totalReadyValue = cartItems
    .filter(i => !i.stockType || i.stockType === 'pronta_entrega')
    .reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  
  const totalPendingValue = cartItems
    .filter(i => i.stockType === 'previsao_meta')
    .reduce((s, i) => s + i.quantity * i.unitPrice, 0);

  const commissionValue = commissionType === 'percentage' 
    ? (subtotalValue * commissionRate) / 100 
    : (cartItems.length > 0 ? commissionRate : 0);

  const totalValue = subtotalValue;
  const initialPaymentTotal = totalReadyValue;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return; // RISCO-03: double-click guard
    setError('');
    if (!selectedClient) { setError('Selecione um cliente.'); return; }
    if (cartItems.length === 0) { setError('Adicione pelo menos um produto.'); return; }
    if (!auth.currentUser) return;

    setSubmitting(true);
    try {
      // Get current admin's name
      const adminDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      const adminData = adminDoc.data();

      const itemsWithStatus = cartItems.map(item => {
        const itemCommValue = commissionType === 'percentage'
          ? (item.quantity * item.unitPrice * commissionRate) / 100
          : (item.quantity * commissionRate);

        return {
          ...item,
          status: 'aguardando_pagamento' as OrderStatus,
          discount: 0,
          amountPaid: 0,
          paymentDate: '',
          paymentMethod: '',
          history: [{
            timestamp: new Date().toISOString(),
            actionType: 'CREATE',
            description: 'Item adicionado ao pedido.',
            userEmail: adminData?.email || auth.currentUser?.email || 'Admin',
          }],
          commissionValue: itemCommValue,
          commissionRate: commissionRate,
          commissionType: commissionType,
        };
      });

      // --- Atomic stock validation + decrement via runTransaction ---
      // Pre-validate all pronta_entrega items before creating order
      for (const item of cartItems) {
        if (item.stockType === 'pronta_entrega') {
          await runTransaction(db, async (transaction) => {
            const productRef = doc(db, 'products', item.productId);
            const productSnap = await transaction.get(productRef);
            if (!productSnap.exists()) {
              throw new Error(`Produto "${item.productName}" não encontrado.`);
            }
            const pData = productSnap.data();
            const currentStock = pData.availableQuantity || 0;
            if (currentStock < item.quantity) {
              throw new Error(
                `Estoque insuficiente para "${item.productName}". ` +
                `Disponível: ${currentStock} unidade${currentStock !== 1 ? 's' : ''}. ` +
                `Solicitado: ${item.quantity}.`
              );
            }
            transaction.update(productRef, {
              availableQuantity: currentStock - item.quantity,
            });
          });
        }
      }

      // Update meta progress — wrapped in runTransaction for atomicity (RISCO-01)
      for (const item of cartItems) {
        if (item.stockType === 'previsao_meta') {
          await runTransaction(db, async (transaction) => {
            const productRef = doc(db, 'products', item.productId);
            const snap = await transaction.get(productRef);
            if (!snap.exists()) return;
            const pData = snap.data();
            const newProgress = (pData.currentGoalProgress || 0) + item.quantity;
            transaction.update(productRef, {
              currentGoalProgress: newProgress,
              goalReached: newProgress >= (pData.requiredGoal || 0),
            });
          });
        }
      }

      const orderDoc = await addDoc(collection(db, 'orders'), {
        clientId: selectedClient.uid,
        clientName: selectedClient.name,
        clientEmail: selectedClient.email,
        clientPhone: selectedClient.phone || '',
        orderDate: new Date().toISOString(),
        totalValue,
        totalReady: initialPaymentTotal,
        totalPending: totalPendingValue,
        status: 'aguardando_pagamento' as OrderStatus, // always start here — never use removed statuses
        items: itemsWithStatus,
        observations,
        orderOrigin: 'admin' as const,
        origin: 'admin',
        registeredByAdminId: auth.currentUser.uid,
        registeredByAdminName: adminData?.name || auth.currentUser.email || 'Admin',
        sellerId: selectedSeller?.uid || '',
        sellerName: selectedSeller?.name || '',
        commissionRate: commissionRate,
        commissionType: commissionType,
        commissionValue: commissionValue,
      });

      setSuccess(orderDoc.id);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao registrar pedido. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-xl mx-auto text-center py-16 space-y-6">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Pedido Registrado!</h2>
        <p className="text-gray-500">
          Pedido <span className="font-bold text-gray-900">#{success.slice(-6).toUpperCase()}</span> criado para{' '}
          <span className="font-bold text-gray-900">{selectedClient?.name}</span>.
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => navigate('/admin/orders')}
            className="px-6 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-all"
          >
            Ver Pedidos
          </button>
          <button
            onClick={() => {
              setSuccess(null);
              setSelectedClient(null);
              setCartItems([]);
              setObservations('');
              setClientSearch('');
              setProductSearch('');
            }}
            className="px-6 py-3 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-all"
          >
            Novo Pedido
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/orders')}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ShoppingBag className="w-6 h-6 text-pink-500" />
              Novo Pedido
            </h1>
          </div>
        </div>
        
        {currentUser && (
          <div className="flex items-center gap-3 bg-white border border-gray-100 px-3 py-2 rounded-xl shadow-sm sm:ml-auto">
            <div className="w-8 h-8 bg-pink-50 rounded-lg flex items-center justify-center text-pink-500 shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest truncate">Vendedor</p>
              <p className="text-xs font-bold text-gray-900 truncate">{currentUser.name}</p>
            </div>
            <div className="h-6 w-px bg-gray-100 mx-1 shrink-0" />
            <div className="shrink-0">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Comissão</p>
              <p className="text-xs font-bold text-emerald-600">
                {commissionType === 'percentage' ? `${commissionRate}%` : fmt(commissionRate)}
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm font-semibold">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* LEFT — Client + Products */}
        <div className="space-y-6">

          {/* Client selector */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 space-y-4">
            <h2 className="text-xs sm:text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <UserSearch className="w-4 h-4 text-pink-500" />
              Selecione o Cliente
            </h2>

            {selectedClient ? (
              <div className="flex items-center justify-between bg-pink-50 border border-pink-100 rounded-xl p-3 sm:p-4">
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 truncate">{selectedClient.name}</p>
                  <p className="text-[11px] text-gray-500 truncate">{selectedClient.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedClient(null)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                  <input
                    type="text"
                    placeholder="Buscar cliente..."
                    value={clientSearch}
                    onChange={e => setClientSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-200 bg-gray-50"
                  />
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1.5 custom-scrollbar">
                  {loadingData ? (
                    <p className="text-[10px] text-gray-400 text-center py-4 uppercase font-bold">Carregando...</p>
                  ) : filteredClients.length === 0 ? (
                    <p className="text-[10px] text-gray-400 text-center py-4 uppercase font-bold">Nenhum cliente</p>
                  ) : filteredClients.map(c => (
                    <button
                      key={c.uid}
                      type="button"
                      onClick={() => { setSelectedClient(c); setClientSearch(''); }}
                      className="w-full text-left px-3 py-3 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-all"
                    >
                      <p className="text-sm font-bold text-gray-900">{c.name}</p>
                      <p className="text-[10px] text-gray-400">{c.email}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          


          {/* Product selector */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 space-y-4">
            <h2 className="text-xs sm:text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <Package className="w-4 h-4 text-pink-500" />
              Escolha os Produtos
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
              <input
                type="text"
                placeholder="Buscar produto..."
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-200 bg-gray-50"
              />
            </div>
            <div className="max-h-80 overflow-y-auto space-y-2 custom-scrollbar">
              {filteredProducts.map(p => {
                const inCart = cartItems.find(i => i.productId === p.id);
                const outOfStock = p.stockType === 'pronta_entrega' && p.availableQuantity <= 0;
                return (
                  <div
                    key={p.id}
                    className={cn(
                      'flex items-center justify-between px-3 py-3 rounded-xl border transition-all',
                      inCart ? 'bg-pink-50 border-pink-100' : 'bg-gray-50 border-gray-100',
                      outOfStock && 'opacity-40 pointer-events-none grayscale'
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 bg-white border border-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <Package className="w-5 h-5 text-gray-300" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{p.name}</p>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-black text-gray-900">{fmt(p.unitPrice)}</span>
                          <span className="text-[10px] text-gray-300">•</span>
                          <span className={cn(
                            "text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md",
                            p.stockType === 'pronta_entrega' ? "bg-blue-50 text-blue-600" : "bg-orange-50 text-orange-600"
                          )}>
                            {p.stockType === 'pronta_entrega' ? `${p.availableQuantity} un` : `Meta`}
                          </span>
                        </div>
                      </div>
                    </div>
                    {inCart ? (
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => updateQty(p.id, inCart.quantity - 1)}
                          className="touch-action w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-red-50"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-6 text-center text-sm font-black">{inCart.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQty(p.id, inCart.quantity + 1)}
                          className="touch-action w-8 h-8 rounded-full bg-pink-500 text-white flex items-center justify-center hover:bg-pink-600"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => addProduct(p)}
                        className="touch-action w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-pink-500 hover:text-white"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT — Order Summary */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 space-y-5 lg:sticky lg:top-24">
          <h2 className="text-xs sm:text-sm font-black text-gray-900 uppercase tracking-widest flex items-center justify-between">
            Resumo da Venda
            <span className="text-[10px] text-gray-400">{cartItems.length} itens</span>
          </h2>

          {cartItems.length === 0 ? (
            <div className="py-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <ShoppingBag className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-xs text-gray-400 font-bold uppercase">Nenhum item</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="max-h-40 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {cartItems.map(item => (
                  <div key={item.productId} className="flex justify-between items-start text-sm">
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 truncate text-xs">{item.productName}</p>
                      <p className="text-[10px] text-gray-400">{item.quantity}x {fmt(item.unitPrice)}</p>
                    </div>
                    <span className="font-black text-gray-900 text-xs ml-4">{fmt(item.quantity * item.unitPrice)}</span>
                  </div>
                ))}
              </div>
              
              <div className="pt-4 border-t border-gray-100 space-y-2">
                <div className="flex justify-between items-center bg-gray-50 p-2.5 rounded-xl">
                  <span className="text-[10px] font-black text-gray-400 uppercase">Subtotal</span>
                  <span className="text-sm font-black text-gray-900">{fmt(subtotalValue)}</span>
                </div>

                <div className="flex justify-between items-center bg-blue-50/80 p-3 rounded-xl border border-blue-100">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-black text-blue-900 uppercase">Cobrar Agora (Pronta)</span>
                  </div>
                  <span className="text-base font-black text-blue-600">
                    {fmt(initialPaymentTotal)}
                  </span>
                </div>

                {totalPendingValue > 0 && (
                  <div className="flex justify-between items-center bg-orange-50/80 p-3 rounded-xl border border-orange-100">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full" />
                      <span className="text-[10px] font-black text-orange-900 uppercase">Saldo Futuro (Meta)</span>
                    </div>
                    <span className="text-base font-black text-orange-600">
                      {fmt(totalPendingValue)}
                    </span>
                  </div>
                )}

                <div className="pt-2 flex justify-between items-center px-1">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total do Pedido</span>
                  <span className="text-xl font-black text-brand-pink">{fmt(totalValue)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Observations */}
          <div className="pt-2">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
              Observações Internas
            </label>
            <textarea
              rows={2}
              value={observations}
              onChange={e => setObservations(e.target.value)}
              placeholder="Ex: Entrega prioritária..."
              className="w-full px-4 py-3 text-sm border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-100 bg-gray-50 resize-none font-medium"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting || cartItems.length === 0 || !selectedClient}
              className={cn(
                "w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg transition-all flex items-center justify-center gap-2",
                submitting || cartItems.length === 0 || !selectedClient
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none"
                  : "bg-gray-900 text-white hover:bg-gray-800 active:scale-[0.98] shadow-gray-200"
              )}
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Finalizar Pedido
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
