import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, updateDoc, doc, getDoc, increment, arrayUnion, runTransaction } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth, handleFirestoreError, OperationType } from '../../firebase';
import { Order, OrderStatus, StatusUpdate } from '../../types';
import { ClipboardList, Search, Filter, Eye, CheckCircle2, Truck, Package, XCircle, Clock, FileText, ExternalLink, Plus, User, ShieldCheck, Trash2, Upload, Loader2, Download, MessageSquare, Lock, Globe, History, X, LayoutGrid, List, ChevronUp, ChevronDown, MessageCircle, ShoppingBag } from 'lucide-react';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { statusConfig, fmt, canTransitionTo } from '../../lib/order-utils';
import { generateOrderPDF } from '../../lib/pdf-utils';
import OrderDetailsModal from '../../components/admin/OrderDetailsModal';

export default function AdminOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'product' | 'order'>('product');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [productFilter, setProductFilter] = useState('all');
  const [sellerFilter, setSellerFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [stockTypeFilter, setStockTypeFilter] = useState('all'); // all | pronta_entrega | previsao_meta
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  // Status Update Modal State
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [pendingStatusUpdate, setPendingStatusUpdate] = useState<{orderId: string, itemIdx: number, newStatus: OrderStatus, oldStatus: OrderStatus} | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [statusComment, setStatusComment] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Delete confirmation modal
  const [deleteModal, setDeleteModal] = useState<{
    order: Order;
    restoreStock: boolean | null; // null = not yet decided
  } | null>(null);
  const [isDeletingOrder, setIsDeletingOrder] = useState(false);

  // Cancel item stock modal
  const [cancelItemModal, setCancelItemModal] = useState<{
    orderId: string;
    itemIdx: number;
    newStatus: OrderStatus;
    currentStatus: OrderStatus;
    itemName: string;
    quantity: number;
    stockType: string;
  } | null>(null);
  const [isCancellingItem, setIsCancellingItem] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('orderDate', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Filter out soft-deleted orders
      setOrders(snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Order))
        .filter(o => !(o as any).deletedAt)
      );
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });
    return () => unsubscribe();
  }, []);

  const handleUpdateStatusClick = (orderId: string, newStatus: OrderStatus) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    // RISCO-10: validate state machine before opening modal
    if (!canTransitionTo(order.status, newStatus)) {
      alert(`Transição não permitida: "${statusConfig[order.status]?.label}" → "${statusConfig[newStatus]?.label}".`);
      return;
    }
    setPendingStatusUpdate({ orderId, newStatus, itemIdx: -1, oldStatus: order.status });
    setShowStatusModal(true);
    setStatusComment('');
    setIsInternalComment(true);
  };

  const confirmStatusUpdate = async () => {
    if (!pendingStatusUpdate || !auth.currentUser) return;
    
    setIsUpdatingStatus(true);
    try {
      const adminDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      const adminName = adminDoc.data()?.name || auth.currentUser.email || 'Admin';
      
      const updateEntry: StatusUpdate = {
        status: pendingStatusUpdate.newStatus,
        isInternal: isInternalComment,
        updatedAt: new Date().toISOString(),
        updatedBy: adminName,
      };

      if (statusComment.trim()) {
        updateEntry.comment = statusComment.trim();
      }

      await updateDoc(doc(db, 'orders', pendingStatusUpdate.orderId), {
        status: pendingStatusUpdate.newStatus,
        statusHistory: arrayUnion(updateEntry)
      });

      if (selectedOrder?.id === pendingStatusUpdate.orderId) {
        setSelectedOrder({ 
          ...selectedOrder, 
          status: pendingStatusUpdate.newStatus,
          statusHistory: [...(selectedOrder.statusHistory || []), updateEntry]
        });
      }

      setShowStatusModal(false);
      setPendingStatusUpdate(null);
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleUpdateItemStatus = async (orderId: string, itemIdx: number, newStatus: OrderStatus, currentStatus: OrderStatus) => {
    if (!auth.currentUser) return;

    if (!canTransitionTo(currentStatus, newStatus)) {
      alert(`Ação não permitida. Não é possível mudar de "${statusConfig[currentStatus]?.label}" para "${statusConfig[newStatus]?.label}".`);
      return;
    }

    // If cancelling an item, show smart modal asking about stock
    if (newStatus === 'cancelado') {
      const order = orders.find(o => o.id === orderId);
      const item = order?.items[itemIdx];
      if (item) {
        setCancelItemModal({
          orderId,
          itemIdx,
          newStatus,
          currentStatus,
          itemName: item.productName,
          quantity: item.quantity,
          stockType: item.stockType || 'pronta_entrega',
        });
        return;
      }
    }

    await _doUpdateItemStatus(orderId, itemIdx, newStatus, false);
  };

  const _doUpdateItemStatus = async (orderId: string, itemIdx: number, newStatus: OrderStatus, restoreStock: boolean) => {
    if (!auth.currentUser) return;
    setIsCancellingItem(true);
    try {
      const orderRef = doc(db, 'orders', orderId);
      const orderSnap = await getDoc(orderRef);
      if (!orderSnap.exists()) return;

      const orderData = orderSnap.data() as Order;
      const updatedItems = [...orderData.items];
      const item = updatedItems[itemIdx];
      const itemName = item.productName;

      const adminDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      const adminName = adminDoc.data()?.name || auth.currentUser.email || 'Admin';

      // RISCO-12: update item.history
      const newHistoryEntry = {
        timestamp: new Date().toISOString(),
        actionType: 'STATUS_CHANGE',
        description: `Status alterado de "${statusConfig[item.status]?.label}" para "${statusConfig[newStatus]?.label}"${restoreStock ? '. Estoque restaurado.' : ''}.`,
        userEmail: adminName,
      };

      updatedItems[itemIdx] = {
        ...item,
        status: newStatus,
        history: [...(item.history || []), newHistoryEntry],
      };

      const updateEntry: StatusUpdate = {
        status: newStatus,
        comment: `Item [${itemName}]: Status alterado para ${statusConfig[newStatus]?.label}${restoreStock ? '. Estoque restaurado.' : ''}`,
        isInternal: true,
        updatedAt: new Date().toISOString(),
        updatedBy: adminName,
      };

      await updateDoc(orderRef, {
        items: updatedItems,
        statusHistory: arrayUnion(updateEntry),
      });

      // RISCO-11: Restore stock — wrap meta reversal in runTransaction
      if (restoreStock && item.stockType === 'pronta_entrega') {
        const productRef = doc(db, 'products', item.productId);
        await runTransaction(db, async (tx) => {
          const snap = await tx.get(productRef);
          if (!snap.exists()) return;
          tx.update(productRef, { availableQuantity: (snap.data().availableQuantity || 0) + item.quantity });
        });
      } else if (restoreStock && item.stockType === 'previsao_meta') {
        const productRef = doc(db, 'products', item.productId);
        await runTransaction(db, async (tx) => {
          const snap = await tx.get(productRef);
          if (!snap.exists()) return;
          const newProgress = Math.max(0, (snap.data().currentGoalProgress || 0) - item.quantity);
          tx.update(productRef, {
            currentGoalProgress: newProgress,
            goalReached: false,
          });
        });
      }

      if (selectedOrder?.id === orderId) {
        setSelectedOrder({
          ...selectedOrder,
          items: updatedItems,
          statusHistory: [...(selectedOrder.statusHistory || []), updateEntry],
        });
      }

      setCancelItemModal(null);
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar status do item.');
    } finally {
      setIsCancellingItem(false);
    }
  };


  const handleDeleteOrder = (order: Order) => {
    setDeleteModal({ order, restoreStock: null });
  };

  const confirmDeleteOrder = async (restoreStock: boolean) => {
    if (!deleteModal) return;
    const { order } = deleteModal;
    setIsDeletingOrder(true);
    try {
      const orderRef = doc(db, 'orders', order.id);

      // Restore stock if requested, for ALL items regardless of status
      if (restoreStock) {
        for (const item of order.items) {
          const productRef = doc(db, 'products', item.productId);
          const productSnap = await getDoc(productRef);
          if (productSnap.exists()) {
            const pData = productSnap.data();
            if (pData.stockType === 'previsao_meta') {
              await updateDoc(productRef, {
                currentGoalProgress: increment(-item.quantity),
              });
            } else if (pData.stockType === 'pronta_entrega') {
              await updateDoc(productRef, {
                availableQuantity: increment(item.quantity),
              });
            }
          }
        }
      }

      // RISCO-13: Soft-delete with full audit trail
      const adminRef = auth.currentUser ? doc(db, 'users', auth.currentUser.uid) : null;
      const adminName = adminRef
        ? (await getDoc(adminRef)).data()?.name || auth.currentUser?.email || 'Admin'
        : 'Admin';

      const deletionAuditEntry: StatusUpdate = {
        status: order.status,
        comment: `Pedido excluído por ${adminName}. Estoque ${restoreStock ? 'restituido' : 'NÃO restituído'}.`,
        isInternal: true,
        updatedAt: new Date().toISOString(),
        updatedBy: adminName,
      };

      await updateDoc(orderRef, {
        deletedAt: new Date().toISOString(),
        deletedBy: adminName,
        stockRestored: restoreStock,
        statusHistory: arrayUnion(deletionAuditEntry),
      });

      setDeleteModal(null);
      if (selectedOrder?.id === order.id) setSelectedOrder(null);
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir pedido.');
    } finally {
      setIsDeletingOrder(false);
    }
  };

  const productItems = useMemo(() => {
    const items: any[] = [];
    orders.forEach(order => {
      order.items.forEach((item, idx) => {
        items.push({
          ...item,
          orderId: order.id,
          orderDate: order.orderDate,
          clientName: order.clientName,
          clientPhone: order.clientPhone,
          sellerName: order.sellerName,
          orderOrigin: order.orderOrigin,
          itemIdx: idx,
          currentStatus: item.status || order.status || 'aguardando_pagamento',
        });
      });
    });
    return items.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
  }, [orders]);

  const uniqueClients = useMemo(() => {
    const clients = new Set(orders.map(o => o.clientName));
    return Array.from(clients).sort();
  }, [orders]);

  const uniqueProducts = useMemo(() => {
    const products = new Set<string>();
    orders.forEach(o => o.items.forEach(i => products.add(i.productName)));
    return Array.from(products).sort();
  }, [orders]);

  const uniqueSellers = useMemo(() => {
    const sellers = new Set<string>();
    orders.forEach(o => { if (o.sellerName) sellers.add(o.sellerName); });
    return Array.from(sellers).sort();
  }, [orders]);

  const filteredOrders = useMemo(() => orders.filter(o => {
    const matchesSearch = o.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (o.sellerName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClient = clientFilter === 'all' || o.clientName === clientFilter;
    const matchesSeller = sellerFilter === 'all' || o.sellerName === sellerFilter;
    const matchesStockType = stockTypeFilter === 'all' ||
      (stockTypeFilter === 'pronta_entrega' && o.items.some(i => (i.stockType || 'pronta_entrega') === 'pronta_entrega')) ||
      (stockTypeFilter === 'previsao_meta' && o.items.some(i => i.stockType === 'previsao_meta'));
    const matchesDateFrom = !dateFrom || new Date(o.orderDate) >= new Date(dateFrom);
    const matchesDateTo = !dateTo || new Date(o.orderDate) <= new Date(dateTo + 'T23:59:59');

    return matchesSearch && matchesClient && matchesSeller && matchesStockType && matchesDateFrom && matchesDateTo;
  }), [orders, searchTerm, clientFilter, sellerFilter, stockTypeFilter, dateFrom, dateTo]);

  const filteredProducts = useMemo(() => productItems.filter(p => {
    const matchesSearch = p.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.orderId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.currentStatus === statusFilter;
    const matchesClient = clientFilter === 'all' || p.clientName === clientFilter;
    const matchesProduct = productFilter === 'all' || p.productName === productFilter;

    return matchesSearch && matchesStatus && matchesClient && matchesProduct;
  }), [productItems, searchTerm, statusFilter, clientFilter, productFilter]);

  const generateListPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    doc.setFontSize(18);
    doc.setTextColor(247, 37, 133);
    doc.text('Saldo da Kricia', 14, 18);
    doc.setFontSize(9);
    doc.setTextColor(100);
    const viewLabel = viewMode === 'order' ? 'Listagem de Pedidos' : 'Listagem por Produto';
    doc.text(viewLabel, 14, 25);
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth - 14, 25, { align: 'right' });

    // Active filters summary
    const activeFilters: string[] = [];
    if (clientFilter !== 'all') activeFilters.push(`Cliente: ${clientFilter}`);
    if (sellerFilter !== 'all') activeFilters.push(`Vendedor: ${sellerFilter}`);
    if (statusFilter !== 'all') activeFilters.push(`Status: ${statusConfig[statusFilter as OrderStatus]?.label}`);
    if (productFilter !== 'all') activeFilters.push(`Produto: ${productFilter}`);
    if (stockTypeFilter !== 'all') activeFilters.push(`Tipo: ${stockTypeFilter === 'pronta_entrega' ? 'Pronta Entrega' : 'Meta/Previsfao'}`);
    if (dateFrom) activeFilters.push(`De: ${dateFrom}`);
    if (dateTo) activeFilters.push(`Até: ${dateTo}`);

    if (activeFilters.length > 0) {
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Filtros: ${activeFilters.join(' | ')}`, 14, 31);
    }

    if (viewMode === 'order') {
      autoTable(doc, {
        startY: activeFilters.length > 0 ? 38 : 32,
        head: [['ID', 'Data', 'Cliente', 'Vendedor', 'Itens', 'Total', 'Status Items']],
        body: filteredOrders.map(o => [
          `#${o.id.slice(-6).toUpperCase()}`,
          format(new Date(o.orderDate), 'dd/MM/yy'),
          o.clientName,
          o.sellerName || '-',
          `${o.items.length} item(ns)`,
          new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(o.totalValue),
          [...new Set(o.items.map(i => statusConfig[i.status as OrderStatus]?.label || 'Aguardando'))].join(', '),
        ]),
        headStyles: { fillColor: [247, 37, 133], textColor: 255, fontSize: 8 },
        styles: { fontSize: 7, cellPadding: 2 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      });
    } else {
      autoTable(doc, {
        startY: activeFilters.length > 0 ? 38 : 32,
        head: [['Produto', 'Cliente', 'Qtd', 'Valor', 'Status', 'Data']],
        body: filteredProducts.map(p => [
          p.productName,
          p.clientName,
          `${p.quantity}x`,
          new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.unitPrice * p.quantity),
          statusConfig[p.currentStatus as OrderStatus]?.label || p.currentStatus,
          format(new Date(p.orderDate), 'dd/MM/yy'),
        ]),
        headStyles: { fillColor: [247, 37, 133], textColor: 255, fontSize: 8 },
        styles: { fontSize: 7, cellPadding: 2 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      });
    }

    const totalRow = viewMode === 'order'
      ? `Total: ${filteredOrders.length} pedidos`
      : `Total: ${filteredProducts.length} itens`;

    const finalY = (doc as any).lastAutoTable?.finalY || 60;
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(totalRow, 14, finalY + 8);

    const filename = viewMode === 'order' ? `pedidos_${format(new Date(), 'ddMMyy')}.pdf` : `produtos_${format(new Date(), 'ddMMyy')}.pdf`;
    doc.save(filename);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-gray-100 pb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
              Gestão <span className="text-gray-400 font-normal">de Pedidos</span>
            </h1>
            <p className="text-gray-500 text-sm mt-1">Acompanhe e gerencie o fluxo de entrega de vendas.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={generateListPDF}
              className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-100 transition-all"
            >
              <Download className="w-4 h-4" /> Exportar Lista
            </button>
            <button
              onClick={() => navigate('/admin/new-order')}
              className="btn-action-premium shrink-0"
            >
              <Plus className="w-4 h-4" /> Novo Pedido
            </button>
          </div>
        </div>

      {/* --- VIEW MODE TOGGLE --- */}
      <div className="flex w-fit bg-gray-100 p-1 rounded-xl mb-6">
        <button
          onClick={() => setViewMode('product')}
          className={cn(
            "px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
            viewMode === 'product' ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
          )}
        >
          <Package className="w-3.5 h-3.5" /> Produto
        </button>
        <button
          onClick={() => setViewMode('order')}
          className={cn(
            "px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
            viewMode === 'order' ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
          )}
        >
          <List className="w-3.5 h-3.5" /> Pedido
        </button>
      </div>

      {/* --- MOBILE FILTERS TOGGLE --- */}
      <button 
        onClick={() => setShowMobileFilters(!showMobileFilters)}
        className="md:hidden w-full flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 shadow-sm mb-4"
      >
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-bold uppercase tracking-widest text-gray-700">Filtros Avançados</span>
        </div>
        {showMobileFilters ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {/* --- FILTERS: conditional by view mode --- */}
      <div className={cn(
        "bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-6",
        !showMobileFilters && "hidden md:block"
      )}>
        {/* Shared: search bar */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder={viewMode === 'product' ? "Buscar por produto, cliente ou ID..." : "Buscar por cliente, vendedor ou ID..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        {viewMode === 'order' ? (
          /* ---- ORDER VIEW FILTERS ---- */
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400 shrink-0" />

            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todos Clientes</option>
              {uniqueClients.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <select
              value={sellerFilter}
              onChange={(e) => setSellerFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todos Vendedores</option>
              {uniqueSellers.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <select
              value={stockTypeFilter}
              onChange={(e) => setStockTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todos os Tipos</option>
              <option value="pronta_entrega">Pronta Entrega</option>
              <option value="previsao_meta">Previsão / Meta</option>
            </select>

            <div className="flex items-center gap-1">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold focus:ring-blue-500 focus:border-blue-500"
                title="Data inicial"
              />
              <span className="text-gray-300 text-xs">até</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold focus:ring-blue-500 focus:border-blue-500"
                title="Data final"
              />
            </div>

            {(clientFilter !== 'all' || sellerFilter !== 'all' || stockTypeFilter !== 'all' || dateFrom || dateTo) && (
              <button
                onClick={() => { setClientFilter('all'); setSellerFilter('all'); setStockTypeFilter('all'); setDateFrom(''); setDateTo(''); }}
                className="px-3 py-2 border border-red-100 bg-red-50 text-red-500 rounded-xl text-xs font-bold hover:bg-red-100 transition-all"
              >
                Limpar
              </button>
            )}
          </div>
        ) : (
          /* ---- PRODUCT VIEW FILTERS ---- */
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400 shrink-0" />

            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todos Clientes</option>
              {uniqueClients.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <select
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todos Produtos</option>
              {uniqueProducts.map(p => <option key={p} value={p}>{p}</option>)}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todos Status</option>
              {Object.entries(statusConfig).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>

            {(clientFilter !== 'all' || productFilter !== 'all' || statusFilter !== 'all') && (
              <button
                onClick={() => { setClientFilter('all'); setProductFilter('all'); setStatusFilter('all'); }}
                className="px-3 py-2 border border-red-100 bg-red-50 text-red-500 rounded-xl text-xs font-bold hover:bg-red-100 transition-all"
              >
                Limpar
              </button>
            )}
          </div>
        )}
      </div>

      {viewMode === 'order' ? (
        <div className="md:bg-white md:rounded-xl md:border md:border-gray-100 md:shadow-sm overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">ID / Data</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Cliente</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Vendedor</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Origem</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredOrders.map((order) => {
                  return (
                    <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-gray-900">#{order.id.slice(-6).toUpperCase()}</p>
                        <p className="text-[10px] text-gray-400">{format(new Date(order.orderDate), 'dd/MM/yyyy HH:mm')}</p>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-700">{order.clientName}</td>
                      <td className="px-6 py-4">
                        {order.sellerName ? (
                          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                            {order.sellerName}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300 italic">Sem vendedor</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-gray-900">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                              order.items
                                .filter(i => i.status !== 'cancelado')
                                .reduce((s, i) => s + i.quantity * i.unitPrice, 0)
                            )}
                          </span>
                          {(order.totalPending || 0) > 0 && (
                            <span className="text-[9px] font-black text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full w-fit mt-1 border border-orange-100">
                              PENDENTE: {fmt(order.totalPending || 0)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {(() => {
                           const config = statusConfig[order.status] || statusConfig.aguardando_pagamento;
                           const IconComp = config.icon;
                           return (
                            <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border", config.bg, config.border, config.color)}>
                              <IconComp className="w-3.5 h-3.5" />
                              <span className="text-[10px] font-bold uppercase tracking-wider">{config.label}</span>
                            </div>
                           )
                        })()}
                      </td>
                      <td className="px-6 py-4">
                        {order.orderOrigin === 'admin' ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-purple-600 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-full w-fit">
                            <ShieldCheck className="w-3 h-3" /> Admin
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full w-fit">
                            <User className="w-3 h-3" /> Cliente
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="Ver Detalhes"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteOrder(order)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Excluir Pedido"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile View: Order Cards */}
          <div className="md:hidden space-y-4">
            {filteredOrders.map((order) => {
              const config = statusConfig[order.status] || statusConfig.aguardando_pagamento;
              const totalVal = order.items
                                .filter(i => i.status !== 'cancelado')
                                .reduce((s, i) => s + i.quantity * i.unitPrice, 0);

              return (
                <div key={order.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100">
                        <ShoppingBag className="w-5 h-5 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-gray-900">#{order.id.slice(-6).toUpperCase()}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{format(new Date(order.orderDate), 'dd/MM/yyyy HH:mm')}</p>
                      </div>
                    </div>
                    <div className={cn("px-2.5 py-1 rounded-lg border", config.bg, config.border, config.color)}>
                      <span className="text-[9px] font-black uppercase tracking-wider">{config.label}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-4 border-y border-gray-50">
                    <div>
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Cliente</span>
                      <p className="text-xs font-bold text-gray-900 truncate">{order.clientName}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Valor Total</span>
                      <p className="text-sm font-black text-brand-pink">{fmt(totalVal)}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex flex-col">
                       <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Vendedor</span>
                       <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 w-fit">
                         {order.sellerName || 'Sem vendedor'}
                       </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="bg-gray-900 text-white p-2.5 rounded-xl shadow-lg shadow-gray-200 active:scale-95 transition-all"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteOrder(order)}
                        className="bg-white text-red-500 p-2.5 rounded-xl border border-red-100 active:scale-95 transition-all"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="md:bg-white md:rounded-xl md:border md:border-gray-100 md:shadow-sm overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Produto</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Cliente/Pedido</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Qtd</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Valor</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Ação Rápida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredProducts.map((item, index) => {
                  const config = statusConfig[item.currentStatus as OrderStatus] || statusConfig.aguardando_pagamento;
                  
                  return (
                    <tr key={`${item.orderId}-${item.itemIdx}-${index}`} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex-shrink-0 overflow-hidden flex items-center justify-center">
                            {item.imageUrl ? (
                              <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900 line-clamp-1">{item.productName}</p>
                            {item.stockType === 'previsao_meta' && (
                              <span className="text-[9px] font-black text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full border border-orange-100 mt-0.5 inline-block">
                                META
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-gray-900">{item.clientName}</p>
                        <button 
                          onClick={() => {
                            const order = orders.find(o => o.id === item.orderId);
                            if (order) setSelectedOrder(order);
                          }}
                          className="text-[10px] text-blue-600 hover:underline font-mono"
                        >
                          Pedido #{item.orderId.slice(-6).toUpperCase()}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-700">
                        {item.quantity}x
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900">
                        {fmt(item.unitPrice * item.quantity)}
                      </td>
                      <td className="px-6 py-4">
                        <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border", config.bg, config.border, config.color)}>
                        {(() => {
                          const IconComp = config.icon;
                          return <IconComp className="w-3.5 h-3.5" />;
                        })()}
                          <span className="text-[10px] font-bold uppercase tracking-wider">{config.label}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <select
                          value={item.currentStatus}
                          onChange={(e) => handleUpdateItemStatus(item.orderId, item.itemIdx, e.target.value as OrderStatus, item.currentStatus as OrderStatus)}
                          className={cn(
                            "text-xs font-bold rounded-lg border px-2 py-1.5 outline-none cursor-pointer transition-colors w-36",
                            config.color, config.border, config.bg, "focus:ring-2 focus:ring-blue-500"
                          )}
                        >
                          <option value="aguardando_pagamento">Aguardando Pagamento</option>
                          <option value="pagamento_confirmado">Pagamento Confirmado</option>
                          <option value="separacao">Em Separação</option>
                          <option value="entregue">Entregue</option>
                          <option value="cancelado">Cancelado</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile View: Product Item Cards */}
          <div className="md:hidden space-y-4">
            {filteredProducts.map((item, index) => {
              const config = statusConfig[item.currentStatus as OrderStatus] || statusConfig.aguardando_pagamento;
              
              return (
                <div key={`${item.orderId}-${item.itemIdx}-${index}`} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 flex-shrink-0 overflow-hidden flex items-center justify-center p-1">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt="" className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        <Package className="w-6 h-6 text-gray-300" />
                      )}
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-black text-gray-900 leading-tight line-clamp-2">{item.productName}</p>
                        <div className={cn("px-2 py-0.5 rounded-lg border shrink-0", config.bg, config.border, config.color)}>
                          <span className="text-[9px] font-black uppercase tracking-wider">{config.label}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] font-black text-gray-400 uppercase bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">Qtd: {item.quantity}x</span>
                        {item.stockType === 'previsao_meta' && (
                          <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-100 uppercase tracking-widest">META</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-4 border-y border-gray-50">
                    <div>
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Cliente / Pedido</span>
                      <p className="text-xs font-bold text-gray-900 truncate">{item.clientName}</p>
                      <button 
                        onClick={() => {
                          const order = orders.find(o => o.id === item.orderId);
                          if (order) setSelectedOrder(order);
                        }}
                        className="text-[10px] text-blue-600 font-black uppercase tracking-widest hover:underline mt-1 block"
                      >
                        #{item.orderId.slice(-6).toUpperCase()}
                      </button>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Subtotal</span>
                      <p className="text-sm font-black text-gray-900">{fmt(item.unitPrice * item.quantity)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <div className="flex-grow">
                       <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1 ml-1">Atualizar Status</label>
                       <select
                         value={item.currentStatus}
                         onChange={(e) => handleUpdateItemStatus(item.orderId, item.itemIdx, e.target.value as OrderStatus, item.currentStatus as OrderStatus)}
                         className={cn(
                           "w-full text-[10px] font-black uppercase rounded-xl border px-4 py-3 outline-none cursor-pointer shadow-sm transition-all",
                           config.color, config.border, config.bg
                         )}
                       >
                         <option value="aguardando_pagamento">Status</option>
                         <option value="pagamento_confirmado">Pago</option>
                         <option value="separacao">Separação</option>
                         <option value="entregue">Entregue</option>
                         <option value="cancelado">Cancelado</option>
                       </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>

      {/* Confirmation Modal for Status Update */}
      {showStatusModal && pendingStatusUpdate && (
        <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh] animate-in slide-in-from-bottom duration-300">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between shrink-0">
              <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Atualizar Status</h3>
              <button 
                onClick={() => { setShowStatusModal(false); setPendingStatusUpdate(null); }}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto">
              <div className="bg-gray-900 p-5 rounded-2xl border border-gray-800 flex items-center justify-between shrink-0 shadow-xl shadow-gray-200">
                <div>
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Novo Status</p>
                  <p className="text-sm font-black text-white">{statusConfig[pendingStatusUpdate.newStatus]?.label}</p>
                </div>
                <div className="bg-brand-pink p-3 rounded-xl shadow-lg shadow-brand-pink/20">
                  {(() => {
                    const IconComp = statusConfig[pendingStatusUpdate.newStatus]?.icon || Package;
                    return <IconComp className="w-5 h-5 text-white" />;
                  })()}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipo de Comentário</label>
                  <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                      onClick={() => setIsInternalComment(true)}
                      className={cn("px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all", isInternalComment ? "bg-white text-gray-900 shadow-sm" : "text-gray-400")}
                    >Interno</button>
                    <button
                      onClick={() => setIsInternalComment(false)}
                      className={cn("px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all", !isInternalComment ? "bg-white text-gray-900 shadow-sm" : "text-gray-400")}
                    >Público</button>
                  </div>
                </div>

                <div className="relative">
                  <MessageSquare className="absolute left-4 top-4 w-4 h-4 text-gray-400" />
                  <textarea
                    placeholder="Adicione uma nota sobre esta mudança..."
                    value={statusComment}
                    onChange={(e) => setStatusComment(e.target.value)}
                    className="w-full pl-11 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-gray-900 transition-all text-sm font-medium resize-none min-h-[100px]"
                  />
                </div>

                <div 
                  onClick={() => setIsInternalComment(!isInternalComment)}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all",
                    isInternalComment ? "bg-amber-50 border-amber-100" : "bg-emerald-50 border-emerald-100"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-xl",
                      isInternalComment ? "bg-amber-100" : "bg-emerald-100"
                    )}>
                      {isInternalComment ? <Lock className="w-4 h-4 text-amber-600" /> : <Globe className="w-4 h-4 text-emerald-600" />}
                    </div>
                    <div>
                      <p className={cn("text-xs font-bold", isInternalComment ? "text-amber-700" : "text-emerald-700")}>
                        {isInternalComment ? "Comentário Interno" : "Comentário Público"}
                      </p>
                      <p className={cn("text-[10px] opacity-70", isInternalComment ? "text-amber-600" : "text-emerald-600")}>
                        {isInternalComment ? "Apenas você verá este comentário." : "O cliente poderá ver este comentário."}
                      </p>
                    </div>
                  </div>
                  <div className={cn(
                    "w-10 h-5 rounded-full relative transition-all duration-300",
                    isInternalComment ? "bg-amber-400" : "bg-emerald-400"
                  )}>
                    <div className={cn(
                      "absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-300",
                      isInternalComment ? "left-6" : "left-1"
                    )} />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => { setShowStatusModal(false); setPendingStatusUpdate(null); }}
                className="flex-grow py-3 px-4 border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-white transition-all text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={confirmStatusUpdate}
                disabled={isUpdatingStatus}
                className="flex-grow py-3 px-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 text-sm disabled:opacity-50"
              >
                {isUpdatingStatus ? "Salvando..." : "Confirmar Mudança"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailsModal 
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onUpdateItemStatus={handleUpdateItemStatus}
        />
      )}
      {/* ============================================================
          DELETE ORDER MODAL (Soft Delete + Stock Decision)
      ============================================================ */}
      {deleteModal && (
        <div className="fixed top-[85px] bottom-[100px] md:top-0 md:bottom-0 md:left-[80px] left-0 right-0 z-[1000] flex items-center justify-center p-4 bg-black/5 backdrop-blur-md">
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Excluir Pedido</h3>
                  <p className="text-xs text-gray-400">#{deleteModal.order.id.slice(-6).toUpperCase()} · {deleteModal.order.clientName}</p>
                </div>
              </div>
              <button
                onClick={() => setDeleteModal(null)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-800 font-medium">
                O pedido será arquivado e removido da listagem. Esta ação pode ser revertida pelo suporte.
              </div>

              <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Itens do Pedido</p>
                {deleteModal.order.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-xs font-medium text-gray-700">
                    <span>{item.productName}</span>
                    <span className="font-bold">{item.quantity} un</span>
                  </div>
                ))}
              </div>

              <p className="text-sm font-bold text-gray-900 pt-1">
                Deseja devolver o estoque dos itens deste pedido?
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => confirmDeleteOrder(true)}
                  disabled={isDeletingOrder}
                  className="flex flex-col items-center gap-1.5 px-4 py-4 bg-emerald-50 border-2 border-emerald-200 text-emerald-700 rounded-xl hover:border-emerald-400 transition-all disabled:opacity-50"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-xs font-bold">Sim, devolver estoque</span>
                </button>
                <button
                  onClick={() => confirmDeleteOrder(false)}
                  disabled={isDeletingOrder}
                  className="flex flex-col items-center gap-1.5 px-4 py-4 bg-gray-50 border-2 border-gray-200 text-gray-600 rounded-xl hover:border-gray-400 transition-all disabled:opacity-50"
                >
                  <XCircle className="w-5 h-5" />
                  <span className="text-xs font-bold">Não devolver</span>
                </button>
              </div>

              {isDeletingOrder && (
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500 py-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Processando...
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          CANCEL ITEM MODAL (Stock Decision)
      ============================================================ */}
      {cancelItemModal && (
        <div className="fixed top-[85px] bottom-[100px] md:top-0 md:bottom-0 md:left-[80px] left-0 right-0 z-[1001] flex items-center justify-center p-4 bg-black/5 backdrop-blur-md">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center">
                  <XCircle className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Cancelar Item</h3>
                  <p className="text-[11px] text-gray-400 truncate max-w-[180px]">{cancelItemModal.itemName}</p>
                </div>
              </div>
              <button
                onClick={() => setCancelItemModal(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm font-bold text-gray-800 text-center">
                {cancelItemModal.quantity} unidade{cancelItemModal.quantity !== 1 ? 's' : ''} serão canceladas
              </div>

              {cancelItemModal.stockType === 'pronta_entrega' ? (
                <p className="text-sm font-bold text-gray-900 text-center">
                  Devolver {cancelItemModal.quantity} unidade{cancelItemModal.quantity !== 1 ? 's' : ''} ao estoque?
                </p>
              ) : (
                <p className="text-sm font-bold text-gray-900 text-center">
                  Reverter {cancelItemModal.quantity} unidade{cancelItemModal.quantity !== 1 ? 's' : ''} do progresso da meta?
                </p>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => _doUpdateItemStatus(cancelItemModal.orderId, cancelItemModal.itemIdx, cancelItemModal.newStatus, true)}
                  disabled={isCancellingItem}
                  className="flex flex-col items-center gap-1 px-3 py-3 bg-emerald-50 border-2 border-emerald-200 text-emerald-700 rounded-xl hover:border-emerald-400 transition-all disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-[10px] font-bold">Sim, devolver</span>
                </button>
                <button
                  onClick={() => _doUpdateItemStatus(cancelItemModal.orderId, cancelItemModal.itemIdx, cancelItemModal.newStatus, false)}
                  disabled={isCancellingItem}
                  className="flex flex-col items-center gap-1 px-3 py-3 bg-gray-50 border-2 border-gray-200 text-gray-600 rounded-xl hover:border-gray-400 transition-all disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  <span className="text-[10px] font-bold">Não devolver</span>
                </button>
              </div>

              <button
                onClick={() => setCancelItemModal(null)}
                className="w-full text-center text-xs text-gray-400 hover:text-gray-600 py-1 transition-colors"
              >
                Cancelar ação
              </button>

              {isCancellingItem && (
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" /> Processando...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// UI Fixed and structurally validated
