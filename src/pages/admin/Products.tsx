import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, addDoc, updateDoc, deleteDoc, doc, getDocs, setDoc, arrayUnion } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, handleFirestoreError, OperationType } from '../../firebase';
import { Package, Plus, Search, Edit2, Trash2, X, Upload, BarChart2, TrendingUp, ShoppingBag, DollarSign, Users, Filter, ShieldCheck, User, Clock, CheckCircle2, Zap, MessageCircle, Loader2, History, Image as ImageIcon, Layers, Settings, Check, ChevronRight, MousePointer2 } from 'lucide-react';
import { SquaresFour, Dress, TShirt, Suitcase, Watch, Handbag, Sparkle, Cube, Lightning, ChartLineUp, NotePencil, Trash, Export, SealCheck, UsersThree, ChartBar, Receipt, HouseLine, UserCircle, WhatsappLogo, Gear, Image, Stack, MagnifyingGlass, Plus as PlusIcon, X as XIcon, TrendUp, CurrencyDollar, Clock as ClockIcon, CaretRight, Tag } from '@phosphor-icons/react';
import { Product, Order, OrderStatus, StatusUpdate, ProductHistoryEntry, ProductVariation } from '../../types';
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
  cancelado: { label: 'Cancelado', color: 'text-red-600', bg: 'bg-orange-50', border: 'border-red-100' },
};

const getCategoryImg = (categoryName: string) => {
  const assetsPath = '/assets/categories/';
  switch (categoryName?.toLowerCase()) {
    case 'vestidos': return `${assetsPath}vestidos.png`;
    case 'blusas': return `${assetsPath}blusas.png`;
    case 'conjuntos': return `${assetsPath}conjuntos.png`;
    case 'acessórios': return `${assetsPath}acessorios.png`;
    case 'bolsas': return `${assetsPath}bolsas.png`;
    case 'calças': return `${assetsPath}calcas.png`;
    case 'saias': return `${assetsPath}saias.png`;
    case 'casacos': return `${assetsPath}casacos.png`;
    case 'sapatos': return `${assetsPath}sapatos.png`;
    case 'shorts': return `${assetsPath}shorts.png`;
    default: return `${assetsPath}all.png`;
  }
};

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<Product> | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Report states
  const [reportProduct, setReportProduct] = useState<Product | null>(null);
  const [reportOrders, setReportOrders] = useState<(Order & { itemQty: number; itemTotal: number })[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportOriginFilter, setReportOriginFilter] = useState<'all' | 'cliente' | 'admin'>('all');
  const [reportTab, setReportTab] = useState<'sales' | 'history'>('sales');
  const [reportStatusFilter, setReportStatusFilter] = useState<string>('all');

  // Hit Goal States
  const [hitGoalProduct, setHitGoalProduct] = useState<Product | null>(null);
  const [hitGoalStock, setHitGoalStock] = useState<number>(0);
  const [shouldChargeClients, setShouldChargeClients] = useState(true);
  const [isHitGoalModalOpen, setIsHitGoalModalOpen] = useState(false);
  const [isProcessingGoal, setIsProcessingGoal] = useState(false);

  // Advanced Product Form States
  const [formSection, setFormSection] = useState<'info' | 'stock' | 'media' | 'variations'>('info');
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [tempVariation, setTempVariation] = useState({ name: '', option: '' });

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
      imageUrls: [],
      hasVariations: false,
      variations: [],
      variationsRequired: false,
      allowVariationSelection: true,
      requiredGoal: 0,
      currentGoalProgress: 0,
    });
    setExistingImageUrls(product?.imageUrls || (product?.imageUrl ? [product.imageUrl] : []));
    setNewImageFiles([]);
    setFormSection('info');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProduct) return;

    setLoading(true);
    try {
      let finalImageUrls = [...existingImageUrls];

      // Upload new images
      if (newImageFiles.length > 0) {
        setIsUploading(true);
        const uploadPromises = newImageFiles.map(async (file) => {
          const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
          const uploadResult = await uploadBytes(storageRef, file);
          return getDownloadURL(uploadResult.ref);
        });
        const uploadedUrls = await Promise.all(uploadPromises);
        finalImageUrls = [...finalImageUrls, ...uploadedUrls];
        setIsUploading(false);
      }

      const productData = {
        ...currentProduct,
        imageUrls: finalImageUrls,
        imageUrl: finalImageUrls[0] || '', // Fallback for legacy code
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
    doc.text('Saldo da Eguel', 14, 22);

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
    doc.save(`Relatório_${reportProduct.name.replace(/\s+/g, '_')}.pdf`);
  };

  const generateLabelsPDF = () => {
    if (!reportProduct || filteredReportOrders.length === 0) return;

    // Small Square Label: 50x50 mm
    const doc = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: [50, 50]
    });

    filteredReportOrders.forEach((order, index) => {
      if (index > 0) doc.addPage([50, 50], 'p');

      // Top Branding (Subtle)
      doc.setFontSize(7);
      doc.setTextColor(247, 37, 133); // Pink
      doc.setFont('helvetica', 'bold');
      doc.text('Saldo da Eguel', 25, 6, { align: 'center' });

      // Client Name (Main Focus)
      doc.setTextColor(0);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      const splitClientName = doc.splitTextToSize(order.clientName.toUpperCase(), 44);
      doc.text(splitClientName, 25, 14, { align: 'center' });

      // Divider
      doc.setDrawColor(240);
      doc.line(10, 22, 40, 22);

      // Order ID
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text('PEDIDO:', 25, 27, { align: 'center' });
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`#${order.id.slice(-6).toUpperCase()}`, 25, 34, { align: 'center' });

      // Item Detail
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(`${order.itemQty} unidades · ${reportProduct.name.slice(0, 20)}...`, 25, 42, { align: 'center' });

      // Minimal footer date
      doc.setFontSize(5);
      doc.setTextColor(180);
      doc.text(format(new Date(), "dd/MM/yy"), 25, 47, { align: 'center' });
    });

    doc.save(`Etiquetas_5x5_${reportProduct.name.replace(/\s+/g, '_')}.pdf`);
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

  const handleHitGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hitGoalProduct) return;

    setIsProcessingGoal(true);
    try {
      const historyEntry: ProductHistoryEntry = {
        type: 'goal_hit',
        message: `Meta atingida! Entrada de ${hitGoalStock} unidades no estoque. Processo resetado para novo lote.`,
        date: new Date().toISOString(),
        user: 'Admin'
      };

      // 1. Update Product
      const productRef = doc(db, 'products', hitGoalProduct.id);
      await updateDoc(productRef, {
        // Increment stock, reset progress
        availableQuantity: (hitGoalProduct.availableQuantity || 0) + hitGoalStock,
        currentGoalProgress: 0,
        goalReached: false, // Reset for next batch
        history: arrayUnion(historyEntry),
        updatedAt: new Date().toISOString()
      });

      // 2. Charge Clients (if selected)
      if (shouldChargeClients) {
        const ordersSnap = await getDocs(collection(db, 'orders'));
        const pendingOrders = ordersSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as Order))
          .filter(o => o.items.some(i => i.productId === hitGoalProduct.id && i.stockType === 'previsao_meta' && o.status !== 'cancelado'));

        for (const order of pendingOrders) {
          const updateEntry: StatusUpdate = {
            status: 'aguardando_comprovante',
            comment: `Meta atingida: ${hitGoalProduct.name}. Aguardando pagamento do saldo referente a este item.`,
            isInternal: false,
            updatedAt: new Date().toISOString(),
            updatedBy: 'Sistema Admin'
          };

          await updateDoc(doc(db, 'orders', order.id), {
            status: 'aguardando_comprovante',
            statusHistory: arrayUnion(updateEntry)
          });
        }
      }

      setIsHitGoalModalOpen(false);
      setHitGoalProduct(null);
      alert('Ação realizada com sucesso! O estoque foi atualizado e as metas reiniciadas.');
    } catch (err) {
      console.error(err);
      alert('Erro ao processar meta.');
    } finally {
      setIsProcessingGoal(false);
    }
  };

  const shareGoalWhatsApp = (product: Product) => {
    const message = `🎉 *ÓTIMAS NOTÍCIAS DA SALDO DA EGUEL!* 🛍️\n\nOlá! Passando para informar que a meta de produção do produto *${product.name.toUpperCase()}* acaba de ser atingida! ✨\n\nEle já está disponível para envio. Caso você tenha este item em um pedido pendente, o pagamento do saldo já pode ser realizado diretamente pelo nosso site. Após o pagamento, não esqueça de anexar o comprovante na área do pedido para agilizarmos sua entrega! 🚚💨\n\nConfira seus pedidos aqui: ${window.location.origin}/my-orders\n\nAgradecemos pela confiança! 💖`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
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
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Estoque e Meta ativa</th>
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
                          <Cube className="w-5 h-5" weight="light" />
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
                  <td className="px-6 py-4">
                     <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md overflow-hidden bg-gray-50 flex-shrink-0">
                           <img 
                              src={getCategoryImg(product.category)} 
                              alt={product.category} 
                              className="w-full h-full object-contain" 
                           />
                        </div>
                        <span className="text-sm text-gray-500 font-medium">{product.category}</span>
                     </div>
                   </td>
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
                    <div className="flex flex-col gap-2">
                       {/* Stock Display */}
                       {product.availableQuantity > 0 && (
                         <div className="flex items-center gap-1.5">
                            <Cube className="w-3 h-3 text-gray-400" weight="light" />
                            <span className="text-sm font-bold text-gray-900">{product.availableQuantity} un <span className="text-[10px] text-gray-400 font-medium">em estoque</span></span>
                         </div>
                       )}
                       
                       {/* Meta Display */}
                       {(product.requiredGoal || 0) > 0 && (
                         <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="bg-orange-500 h-full"
                                  style={{ width: `${Math.min(100, ((product.currentGoalProgress || 0) / (product.requiredGoal || 1)) * 100)}%` }}
                                ></div>
                              </div>
                              <span className="text-[10px] font-bold text-orange-600">{product.currentGoalProgress || 0}/{product.requiredGoal}</span>
                            </div>
                            <button
                              onClick={() => {
                                setHitGoalProduct(product);
                                setHitGoalStock(0);
                                setIsHitGoalModalOpen(true);
                              }}
                              className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 transition-colors"
                            >
                              <Lightning className="w-3 h-3 fill-emerald-600" weight="fill" /> Atingir Meta
                            </button>
                         </div>
                       )}
                       
                       {product.availableQuantity === 0 && (!product.requiredGoal || product.requiredGoal === 0) && (
                         <span className="text-xs text-gray-300 italic font-medium">Sem estoque ou meta</span>
                       )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenReport(product)}
                        className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                        title="Relatório do produto"
                      >
                        <ChartLineUp className="w-4 h-4" weight="light" />
                      </button>
                      <button
                        onClick={() => handleOpenModal(product)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="Editar produto"
                      >
                        <NotePencil className="w-4 h-4" weight="light" />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Excluir produto"
                      >
                        <Trash className="w-4 h-4" weight="light" />
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
        <div className="fixed top-[85px] bottom-[100px] md:top-0 md:bottom-0 md:left-[80px] left-0 right-0 z-[1000] flex items-center justify-center p-4 bg-black/5 backdrop-blur-md">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-xl flex flex-col max-h-full">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-start justify-between bg-white z-10 shrink-0 rounded-t-2xl">
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
                    <ChartLineUp className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Relatório Analítico</span>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">{reportProduct.name}</h2>
                  <p className="text-sm text-gray-400">{reportProduct.category} · {fmt(reportProduct.unitPrice)}</p>
                </div>
              </div>
                <button onClick={() => setReportProduct(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all">
                  <XIcon className="w-6 h-6" weight="light" />
                </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              {reportLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div>
                </div>
              ) : (
                <>
                  {/* Tab Selector */}
                  <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl w-fit mb-2">
                    <button
                      onClick={() => setReportTab('sales')}
                      className={cn(
                        "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                        reportTab === 'sales' ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
                      )}
                    >
                      Vendas
                    </button>
                    <button
                      onClick={() => setReportTab('history')}
                      className={cn(
                        "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                        reportTab === 'history' ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
                      )}
                    >
                      Histórico
                    </button>
                  </div>
                  {reportTab === 'sales' ? (
                    <>
                      {/* KPI cards - Monochromatic & Compact */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-white border border-gray-100 rounded-xl p-3">
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Pedidos</p>
                          <p className="text-xl font-bold text-gray-900 leading-none">{kpiOrders.length}</p>
                        </div>
                        <div className="bg-white border border-gray-100 rounded-xl p-3">
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Unidades</p>
                          <p className="text-xl font-bold text-gray-900 leading-none">{totalUnits}</p>
                        </div>
                        <div className="bg-white border border-gray-100 rounded-xl p-3">
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Receita</p>
                          <p className="text-xl font-bold text-gray-900 leading-none">{fmt(totalRevenue)}</p>
                        </div>
                        <div className="bg-white border border-gray-100 rounded-xl p-3">
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Clientes</p>
                          <p className="text-xl font-bold text-gray-900 leading-none">{uniqueClients}</p>
                        </div>
                      </div>

                      {/* Filters - Simplified Labels */}
                      <div className="flex items-center gap-2 py-1">
                        {(['all', 'cliente', 'admin'] as const).map(origin => (
                          <button
                            key={origin}
                            onClick={() => setReportOriginFilter(origin)}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                              reportOriginFilter === origin ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                            )}
                          >
                            {origin === 'all' ? 'Todos' : origin === 'cliente' ? 'Site' : 'Admin'}
                          </button>
                        ))}
                      </div>
                      <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Detalhamento de Vendas</h3>
                        {filteredReportOrders.length === 0 ? (
                          <div className="text-center py-10 border border-dashed border-gray-100 rounded-xl">
                             <p className="text-[11px] text-gray-400 italic">Nenhuma venda encontrada.</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                             {filteredReportOrders.map((o, idx) => (
                                <div key={idx} className="bg-white border border-gray-50 rounded-xl p-3 shadow-sm flex flex-col gap-2 group hover:border-emerald-100 transition-all">
                                   <div className="flex justify-between items-start">
                                      <div className="min-w-0">
                                         <div className="flex items-center gap-1.5 mb-0.5">
                                           <span className="text-[10px] font-black text-gray-900 group-hover:text-emerald-600 transition-colors">#{o.id.slice(-6).toUpperCase()}</span>
                                           <span className="text-[8px] text-gray-300">·</span>
                                           <span className="text-[9px] font-black text-gray-400 uppercase">{o.orderOrigin === 'admin' ? 'Admin' : 'Site'}</span>
                                         </div>
                                         <p className="text-[11px] font-bold text-gray-700 truncate">{o.clientName}</p>
                                         <p className="text-[9px] text-gray-400 font-medium">{format(new Date(o.orderDate), "dd MMM, HH:mm", { locale: ptBR })}</p>
                                      </div>
                                      <div className="text-right shrink-0">
                                         <p className="text-[11px] font-black text-emerald-600 leading-none">{fmt(o.itemTotal)}</p>
                                         <p className="text-[9px] text-gray-400 font-bold mt-1">{o.itemQty} un</p>
                                      </div>
                                   </div>
                                   <div className="flex justify-end">
                                      <div className={cn(
                                        "px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase border",
                                        statusConfig[o.status]?.color, statusConfig[o.status]?.bg, statusConfig[o.status]?.border
                                      )}>
                                        {statusConfig[o.status]?.label}
                                      </div>
                                   </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    /* History Tab */
                    <div className="space-y-4 py-2">
                       <div className="bg-gray-50/50 rounded-2xl border border-gray-100 p-6 min-h-[300px]">
                          {!reportProduct.history || reportProduct.history.length === 0 ? (
                            <div className="flex flex-col items-center justify-center pt-20 text-center">
                              <History className="w-8 h-8 text-gray-200 mb-2" />
                              <p className="text-xs text-gray-400 italic font-medium">Nenhum evento registrado no histórico.</p>
                            </div>
                          ) : (
                            <div className="space-y-6 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
                               {reportProduct.history.slice().reverse().map((h, i) => (
                                 <div key={i} className="relative pl-8">
                                    <div className="absolute left-0.5 top-1 w-3 h-3 rounded-full bg-white border-2 border-gray-900 z-10"></div>
                                    <div className="space-y-1">
                                       <div className="flex justify-between items-start">
                                          <p className="text-[10px] font-black text-gray-900 uppercase tracking-tight">{h.type === 'goal_hit' ? 'Meta Atingida' : h.type}</p>
                                          <span className="text-[9px] text-gray-400 font-medium">{format(new Date(h.date), "dd MMM, HH:mm", { locale: ptBR })}</span>
                                       </div>
                                       <p className="text-[11px] text-gray-600 leading-relaxed font-medium">"{h.message}"</p>
                                       <p className="text-[9px] text-gray-400 font-bold uppercase">Por: {h.user}</p>
                                    </div>
                                 </div>
                               ))}
                            </div>
                          )}
                       </div>
                    </div>
                  )}
                </>
              )}
            </div>
            
             {/* Modal Footer - Inline Actions Only */}
             {!reportLoading && (
                <div className="p-5 bg-white border-t border-gray-100 rounded-b-2xl flex justify-center">
                    <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
                       <button
                         onClick={() => shareGoalWhatsApp(reportProduct)}
                         className="flex items-center gap-1.5 bg-gray-50 text-gray-700 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-50 hover:text-emerald-700 transition-all border border-gray-100 whitespace-nowrap"
                       >
                         <WhatsappLogo className="w-4 h-4" weight="fill" /> WhatsApp
                       </button>
                       <button
                         onClick={generatePDF}
                         className="flex items-center gap-1.5 bg-gray-50 text-gray-700 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all border border-gray-100 whitespace-nowrap"
                       >
                         <Export className="w-4 h-4" weight="bold" /> Relatório
                       </button>
                       <button
                         onClick={generateLabelsPDF}
                         className="flex items-center gap-1.5 bg-gray-900 text-white px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all shadow-sm whitespace-nowrap"
                       >
                         <Tag className="w-4 h-4" weight="bold" /> Etiquetas
                       </button>
                    </div>
                </div>
             )}
          </div>
        </div>
      )}

      {/* PRODUCT FORM MODAL (Add/Edit) */}
      {isModalOpen && currentProduct && (
        <div className="fixed top-[85px] bottom-[100px] md:top-0 md:bottom-0 md:left-[80px] left-0 right-0 z-[1000] flex items-center justify-center p-4 bg-black/10 backdrop-blur-md overflow-hidden">
          <div className="bg-white rounded-[2.5rem] w-full max-w-5xl shadow-2xl flex flex-col h-full max-h-[85vh] border border-white/20 relative overflow-hidden animate-in fade-in zoom-in duration-300">
            
            {/* Header */}
            <div className="p-8 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white relative z-20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                  {currentProduct.id ? <Edit2 className="w-6 h-6 text-blue-600" /> : <Plus className="w-6 h-6 text-blue-600" />}
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 tracking-tight">
                    {currentProduct.id ? 'Refinar Produto' : 'Novo Produto Premium'}
                  </h2>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Painel de Configuração Avançada</p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-3 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-full transition-all active:scale-90"
              >
                <X className="w-7 h-7" weight="light" />
              </button>
            </div>

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* Sidebar Tabs / Mobile Top Nav */}
              <div className="md:w-64 w-full bg-gray-50/50 border-b md:border-b-0 md:border-r border-gray-100 p-4 md:p-6 flex flex-row md:flex-col gap-2 shrink-0 overflow-x-auto scrollbar-hide">
                {[
                  { id: 'info', label: 'Info', icon: Gear },
                  { id: 'stock', label: 'Estoque', icon: Lightning },
                  { id: 'media', label: 'Fotos', icon: Image },
                  { id: 'variations', label: 'Opções', icon: Stack },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setFormSection(tab.id as any)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all group relative outline-none shrink-0",
                      formSection === tab.id 
                        ? "bg-white text-blue-600 shadow-sm border border-gray-100" 
                        : "text-gray-400 hover:text-gray-600 hover:bg-gray-100/50"
                    )}
                  >
                    <tab.icon className={cn("w-5 h-5", formSection === tab.id ? "text-blue-600" : "text-gray-300 group-hover:text-gray-400")} />
                    <span className="hidden sm:inline">{tab.label}</span>
                    {formSection === tab.id && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-auto md:right-2 md:top-1/2 md:-translate-y-1/2 w-4 h-1 md:w-1.5 md:h-1.5 bg-blue-600 rounded-full" />}
                  </button>
                ))}
              </div>

              {/* Form Content */}
              <div className="flex-1 overflow-y-auto bg-white p-6 md:p-10 scrollbar-hide">
                <form onSubmit={handleSave} id="productForm">
                  {/* SECTION: INFO */}
                  {formSection === 'info' && (
                    <div className="space-y-6 md:space-y-8 animate-in slide-in-from-right-4 duration-300">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                         <div className="space-y-6">
                            <div>
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Nome Comercial</label>
                              <input
                                type="text"
                                required
                                value={currentProduct.name}
                                onChange={e => setCurrentProduct({ ...currentProduct, name: e.target.value })}
                                className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-blue-500 transition-all outline-none text-sm font-bold"
                                placeholder="Ex: Vestido Midi Floral Premium"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Categoria Principal</label>
                              <input
                                type="text"
                                required
                                value={currentProduct.category}
                                onChange={e => setCurrentProduct({ ...currentProduct, category: e.target.value })}
                                className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-blue-500 transition-all outline-none text-sm font-bold"
                                placeholder="Festa, Casual, Praia..."
                              />
                            </div>
                         </div>
                         <div className="space-y-6">
                            <div>
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Preço Unidade (Atacado)</label>
                              <div className="relative">
                                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 font-bold">R$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  required
                                  value={currentProduct.unitPrice}
                                  onChange={e => setCurrentProduct({ ...currentProduct, unitPrice: parseFloat(e.target.value) })}
                                  className="w-full pl-14 pr-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-blue-500 transition-all outline-none text-sm font-bold"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Status de Exibição</label>
                              <div className="flex gap-4">
                                {['active', 'inactive'].map((s) => (
                                  <button
                                    key={s}
                                    type="button"
                                    onClick={() => setCurrentProduct({ ...currentProduct, status: s as any })}
                                    className={cn(
                                      "flex-1 py-3 rounded-2xl text-xs font-black uppercase tracking-widest border-2 transition-all",
                                      currentProduct.status === s 
                                        ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100" 
                                        : "bg-white border-gray-100 text-gray-400 hover:border-gray-200 font-bold"
                                    )}
                                  >
                                    {s === 'active' ? 'Ativo' : 'Pausado'}
                                  </button>
                                ))}
                              </div>
                            </div>
                         </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Descrição Detalhada</label>
                        <textarea
                          value={currentProduct.description}
                          onChange={e => setCurrentProduct({ ...currentProduct, description: e.target.value })}
                          rows={4}
                          className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-blue-500 transition-all outline-none text-sm font-medium leading-relaxed"
                          placeholder="Descreva o tecido, caimento e detalhes especiais..."
                        ></textarea>
                      </div>
                    </div>
                  )}

                  {/* SECTION: STOCK & GOAL */}
                  {formSection === 'stock' && (
                    <div className="space-y-10 animate-in slide-in-from-right-4 duration-300">
                      <div className="bg-blue-50/50 p-8 rounded-[2rem] border border-blue-100">
                        <div className="flex items-center gap-4 mb-6">
                          <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center font-black">1</div>
                          <div>
                            <h4 className="text-sm font-black text-blue-900 uppercase">Pronta Entrega</h4>
                            <p className="text-[10px] text-blue-600 font-bold">Gerenciar estoque físico disponível agora.</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <label 
                            onClick={() => setCurrentProduct({ ...currentProduct, stockType: currentProduct.stockType === 'pronta_entrega' ? 'previsao_meta' : 'pronta_entrega' })}
                            className="flex items-center gap-4 bg-white p-5 rounded-2xl cursor-pointer border-2 border-transparent hover:border-blue-200 transition-all"
                          >
                            <div className={cn(
                              "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                              currentProduct.stockType === 'pronta_entrega' ? "bg-blue-600 border-blue-600" : "border-gray-200"
                            )}>
                              {currentProduct.stockType === 'pronta_entrega' && <Check className="w-4 h-4 text-white" />}
                            </div>
                            <span className="text-sm font-black text-gray-700">Habilitar Estoque Ativo</span>
                          </label>
                          <div className={cn("transition-all", currentProduct.stockType !== 'pronta_entrega' ? "opacity-30 pointer-events-none" : "")}>
                            <input
                              type="number"
                              value={currentProduct.availableQuantity}
                              onChange={e => setCurrentProduct({ ...currentProduct, availableQuantity: parseInt(e.target.value) })}
                              className="w-full px-6 py-4 bg-white border-2 border-gray-100 rounded-2xl outline-none text-sm font-bold focus:border-blue-500"
                              placeholder="Qtd em estoque"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="bg-orange-50/50 p-8 rounded-[2rem] border border-orange-100">
                        <div className="flex items-center gap-4 mb-6">
                          <div className="w-10 h-10 bg-orange-500 text-white rounded-xl flex items-center justify-center font-black">2</div>
                          <div>
                            <h4 className="text-sm font-black text-orange-900 uppercase">Meta de Vendas</h4>
                            <p className="text-[10px] text-orange-600 font-bold">Vender antecipadamente para atingir um lote.</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <label 
                            onClick={() => setCurrentProduct({ ...currentProduct, requiredGoal: (currentProduct.requiredGoal || 0) > 0 ? 0 : 50 })}
                            className="flex items-center gap-4 bg-white p-5 rounded-2xl cursor-pointer border-2 border-transparent hover:border-orange-200 transition-all"
                          >
                            <div className={cn(
                              "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                              (currentProduct.requiredGoal || 0) > 0 ? "bg-orange-500 border-orange-500" : "border-gray-200"
                            )}>
                              {(currentProduct.requiredGoal || 0) > 0 && <Check className="w-4 h-4 text-white" />}
                            </div>
                            <span className="text-sm font-black text-gray-700">Habilitar Meta (Lote)</span>
                          </label>
                          <div className={cn("transition-all", (!currentProduct.requiredGoal || currentProduct.requiredGoal === 0) ? "opacity-30 pointer-events-none" : "")}>
                            <input
                              type="number"
                              value={currentProduct.requiredGoal || 0}
                              onChange={e => setCurrentProduct({ ...currentProduct, requiredGoal: parseInt(e.target.value) })}
                              className="w-full px-6 py-4 bg-white border-2 border-gray-100 rounded-2xl outline-none text-sm font-bold focus:border-orange-500"
                              placeholder="Meta de unidades"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SECTION: MEDIA */}
                  {formSection === 'media' && (
                    <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                      <div className="flex flex-col items-center justify-center border-4 border-dashed border-gray-100 rounded-[2.5rem] p-12 text-center group hover:border-blue-100 transition-all bg-gray-50/50 relative overflow-hidden">
                         <Upload className="w-12 h-12 text-blue-500 mb-4 group-hover:-translate-y-2 transition-transform duration-300" />
                         <h3 className="text-lg font-black text-gray-900 mb-2">Adicionar novas fotos</h3>
                         <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-10">Você pode selecionar várias fotos de uma vez para carregar sua galeria.</p>
                         
                         <input
                          type="file"
                          multiple
                          accept="image/*"
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          onChange={e => {
                            if (e.target.files) {
                              setNewImageFiles([...newImageFiles, ...Array.from(e.target.files)]);
                            }
                          }}
                        />
                      </div>

                      <div className="space-y-4">
                         <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <ImageIcon className="w-4 h-4" /> Sua Galeria ({existingImageUrls.length + newImageFiles.length} fotos)
                         </h4>
                         <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                            {/* Existing Images */}
                            {existingImageUrls.map((url, idx) => (
                              <div key={`exist-${idx}`} className="aspect-square bg-gray-100 rounded-3xl overflow-hidden relative group shadow-sm border border-gray-200">
                                 <img src={url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                 <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 px-4 backdrop-blur-sm">
                                    <button
                                      type="button"
                                      onClick={() => setExistingImageUrls(existingImageUrls.filter((_, i) => i !== idx))}
                                      className="p-3 bg-red-600 text-white rounded-2xl hover:bg-red-700 shadow-xl active:scale-90 transition-all font-bold text-xs"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                 </div>
                              </div>
                            ))}
                            {/* New Files Preview */}
                            {newImageFiles.map((file, idx) => (
                              <div key={`new-${idx}`} className="aspect-square bg-gray-100 rounded-3xl overflow-hidden relative group border-2 border-dashed border-blue-200 shadow-xl shadow-blue-50">
                                 <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover opacity-70" />
                                 <div className="absolute top-2 right-2 bg-blue-600 text-white px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest">Aguardando</div>
                                 <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      type="button"
                                      onClick={() => setNewImageFiles(newImageFiles.filter((_, i) => i !== idx))}
                                      className="p-3 bg-red-600 text-white rounded-2xl hover:bg-red-700 active:scale-90 transition-all font-bold text-xs"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                 </div>
                              </div>
                            ))}
                         </div>
                      </div>
                    </div>
                  )}

                  {/* SECTION: VARIATIONS */}
                  {formSection === 'variations' && (
                    <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                      <div 
                        onClick={() => setCurrentProduct({ ...currentProduct, hasVariations: !currentProduct.hasVariations })}
                        className={cn(
                          "flex items-center justify-between p-8 rounded-[2.5rem] border-2 cursor-pointer transition-all",
                          currentProduct.hasVariations ? "bg-indigo-50 border-indigo-200" : "bg-gray-50 border-gray-100"
                        )}
                      >
                         <div className="flex items-center gap-5">
                            <div className={cn(
                               "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg",
                               currentProduct.hasVariations ? "bg-indigo-600 text-white shadow-indigo-100" : "bg-white text-gray-300"
                            )}>
                               <Layers className="w-7 h-7" />
                            </div>
                            <div>
                               <h4 className="text-lg font-black text-gray-900 tracking-tight">Habilitar Variações</h4>
                               <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Habilitar seleção de Cor, Tamanho, etc pelo cliente.</p>
                            </div>
                         </div>
                         <div className={cn(
                            "w-12 h-6 rounded-full relative transition-all duration-300",
                            currentProduct.hasVariations ? "bg-indigo-600" : "bg-gray-300"
                          )}>
                            <div className={cn(
                              "absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300",
                              currentProduct.hasVariations ? "left-7" : "left-1"
                            )} />
                         </div>
                      </div>

                      {currentProduct.hasVariations && (
                      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                         {/* Toggle: Allow Selection */}
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div 
                              onClick={() => setCurrentProduct({ ...currentProduct, allowVariationSelection: !currentProduct.allowVariationSelection })}
                              className={cn(
                                "flex items-center justify-between p-6 rounded-2xl border-2 cursor-pointer transition-all",
                                currentProduct.allowVariationSelection ? "bg-indigo-50 border-indigo-200" : "bg-white border-gray-100"
                              )}
                            >
                                <div className="flex items-center gap-4">
                                  <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center",
                                    currentProduct.allowVariationSelection ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-400"
                                  )}>
                                      <MousePointer2 className="w-5 h-5" />
                                  </div>
                                  <div>
                                      <p className="text-xs font-black uppercase text-gray-900">Permitir Seleção</p>
                                      <p className="text-[10px] text-gray-400 font-bold uppercase">Habilitar menu pro cliente escolher.</p>
                                    </div>
                                </div>
                                <div className={cn(
                                    "w-10 h-5 rounded-full relative transition-all duration-300",
                                    currentProduct.allowVariationSelection ? "bg-indigo-600" : "bg-gray-300"
                                  )}>
                                    <div className={cn(
                                      "absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-300",
                                      currentProduct.allowVariationSelection ? "left-6" : "left-1"
                                    )} />
                                </div>
                            </div>

                            <div 
                              onClick={() => {
                                if (!currentProduct.allowVariationSelection) return;
                                setCurrentProduct({ ...currentProduct, variationsRequired: !currentProduct.variationsRequired });
                              }}
                              className={cn(
                                "flex items-center justify-between p-6 rounded-2xl border-2 cursor-pointer transition-all",
                                currentProduct.variationsRequired ? "bg-orange-50 border-orange-200" : "bg-white border-gray-100",
                                !currentProduct.allowVariationSelection && "opacity-30 cursor-not-allowed"
                              )}
                            >
                                <div className="flex items-center gap-4">
                                  <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center",
                                    currentProduct.variationsRequired ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-400"
                                  )}>
                                      <ShieldCheck className="w-5 h-5" />
                                  </div>
                                  <div>
                                      <p className="text-xs font-black uppercase text-gray-900">Seleção Obrigatória</p>
                                      <p className="text-[10px] text-gray-400 font-bold uppercase">O cliente DEVE escolher antes de comprar.</p>
                                    </div>
                                </div>
                                <div className={cn(
                                    "w-10 h-5 rounded-full relative transition-all duration-300",
                                    currentProduct.variationsRequired ? "bg-orange-500" : "bg-gray-300"
                                  )}>
                                    <div className={cn(
                                      "absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-300",
                                      currentProduct.variationsRequired ? "left-6" : "left-1"
                                    )} />
                                </div>
                            </div>
                         </div>

                         {/* Variation Builder */}
                           <div className="bg-white border-2 border-gray-50 rounded-[2rem] p-8 shadow-sm">
                              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Monte as Variações Disponíveis</h4>
                              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
                                 <div className="md:col-span-4">
                                    <input 
                                      type="text"
                                      placeholder="Ex: Cor ou Tamanho"
                                      value={tempVariation.name}
                                      onChange={e => setTempVariation({ ...tempVariation, name: e.target.value })}
                                      className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 transition-all font-bold text-sm outline-none"
                                    />
                                 </div>
                                 <div className="md:col-span-6 flex flex-wrap gap-2 items-center bg-gray-50 p-2 rounded-2xl border-2 border-transparent focus-within:border-indigo-500 focus-within:bg-white transition-all">
                                    <input 
                                      type="text"
                                      placeholder="Opções (ex: P, Azul...)"
                                      value={tempVariation.option}
                                      onChange={e => setTempVariation({ ...tempVariation, option: e.target.value })}
                                      className="flex-1 bg-transparent border-none outline-none px-4 py-2 font-bold text-sm"
                                    />
                                 </div>
                                 <button
                                   type="button"
                                   onClick={() => {
                                     if (!tempVariation.name || !tempVariation.option) return;
                                     const existing = (currentProduct.variations || []).find(v => v.name === tempVariation.name);
                                     if (existing) {
                                        const updated = (currentProduct.variations || []).map(v => 
                                          v.name === tempVariation.name ? { ...v, options: [...v.options, tempVariation.option] } : v
                                        );
                                        setCurrentProduct({ ...currentProduct, variations: updated });
                                     } else {
                                        const newVar: ProductVariation = { name: tempVariation.name, options: [tempVariation.option] };
                                        setCurrentProduct({ ...currentProduct, variations: [...(currentProduct.variations || []), newVar] });
                                     }
                                     setTempVariation({ ...tempVariation, option: '' });
                                   }}
                                   className="md:col-span-2 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center p-4 text-xs tracking-widest uppercase"
                                 >
                                    Add
                                 </button>
                              </div>

                              {/* Current Variations Display */}
                              <div className="space-y-4 pt-6 border-t border-gray-50">
                                 {(currentProduct.variations || []).map((v, vIdx) => (
                                   <div key={vIdx} className="flex flex-col gap-3 p-5 bg-gray-50/50 rounded-2xl border border-gray-100 group">
                                      <div className="flex justify-between items-center">
                                         <span className="text-xs font-black uppercase text-indigo-600 tracking-wider flex items-center gap-2">
                                            <Settings className="w-3 h-3" /> {v.name}
                                         </span>
                                         <button 
                                            type="button"
                                            onClick={() => setCurrentProduct({ ...currentProduct, variations: (currentProduct.variations || []).filter((_, i) => i !== vIdx) })}
                                            className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                                         >
                                            <X className="w-4 h-4" />
                                         </button>
                                      </div>
                                      <div className="flex flex-wrap gap-2">
                                         {v.options.map((opt, oIdx) => (
                                           <span key={oIdx} className="bg-white border border-gray-200 px-4 py-2 rounded-xl text-[10px] font-black uppercase text-gray-700 flex items-center gap-2 shadow-sm">
                                              {opt}
                                              <button 
                                                type="button"
                                                onClick={() => {
                                                  const updated = (currentProduct.variations || []).map((vari, i) => 
                                                    i === vIdx ? { ...vari, options: vari.options.filter((_, oi) => oi !== oIdx) } : vari
                                                  );
                                                  setCurrentProduct({ ...currentProduct, variations: updated });
                                                }}
                                                className="hover:text-red-500 transition-colors"
                                              >
                                                <X className="w-3 h-3" />
                                              </button>
                                           </span>
                                         ))}
                                      </div>
                                   </div>
                                 ))}
                              </div>
                           </div>
                        </div>
                      )}
                    </div>
                  )}
                </form>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 md:p-8 bg-gray-50/80 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between shrink-0 relative z-20 gap-4">
              <div className="hidden sm:flex items-center gap-4">
                 <div className="flex -space-x-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-blue-100 flex items-center justify-center text-[10px] font-black text-blue-600">{i}</div>
                    ))}
                 </div>
                 <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Confira todas as seções antes de salvar</p>
              </div>
              <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 md:px-8 py-3 text-gray-400 font-bold text-xs tracking-widest uppercase hover:text-gray-900 transition-colors"
                >
                  Descartar
                </button>
                <button
                  form="productForm"
                  type="submit"
                  disabled={loading || isUploading}
                  className="bg-blue-600 text-white px-6 md:px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-[0.1em] hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95 w-full sm:w-auto"
                >
                  {loading ? (
                    <>
                       <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                       <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                       <ShieldCheck className="w-5 h-5" /> Publicar
                    </>
                  )}
                </button>
              </div>
            </div>
            
            {/* Background Decorative Gradient */}
            <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-blue-50/30 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none z-0"></div>
          </div>
        </div>
      )}
      {/* ============================================================
          HIT GOAL MODAL
      ============================================================ */}
      {isHitGoalModalOpen && hitGoalProduct && (
        <div className="fixed top-[85px] bottom-[100px] md:top-0 md:bottom-0 md:left-[80px] left-0 right-0 z-[1000] flex items-center justify-center p-4 bg-black/5 backdrop-blur-md">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-full animate-in fade-in zoom-in duration-300">
            {/* Header */}
            <div className="p-8 border-b border-gray-50 flex items-center justify-between shrink-0 bg-emerald-50 rounded-t-3xl">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-100">
                  <Zap className="w-8 h-8 text-emerald-600 fill-emerald-600 animate-pulse" />
                </div>
                <div>
                   <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 opacity-70">Atingir Meta de Vendas</span>
                   <h2 className="text-xl font-black text-gray-900">{hitGoalProduct.name}</h2>
                </div>
              </div>
              <button 
                onClick={() => { setIsHitGoalModalOpen(false); setHitGoalProduct(null); }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-full transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleHitGoal} className="p-8 space-y-8 overflow-y-auto">
               <div className="space-y-6">
                 <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Quantidade Produzida (Estoque Inicial)</label>
                    <div className="relative group">
                       <input
                        type="number"
                        min="0"
                        required
                        value={hitGoalStock}
                        onChange={e => setHitGoalStock(parseInt(e.target.value))}
                        className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:bg-white focus:border-emerald-500 transition-all outline-none text-lg font-bold"
                        placeholder="Ex: 50"
                      />
                      <Package className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-300 group-focus-within:text-emerald-500 transition-colors" />
                    </div>
                    <p className="mt-2 text-[10px] text-gray-400 font-medium italic">Esta quantidade será adicionada ao estoque disponível para novas vendas site.</p>
                 </div>

                 <div 
                   onClick={() => setShouldChargeClients(!shouldChargeClients)}
                   className={cn(
                     "flex items-center justify-between p-5 rounded-2xl border-2 cursor-pointer transition-all",
                     shouldChargeClients ? "bg-blue-50 border-blue-100" : "bg-gray-50 border-gray-100"
                   )}
                 >
                    <div className="flex items-center gap-4">
                       <div className={cn(
                         "w-10 h-10 rounded-xl flex items-center justify-center",
                         shouldChargeClients ? "bg-blue-100 text-blue-600" : "bg-gray-200 text-gray-400"
                       )}>
                          <DollarSign className="w-5 h-5" />
                       </div>
                       <div>
                          <p className={cn("text-xs font-black uppercase tracking-tight", shouldChargeClients ? "text-blue-700" : "text-gray-500")}>Cobrar Clientes</p>
                          <p className={cn("text-[10px] font-medium", shouldChargeClients ? "text-blue-600" : "text-gray-400")}>Habilitar pagamento do saldo nos pedidos pendentes.</p>
                       </div>
                    </div>
                    <div className={cn(
                        "w-10 h-5 rounded-full relative transition-all duration-300",
                        shouldChargeClients ? "bg-blue-500" : "bg-gray-300"
                      )}>
                        <div className={cn(
                          "absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-300",
                          shouldChargeClients ? "left-6" : "left-1"
                        )} />
                    </div>
                 </div>
               </div>

               <div className="grid grid-cols-1 gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={isProcessingGoal}
                    className="w-full py-4 bg-emerald-600 text-white font-black rounded-2xl hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
                  >
                    {isProcessingGoal ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5" /> FINALIZAR META E LIBERAR ESTOQUE
                      </>
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => shareGoalWhatsApp(hitGoalProduct)}
                    className="w-full py-4 bg-white border-2 border-emerald-500 text-emerald-600 font-black rounded-2xl hover:bg-emerald-50 transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                    <MessageCircle className="w-5 h-5" /> NOTIFICAR VIA WHATSAPP (MENSAGEM PROFISSIONAL)
                  </button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
