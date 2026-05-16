export type UserRole = 'admin' | 'client' | 'supplier' | 'seller';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  role: UserRole;
  address?: string;
  city?: string;
  state?: string;
  cpf?: string;
  cnpj?: string;
  companyName?: string;
  tradingName?: string;
  observations?: string;
  status: 'active' | 'inactive';
  commissionDefault?: number;
  commissionType?: 'percentage' | 'fixed';
  monthlyGoal?: number;
  monthlyGoalType?: 'percentage' | 'fixed';
  totalPurchases?: number;
  isSeller?: boolean;
  isSupplier?: boolean;
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
  costPrice?: number;
  requiredGoal?: number;
  currentGoalProgress?: number;
  estimatedArrivalDate?: string;
  imageUrl?: string;
  imageUrls?: string[];
  status: 'active' | 'inactive';
  goalReached?: boolean;
  history?: ProductHistoryEntry[];
  hasVariations?: boolean;
  variations?: ProductVariation[];
  variationsRequired?: boolean;
  allowVariationSelection?: boolean;
  supplierId?: string;
  supplierName?: string;
}

export interface ProductVariation {
  name: string; // e.g., "Cor", "Tamanho"
  options: string[]; // e.g., ["Preto", "Branco"]
}

export interface ProductHistoryEntry {
  type: 'goal_hit' | 'stock_update' | 'meta_reset' | 'price_change';
  message: string;
  date: string;
  user: string;
}

export type OrderStatus = 
  | 'aguardando_pagamento' 
  | 'pagamento_confirmado' 
  | 'separacao' 
  | 'entregue' 
  | 'cancelado';

export interface ItemHistoryLog {
  timestamp: string;
  actionType: string;
  description: string;
  userEmail: string;
}

export interface StatusUpdate {
  status: OrderStatus;
  comment?: string;
  isInternal: boolean;
  updatedAt: string;
  updatedBy: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  imageUrl?: string;
  imageUrls?: string[];
  stockType?: StockType;
  selectedVariations?: Record<string, string>;
  
  status: OrderStatus;
  
  discount?: number;
  amountPaid?: number;
  paymentDate?: string;
  paymentMethod?: string;
  history?: ItemHistoryLog[];

  commissionValue?: number;
  commissionRate?: number;
  commissionType?: 'percentage' | 'fixed';
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
  totalReady?: number;
  totalPending?: number;
  status: OrderStatus;
  items: OrderItem[];
  observations?: string;
  orderOrigin: OrderOrigin;
  registeredByAdminName?: string;
  statusHistory?: StatusUpdate[];
  sellerId?: string;
  sellerName?: string;
  commissionValue?: number;
  commissionRate?: number;
  origin?: 'site' | 'admin'; // Replacing orderOrigin legacy
}

export interface CartItem extends OrderItem {}

export type FinanceCategory = 'Fornecedor' | 'Marketing' | 'Infraestrutura' | 'Logística' | 'Pessoal' | 'Outros' | 'Ganho Extra';
export type FinanceType = 'expense' | 'gain';

export interface FinanceEntry {
  id: string;
  description: string;
  amount: number;
  category: FinanceCategory;
  date: string;
  type: FinanceType;
  createdAt: string;
  supplierId?: string;
  sellerId?: string;
  orderId?: string;
}

export interface Commission {
  id: string;
  orderId: string;
  sellerId: string;
  sellerName: string;
  amount: number;
  status: 'pending' | 'paid';
  date: string;
  createdAt: string;
}

export interface CommissionPayout {
  id: string;
  sellerId: string;
  amount: number;
  paidAt: string;
  paidBy: string;
  periodStart?: string;
  periodEnd?: string;
  notes?: string;
}

export interface UserAuditLog {
  userId: string;
  changedBy: string;
  changedAt: string;
  field: string;
  oldValue: any;
  newValue: any;
}

export interface SystemLog {
  id: string;
  targetId: string; // The ID of the person/entity affected
  targetName: string;
  actionType: 'CREATE' | 'UPDATE' | 'ROLE_CHANGE' | 'STATUS_CHANGE' | 'FINANCE_CHANGE' | 'MANUAL';
  description: string;
  performedBy: string;
  performedByEmail: string;
  timestamp: string;
  metadata?: any;
}

export interface PushToken {
  userId: string | null;
  token: string;
  platform: 'android' | 'ios' | 'desktop';
  createdAt: string;
  updatedAt: string;
}
