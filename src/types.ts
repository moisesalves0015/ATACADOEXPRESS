export type UserRole = 'admin' | 'client';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  address?: string;
  cpf?: string;
  totalPurchases?: number;
  createdAt: string;
}

export type StockType = 'pronta_entrega' | 'previsao_meta';

export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  stockType: StockType;
  availableQuantity: number;
  unitPrice: number;
  requiredGoal?: number;
  currentGoalProgress?: number;
  estimatedArrivalDate?: string;
  imageUrl?: string;
  imageUrls?: string[];
  status: 'active' | 'inactive';
  goalReached?: boolean;
}

export type OrderStatus = 
  | 'aguardando_pagamento' 
  | 'pagamento_confirmado' 
  | 'separacao' 
  | 'enviado' 
  | 'entregue' 
  | 'cancelado';

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  imageUrl?: string;
  imageUrls?: string[];
}

export type OrderOrigin = 'cliente' | 'admin';

export interface Order {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  orderDate: string;
  totalValue: number;
  status: OrderStatus;
  paymentProofUrl?: string;
  observations?: string;
  items: OrderItem[];
  orderOrigin: OrderOrigin;
  /** Filled only when orderOrigin === 'admin' */
  registeredByAdminId?: string;
  registeredByAdminName?: string;
}
