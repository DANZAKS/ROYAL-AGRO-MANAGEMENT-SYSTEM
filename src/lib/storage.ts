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
  SaleItem
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
  INITIAL_PURCHASES
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
  currentUser: User | null;
}

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
        currentUser: parsed.currentUser || INITIAL_USERS[0] // CEO default
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
    currentUser: INITIAL_USERS[0]
  };
}

export function saveAppState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
  type: NotificationItem['type'],
  branchId?: string,
  targetRole?: User['role']
): NotificationItem {
  return {
    id: 'notif-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    title,
    message,
    type,
    read: false,
    timestamp: new Date().toISOString(),
    branchId,
    targetRole
  };
}
