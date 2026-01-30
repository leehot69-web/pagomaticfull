
export interface Terminal {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'error';
  lastSync: string;
}

export type UserRole = 'ADMIN' | 'COMPRAS' | 'DESPACHOS' | 'COBRANZA' | 'AUDITOR';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface AppSettings {
  storeName: string;
  printerSize: string;
  requireDispatchApproval: boolean;
  requirePaymentApproval: boolean;
  requireInvoiceApproval: boolean;
  requireReturnApproval: boolean;
}

export interface User {
  id: string;
  username: string;
  name: string;
  roles: UserRole[];
  password?: string;
  avatar?: string;
}

export interface Store {
  id: string;
  name: string;
  location: string;
  totalDebt: number;
  lastDispatch: string;
  color: string;
  terminals: Terminal[];
  manager?: string;
  phone?: string;
  address?: string;
  config?: {
    allowsCredit: boolean;
    maxDebtLimit: number;
    paymentTermDays?: number; // Días de crédito para esta sucursal (default: 15)
    taxId?: string;
  };
  active?: boolean;
}

export interface Supplier {
  id: string;
  name: string;
  taxId?: string;
  address?: string;
  phone?: string;
  email?: string;
  totalVolume: number;
  debt: number;
  bankAccount: string;
  color: string;
}

export interface StockAdjustment {
  id: string;
  productId: string;
  quantity: number;
  reason: string;
  timestamp: string;
}

export interface Product {
  id: string;
  name: string;
  supplierId: string;
  supplierName: string;
  purchaseCost: number;
  purchaseTax: number;
  purchaseFreight: number;
  supplyPrice: number;
  retailPrice: number;
  imageUrl: string;
  color: string;
  stock: number; // Added tracking for central warehouse
  minStock?: number;
  maxStock?: number;
  brand?: string;
  presentation?: string; // e.g., "500g", "1L", "Caja 12 unidades"
  unit: 'u' | 'kg' | 'gr'; // u = unidades, kg = kilogramos, gr = gramos
}

export type ReturnReason = 'damaged' | 'expired' | 'lost' | 'good_condition';

export interface ProductReturn {
  id: string;
  dispatchId: string;
  productId: string;
  quantity: number;
  reason: ReturnReason;
  timestamp: string;
  note?: string;
}

export interface StockDispatch {
  id: string;
  dispatchNumber: string;
  storeId: string;
  timestamp: string;
  items: {
    productId: string;
    quantity: number;
    unitSupplyPrice: number;
  }[];
  returns?: ProductReturn[]; // Added structured returns
  totalAmount: number;
  driverName?: string;
  vehiclePlate?: string;
  status: 'active' | 'returned' | 'partial_return' | 'cancelled';
  approvalStatus?: ApprovalStatus;
  authorizedBy?: string;
  authorizedAt?: string;
  dueDate?: string;
  printCount?: number;
}

export interface StorePayment {
  id: string;
  storeId: string;
  dispatchId?: string;
  dispatchNumber?: string;
  date: string;
  amount: number;
  reference: string;
  method: string;
  status?: 'active' | 'cancelled';
  receiptImage?: string; // Nuevo: Soporte para foto del comprobante
  printCount?: number;
  approvalStatus?: ApprovalStatus;
  authorizedBy?: string;
  authorizedAt?: string;
}

export interface Invoice {
  id: string;
  supplierId: string;
  invoiceNumber: string;
  date: string;
  items: {
    productId: string;
    quantity: number;
    unitCost: number;
    unitTax: number;
    unitFreight: number;
    totalItemCost: number;
  }[];
  totalAmount: number;
  amountPaid: number;
  status: 'pending' | 'partial' | 'paid';
  notes?: string;
  invoiceImageUrl?: string;
  dueDate?: string;
  approvalStatus?: ApprovalStatus;
  authorizedBy?: string;
  authorizedAt?: string;
}

export interface SupplierPayment {
  id: string;
  supplierId: string;
  invoiceId?: string;
  invoiceNumber?: string;
  date: string;
  amount: number;
  reference: string;
  method: string;
  status?: 'active' | 'cancelled';
  approvalStatus?: ApprovalStatus;
  authorizedBy?: string;
  authorizedAt?: string;
  receiptImage?: string; // Nuevo: Soporte para foto del comprobante
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: 'create' | 'update' | 'delete' | 'anular' | 'block';
  entity: 'dispatch' | 'payment' | 'invoice' | 'product' | 'store';
  entityId: string;
  details: string;
  timestamp: string;
}

export interface DashboardMetrics {
  totalAccountsReceivable: number;
  totalAccountsPayable: number;
  inventoryValueAtCost: number;
  activeStores: number;
  totalProfit: number;
  totalLosses?: number;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface RevenueDataPoint {
  time: string;
  revenue: number;
}

export interface PaymentBreakdownItem {
  name: string;
  amount: number;
}

export interface Transaction {
  id: string;
  amount: number;
  timestamp: string;
  productCount: number;
  supplierCount: number;
  approvalStatus?: ApprovalStatus;
}