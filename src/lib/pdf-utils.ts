import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { Order } from '../types';
import { statusConfig } from './order-utils';

export const generateOrderPDF = (order: Order) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // Header
  doc.setFontSize(22);
  doc.setTextColor(247, 37, 133); // Pink
  doc.text('Saldo da Kricia', 14, 22);
  
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
  doc.text(`Vendedor: ${order.sellerName || 'N/A'}`, 14, 67);
  doc.text(`Origem: ${order.orderOrigin === 'admin' ? 'Venda Admin' : 'Site Cliente'}`, 14, 72);

  // Order Summary
  doc.text(`Status Atual: ${statusConfig[order.status]?.label || order.status}`, pageWidth - 14, 52, { align: 'right' });
  doc.text(`Total: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.totalValue)}`, pageWidth - 14, 57, { align: 'right' });

  // Items Table
  autoTable(doc, {
    startY: 80,
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
  
  const readySubtotal = order.totalReady || 0;
  doc.text(`Subtotal Pronta Entrega: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(readySubtotal)}`, pageWidth - 14, currentY, { align: 'right' });
  
  if (order.totalReady && order.totalReady > 0) {
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
