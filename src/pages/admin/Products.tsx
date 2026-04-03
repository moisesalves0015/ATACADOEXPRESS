import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, addDoc, updateDoc, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, handleFirestoreError, OperationType } from '../../firebase';
import { Product, Order, OrderStatus } from '../../types';
import { Package, Plus, Search, Edit2, Trash2, X, Upload, BarChart2, TrendingUp, ShoppingBag, DollarSign, Users, Filter, ShieldCheck, User, Clock, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const statusConfig: Record<string, { label: string, color: string, bg: string, border: string }> = {
  aguardando_pagamento: { label: 'Aguardando Pagamento', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
  aguardando_comprovante: { label: 'Aguardando Comprovante', color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
  confirmando_pagamento: { label: 'Confirmando Pagamento', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
  pagamento_confirmado: { label: 'Pagamento Confirmado', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  separacao: { label: 'Em Separação', color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
  entregue: { label: 'Entregue', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
  cancelado: { label: 'Cancelado', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
};

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<Product> | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Report states
  const [reportProduct, setReportProduct] = useState<Product | null>(null);
  const [reportOrders, setReportOrders] = useState<(Order & { itemQty: number; itemTotal: number })[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportOriginFilter, setReportOriginFilter] = useState<'all' | 'cliente' | 'admin'>('all');
  const [reportStatusFilter, setReportStatusFilter] = useState<string>('all');

  useEffect(() => {
    const q = query(collection(db, 'products'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
    });
    return () => unsubscribe();
  }, []);

  const handleOpenModal = (product?: Product) => {
    setCurrentProduct(product || {
      name: '',
      description: '',
      category: '',
      stockType: 'pronta_entrega',
      availableQuantity: 0,
      unitPrice: 0,
      status: 'active',
      imageUrl: '',
      imageUrls: []
    });
    setImageFile(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProduct) return;

    setLoading(true);
    try {
      let imageUrl = currentProduct.imageUrl;

      if (imageFile) {
        setIsUploading(true);
        const storageRef = ref(storage, `products/${Date.now()}_${imageFile.name}`);
        const uploadResult = await uploadBytes(storageRef, imageFile);
        imageUrl = await getDownloadURL(uploadResult.ref);
        setIsUploading(false);
      }

      const productData = {
        ...currentProduct,
        imageUrl,
        updatedAt: new Date().toISOString()
      };

      if (currentProduct.id) {
        await updateDoc(doc(db, 'products', currentProduct.id), productData);
      } else {
        await addDoc(collection(db, 'products'), {
          ...productData,
          createdAt: new Date().toISOString(),
          currentGoalProgress: 0
        });
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar produto.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (postId: string) => {
    if (window.confirm('Excluir este produto permanentemente?')) {
      try {
        await deleteDoc(doc(db, 'products', postId));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const generatePDF = () => {
    if (!reportProduct) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Header
    doc.setFontSize(22);
    doc.setTextColor(247, 37, 133); // Brand Pink
    doc.text('Atacado Express Boutique', 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Relatório Analítico de Produto`, 14, 30);
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth - 14, 30, { align: 'right' });

    // Item Info
    doc.setDrawColor(241, 245, 249);
    doc.line(14, 35, pageWidth - 14, 35);

    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text(reportProduct.name, 14, 45);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Categoria: ${reportProduct.category}`, 14, 52);
    doc.text(`Preço Unitário: ${fmt(reportProduct.unitPrice)}`, 14, 57);
    doc.text(`Tipo de Estoque: ${reportProduct.stockType === 'pronta_entrega' ? 'Pronta Entrega' : 'Previsão/Meta'}`, 14, 62);

    const stockInfo = reportProduct.stockType === 'pronta_entrega'
      ? `Disponível: ${reportProduct.availableQuantity} unidades`
      : `Meta: ${reportProduct.currentGoalProgress || 0} de ${reportProduct.requiredGoal} atingido`;
    doc.text(stockInfo, 14, 72);

    // --- KPIs ---
    doc.setDrawColor(241, 245, 249);
    doc.line(14, 80, pageWidth - 14, 80);

    const kpis = [
      ['Total Pedidos', kpiOrders.length.toString()],
      ['Unidades Vendidas', totalUnits.toString()],
      ['Receita Total', fmt(totalRevenue)],
      ['Clientes Únicos', uniqueClients.toString()]
    ];

    autoTable(doc, {
      startY: 85,
      head: [['Indicador', 'Valor']],
      body: kpis,
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 2 },
      headStyles: { fontStyle: 'bold', textColor: [100, 116, 139] },
      columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } }
    });

    // --- Orders Table ---
    doc.setFontSize(14);
    doc.text('Detalhamento de Pedidos', 14, (doc as any).lastAutoTable.finalY + 15);

    const tableData = filteredReportOrders.map(o => [
      `#${o.id.slice(-6).toUpperCase()}\n${format(new Date(o.orderDate), "dd/MM/yyyy")}`,
      `${o.clientName}\n${o.clientPhone || o.clientEmail}`,
      o.orderOrigin === 'admin' ? 'Admin' : 'Cliente',
      `${o.itemQty} un`,
      fmt(o.itemTotal),
      statusConfig[o.status]?.label || 'Status Desconhecido'
    ]);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['ID/Data', 'Cliente', 'Origem', 'Qtde', 'Total', 'Status']],
      body: tableData,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [247, 37, 133], textColor: 255 },
      alternateRowStyles: { fillColor: [248, 250, 252] }
    });

    // --- Footer ---
    const totalFiltered = filteredReportOrders.reduce((s, o) => s + o.itemTotal, 0);
    const finalY = (doc as any).lastAutoTable.finalY;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL FILTRADO: ${fmt(totalFiltered)}`, pageWidth - 14, finalY + 10, { align: 'right' });

    doc.save(`Relatório_${reportProduct.name.replace(/\s+/g, '_')}.pdf`);
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
          className="btn-action-premium"
        >
          <Plus className="w-4 h-4" /> Novo Produto
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
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

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
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
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 flex-shrink-0 overflow-hidden">
                        {product.imageUrls?.length || product.imageUrl ? (
                          <img src={product.imageUrls?.length ? product.imageUrls[0] : product.imageUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
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
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">
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
          <div className="bg-white rounded-2xl w-full max-w-4xl my-8 shadow-xl">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-start justify-between sticky top-0 bg-white z-10 rounded-t-2xl">
              <div className="flex items-center gap-4">
                {reportProduct.imageUrls?.length || reportProduct.imageUrl ? (
                  <img src={reportProduct.imageUrls?.length ? reportProduct.imageUrls[0] : reportProduct.imageUrl} alt="" className="w-12 h-12 rounded-xl object-cover" referrerPolicy="no-referrer" />
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
                  <h2 className="text-xl font-bold text-gray-900">{reportProduct.name}</h2>
                  <p className="text-sm text-gray-400">{reportProduct.category} · {fmt(reportProduct.unitPrice)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={generatePDF}
                  className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-md shadow-emerald-100"
                >
                  <Upload className="w-4 h-4 rotate-180" /> Baixar PDF
                </button>
                <button onClick={() => setReportProduct(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>
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
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <ShoppingBag className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Pedidos</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{kpiOrders.length}</p>
                    </div>
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="w-4 h-4 text-blue-600" />
                        <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Unidades</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{totalUnits}</p>
                    </div>
                    <div className="bg-pink-50 border border-pink-100 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="w-4 h-4 text-pink-600" />
                        <span className="text-xs font-bold text-pink-600 uppercase tracking-widest">Receita</span>
                      </div>
                      <p className="text-xl font-bold text-gray-900">{fmt(totalRevenue)}</p>
                    </div>
                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="w-4 h-4 text-indigo-600" />
                        <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Clientes</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{uniqueClients}</p>
                    </div>
                  </div>

                  {/* Filters */}
                  <div className="flex flex-wrap gap-3 py-2">
                    {(['all', 'cliente', 'admin'] as const).map(origin => (
                      <button
                        key={origin}
                        onClick={() => setReportOriginFilter(origin)}
                        className={cn(
                          "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all",
                          reportOriginFilter === origin ? "bg-emerald-600 text-white shadow-md shadow-emerald-100" : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                        )}
                      >
                        {origin === 'all' ? 'Todas Origens' : origin === 'cliente' ? 'Apenas Site' : 'Apenas Vendedora'}
                      </button>
                    ))}
                  </div>

                  {/* Orders List */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Detalhamento de Vendas</h3>
                    {filteredReportOrders.length === 0 ? (
                      <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-2xl">
                         <p className="text-gray-400 italic">Nenhuma venda encontrada para este filtro.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                         {filteredReportOrders.map((o, idx) => (
                           <div key={idx} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-black text-gray-900">#{o.id.slice(-6).toUpperCase()}</span>
                                    <span className={cn(
                                       "px-2 py-0.5 rounded-full text-[8px] font-black uppercase",
                                       o.orderOrigin === 'admin' ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                                    )}>
                                      {o.orderOrigin === 'admin' ? 'Venda Admin' : 'Venda Site'}
                                    </span>
                                  </div>
                                  <p className="text-xs font-bold text-gray-700">{o.clientName}</p>
                                  <p className="text-[10px] text-gray-400">{format(new Date(o.orderDate), "dd/MM/yyyy HH:mm")}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-black text-emerald-600">{fmt(o.itemTotal)}</p>
                                  <p className="text-[10px] text-gray-500 font-bold">{o.itemQty} unidades</p>
                                  <div className={cn(
                                    "mt-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase border inline-block",
                                    statusConfig[o.status]?.color, statusConfig[o.status]?.bg, statusConfig[o.status]?.border
                                  )}>
                                    {statusConfig[o.status]?.label}
                                  </div>
                                </div>
                              </div>
                           </div>
                         ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            
            {/* Modal Footer */}
            {!reportLoading && (
               <div className="p-6 bg-gray-50 border-t border-gray-100 rounded-b-2xl flex justify-between items-center">
                  <p className="text-xs text-gray-400">Total filtrado neste produto: <strong className="text-emerald-600 font-black">{fmt(filteredReportOrders.reduce((s, o) => s + o.itemTotal, 0))}</strong></p>
                  <button onClick={() => setReportProduct(null)} className="px-6 py-2 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-100 transition-all text-sm">Fechar</button>
               </div>
            )}
          </div>
        </div>
      )}

      {/* PRODUCT FORM MODAL (Add/Edit) SAME AS BEFORE */}
      {isModalOpen && currentProduct && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl my-8 shadow-xl">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold">{currentProduct.id ? 'Editar Produto' : 'Novo Produto'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Nome do Produto</label>
                    <input
                      type="text"
                      required
                      value={currentProduct.name}
                      onChange={e => setCurrentProduct({ ...currentProduct, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Categoria</label>
                    <input
                      type="text"
                      required
                      value={currentProduct.category}
                      onChange={e => setCurrentProduct({ ...currentProduct, category: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Preço Unitário</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={currentProduct.unitPrice}
                        onChange={e => setCurrentProduct({ ...currentProduct, unitPrice: parseFloat(e.target.value) })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Status</label>
                      <select
                        value={currentProduct.status}
                        onChange={e => setCurrentProduct({ ...currentProduct, status: e.target.value as 'active' | 'inactive' })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="active">Ativo</option>
                        <option value="inactive">Inativo</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Tipo de Estoque</label>
                    <select
                      value={currentProduct.stockType}
                      onChange={e => setCurrentProduct({ ...currentProduct, stockType: e.target.value as any })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="pronta_entrega">Pronta Entrega</option>
                      <option value="previsao_meta">Previsão / Meta</option>
                    </select>
                  </div>
                  {currentProduct.stockType === 'pronta_entrega' ? (
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Quantidade Disponível</label>
                      <input
                        type="number"
                        required
                        value={currentProduct.availableQuantity}
                        onChange={e => setCurrentProduct({ ...currentProduct, availableQuantity: parseInt(e.target.value) })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Meta de Vendas (Unidades)</label>
                      <input
                        type="number"
                        required
                        value={currentProduct.requiredGoal}
                        onChange={e => setCurrentProduct({ ...currentProduct, requiredGoal: parseInt(e.target.value) })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Imagem do Produto (Opcional)</label>
                    <div className="flex items-center gap-4">
                      {isUploading ? (
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      ) : (
                        <input
                          type="file"
                          accept="image/*"
                          onChange={e => setImageFile(e.target.files?.[0] || null)}
                          className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Descrição</label>
                <textarea
                  value={currentProduct.description}
                  onChange={e => setCurrentProduct({ ...currentProduct, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-blue-500 focus:border-blue-500"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2 border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-100 transition-all shadow-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || isUploading}
                  className="px-8 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-100 disabled:opacity-50"
                >
                  {loading ? 'Salvando...' : 'Salvar Produto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
