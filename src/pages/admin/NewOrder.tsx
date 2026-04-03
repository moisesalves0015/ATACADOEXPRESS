import React, { useState, useEffect } from 'react';
import {
  collection, onSnapshot, addDoc, getDocs, query, where,
  doc, getDoc, updateDoc, increment
} from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { Product, UserProfile, OrderItem } from '../../types';
import {
  UserSearch, Package, Plus, Minus, ArrowLeft, CheckCircle2,
  X, Search, ShoppingBag, AlertCircle, Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const SEPARATION_FEE = 15;

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

  // Load clients and products
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
    return () => { unsub1(); unsub2(); };
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
      }];
    });
  };

  const updateQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      setCartItems(prev => prev.filter(i => i.productId !== productId));
    } else {
      setCartItems(prev => prev.map(i => i.productId === productId ? { ...i, quantity: qty } : i));
    }
  };

  const subtotalValue = cartItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const totalValue = subtotalValue > 0 ? subtotalValue + SEPARATION_FEE : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!selectedClient) { setError('Selecione um cliente.'); return; }
    if (cartItems.length === 0) { setError('Adicione pelo menos um produto.'); return; }
    if (!auth.currentUser) return;

    setSubmitting(true);
    try {
      // Get current admin's name
      const adminDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      const adminData = adminDoc.data();

      const orderDoc = await addDoc(collection(db, 'orders'), {
        clientId: selectedClient.uid,
        clientName: selectedClient.name,
        clientEmail: selectedClient.email,
        clientPhone: selectedClient.phone || '',
        orderDate: new Date().toISOString(),
        totalValue,
        status: 'aguardando_pagamento',
        items: cartItems,
        observations,
        orderOrigin: 'admin' as const,
        registeredByAdminId: auth.currentUser.uid,
        registeredByAdminName: adminData?.name || auth.currentUser.email || 'Admin',
      });

      // Update stock / goal progress
      for (const item of cartItems) {
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

      setSuccess(orderDoc.id);
    } catch (err) {
      console.error(err);
      setError('Erro ao registrar pedido. Tente novamente.');
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
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/admin/orders')}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <ShoppingBag className="w-7 h-7 text-pink-500" />
            Novo Pedido
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">Registrar venda em nome de um cliente</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-50 text-red-600 px-4 py-3 rounded-2xl text-sm font-semibold">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* LEFT — Client + Products */}
        <div className="space-y-6">

          {/* Client selector */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <UserSearch className="w-4 h-4 text-pink-500" />
              Cliente
            </h2>

            {selectedClient ? (
              <div className="flex items-center justify-between bg-pink-50 border border-pink-100 rounded-2xl p-4">
                <div>
                  <p className="font-bold text-gray-900">{selectedClient.name}</p>
                  <p className="text-xs text-gray-500">{selectedClient.email}</p>
                  {selectedClient.phone && (
                    <p className="text-xs text-gray-400">{selectedClient.phone}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedClient(null)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
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
                    placeholder="Buscar por nome, email ou telefone..."
                    value={clientSearch}
                    onChange={e => setClientSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-200"
                    style={{ fontSize: '16px' }}
                  />
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1.5">
                  {loadingData ? (
                    <p className="text-sm text-gray-400 text-center py-4">Carregando...</p>
                  ) : filteredClients.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">Nenhum cliente encontrado</p>
                  ) : filteredClients.map(c => (
                    <button
                      key={c.uid}
                      type="button"
                      onClick={() => { setSelectedClient(c); setClientSearch(''); }}
                      className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-all"
                    >
                      <p className="text-sm font-bold text-gray-900">{c.name}</p>
                      <p className="text-[11px] text-gray-400">{c.email}{c.phone ? ` · ${c.phone}` : ''}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Product selector */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <Package className="w-4 h-4 text-pink-500" />
              Produtos
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
              <input
                type="text"
                placeholder="Buscar produto..."
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-200"
                style={{ fontSize: '16px' }}
              />
            </div>
            <div className="max-h-72 overflow-y-auto space-y-2">
              {filteredProducts.map(p => {
                const inCart = cartItems.find(i => i.productId === p.id);
                const outOfStock = p.stockType === 'pronta_entrega' && p.availableQuantity <= 0;
                return (
                  <div
                    key={p.id}
                    className={cn(
                      'flex items-center justify-between px-4 py-3 rounded-xl border transition-all',
                      inCart ? 'bg-pink-50 border-pink-100' : 'bg-grey-50 border-gray-100',
                      outOfStock && 'opacity-40 pointer-events-none'
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Package className="w-4 h-4 text-gray-300" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{p.name}</p>
                        <p className="text-xs text-gray-400">
                          {fmt(p.unitPrice)}
                          {p.stockType === 'pronta_entrega'
                            ? ` · ${p.availableQuantity} em estoque`
                            : ` · Meta: ${p.currentGoalProgress || 0}/${p.requiredGoal}`}
                        </p>
                      </div>
                    </div>
                    {inCart ? (
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => updateQty(p.id, inCart.quantity - 1)}
                          className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-red-50 hover:border-red-200 transition-all"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-sm font-bold">{inCart.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQty(p.id, inCart.quantity + 1)}
                          className="w-7 h-7 rounded-full bg-pink-500 text-white flex items-center justify-center hover:bg-pink-600 transition-all"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => addProduct(p)}
                        className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-pink-500 hover:text-white transition-all flex-shrink-0"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT — Order Summary */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5 sticky top-24">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Resumo do Pedido</h2>

            {cartItems.length === 0 ? (
              <div className="py-10 text-center">
                <ShoppingBag className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400">Nenhum produto adicionado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cartItems.map(item => (
                  <div key={item.productId} className="flex justify-between items-center text-sm">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{item.productName}</p>
                      <p className="text-xs text-gray-400">{item.quantity}x {fmt(item.unitPrice)}</p>
                    </div>
                    <span className="font-bold text-gray-900 flex-shrink-0 ml-4">{fmt(item.quantity * item.unitPrice)}</span>
                  </div>
                ))}
                
                <div className="pt-4 border-t border-gray-100 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="font-semibold text-gray-900">{fmt(subtotalValue)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 flex items-center gap-1.5">
                      Cobrança por Separação
                      <Info className="w-3.5 h-3.5 text-blue-400" />
                    </span>
                    <span className="font-semibold text-blue-600">+{fmt(SEPARATION_FEE)}</span>
                  </div>
                  <div className="pt-2 flex justify-between text-lg font-bold">
                    <span className="text-gray-900">Total</span>
                    <span className="text-pink-600">{fmt(totalValue)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Observations */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                Observações (opcional)
              </label>
              <textarea
                rows={3}
                value={observations}
                onChange={e => setObservations(e.target.value)}
                placeholder="Informações adicionais sobre o pedido..."
                className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-200 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || cartItems.length === 0 || !selectedClient}
              className="w-full py-4 rounded-xl font-bold text-white text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
              style={{ background: 'linear-gradient(135deg, #F72585 0%, #b5179e 100%)', boxShadow: '0 8px 24px #F7258530' }}
            >
              {submitting ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Registrando...
                </div>
              ) : (
                `Registrar Pedido · ${fmt(totalValue)}`
              )}
            </button>

            <p className="text-[11px] text-gray-400 text-center">
              Pedido será registrado com origem <strong>Admin</strong> e vinculado ao seu nome com taxa de separação de {fmt(SEPARATION_FEE)}.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
