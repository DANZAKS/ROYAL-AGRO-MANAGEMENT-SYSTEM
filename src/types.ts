export type UserRole = 'CEO' | 'BRANCH_MANAGER' | 'SALES_STAFF' | 'SALES_CASHIER' | 'INVENTORY_OFFICER';

export interface User {
  id: string;
  username?: string;
  name: string;
  email: string;
  role: UserRole;
  branchId: string | null; // null for CEO (all branches)
  branchName?: string;
  phone: string;
  status: 'ACTIVE' | 'INACTIVE';
  avatar?: string;
  avatarUrl?: string;
  createdAt: string;
  lastLogin?: string;
}

export interface Branch {
  id: string;
  code: string;
  name: string;
  state: string;
  address: string;
  phone: string;
  managerId: string | null;
  managerName: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export type ProductCategory = 
  | 'SEEDS' 
  | 'FERTILIZERS' 
  | 'AGROCHEMICALS' 
  | 'EQUIPMENT' 
  | 'SEEDLINGS' 
  | 'CROP_CARE';

export type UnitOfMeasurement = 
  | 'KG' 
  | 'BAG_50KG' 
  | 'PACK' 
  | 'SACHET' 
  | 'CARTON' 
  | 'PIECE';

export interface Product {
  id: string;
  sku: string;
  name: string;
  seedVariety: string; // e.g. "Hybrid Maize SC719", "Faro 44 Rice", "SAMPEA 14 Cowpea"
  description: string;
  category: ProductCategory;
  unit: UnitOfMeasurement;
  purchasePrice: number;
  sellingPrice: number;
  minStockLevel: number;
  imageUrl: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export interface BranchInventory {
  id: string;
  productId: string;
  branchId: string;
  quantity: number;
  reorderLevel: number;
  lastUpdated: string;
}

export type StockMovementType = 
  | 'PURCHASE' 
  | 'SALE' 
  | 'TRANSFER_IN' 
  | 'TRANSFER_OUT' 
  | 'DAMAGED' 
  | 'EXPIRED' 
  | 'ADJUSTMENT' 
  | 'LOST';

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  branchId: string;
  branchName: string;
  quantityDelta: number; // positive or negative
  previousQty: number;
  newQty: number;
  type: StockMovementType;
  referenceNo?: string;
  userId: string;
  userName: string;
  date: string;
  notes?: string;
}

export type StockTransferStatus = 
  | 'PENDING' 
  | 'APPROVED' 
  | 'DISPATCHED' 
  | 'RECEIVED' 
  | 'REJECTED' 
  | 'CANCELLED';

export interface StockTransfer {
  id: string;
  transferNo: string;
  sourceBranchId: string;
  sourceBranchName: string;
  destinationBranchId: string;
  destinationBranchName: string;
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  requestedByUserId: string;
  requestedByUserName: string;
  approvedByUserId?: string;
  approvedByUserName?: string;
  status: StockTransferStatus;
  notes?: string;
  requestDate: string;
  dispatchDate?: string;
  receiveDate?: string;
}

export type PaymentMethod = 'CASH' | 'POS' | 'BANK_TRANSFER' | 'CREDIT';

export type SaleStatus = 'COMPLETED' | 'CANCELLED';

export interface SaleItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  unit: UnitOfMeasurement;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  discount: number;
}

export interface Sale {
  id: string;
  receiptNo: string;
  branchId: string;
  branchName: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  items: SaleItem[];
  subtotal: number;
  tax: number;
  discount: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
  status: SaleStatus;
  cancelledReason?: string;
  cancelledByUserId?: string;
  staffUserId: string;
  staffName: string;
  date: string; // YYYY-MM-DD
  timestamp: string; // ISO string
}

export interface Customer {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  address: string;
  state: string;
  totalPurchases: number;
  totalSpent: number;
  registeredBranchId: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  categoriesSupplied: ProductCategory[];
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export interface PurchaseOrderItem {
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface PurchaseOrder {
  id: string;
  orderNo: string;
  supplierId: string;
  supplierName: string;
  branchId: string;
  branchName: string;
  items: PurchaseOrderItem[];
  totalAmount: number;
  receivedDate: string;
  receivedByUserId: string;
  receivedByUserName: string;
  status: 'RECEIVED' | 'PENDING';
  notes?: string;
}

export type ExpenseCategory = 
  | 'TRANSPORTATION' 
  | 'ELECTRICITY_DIESEL' 
  | 'RENT' 
  | 'SALARY' 
  | 'MAINTENANCE' 
  | 'LOGISTICS' 
  | 'MARKETING' 
  | 'EQUIPMENT' 
  | 'OTHER';

export interface Expense {
  id: string;
  branchId: string;
  branchName: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
  vendorName?: string;
  date: string;
  recordedByUserId: string;
  recordedByUserName: string;
  receiptRef?: string;
  status: 'APPROVED' | 'PENDING';
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type?: 'LOW_STOCK' | 'TRANSFER_REQUEST' | 'TRANSFER_UPDATE' | 'NEW_SALE' | 'EXPENSE_ALERT' | 'SYSTEM';
  isRead?: boolean;
  read?: boolean;
  timestamp: string;
  branchId?: string;
  targetRole?: UserRole;
}

export type Notification = NotificationItem;

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole?: UserRole;
  branchId?: string;
  branchName?: string;
  action: string;
  category?: string;
  details?: string;
  description?: string;
  timestamp: string;
  ipAddress?: string;
}

export type DateFilterOption = 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'THIS_YEAR' | 'ALL' | 'CUSTOM';

export interface AppState {
  currentUser: User;
  branches: Branch[];
  products: Product[];
  inventory: BranchInventory[];
  sales: Sale[];
  transfers: StockTransfer[];
  customers: Customer[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  purchases?: PurchaseOrder[];
  expenses: Expense[];
  users: User[];
  notifications: NotificationItem[];
  auditLogs: AuditLog[];
  stockMovements: StockMovement[];
}
