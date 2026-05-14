import { OrderStatus } from '../types';
import { Clock, CheckCircle2, Package, XCircle } from 'lucide-react';

export const statusConfig = {
  aguardando_pagamento: { label: 'Aguardando Pagamento', icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
  pagamento_confirmado: { label: 'Pagamento Confirmado', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  separacao: { label: 'Em Separação', icon: Package, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
  entregue: { label: 'Entregue', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
  cancelado: { label: 'Cancelado', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
};

export const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export const canTransitionTo = (current: OrderStatus, next: OrderStatus): boolean => {
  if (current === next) return false;
  if (next === 'cancelado') return current !== 'cancelado' && current !== 'entregue';

  if (current === 'aguardando_pagamento') return next === 'pagamento_confirmado';
  if (current === 'pagamento_confirmado') return next === 'separacao';
  if (current === 'separacao') return next === 'entregue';
  if (current === 'entregue') return false;
  if (current === 'cancelado') return false;

  return false;
};
