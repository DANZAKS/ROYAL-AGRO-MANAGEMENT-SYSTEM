import {
  Branch,
  User,
  Product,
  BranchInventory,
  Customer,
  Supplier,
  Sale,
  StockTransfer,
  Expense,
  NotificationItem,
  AuditLog,
  StockMovement,
  PurchaseOrder,
  GoodsReceipt,
  SupplierPayment,
  SaleItem,
  CustomerCredit,
  CreditPayment,
  SalesReturn,
  FinancialTransaction,
  CashSession,
  CashReconciliation,
  NotificationSettings,
  AttendanceRecord,
  CommissionRecord,
  CommissionRule,
  CompanySettings,
  BusinessRulesSettings,
  DataImportRecord
} from '../types';
import {
  INITIAL_BRANCHES,
  INITIAL_USERS,
  INITIAL_PRODUCTS,
  INITIAL_BRANCH_INVENTORY,
  INITIAL_CUSTOMERS,
  INITIAL_SUPPLIERS,
  INITIAL_SALES,
  INITIAL_STOCK_TRANSFERS,
  INITIAL_EXPENSES,
  INITIAL_NOTIFICATIONS,
  INITIAL_AUDIT_LOGS,
  INITIAL_STOCK_MOVEMENTS,
  INITIAL_PURCHASES,
  INITIAL_GOODS_RECEIPTS,
  INITIAL_SUPPLIER_PAYMENTS,
  INITIAL_CREDITS,
  INITIAL_CREDIT_PAYMENTS,
  INITIAL_SALES_RETURNS,
  INITIAL_FINANCIAL_TRANSACTIONS,
  INITIAL_CASH_SESSIONS,
  INITIAL_CASH_RECONCILIATIONS,
  INITIAL_ATTENDANCE,
  INITIAL_COMMISSIONS,
  INITIAL_COMMISSION_RULES,
  DEFAULT_COMPANY_SETTINGS,
  DEFAULT_BUSINESS_RULES,
  INITIAL_DATA_IMPORTS
} from '../data/initialData';

const STORAGE_KEY = 'ROYAL_AGRO_SYS_DATA_V1';

export interface AppState {
  users: User[];
  branches: Branch[];
  products: Product[];
  inventory: BranchInventory[];
  customers: Customer[];
  suppliers: Supplier[];
  sales: Sale[];
  transfers: StockTransfer[];
  expenses: Expense[];
  notifications: NotificationItem[];
  auditLogs: AuditLog[];
  stockMovements: StockMovement[];
  movements: StockMovement[];
  purchases: PurchaseOrder[];
  purchaseOrders: PurchaseOrder[];
  goodsReceipts: GoodsReceipt[];
  supplierPayments: SupplierPayment[];
  credits: CustomerCredit[];
  creditPayments: CreditPayment[];
  salesReturns: SalesReturn[];
  financialTransactions?: FinancialTransaction[];
  cashSessions?: CashSession[];
  cashReconciliations?: CashReconciliation[];
  notificationSettings?: NotificationSettings;
  backupHistory?: any[];
  lastIntegrityReport?: any;
  currentUser: User | null;
  attendance?: AttendanceRecord[];
  commissions?: CommissionRecord[];
  commissionRules?: CommissionRule[];
  companySettings?: CompanySettings;
  businessRules?: BusinessRulesSettings;
  dataImports?: DataImportRecord[];
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  soundEnabled: true,
  browserPushEnabled: false,
  significantSaleThreshold: 500000,
  cashDiscrepancyThreshold: 5000,
  expiryWarningDays: [90, 60, 30, 7],
  enabledCategories: {
    INVENTORY_LOW_STOCK: true,
    EXPIRY_ALERT: true,
    CUSTOMER_CREDIT: true,
    SALES_RETURNS: true,
    PURCHASE_SUPPLIER: true,
    BRANCH_TRANSFERS: true,
    EXPENSE_RECONCILIATION: true,
    SECURITY_USERS: true,
    SYNC_OFFLINE: true,
    SYSTEM_ANNOUNCEMENT: true
  },
  mutedBranches: []
};

export function loadAppState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const m = parsed.stockMovements || parsed.movements || INITIAL_STOCK_MOVEMENTS;
      const po = parsed.purchaseOrders || parsed.purchases || INITIAL_PURCHASES;
      return {
        users: parsed.users || INITIAL_USERS,
        branches: parsed.branches || INITIAL_BRANCHES,
        products: parsed.products || INITIAL_PRODUCTS,
        inventory: parsed.inventory || INITIAL_BRANCH_INVENTORY,
        customers: parsed.customers || INITIAL_CUSTOMERS,
        suppliers: parsed.suppliers || INITIAL_SUPPLIERS,
        sales: parsed.sales || INITIAL_SALES,
        transfers: parsed.transfers || INITIAL_STOCK_TRANSFERS,
        expenses: parsed.expenses || INITIAL_EXPENSES,
        notifications: parsed.notifications || INITIAL_NOTIFICATIONS,
        auditLogs: parsed.auditLogs || INITIAL_AUDIT_LOGS,
        stockMovements: m,
        movements: m,
        purchases: po,
        purchaseOrders: po,
        goodsReceipts: parsed.goodsReceipts || INITIAL_GOODS_RECEIPTS,
        supplierPayments: parsed.supplierPayments || INITIAL_SUPPLIER_PAYMENTS,
        credits: parsed.credits || INITIAL_CREDITS,
        creditPayments: parsed.creditPayments || INITIAL_CREDIT_PAYMENTS,
        salesReturns: parsed.salesReturns || INITIAL_SALES_RETURNS,
        financialTransactions: parsed.financialTransactions || INITIAL_FINANCIAL_TRANSACTIONS,
        cashSessions: parsed.cashSessions || INITIAL_CASH_SESSIONS,
        cashReconciliations: parsed.cashReconciliations || INITIAL_CASH_RECONCILIATIONS,
        notificationSettings: parsed.notificationSettings ? { ...DEFAULT_NOTIFICATION_SETTINGS, ...parsed.notificationSettings } : DEFAULT_NOTIFICATION_SETTINGS,
        backupHistory: parsed.backupHistory || [],
        lastIntegrityReport: parsed.lastIntegrityReport || null,
        currentUser: parsed.currentUser || INITIAL_USERS[0], // CEO default
        attendance: parsed.attendance || INITIAL_ATTENDANCE,
        commissions: parsed.commissions || INITIAL_COMMISSIONS,
        commissionRules: parsed.commissionRules || INITIAL_COMMISSION_RULES,
        companySettings: parsed.companySettings || DEFAULT_COMPANY_SETTINGS,
        businessRules: parsed.businessRules || DEFAULT_BUSINESS_RULES,
        dataImports: parsed.dataImports || INITIAL_DATA_IMPORTS
      };
    }
  } catch (err) {
    console.error('Error loading state from localStorage:', err);
  }

  // Fallback initial
  return {
    users: INITIAL_USERS,
    branches: INITIAL_BRANCHES,
    products: INITIAL_PRODUCTS,
    inventory: INITIAL_BRANCH_INVENTORY,
    customers: INITIAL_CUSTOMERS,
    suppliers: INITIAL_SUPPLIERS,
    sales: INITIAL_SALES,
    transfers: INITIAL_STOCK_TRANSFERS,
    expenses: INITIAL_EXPENSES,
    notifications: INITIAL_NOTIFICATIONS,
    auditLogs: INITIAL_AUDIT_LOGS,
    stockMovements: INITIAL_STOCK_MOVEMENTS,
    movements: INITIAL_STOCK_MOVEMENTS,
    purchases: INITIAL_PURCHASES,
    purchaseOrders: INITIAL_PURCHASES,
    goodsReceipts: INITIAL_GOODS_RECEIPTS,
    supplierPayments: INITIAL_SUPPLIER_PAYMENTS,
    credits: INITIAL_CREDITS,
    creditPayments: INITIAL_CREDIT_PAYMENTS,
    salesReturns: INITIAL_SALES_RETURNS,
    financialTransactions: INITIAL_FINANCIAL_TRANSACTIONS,
    cashSessions: INITIAL_CASH_SESSIONS,
    cashReconciliations: INITIAL_CASH_RECONCILIATIONS,
    notificationSettings: DEFAULT_NOTIFICATION_SETTINGS,
    currentUser: INITIAL_USERS[0],
    attendance: INITIAL_ATTENDANCE,
    commissions: INITIAL_COMMISSIONS,
    commissionRules: INITIAL_COMMISSION_RULES,
    companySettings: DEFAULT_COMPANY_SETTINGS,
    businessRules: DEFAULT_BUSINESS_RULES,
    dataImports: INITIAL_DATA_IMPORTS
  };
}

import { syncFullAppStateToIndexedDB } from '../offline/offlineStorage';

export function saveAppState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    // Asynchronously synchronize full app state to IndexedDB for offline-first support
    syncFullAppStateToIndexedDB(state).catch((err) => {
      console.error('Error syncing AppState to IndexedDB:', err);
    });
  } catch (err) {
    console.error('Error saving state to localStorage:', err);
  }
}

// Utility to create a unique audit log entry
export function createAuditLog(
  state: AppState,
  action: string,
  category: AuditLog['category'],
  description: string,
  branchId?: string,
  branchName?: string
): AuditLog {
  const user = state.currentUser || INITIAL_USERS[0];
  const newLog: AuditLog = {
    id: 'audit-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    branchId: branchId || user.branchId || undefined,
    branchName: branchName || (branchId ? state.branches.find(b => b.id === branchId)?.name : undefined),
    action,
    category,
    description,
    timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16)
  };
  return newLog;
}

// Utility to create a notification
export function createNotification(
  title: string,
  message: string,
  type: NotificationItem['type'] = 'SYSTEM',
  branchId?: string,
  targetRole?: User['role']
): NotificationItem {
  const now = new Date().toISOString();
  return {
    id: 'notif-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    title,
    message,
    type,
    category: 'SYSTEM_ANNOUNCEMENT',
    eventType: type || 'SYSTEM',
    priority: 'MEDIUM',
    status: 'UNREAD',
    createdAt: now,
    read: false,
    isRead: false,
    timestamp: now,
    branchId,
    targetRole
  };
}
