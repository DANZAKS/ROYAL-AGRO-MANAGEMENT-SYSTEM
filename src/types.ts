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
  email?: string;
  managerId: string | null;
  managerName: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  allowsCreditSales?: boolean;
  allowsTransfers?: boolean;
  customReceiptFooter?: string;
  operatingHours?: string;
  createdAt: string;
  updatedAt?: string;
}

export type ProductCategory = 
  | 'SEEDS' 
  | 'FERTILIZERS' 
  | 'AGROCHEMICALS' 
  | 'EQUIPMENT' 
  | 'SEEDLINGS' 
  | 'CROP_CARE'
  | 'IRRIGATION'
  | 'ANIMAL_HEALTH';

export type UnitOfMeasurement = 
  | 'KG' 
  | 'BAG_50KG' 
  | 'PACK' 
  | 'SACHET' 
  | 'CARTON' 
  | 'PIECE';

export interface ProductPackageVariant {
  id: string;
  name: string; // e.g., "1 kg Pouch", "5 kg Bag", "10 kg Sack"
  sizeKg?: number;
  barcode: string;
  sellingPrice: number;
  purchasePrice?: number;
  unit: UnitOfMeasurement;
}

export interface Product {
  id: string;
  sku: string;
  barcode?: string;
  name: string;
  seedVariety: string; // e.g. "Hybrid Maize SC719", "Faro 44 Rice", "SAMPEA 14 Cowpea"
  description: string;
  category: ProductCategory;
  unit: UnitOfMeasurement;
  packageSizeKg?: number;
  purchasePrice: number;
  sellingPrice: number;
  minStockLevel: number;
  imageUrl: string;
  status: 'ACTIVE' | 'INACTIVE';
  packageVariants?: ProductPackageVariant[];
  createdAt: string;
}

export interface BranchInventory {
  id: string;
  productId: string;
  branchId: string;
  quantity: number;
  reorderLevel: number;
  batchNumber?: string;
  expiryDate?: string;
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
  | 'ADJUSTMENT_IN'
  | 'ADJUSTMENT_OUT'
  | 'LOST'
  | 'RETURN';

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
  syncStatus?: 'synced' | 'pending' | 'failed' | 'conflict';
  lastSyncedAt?: string;
}

export type StockTransferStatus = 
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'REQUESTED' 
  | 'PENDING' 
  | 'APPROVED' 
  | 'PREPARING'
  | 'IN_TRANSIT'
  | 'DISPATCHED' 
  | 'PARTIALLY_RECEIVED'
  | 'RECEIVED' 
  | 'REJECTED' 
  | 'CANCELLED';

export interface StockTransferItem {
  id: string;
  transferId?: string;
  productId: string;
  productName: string;
  productSku: string;
  unit?: UnitOfMeasurement;
  requestedQuantity: number;
  approvedQuantity?: number;
  dispatchedQuantity?: number;
  receivedQuantity?: number;
  damagedQuantity?: number;
  missingQuantity?: number;
  discrepancyReason?: string;
  notes?: string;
}

export interface StockTransfer {
  id: string;
  transferNo: string;
  sourceBranchId: string;
  sourceBranchName: string;
  destinationBranchId: string;
  destinationBranchName: string;
  productId?: string;
  productName?: string;
  productSku?: string;
  quantity?: number;
  items?: StockTransferItem[];
  requestedByUserId: string;
  requestedByUserName: string;
  approvedByUserId?: string;
  approvedByUserName?: string;
  approvedAt?: string;
  preparedByUserId?: string;
  preparedByUserName?: string;
  preparedAt?: string;
  dispatchedByUserId?: string;
  dispatchedByUserName?: string;
  dispatchedAt?: string;
  receivedByUserId?: string;
  receivedByUserName?: string;
  receivedAt?: string;
  driverName?: string;
  driverPhone?: string;
  vehicleNumber?: string;
  waybillNumber?: string;
  estimatedArrivalDate?: string;
  status: StockTransferStatus;
  notes?: string;
  rejectionReason?: string;
  cancellationReason?: string;
  hasDiscrepancy?: boolean;
  discrepancyStatus?: 'NONE' | 'UNDER_INVESTIGATION' | 'RESOLVED_TRANSIT_LOSS' | 'RESOLVED_SUPPLIER_RECOVERY' | 'RESOLVED_RETURNED';
  discrepancyResolutionNotes?: string;
  discrepancyResolvedByUserId?: string;
  discrepancyResolvedByUserName?: string;
  discrepancyResolvedAt?: string;
  requestDate: string;
  dispatchDate?: string;
  receiveDate?: string;
  syncStatus?: 'synced' | 'pending' | 'failed' | 'conflict';
  lastSyncedAt?: string;
}

export interface ReorderRecommendation {
  productId: string;
  productName: string;
  sku: string;
  category: ProductCategory;
  unit: UnitOfMeasurement;
  branchId: string;
  branchName: string;
  currentStock: number;
  reorderLevel: number;
  minStockLevel: number;
  targetStockLevel: number;
  onOrderStock: number;
  inTransitStock: number;
  suggestedQuantity: number;
  preferredSupplierId?: string;
  preferredSupplierName?: string;
  unitCost: number;
  estimatedTotalCost: number;
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'NORMAL';
}

export interface DemandForecast {
  productId: string;
  productName: string;
  sku: string;
  category: ProductCategory;
  unit: UnitOfMeasurement;
  branchId: string;
  branchName: string;
  currentStock: number;
  salesCountTotal: number;
  totalUnitsSold: number;
  dailyRunRate: number; // units sold per day
  weeklyRunRate: number;
  daysOfStockRemaining: number;
  stockoutRisk: 'CRITICAL' | 'MODERATE' | 'HEALTHY' | 'OVERSTOCKED' | 'INSUFFICIENT_DATA';
  hasSufficientData: boolean;
  seasonalFactor?: string;
  suggested30DayRestock: number;
}

export interface StockRedistributionSuggestion {
  id: string;
  productId: string;
  productName: string;
  unit: UnitOfMeasurement;
  sourceBranchId: string;
  sourceBranchName: string;
  sourceStock: number;
  sourceDaysRemaining: number;
  destBranchId: string;
  destBranchName: string;
  destStock: number;
  destDaysRemaining: number;
  suggestedTransferQty: number;
  reason: string;
}

export type AdjustmentReason = 
  | 'DAMAGED' 
  | 'EXPIRED' 
  | 'LOST' 
  | 'FOUND' 
  | 'COUNTING_ERROR' 
  | 'OPENING_BALANCE' 
  | 'OTHER';

export interface StockAdjustment {
  id: string;
  adjustmentNo: string;
  productId: string;
  productName: string;
  productSku: string;
  branchId: string;
  branchName: string;
  type: 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT';
  reason: AdjustmentReason;
  quantity: number;
  systemQuantity?: number;
  physicalQuantity?: number;
  notes?: string;
  createdByUserId: string;
  createdByUserName: string;
  createdAt: string;
  syncStatus?: 'synced' | 'pending' | 'failed' | 'conflict';
  lastSyncedAt?: string;
}

export type PaymentMethod = 'CASH' | 'POS' | 'BANK_TRANSFER' | 'MOBILE_MONEY' | 'CREDIT' | 'CHEQUE' | 'OTHER';

export type SupplierPaymentMethod = 'BANK_TRANSFER' | 'CHEQUE' | 'CASH' | 'BANK_DRAFT' | 'OTHER';

export type PaymentStatus = 'PAID' | 'PARTIAL' | 'UNPAID';

export type CreditStatus = 'GOOD' | 'ACTIVE' | 'OVERDUE';

export interface CustomerCredit {
  id: string;
  creditNo: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  saleId: string;
  receiptNo: string;
  saleDate: string;
  dueDate: string;
  paymentTerms: string; // e.g. "Net 30", "Net 15", "Net 7", "Custom"
  creditAmount: number;
  amountPaid: number;
  remainingBalance: number;
  paymentStatus: PaymentStatus;
  creditStatus: CreditStatus;
  remarks?: string;
  branchId: string;
  branchName: string;
  createdByUserId: string;
  createdByUserName: string;
  createdAt: string;
  updatedAt: string;
  syncStatus?: 'synced' | 'pending' | 'failed' | 'conflict';
  lastSyncedAt?: string;
}

export type FinancialTransactionType =
  | 'SALE'
  | 'CUSTOMER_PAYMENT'
  | 'CUSTOMER_CREDIT_PAYMENT'
  | 'EXPENSE'
  | 'SUPPLIER_PAYMENT'
  | 'REFUND'
  | 'OTHER_INCOME'
  | 'OTHER_EXPENSE'
  | 'REVERSAL'
  | 'OPENING_BALANCE';

export interface FinancialTransaction {
  id: string;
  financialTransactionId?: string;
  branchId: string;
  branchName?: string;
  transactionType: FinancialTransactionType;
  referenceId?: string;
  referenceNumber: string;
  description: string;
  moneyIn: number;
  moneyOut: number;
  paymentMethod: PaymentMethod | SupplierPaymentMethod;
  paymentCategory?: 'CASH' | 'BANK' | 'POS' | 'CREDIT' | 'CHEQUE' | 'OTHER';
  createdByUserId: string;
  createdByUserName: string;
  transactionDate: string; // YYYY-MM-DD
  timestamp: string; // ISO string
  createdAt: string;
  isReversal?: boolean;
  reversalOfId?: string;
  reversalReason?: string;
  notes?: string;
  status: 'COMPLETED' | 'REVERSED' | 'CANCELLED';
  syncStatus?: 'synced' | 'pending' | 'failed' | 'conflict';
  lastSyncedAt?: string;
}

export interface CashDenominations {
  notes1000?: number;
  notes500?: number;
  notes200?: number;
  notes100?: number;
  notes50?: number;
  notes20?: number;
  notes10?: number;
  coins?: number;
  coinsAndOthers?: number;
}

export interface CashSession {
  id: string;
  branchId: string;
  branchName: string;
  date: string; // YYYY-MM-DD
  openingCash: number;
  expectedClosingCash: number;
  actualClosingCash?: number;
  variance?: number; // actual - expected
  varianceReason?: string;
  status: 'OPEN' | 'CLOSED' | 'RECONCILED';
  openedByUserId: string;
  openedByUserName: string;
  openedAt: string;
  closedByUserId?: string;
  closedByUserName?: string;
  closedAt?: string;
  denominations?: CashDenominations;
  notes?: string;
  syncStatus?: 'synced' | 'pending' | 'failed' | 'conflict';
  lastSyncedAt?: string;
}

export interface CashReconciliation {
  id: string;
  reconciliationNo: string;
  branchId: string;
  branchName: string;
  sessionId?: string;
  date: string;
  expectedCashAmount: number;
  physicalCashAmount: number;
  variance: number; // positive = excess/surplus, negative = shortage
  varianceType: 'BALANCED' | 'SHORTAGE' | 'EXCESS' | 'SURPLUS';
  reason?: string;
  investigationStatus: 'RESOLVED' | 'PENDING_INVESTIGATION' | 'APPROVED_WRITE_OFF' | 'WRITTEN_OFF';
  reconciledByUserId: string;
  reconciledByUserName: string;
  reconciledAt?: string;
  approvedByUserId?: string;
  approvedByUserName?: string;
  approvedAt?: string;
  denominations?: CashDenominations;
  notes?: string;
  createdAt: string;
  syncStatus?: 'synced' | 'pending' | 'failed' | 'conflict';
  lastSyncedAt?: string;
}

export interface CreditPayment {
  id: string;
  paymentNo: string;
  creditId: string;
  customerId: string;
  customerName: string;
  receiptNo: string;
  amountPaid: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  notes?: string;
  receivedByUserId: string;
  receivedByUserName: string;
  branchId?: string;
  createdAt: string;
  syncStatus?: 'synced' | 'pending' | 'failed' | 'conflict';
  lastSyncedAt?: string;
}

export type SaleStatus = 'COMPLETED' | 'CANCELLED';

export interface SaleItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  barcode?: string;
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
  amountPaid?: number;
  balanceDue?: number;
  paymentStatus?: PaymentStatus;
  creditDueDate?: string;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
  status: SaleStatus;
  cancelledReason?: string;
  cancelledByUserId?: string;
  staffUserId: string;
  staffName: string;
  date: string; // YYYY-MM-DD
  timestamp: string; // ISO string
  syncStatus?: 'synced' | 'pending' | 'failed' | 'conflict';
  lastSyncedAt?: string;
}

export interface Customer {
  id: string;
  customerCode?: string;
  fullName: string;
  phone: string;
  email: string;
  address: string;
  state: string;
  farmerType?: string;
  totalPurchases: number;
  totalSpent: number;
  creditLimit?: number;
  creditBalance?: number;
  currentBalance?: number;
  storeCreditBalance?: number;
  totalReturns?: number;
  totalRefunds?: number;
  registeredBranchId: string;
  createdAt: string;
  syncStatus?: 'synced' | 'pending' | 'failed' | 'conflict';
  lastSyncedAt?: string;
}

export interface Supplier {
  id: string;
  supplierCode?: string;
  companyName: string;
  name?: string; // Backwards compatible alias for companyName
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  state?: string;
  categoriesSupplied: ProductCategory[];
  suppliedCategories?: ProductCategory[] | string[];
  status: 'ACTIVE' | 'INACTIVE';
  bankName?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  taxId?: string;
  notes?: string;
  creditTerms?: string;
  paymentTerms?: string;
  createdAt: string;
  updatedAt?: string;
  syncStatus?: 'synced' | 'pending' | 'failed' | 'conflict';
  lastSyncedAt?: string;
}

export type PurchaseOrderStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'PARTIALLY_RECEIVED'
  | 'RECEIVED'
  | 'CANCELLED';

export interface PurchaseOrderItem {
  id: string;
  purchaseOrderId?: string;
  productId: string;
  productName: string;
  productSku: string;
  unit?: string;
  orderedQuantity: number;
  quantity: number; // Backwards compatible alias
  receivedQuantity?: number;
  unitPrice: number; // Unit Cost
  discount?: number;
  subtotal: number;
  notes?: string;
}

export interface PurchaseOrder {
  id: string;
  orderNo: string;
  supplierId: string;
  supplierName: string;
  branchId: string;
  branchName: string;
  items: PurchaseOrderItem[];
  subtotal?: number;
  discount?: number;
  tax?: number;
  totalAmount: number;
  orderDate: string;
  expectedDate?: string;
  receivedDate?: string;
  status: PurchaseOrderStatus;
  createdByUserId?: string;
  createdByUserName?: string;
  approvedByUserId?: string;
  approvedByUserName?: string;
  approvedAt?: string;
  rejectedReason?: string;
  receivedByUserId?: string;
  receivedByUserName?: string;
  notes?: string;
  paymentTerms?: string;
  createdAt?: string;
  updatedAt?: string;
  syncStatus?: 'synced' | 'pending' | 'failed' | 'conflict';
  lastSyncedAt?: string;
}

export type GoodsReceiptCondition = 'GOOD' | 'DAMAGED' | 'EXPIRED' | 'INSPECTION_PENDING' | 'REJECTED' | 'PARTIALLY_DAMAGED';

export interface GoodsReceiptItem {
  id: string;
  receiptId?: string;
  productId: string;
  productName: string;
  productSku: string;
  unit?: string;
  orderedQuantity: number;
  receivedQuantity: number;
  acceptedQuantity: number;
  damagedQuantity: number;
  unitPrice?: number;
  unitCost?: number;
  subtotal: number;
  batchNumber?: string;
  manufacturingDate?: string;
  expiryDate?: string;
  condition?: GoodsReceiptCondition | string;
  damageReason?: string;
  notes?: string;
}

export interface GoodsReceipt {
  id: string;
  grnNumber: string; // e.g. GRN-2026-00015
  purchaseOrderId: string;
  purchaseOrderNo?: string;
  purchaseOrderNumber?: string;
  supplierId: string;
  supplierName: string;
  branchId: string;
  branchName: string;
  deliveryNoteNumber?: string;
  vehicleNumber?: string;
  driverName?: string;
  driverPhone?: string;
  receivedDate: string;
  receivedByUserId: string;
  receivedByUserName: string;
  inspectedByUserId?: string;
  inspectedByUserName?: string;
  items: GoodsReceiptItem[];
  totalAcceptedQuantity?: number;
  totalDamagedQuantity?: number;
  totalValue?: number;
  totalAmount?: number;
  status?: 'COMPLETED' | 'CANCELLED' | 'VERIFIED' | 'PENDING';
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  syncStatus?: 'synced' | 'pending' | 'failed' | 'conflict';
  lastSyncedAt?: string;
}

export interface SupplierPayment {
  id: string;
  paymentNo: string; // e.g. SP-2026-001
  supplierId: string;
  supplierName: string;
  purchaseOrderId?: string;
  purchaseOrderNo?: string;
  purchaseOrderNumber?: string;
  amount: number;
  paymentMethod: SupplierPaymentMethod | PaymentMethod;
  paymentDate: string;
  reference?: string;
  bankName?: string;
  accountNumber?: string;
  chequeNumber?: string;
  notes?: string;
  recordedByUserId?: string;
  recordedByUserName?: string;
  paidByUserId?: string;
  paidByUserName?: string;
  branchId?: string;
  branchName?: string;
  status: 'COMPLETED' | 'CANCELLED' | 'PAID' | 'PENDING';
  createdAt: string;
  updatedAt?: string;
  syncStatus?: 'synced' | 'pending' | 'failed' | 'conflict';
  lastSyncedAt?: string;
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
  status: 'APPROVED' | 'PENDING' | 'CANCELLED';
  createdAt?: string;
  updatedAt?: string;
  syncStatus?: 'synced' | 'pending' | 'failed' | 'conflict';
  lastSyncedAt?: string;
}

export type NotificationCategory =
  | 'INVENTORY_LOW_STOCK'
  | 'EXPIRY_ALERT'
  | 'CUSTOMER_CREDIT'
  | 'SALES_RETURNS'
  | 'PURCHASE_SUPPLIER'
  | 'BRANCH_TRANSFERS'
  | 'EXPENSE_RECONCILIATION'
  | 'SECURITY_USERS'
  | 'SYNC_OFFLINE'
  | 'SYSTEM_ANNOUNCEMENT';

export type NotificationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type NotificationStatus = 'UNREAD' | 'READ' | 'DISMISSED' | 'RESOLVED';

export interface NotificationItem {
  id: string;
  recipientUserId?: string | null;
  branchId?: string | null;
  branchName?: string;
  category: NotificationCategory;
  eventType: string; // e.g. 'LOW_STOCK', 'BATCH_EXPIRING', 'OVERDUE_CREDIT', 'TRANSFER_REQUESTED', etc.
  title: string;
  message: string;
  referenceType?: 'PRODUCT' | 'SALE' | 'CUSTOMER' | 'TRANSFER' | 'PURCHASE_ORDER' | 'GOODS_RECEIPT' | 'EXPENSE' | 'CASH_RECONCILIATION' | 'USER' | 'SYNC' | string;
  referenceId?: string;
  priority: NotificationPriority;
  createdAt: string;
  readAt?: string | null;
  resolvedAt?: string | null;
  resolvedByUserName?: string | null;
  status: NotificationStatus;
  syncStatus?: 'synced' | 'pending' | 'failed' | 'conflict';
  actionTab?: string;
  actionLabel?: string;
  actionPayload?: Record<string, any>;
  // Backwards compatibility fields
  type?: 'LOW_STOCK' | 'TRANSFER_REQUEST' | 'TRANSFER_UPDATE' | 'NEW_SALE' | 'EXPENSE_ALERT' | 'SYSTEM' | string;
  isRead?: boolean;
  read?: boolean;
  timestamp?: string;
  targetRole?: UserRole;
}

export type Notification = NotificationItem;

export interface NotificationSettings {
  soundEnabled: boolean;
  browserPushEnabled: boolean;
  significantSaleThreshold: number;
  cashDiscrepancyThreshold: number;
  expiryWarningDays: number[];
  enabledCategories: Record<NotificationCategory, boolean>;
  mutedBranches: string[];
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole?: UserRole;
  branchId?: string;
  branchName?: string;
  action: string;
  category?: string;
  entity?: string;
  entityId?: string;
  details?: string;
  description?: string;
  timestamp: string;
  ipAddress?: string;
}

export type ReturnReason =
  | 'WRONG_PRODUCT'
  | 'DAMAGED_PRODUCT'
  | 'EXPIRED_PRODUCT'
  | 'DEFECTIVE_PRODUCT'
  | 'WRONG_QUANTITY'
  | 'CUSTOMER_REQUEST'
  | 'OTHER';

export type ReturnType = 'REFUND' | 'REPLACE' | 'STORE_CREDIT' | 'REDUCE_CREDIT';

export type ItemCondition = 'GOOD' | 'DAMAGED' | 'EXPIRED' | 'DESTROYED';

export type ReturnStatus = 'SUBMITTED' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'COMPLETED';

export interface SalesReturnItem {
  id: string;
  returnId?: string;
  productId: string;
  productName: string;
  quantity: number;
  condition: ItemCondition;
  replacementProductId?: string;
  replacementProductName?: string;
  unitPrice: number;
  subtotal: number;
}

export interface SalesReturn {
  id: string;
  returnNo: string;
  saleId: string;
  receiptNo: string;
  originalReceiptNo?: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  returnDate: string;
  returnReason: ReturnReason;
  returnType: ReturnType;
  items: SalesReturnItem[];
  totalReturnValue: number;
  refundAmount: number;
  creditAdjustment?: number;
  status: ReturnStatus;
  submittedByUserId: string;
  submittedByUserName: string;
  approvedByUserId?: string;
  approvedByUserName?: string;
  branchId: string;
  branchName: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  syncStatus?: 'synced' | 'pending' | 'failed' | 'conflict';
  lastSyncedAt?: string;
}

export type DateFilterOption = 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'THIS_YEAR' | 'ALL' | 'CUSTOM';

export interface BackupMetadata {
  id: string;
  createdAt: string;
  appName: string;
  appVersion: string;
  schemaVersion: string;
  createdByUserId: string;
  createdByUserName: string;
  createdByUserRole: UserRole;
  backupScope: 'FULL_SYSTEM' | 'BRANCH_SNAPSHOT';
  branchId?: string;
  branchName?: string;
  isOfflineSnapshot: boolean;
  pendingOfflineOpsCount?: number;
  checksum: string;
  recordCounts: Record<string, number>;
  totalRecords: number;
  description?: string;
  storageLocation?: 'CLIENT_DOWNLOAD' | 'SERVER_STORE' | 'INDEXED_DB';
  fileSizeBytes?: number;
}

export interface BackupPackage {
  metadata: BackupMetadata;
  data: {
    branches?: Branch[];
    users?: User[];
    products?: Product[];
    inventory?: BranchInventory[];
    sales?: Sale[];
    transfers?: StockTransfer[];
    customers?: Customer[];
    suppliers?: Supplier[];
    purchaseOrders?: PurchaseOrder[];
    goodsReceipts?: GoodsReceipt[];
    supplierPayments?: SupplierPayment[];
    expenses?: Expense[];
    stockMovements?: StockMovement[];
    stockAdjustments?: StockAdjustment[];
    credits?: CustomerCredit[];
    creditPayments?: CreditPayment[];
    salesReturns?: SalesReturn[];
    financialTransactions?: FinancialTransaction[];
    cashSessions?: CashSession[];
    cashReconciliations?: CashReconciliation[];
    notifications?: NotificationItem[];
    auditLogs?: AuditLog[];
    notificationSettings?: NotificationSettings;
  };
}

export interface BackupLogEntry {
  id: string;
  timestamp: string;
  type: 'MANUAL_BACKUP' | 'AUTO_SAFETY_BACKUP' | 'RESTORE_OPERATION' | 'INTEGRITY_REPAIR';
  status: 'SUCCESS' | 'FAILED' | 'WARNING';
  performedBy: string;
  userRole: UserRole;
  details: string;
  backupId?: string;
  checksum?: string;
  recordsCount?: number;
  fileSizeBytes?: number;
  error?: string;
}

export type IntegrityCategory =
  | 'STOCK_DISCREPANCY'
  | 'CREDIT_DISCREPANCY'
  | 'SUPPLIER_DISCREPANCY'
  | 'ORPHANED_REFERENCE'
  | 'DUPLICATE_ID'
  | 'INVALID_TRANSACTION'
  | 'SYNC_STALL';

export type IntegritySeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export interface IntegrityIssue {
  id: string;
  category: IntegrityCategory;
  severity: IntegritySeverity;
  title: string;
  description: string;
  entityType: string;
  entityId: string;
  branchId?: string;
  branchName?: string;
  expectedValue?: string | number;
  actualValue?: string | number;
  canAutoRepair: boolean;
  repairActionLabel?: string;
  detectedAt: string;
  technicalDetails?: Record<string, any>;
}

export interface IntegrityReport {
  id: string;
  runAt: string;
  performedBy: string;
  totalIssuesFound: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  issues: IntegrityIssue[];
  collectionsChecked: string[];
  executionTimeMs: number;
}

export interface RestoreOptions {
  mode: 'MERGE_DEDUPLICATE' | 'FULL_OVERWRITE';
  createSafetyBackup: boolean;
  skipDuplicateReceipts: boolean;
  skipDuplicatePayments: boolean;
  skipDuplicateStockMovements: boolean;
  selectedCollections?: string[];
}

export interface RestoreResult {
  success: boolean;
  mode: 'MERGE_DEDUPLICATE' | 'FULL_OVERWRITE';
  recordsRestored: Record<string, number>;
  recordsSkipped: Record<string, number>;
  totalRestored: number;
  totalSkipped: number;
  safetyBackupId?: string;
  warnings: string[];
  errors: string[];
  timestamp: string;
}

// ==========================================
// MODULE 18: STAFF ATTENDANCE, PERFORMANCE & COMMISSIONS
// ==========================================

export type AttendanceStatus = 'PRESENT' | 'LATE' | 'HALF_DAY' | 'ON_LEAVE' | 'ABSENT';
export type LeaveType = 'ANNUAL' | 'SICK' | 'MATERNITY' | 'CASUAL' | 'EMERGENCY' | 'UNPAID';
export type AttendanceCorrectionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface AttendanceCorrectionRequest {
  id: string;
  requestedClockIn?: string; // HH:mm or ISO string
  requestedClockOut?: string; // HH:mm or ISO string
  reason: string;
  status: AttendanceCorrectionStatus;
  requestedAt: string;
  reviewedByUserId?: string;
  reviewedByUserName?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  adminNotes?: string;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  branchId: string;
  branchName: string;
  date: string; // YYYY-MM-DD
  scheduledStart?: string; // e.g. "08:30"
  scheduledEnd?: string; // e.g. "17:30"
  clockIn: string | null; // e.g. "08:15" or ISO
  clockOut: string | null; // e.g. "17:30" or ISO
  workMinutes: number; // total worked minutes
  status: AttendanceStatus;
  isMissingClockOut: boolean;
  explanation?: string; // explanation submitted if missed clock-in or clock-out
  correctionRequest?: AttendanceCorrectionRequest;
  leaveType?: LeaveType;
  leaveReason?: string;
  notes?: string;
  syncStatus?: 'synced' | 'pending' | 'pending_verification' | 'failed';
  isOfflineRecord?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CommissionRuleType = 'PERCENTAGE_TOTAL' | 'FIXED_PER_SALE' | 'CATEGORY_TIERED';
export type CommissionStatus = 'PENDING' | 'AWAITING_APPROVAL' | 'APPROVED' | 'PAID' | 'REJECTED';

export interface CommissionRule {
  id: string;
  name: string;
  description: string;
  ruleType: CommissionRuleType;
  percentageRate?: number; // e.g. 2.0%
  fixedAmountPerSale?: number; // e.g. 1500 NGN
  categoryRates?: Partial<Record<ProductCategory, number>>; // e.g. { SEEDS: 3.0, FERTILIZERS: 1.5, ... }
  includeCreditSales: boolean;
  deductReturns: boolean;
  minSaleThreshold?: number; // minimum sale subtotal to qualify
  status: 'ACTIVE' | 'INACTIVE';
  effectiveDate: string;
  createdByUserId: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CommissionAdjustment {
  id: string;
  type: 'RETURN_REVERSAL' | 'SALE_CANCELLATION' | 'BONUS_ADJUSTMENT' | 'PENALTY_DEDUCTION' | 'OTHER_ADJUSTMENT';
  referenceNo?: string;
  saleId?: string;
  returnId?: string;
  description: string;
  amount: number; // positive or negative
  createdAt: string;
  createdByUserId: string;
  createdByUserName: string;
}

export interface CommissionBreakdownItem {
  id: string;
  saleId: string;
  receiptNo: string;
  date: string;
  saleAmount: number;
  eligibleAmount: number;
  rateApplied: number; // percentage or fixed rate
  calculatedCommission: number;
  paymentMethod: PaymentMethod;
  category?: ProductCategory;
  isReturned?: boolean;
  returnedAmount?: number;
  netCommission: number;
  notes?: string;
}

export interface CommissionRecord {
  id: string;
  commissionNo: string; // e.g. COM-2026-001
  userId: string;
  userName: string;
  userRole: UserRole;
  branchId: string;
  branchName: string;
  periodMonth: string; // YYYY-MM
  periodStart: string; // YYYY-MM-DD
  periodEnd: string; // YYYY-MM-DD
  ruleId: string;
  ruleName: string;
  grossSalesAmount: number;
  eligibleSalesAmount: number;
  salesCount: number;
  returnsDeductionAmount: number;
  baseCommissionAmount: number;
  adjustmentsAmount: number;
  netCommissionAmount: number;
  status: CommissionStatus;
  breakdownItems: CommissionBreakdownItem[];
  adjustments: CommissionAdjustment[];
  approvedByUserId?: string;
  approvedByUserName?: string;
  approvedAt?: string;
  rejectionReason?: string;
  paidAt?: string;
  paidByUserId?: string;
  paidByUserName?: string;
  paymentReference?: string;
  paymentMethod?: 'BANK_TRANSFER' | 'CASH' | 'CHEQUE';
  financialTransactionId?: string; // link to financial log
  notes?: string;
  createdAt: string;
  updatedAt: string;
  syncStatus?: 'synced' | 'pending' | 'pending_verification' | 'failed';
}

export interface StaffPerformanceSummary {
  userId: string;
  userName: string;
  userRole: UserRole;
  branchId: string;
  branchName: string;
  totalTransactions: number;
  completedTransactions: number;
  cancelledTransactions: number;
  grossSalesValue: number;
  discountsGiven: number;
  returnsCount: number;
  returnsValue: number;
  netSalesValue: number;
  cashCollected: number;
  creditSalesValue: number;
  avgOrderValue: number;
  daysWorked: number;
  onTimeRate: number; // percentage 0-100
  commissionEarned: number;
  commissionPaid: number;
  commissionPending: number;
}

// Module 19: System Settings, Business Configuration & Data Import
export interface CompanySettings {
  id: string;
  companyName: string;
  tagline: string;
  registrationNumber: string; // e.g. RC 1489201
  taxIdentificationNumber: string; // e.g. TIN-23849102-0001
  email: string;
  phone: string;
  website: string;
  headOfficeAddress: string;
  state: string;
  country: string;
  logoUrl: string;
  currencySymbol: string; // '₦'
  currencyCode: string; // 'NGN'
  currencyPosition: 'BEFORE' | 'AFTER';
  dateFormat: 'DD/MM/YYYY' | 'YYYY-MM-DD' | 'MM/DD/YYYY';
  timeFormat: '12H' | '24H';
  numberFormat: 'COMMA_DECIMAL' | 'SPACE_DECIMAL';
  timezone: string; // 'Africa/Lagos'
  receiptHeader: string;
  receiptFooter: string;
  taxEnabled: boolean;
  taxRate: number; // e.g. 7.5% Nigerian standard VAT
  pricesIncludeTax: boolean;
  defaultLanguage: 'en' | 'ha' | 'yo' | 'ig';
  enableQrReceipt: boolean;
  enableBarcodeReceipt: boolean;
  updatedAt: string;
  updatedByUserId?: string;
  updatedByUserName?: string;
}

export interface BusinessRulesSettings {
  id: string;
  lowStockDefaultThreshold: number;
  criticalStockDefaultThreshold: number;
  expiryWarningDays: number[];
  defaultCustomerCreditLimit: number;
  requireApprovalForCreditOver: number;
  creditGracePeriodDays: number;
  blockCreditOnOverdue: boolean;
  cashierMaxDiscountPercent: number;
  managerMaxDiscountPercent: number;
  requireDiscountReasonOver: number;
  requireTransferApproval: boolean;
  autoAlertTransferTransitDays: number;
  receiptNumberPrefix: string;
  invoiceNumberPrefix: string;
  transferNumberPrefix: string;
  purchaseOrderPrefix: string;
  goodsReceiptPrefix: string;
  creditReferencePrefix: string;
  returnReferencePrefix: string;
  openingStockPrefix: string;
  updatedAt: string;
  updatedByUserId?: string;
  updatedByUserName?: string;
}

export type DataImportType = 'PRODUCTS' | 'CUSTOMERS' | 'SUPPLIERS' | 'OPENING_STOCK';

export interface ImportRowValidation<T = any> {
  rowNumber: number;
  raw: Record<string, string>;
  parsed: T | null;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  isDuplicate: boolean;
}

export interface DataImportRecord {
  id: string;
  importReference: string; // e.g. "IMP-PROD-20261021-001"
  importType: DataImportType;
  fileName: string;
  fileHash?: string;
  totalRows: number;
  validRows: number;
  importedRows: number;
  skippedRows: number;
  failedRows: number;
  performedByUserId: string;
  performedByUserName: string;
  branchId?: string;
  branchName?: string;
  status: 'COMPLETED' | 'PARTIAL' | 'FAILED';
  summaryNotes?: string;
  errorsList?: string[];
  createdAt: string;
  syncStatus?: 'synced' | 'pending' | 'pending_verification' | 'failed';
  isOfflineRecord?: boolean;
}

export interface OpeningStockImportItem {
  productSku: string;
  productName?: string;
  branchCode: string;
  branchName?: string;
  quantity: number;
  unitCost: number;
  batchNumber?: string;
  expiryDate?: string;
  notes?: string;
}

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
  movements?: StockMovement[];
  stockAdjustments?: StockAdjustment[];
  credits?: CustomerCredit[];
  creditPayments?: CreditPayment[];
  salesReturns?: SalesReturn[];
  goodsReceipts?: GoodsReceipt[];
  supplierPayments?: SupplierPayment[];
  financialTransactions?: FinancialTransaction[];
  cashSessions?: CashSession[];
  cashReconciliations?: CashReconciliation[];
  notificationSettings?: NotificationSettings;
  backupHistory?: BackupLogEntry[];
  lastIntegrityReport?: IntegrityReport;
  attendance?: AttendanceRecord[];
  commissions?: CommissionRecord[];
  commissionRules?: CommissionRule[];
  companySettings?: CompanySettings;
  businessRules?: BusinessRulesSettings;
  dataImports?: DataImportRecord[];
}


