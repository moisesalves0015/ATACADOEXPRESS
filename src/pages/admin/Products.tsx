import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Product, StockType, Order } from '../../types';
import {
  Package, Plus, Search, Edit2, Trash2, X, Image as ImageIcon,
  BarChart2, TrendingUp, ShoppingBag, Users, DollarSign, User, ShieldCheck, Filter
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const statusConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  aguardando_pagamento: { label: 'Aguard. Pagamento', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
  pagamento_confirmado: { label: 'Pag. Confirmado', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
  separacao: { label: 'Em Separação', color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
  enviado: { label: 'Enviado', color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
  entregue: { label: 'Entregue', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
  cancelado: { label: 'Cancelado', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
};

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Report state
  const [reportProduct, setReportProduct] = useState<Product | null>(null);
  const [reportOrders, setReportOrders] = useState<(Order & { itemQty: number; itemTotal: number })[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportOriginFilter, setReportOriginFilter] = useState<'all' | 'cliente' | 'admin'>('all');
  const [reportStatusFilter, setReportStatusFilter] = useState('all');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    stockType: 'pronta_entrega' as StockType,
    availableQuantity: 0,
    unitPrice: 0,
    requiredGoal: 0,
    estimatedArrivalDate: '',
    imageUrl: '',
    status: 'active' as 'active' | 'inactive'
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'products'), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
    });
    return () => unsubscribe();
  }, []);

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        description: product.description,
        category: product.category,
        stockType: product.stockType,
        availableQuantity: product.availableQuantity,
        unitPrice: product.unitPrice,
        requiredGoal: product.requiredGoal || 0,
        estimatedArrivalDate: product.estimatedArrivalDate || '',
        imageUrl: product.imageUrl || '',
        status: product.status
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '', description: '', category: '', stockType: 'pronta_entrega',
        availableQuantity: 0, unitPrice: 0, requiredGoal: 0,
        estimatedArrivalDate: '', imageUrl: '', status: 'active'
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await updateDoc(doc(db, 'products', editingProduct.id), formData);
      } else {
        await addDoc(collection(db, 'products'), {
          ...formData, currentGoalProgress: 0, goalReached: false
        });
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar produto.');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este produto?')) {
      try {
        await deleteDoc(doc(db, 'products', id));
      } catch (err) {
        console.error(err);
        alert('Erro ao excluir produto.');
      }
    }
  };

  // Open product report
  const handleOpenReport = async (product: Product) => {
    setReportProduct(product);
    setReportLoading(true);
    setReportOriginFilter('all');
    setReportStatusFilter('all');
    try {
      const snap = await getDocs(collection(db, 'orders'));
      const matching: (Order & { itemQty: number; itemTotal: number })[] = [];
      snap.docs.forEach(d => {
        const order = { id: d.id, ...d.data() } as Order;
        const item = order.items.find(i => i.productId === product.id);
        if (item) {
          matching.push({
            ...order,
            itemQty: item.quantity,
            itemTotal: item.quantity * item.unitPrice,
          });
        }
      });
      // Sort newest first
      matching.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
      setReportOrders(matching);
    } catch (err) {
      console.error(err);
    } finally {
      setReportLoading(false);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredReportOrders = reportOrders.filter(o => {
    const matchOrigin = reportOriginFilter === 'all' || o.orderOrigin === reportOriginFilter;
    const matchStatus = reportStatusFilter === 'all' || o.status === reportStatusFilter;
    return matchOrigin && matchStatus;
  });

  // KPIs
  const kpiOrders = reportOrders.filter(o => o.status !== 'cancelado');
  const totalUnits = kpiOrders.reduce((s, o) => s + o.itemQty, 0);
  const totalRevenue = kpiOrders.reduce((s, o) => s + o.itemTotal, 0);
  const uniqueClients = new Set(kpiOrders.map(o => o.clientId)).size;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <Package className="w-7 h-7 text-blue-600" /> Gestão de Produtos
        </h1>
        <button
          onClick={() => handleOpenModal()}
          className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
        >
          <Plus className="w-5 h-5" /> Novo Produto
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou categoria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Produto</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Categoria</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Preço</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Estoque/Meta</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 flex-shrink-0">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt="" className="w-full h-full object-cover rounded-lg" referrerPolicy="no-referrer" />
                        ) : (
                          <Package className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{product.name}</p>
                        <p className={cn(
                          "text-[10px] font-bold uppercase",
                          product.status === 'active' ? 'text-green-600' : 'text-red-600'
                        )}>
                          {product.status === 'active' ? 'Ativo' : 'Inativo'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{product.category}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border",
                      product.stockType === 'pronta_entrega' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-orange-50 text-orange-700 border-orange-100'
                    )}>
                      {product.stockType === 'pronta_entrega' ? 'Pronta' : 'Meta'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900">
                    {fmt(product.unitPrice)}
                  </td>
                  <td className="px-6 py-4">
                    {product.stockType === 'pronta_entrega' ? (
                      <span className="text-sm font-medium text-gray-600">{product.availableQuantity} un</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-orange-500 h-full"
                            style={{ width: `${Math.min(100, ((product.currentGoalProgress || 0) / (product.requiredGoal || 1)) * 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-[10px] font-bold text-orange-600">{product.currentGoalProgress || 0}/{product.requiredGoal}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenReport(product)}
                        className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                        title="Relatório do produto"
                      >
                        <BarChart2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenModal(product)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="Editar produto"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Excluir produto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================
          PRODUCT REPORT MODAL
      ============================================================ */}
      {reportProduct && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-4xl my-8 shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-start justify-between sticky top-0 bg-white z-10 rounded-t-3xl">
              <div className="flex items-center gap-4">
                {reportProduct.imageUrl ? (
                  <img src={reportProduct.imageUrl} alt="" className="w-12 h-12 rounded-xl object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                    <Package className="w-6 h-6 text-gray-400" />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <BarChart2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Relatório do Produto</span>
                  </div>
                  <h2 className="text-xl font-black text-gray-900">{reportProduct.name}</h2>
                  <p className="text-sm text-gray-400">{reportProduct.category} · {fmt(reportProduct.unitPrice)}</p>
                </div>
              </div>
              <button onClick={() => setReportProduct(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {reportLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
                </div>
              ) : (
                <>
                  {/* KPI cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <ShoppingBag className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Pedidos</span>
                      </div>
                      <p className="text-2xl font-black text-gray-900">{kpiOrders.length}</p>
                    </div>
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="w-4 h-4 text-blue-600" />
                        <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Unidades</span>
                      </div>
                      <p className="text-2xl font-black text-gray-900">{totalUnits}</p>
                    </div>
                    <div className="bg-pink-50 border border-pink-100 rounded-2xl p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="w-4 h-4 text-pink-600" />
                        <span className="text-xs font-bold text-pink-600 uppercase tracking-widest">Receita</span>
                      </div>
                      <p className="text-xl font-black text-gray-900">{fmt(totalRevenue)}</p>
                    </div>
                    <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="w-4 h-4 text-purple-600" />
                        <span className="text-xs font-bold text-purple-600 uppercase tracking-widest">Clientes</span>
                      </div>
                      <p className="text-2xl font-black text-gray-900">{uniqueClients}</p>
                    </div>
                  </div>

                  {/* Filters */}
                  <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-gray-400" />
                      <select
                        value={reportOriginFilter}
                        onChange={e => setReportOriginFilter(e.target.value as any)}
                        className="text-sm border border-gray-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                      >
                        <option value="all">Todas origens</option>
                        <option value="cliente">Cliente (app)</option>
                        <option value="admin">Admin (vendedora)</option>
                      </select>
                    </div>
                    <select
                      value={reportStatusFilter}
                      onChange={e => setReportStatusFilter(e.target.value)}
                      className="text-sm border border-gray-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    >
                      <option value="all">Todos status</option>
                      {Object.entries(statusConfig).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </select>
                    <span className="text-xs text-gray-400 self-center ml-auto">
                      {filteredReportOrders.length} pedido{filteredReportOrders.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Orders table */}
                  {filteredReportOrders.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">Nenhum pedido encontrado para este produto.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-gray-100">
                      <table className="w-full text-left border-collapse text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Pedido / Data</th>
                            <th className="px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Cliente</th>
                            <th className="px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Origem</th>
                            <th className="px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Qtde</th>
                            <th className="px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Valor</th>
                            <th className="px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {filteredReportOrders.map(order => {
                            const sc = statusConfig[order.status];
                            return (
                              <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-4 py-3">
                                  <p className="font-bold text-gray-900">#{order.id.slice(-6).toUpperCase()}</p>
                                  <p className="text-[11px] text-gray-400">
                                    {format(new Date(order.orderDate), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                  </p>
                                </td>
                                <td className="px-4 py-3">
                                  <p className="font-semibold text-gray-900">{order.clientName}</p>
                                  {order.clientEmail && <p className="text-[11px] text-gray-400">{order.clientEmail}</p>}
                                  {order.clientPhone && <p className="text-[11px] text-gray-400">{order.clientPhone}</p>}
                                </td>
                                <td className="px-4 py-3">
                                  {order.orderOrigin === 'admin' ? (
                                    <div>
                                      <span className="flex items-center gap-1 text-[10px] font-bold text-purple-600 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-full w-fit">
                                        <ShieldCheck className="w-3 h-3" /> Admin
                                      </span>
                                      {order.registeredByAdminName && (
                                        <p className="text-[11px] text-gray-400 mt-0.5">{order.registeredByAdminName}</p>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full w-fit">
                                      <User className="w-3 h-3" /> Cliente
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3 font-black text-gray-900">{order.itemQty} un</td>
                                <td className="px-4 py-3 font-bold text-gray-900">{fmt(order.itemTotal)}</td>
                                <td className="px-4 py-3">
                                  <span className={cn(
                                    'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border',
                                    sc?.color, sc?.bg, sc?.border
                                  )}>
                                    {sc?.label}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        {/* Totals footer */}
                        <tfoot>
                          <tr className="bg-gray-50 border-t-2 border-gray-200">
                            <td colSpan={3} className="px-4 py-3 text-xs font-black text-gray-400 uppercase">Total (filtrado)</td>
                            <td className="px-4 py-3 font-black text-gray-900">
                              {filteredReportOrders.reduce((s, o) => s + o.itemQty, 0)} un
                            </td>
                            <td className="px-4 py-3 font-black text-pink-600">
                              {fmt(filteredReportOrders.reduce((s, o) => s + o.itemTotal, 0))}
                            </td>
                            <td />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          PRODUCT FORM MODAL
      ============================================================ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-gray-900">
                {editingProduct ? 'Editar Produto' : 'Novo Produto'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Nome do Produto</label>
                  <input
                    type="text" required value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Descrição</label>
                  <textarea
                    rows={3} value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Categoria</label>
                  <input
                    type="text" required value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Preço Unitário</label>
                  <input
                    type="number" step="0.01" required value={formData.unitPrice}
                    onChange={(e) => setFormData({ ...formData, unitPrice: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Tipo de Estoque</label>
                  <select
                    value={formData.stockType}
                    onChange={(e) => setFormData({ ...formData, stockType: e.target.value as StockType })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="pronta_entrega">Pronta Entrega</option>
                    <option value="previsao_meta">Previsão por Meta</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="active">Ativo</option>
                    <option value="inactive">Inativo</option>
                  </select>
                </div>

                {formData.stockType === 'pronta_entrega' ? (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Quantidade em Estoque</label>
                    <input
                      type="number" value={formData.availableQuantity}
                      onChange={(e) => setFormData({ ...formData, availableQuantity: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Meta Necessária (unidades)</label>
                      <input
                        type="number" value={formData.requiredGoal}
                        onChange={(e) => setFormData({ ...formData, requiredGoal: parseInt(e.target.value) })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Previsão de Chegada</label>
                      <input
                        type="text" placeholder="Ex: 15 dias úteis"
                        value={formData.estimatedArrivalDate}
                        onChange={(e) => setFormData({ ...formData, estimatedArrivalDate: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </>
                )}

                <div className="sm:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">URL da Imagem</label>
                  <div className="flex gap-2">
                    <div className="relative flex-grow">
                      <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text" value={formData.imageUrl}
                        onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-blue-500 focus:border-blue-500"
                        placeholder="https://exemplo.com/imagem.jpg"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-50 flex gap-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-grow py-3 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-grow py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                >
                  {editingProduct ? 'Salvar Alterações' : 'Cadastrar Produto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
