import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, updateDoc, doc, deleteDoc, getDoc, increment, arrayUnion } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth, handleFirestoreError, OperationType } from '../../firebase';
import { Order, OrderStatus, StatusUpdate } from '../../types';
import { ClipboardList, Search, Filter, Eye, CheckCircle2, Truck, Package, XCircle, Clock, FileText, ExternalLink, Plus, User, ShieldCheck, Trash2, Upload, Loader2, Download, MessageSquare, Lock, Globe, History, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const statusConfig = {
  aguardando_pagamento: { label: 'Aguardando Pagamento', icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
  aguardando_comprovante: { label: 'Aguardando Comprovante', icon: Upload, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
  confirmando_pagamento: { label: 'Confirmando Pagamento', icon: Search, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
  pagamento_confirmado: { label: 'Pagamento Confirmado', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  separacao: { label: 'Em Separação', icon: Package, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
  entregue: { label: 'Entregue', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
  cancelado: { label: 'Cancelado', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
};

export default function AdminOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  // Status Update Modal State
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [pendingStatusUpdate, setPendingStatusUpdate] = useState<{orderId: string, newStatus: OrderStatus} | null>(null);
  const [statusComment, setStatusComment] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('orderDate', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });
    return () => unsubscribe();
  }, []);

  const handleUpdateStatusClick = (orderId: string, newStatus: OrderStatus) => {
    const order = orders.find(o => o.id === orderId);
    if (order?.status === newStatus) return;
    
    setPendingStatusUpdate({ orderId, newStatus });
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
        comment: statusComment.trim() || undefined,
        isInternal: isInternalComment,
        updatedAt: new Date().toISOString(),
        updatedBy: adminName,
      };

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

  const handleFileUpload = async (orderId: string, file: File) => {
    setUploadingId(orderId);
    try {
      const storageRef = ref(storage, `payment_proofs/${orderId}_${Date.now()}`);
      const uploadResult = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(uploadResult.ref);
      
      const adminName = auth.currentUser ? (await getDoc(doc(db, 'users', auth.currentUser.uid))).data()?.name : 'Admin';

      const updateEntry: StatusUpdate = {
        status: 'confirmando_pagamento',
        comment: 'Comprovante anexado pelo Admin.',
        isInternal: true,
        updatedAt: new Date().toISOString(),
        updatedBy: adminName || 'Admin',
      };

      await updateDoc(doc(db, 'orders', orderId), {
        paymentProofUrl: downloadURL,
        status: 'confirmando_pagamento',
        statusHistory: arrayUnion(updateEntry)
      });
      
      alert('Comprovante enviado e status atualizado!');
    } catch (err) {
      console.error(err);
      alert('Erro ao fazer upload do comprovante.');
    } finally {
      setUploadingId(null);
    }
  };

  const generateOrderPDF = (order: Order) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Header
    doc.setFontSize(22);
    doc.setTextColor(247, 37, 133); // Pink
    doc.text('Saldo da Eguel', 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Relatório do Pedido #${order.id.slice(-6).toUpperCase()}`, 14, 30);
    doc.text(`Data: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth - 14, 30, { align: 'right' });

    // Client Info
    doc.setDrawColor(240);
    doc.line(14, 35, pageWidth - 14, 35);
    
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text('Dados do Cliente', 14, 45);
    doc.setFontSize(10);
    doc.text(`Nome: ${order.clientName}`, 14, 52);
    doc.text(`Email: ${order.clientEmail || 'N/A'}`, 14, 57);
    doc.text(`Telefone: ${order.clientPhone || 'N/A'}`, 14, 62);
    doc.text(`Origem: ${order.orderOrigin === 'admin' ? 'Venda Admin' : 'Site Cliente'}`, 14, 67);

    // Order Summary
    doc.text(`Status Atual: ${statusConfig[order.status]?.label || order.status}`, pageWidth - 14, 52, { align: 'right' });
    doc.text(`Total: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.totalValue)}`, pageWidth - 14, 57, { align: 'right' });

    // Items Table
    autoTable(doc, {
      startY: 75,
      head: [['Produto', 'Tipo', 'Qtd', 'Vlr Unit.', 'Subtotal']],
      body: order.items.map(i => [
        i.productName,
        i.stockType === 'previsao_meta' ? 'META' : 'PRONTA',
        i.quantity,
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(i.unitPrice),
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(i.unitPrice * i.quantity)
      ]),
      headStyles: { fillColor: [247, 37, 133] },
      columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'right' }, 4: { halign: 'right' } }
    });

    // Totals logic
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    // Breakdown
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    let currentY = finalY;
    
    const readySubtotal = order.totalReady ? order.totalReady - (order.totalReady > 14 ? 15 : 0) : 0;
    doc.text(`Subtotal Pronta Entrega: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(readySubtotal)}`, pageWidth - 14, currentY, { align: 'right' });
    
    if (order.totalReady && order.totalReady > 0) {
      currentY += 5;
      doc.text(`Taxa de Separação: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(15)}`, pageWidth - 14, currentY, { align: 'right' });
      currentY += 7;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 64, 175); // Blue
      doc.text(`TOTAL A PAGAR AGORA: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.totalReady)}`, pageWidth - 14, currentY, { align: 'right' });
      doc.setTextColor(0);
      doc.setFont('helvetica', 'normal');
    }

    if (order.totalPending && order.totalPending > 0) {
      currentY += 10;
      doc.text(`Total Sob Encomenda (Meta): ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.totalPending)}`, pageWidth - 14, currentY, { align: 'right' });
      currentY += 7;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(194, 65, 12); // Orange
      doc.text(`TOTAL PENDENTE (PAGAR DEPOIS): ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.totalPending)}`, pageWidth - 14, currentY, { align: 'right' });
      doc.setTextColor(0);
      doc.setFont('helvetica', 'normal');
    }

    currentY += 12;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`VALOR TOTAL GERAL: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.totalValue)}`, pageWidth - 14, currentY, { align: 'right' });

    // Status History Table
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Histórico de Alterações', 14, currentY + 20);
    
    const historyBody = (order.statusHistory || []).map(h => [
      format(new Date(h.updatedAt), 'dd/MM/yyyy HH:mm'),
      statusConfig[h.status]?.label || h.status,
      h.updatedBy,
      `${h.comment || '-'}${h.isInternal ? ' (Interno)' : ''}`
    ]);

    autoTable(doc, {
      startY: currentY + 25,
      head: [['Data/Hora', 'Status', 'Responsável', 'Comentário']],
      body: historyBody.length > 0 ? historyBody : [['-', 'Pedido Criado', order.registeredByAdminName || 'Sistema/Cliente', '-']],
      headStyles: { fillColor: [100, 100, 100] },
    });

    doc.save(`pedido_${order.id.slice(-6).toUpperCase()}.pdf`);
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (window.confirm('Tem certeza que deseja excluir permanentemente este pedido? O estoque será restabelecido. Esta ação não pode ser desfeita.')) {
      try {
        const orderRef = doc(db, 'orders', orderId);
        const orderSnap = await getDoc(orderRef);
        
        if (orderSnap.exists()) {
          const orderData = orderSnap.data() as Order;
          
          if (orderData.status !== 'cancelado') {
            for (const item of orderData.items) {
              const productRef = doc(db, 'products', item.productId);
              const productSnap = await getDoc(productRef);
              
              if (productSnap.exists()) {
                const pData = productSnap.data();
                if (pData.stockType === 'previsao_meta') {
                  await updateDoc(productRef, {
                    currentGoalProgress: increment(-item.quantity)
                  });
                } else if (pData.stockType === 'pronta_entrega') {
                  await updateDoc(productRef, {
                    availableQuantity: increment(item.quantity)
                  });
                }
              }
            }
          }
        }
        
        await deleteDoc(orderRef);
      } catch (err) {
        console.error(err);
        alert('Erro ao excluir pedido e restabelecer estoque.');
      }
    }
  };

  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          o.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
          <ClipboardList className="w-7 h-7 text-blue-600" /> Gestão de Pedidos
        </h1>
        <button
          onClick={() => navigate('/admin/new-order')}
          className="btn-action-premium"
        >
          <Plus className="w-4 h-4" /> Novo Pedido
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por cliente ou ID do pedido..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-3 pr-10 py-2 text-base border-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-xl"
          >
            <option value="all">Todos Status</option>
            {Object.entries(statusConfig).map(([key, value]) => (
              <option key={key} value={key}>{value.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">ID / Data</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Total</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Origem</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Comprovante</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredOrders.map((order) => {
                const config = statusConfig[order.status] || statusConfig.aguardando_pagamento;
                const isUploading = uploadingId === order.id;
                
                return (
                  <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-gray-900">#{order.id.slice(-6).toUpperCase()}</p>
                      <p className="text-[10px] text-gray-400">{format(new Date(order.orderDate), 'dd/MM/yyyy HH:mm')}</p>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-700">{order.clientName}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-900">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.totalValue)}
                        </span>
                        {(order.totalPending || 0) > 0 && (
                          <span className="text-[9px] font-black text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full w-fit mt-1 border border-orange-100">
                            PENDENTE: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.totalPending || 0)}
                          </span>
                        )}
                        {(order.totalReady || 0) > 0 && (
                          <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full w-fit mt-0.5 border border-blue-100">
                            COBRADO: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.totalReady || 0)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={order.status}
                        onChange={(e) => handleUpdateStatusClick(order.id, e.target.value as OrderStatus)}
                        className={cn(
                          "px-2 py-1 rounded-full text-[10px] font-bold uppercase border focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all cursor-pointer",
                          config.color, config.bg, config.border
                        )}
                      >
                        {Object.entries(statusConfig).map(([key, val]) => (
                          <option key={key} value={key} className="bg-white text-gray-900 uppercase font-bold text-[10px]">
                            {val.label}
                          </option>
                        ))}
                      </select>
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
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {order.paymentProofUrl ? (
                          <a 
                            href={order.paymentProofUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-xs font-bold group"
                          >
                            <FileText className="w-3 h-3" /> 
                            <span className="group-hover:underline">Ver</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-xs text-gray-300 italic">Pendente</span>
                        )}
                        
                        {(order.status === 'aguardando_comprovante' || order.status === 'aguardando_pagamento' || !order.paymentProofUrl) && (
                          <div className="flex items-center gap-1">
                            <label className="cursor-pointer p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Fazer Upload">
                              {isUploading ? (
                                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                              ) : (
                                <Upload className="w-4 h-4" />
                              )}
                              <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={(e) => {
                                  if (e.target.files?.[0]) {
                                    handleFileUpload(order.id, e.target.files[0]);
                                  }
                                }}
                                disabled={isUploading}
                              />
                            </label>
                            
                            {/* WhatsApp Button */}
                            <button
                              onClick={() => {
                                const msg = `Olá ${order.clientName}! Sou da Saldo da Eguel. Identificamos que o Pedido #${order.id.slice(-6).toUpperCase()} (Total: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.totalValue)}) está aguardando o comprovante de pagamento. Por favor, anexe o arquivo no portal ou envie aqui para agilizarmos a sua separação. Obrigado!`;
                                const phone = order.clientPhone ? `55${order.clientPhone.replace(/\D/g, '')}` : '';
                                if(phone) {
                                  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
                                } else {
                                  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                                }
                              }}
                              className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
                              title="Solicitar via WhatsApp"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
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
                          onClick={() => handleDeleteOrder(order.id)}
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
      </div>

      {/* Confirmation Modal for Status Update */}
      {showStatusModal && pendingStatusUpdate && (
        <div className="fixed top-[85px] bottom-[100px] md:top-0 md:bottom-0 md:left-[80px] left-0 right-0 z-[1000] flex items-center justify-center p-4 bg-black/5 backdrop-blur-md">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl flex flex-col max-h-full animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between shrink-0">
              <h3 className="text-lg font-bold text-gray-900">Atualizar Status</h3>
              <button 
                onClick={() => { setShowStatusModal(false); setPendingStatusUpdate(null); }}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto">
              <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-center justify-between shrink-0">
                <div>
                  <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Novo Status</p>
                  <p className="text-sm font-bold text-blue-900">{statusConfig[pendingStatusUpdate.newStatus]?.label}</p>
                </div>
                <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-100">
                  {(() => {
                    const IconComp = statusConfig[pendingStatusUpdate.newStatus]?.icon || Package;
                    return <IconComp className="w-5 h-5 text-white" />;
                  })()}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 px-1 flex items-center gap-2">
                    <MessageSquare className="w-3 h-3" /> Comentário (opcional)
                  </label>
                  <textarea
                    rows={3}
                    value={statusComment}
                    onChange={e => setStatusComment(e.target.value)}
                    placeholder="Ex: Recebi via WhatsApp, cliente já conferiu..."
                    className="w-full px-4 py-3 text-sm border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
                  />
                </div>

                <div 
                  onClick={() => setIsInternalComment(!isInternalComment)}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all",
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
                className="flex-grow py-3 px-4 border border-gray-200 text-gray-600 font-bold rounded-2xl hover:bg-white transition-all text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={confirmStatusUpdate}
                disabled={isUpdatingStatus}
                className="flex-grow py-3 px-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 text-sm disabled:opacity-50"
              >
                {isUpdatingStatus ? "Salvando..." : "Confirmar Mudança"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed top-[85px] bottom-[100px] md:top-0 md:bottom-0 md:left-[80px] left-0 right-0 z-[1000] flex items-center justify-center p-4 bg-black/5 backdrop-blur-md">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col max-h-full">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-white z-10 shrink-0 rounded-t-3xl">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold text-gray-900">Pedido #{selectedOrder.id.slice(-6).toUpperCase()}</h2>
                <div className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-bold uppercase border",
                  statusConfig[selectedOrder.status]?.color, 
                  statusConfig[selectedOrder.status]?.bg, 
                  statusConfig[selectedOrder.status]?.border
                )}>
                  {statusConfig[selectedOrder.status]?.label}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => generateOrderPDF(selectedOrder)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-xl hover:bg-gray-800 transition-all shadow-md"
                >
                  <Download className="w-4 h-4" /> Relatório PDF
                </button>
                <button onClick={() => setSelectedOrder(null)} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="flex-grow overflow-y-auto p-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Information Column */}
                <div className="lg:col-span-2 space-y-8">
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Cliente</h3>
                      <div className="space-y-1">
                        <p className="font-bold text-gray-900 text-lg">{selectedOrder.clientName}</p>
                        <p className="text-sm text-gray-500">{selectedOrder.clientEmail || 'Sem email'}</p>
                        {selectedOrder.clientPhone && (
                          <p className="text-sm text-blue-600 font-medium">{selectedOrder.clientPhone}</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Data do Pedido</h3>
                      <p className="font-bold text-gray-900">{format(new Date(selectedOrder.orderDate), "dd 'de' MMMM, yyyy", { locale: ptBR })}</p>
                      <p className="text-sm text-gray-500">{format(new Date(selectedOrder.orderDate), "HH:mm")}</p>
                    </div>
                  </div>

                  <div className={cn(
                    'rounded-2xl px-6 py-4 flex items-start gap-4 border',
                    selectedOrder.orderOrigin === 'admin' ? 'bg-purple-50 border-purple-100' : 'bg-blue-50 border-blue-100'
                  )}>
                    <div className={cn("p-2 rounded-xl", selectedOrder.orderOrigin === 'admin' ? "bg-purple-100" : "bg-blue-100")}>
                      {selectedOrder.orderOrigin === 'admin' ? <ShieldCheck className="w-5 h-5 text-purple-600" /> : <User className="w-5 h-5 text-blue-600" />}
                    </div>
                    <div>
                      <p className={cn('text-xs font-bold uppercase tracking-widest', selectedOrder.orderOrigin === 'admin' ? 'text-purple-700' : 'text-blue-700')}>
                        {selectedOrder.orderOrigin === 'admin' ? 'Venda registrada por Admin' : 'Pedido feito pelo cliente (Site)'}
                      </p>
                      {selectedOrder.orderOrigin === 'admin' && selectedOrder.registeredByAdminName && (
                        <p className="text-sm text-purple-600 mt-0.5">Responsável: <strong>{selectedOrder.registeredByAdminName}</strong></p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Itens do Pedido</h3>
                    <div className="bg-gray-50 rounded-2xl overflow-hidden border border-gray-100">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-gray-100/50 text-gray-500 text-[10px] uppercase font-bold">
                          <tr>
                            <th className="px-4 py-3">Produto</th>
                            <th className="px-4 py-3 text-center">Qtd</th>
                            <th className="px-4 py-3 text-right">Unitário</th>
                            <th className="px-4 py-3 text-right">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {selectedOrder.items.map((item, idx) => (
                            <tr key={idx} className="bg-white">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-gray-900">{item.productName}</span>
                                  {item.stockType === 'previsao_meta' && (
                                    <span className="text-[8px] bg-orange-50 text-orange-600 border border-orange-100 px-1.5 py-0.5 rounded-full font-black uppercase">
                                      Meta
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center font-medium text-gray-600">{item.quantity}</td>
                              <td className="px-4 py-3 text-right text-gray-500">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.unitPrice)}
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-gray-900">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.unitPrice * item.quantity)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="p-4 bg-gray-50 flex flex-col items-end gap-2">
                         {/* Split Breakdown for Admin */}
                         <div className="w-full max-w-[280px] space-y-2 border-b border-gray-200 pb-2 mb-1">
                           <div className="flex justify-between text-[10px] font-black text-blue-600 uppercase">
                             <span>Cobrado Agora (Pronta):</span>
                             <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedOrder.totalReady ? selectedOrder.totalReady - (selectedOrder.totalReady > 0 ? 15 : 0) : 0)}</span>
                           </div>
                           <div className="flex justify-between text-[10px] font-black text-blue-400 uppercase">
                             <span>Taxa Separação:</span>
                             <span>+ {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedOrder.totalReady && selectedOrder.totalReady > 0 ? 15 : 0)}</span>
                           </div>
                           <div className="flex justify-between text-xs font-black text-blue-800 bg-blue-100/50 px-2 py-1 rounded-lg">
                             <span>TOTAL JÁ COBRADO:</span>
                             <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedOrder.totalReady || 0)}</span>
                           </div>
                         </div>

                         {(selectedOrder.totalPending || 0) > 0 && (
                           <div className="w-full max-w-[280px] space-y-2 border-b border-gray-200 pb-2 mb-1">
                             <div className="flex justify-between text-[10px] font-black text-orange-600 uppercase">
                               <span>Pendente Meta:</span>
                               <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedOrder.totalPending || 0)}</span>
                             </div>
                             <div className="flex justify-between text-xs font-black text-orange-800 bg-orange-100/50 px-2 py-1 rounded-lg">
                               <span>TOTAL PENDENTE:</span>
                               <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedOrder.totalPending || 0)}</span>
                             </div>
                           </div>
                         )}

                         <div className="flex justify-between w-full max-w-[280px] text-lg font-black text-gray-900 mt-1 px-2">
                           <span>VALOR TOTAL:</span>
                           <span className="text-pink-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedOrder.totalValue)}</span>
                         </div>
                      </div>
                    </div>
                  </div>

                  {selectedOrder.observations && (
                    <div className="space-y-2">
                       <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Observações do Pedido</h3>
                       <div className="p-4 bg-gray-50 rounded-2xl text-sm text-gray-600 italic border border-gray-100">
                         "{selectedOrder.observations}"
                       </div>
                    </div>
                  )}
                </div>

                {/* History Column */}
                <div className="space-y-6">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <History className="w-4 h-4 text-gray-400" /> Linha do Tempo
                  </h3>
                  
                  <div className="relative pl-4 space-y-6 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
                    {/* Creation entry */}
                    <div className="relative">
                      <div className="absolute -left-[30px] top-1 w-6 h-6 rounded-full bg-white border-2 border-gray-200 z-10 flex items-center justify-center">
                        <Plus className="w-3 h-3 text-gray-400" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-gray-900">Pedido Realizado</p>
                        <p className="text-[10px] text-gray-400">{format(new Date(selectedOrder.orderDate), "dd MMM, HH:mm", { locale: ptBR })}</p>
                      </div>
                    </div>

                    {/* Dynamic history entries */}
                    {(selectedOrder.statusHistory || []).map((h, i) => (
                      <div key={i} className="relative">
                        <div className={cn(
                          "absolute -left-[30px] top-1 w-6 h-6 rounded-full bg-white border-2 z-10 flex items-center justify-center",
                          statusConfig[h.status]?.border || "border-gray-200"
                        )}>
                          {(() => {
                            const Icon = statusConfig[h.status]?.icon || Package;
                            return <Icon className={cn("w-3 h-3", statusConfig[h.status]?.color || "text-gray-400")} />;
                          })()}
                        </div>
                        <div className="bg-gray-50/50 rounded-2xl p-3 border border-gray-100/50">
                          <div className="flex justify-between items-start mb-1">
                             <p className={cn("text-xs font-bold uppercase tracking-tight", statusConfig[h.status]?.color)}>
                               {statusConfig[h.status]?.label}
                             </p>
                             <div className="flex items-center gap-1.5">
                               {h.isInternal && (
                                 <span className="flex items-center gap-0.5 text-[8px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-black uppercase">
                                   <Lock className="w-2 h-2" /> Interno
                                 </span>
                               )}
                             </div>
                          </div>
                          <p className="text-[10px] text-gray-400 mb-2">
                             {format(new Date(h.updatedAt), "dd MMM - HH:mm", { locale: ptBR })} por <strong>{h.updatedBy}</strong>
                          </p>
                          {h.comment && (
                            <div className="text-[11px] text-gray-600 bg-white/60 p-2 rounded-xl border border-gray-100">
                               {h.comment}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
