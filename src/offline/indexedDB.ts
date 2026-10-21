const DB_NAME = 'RoyalAgroDB';
const DB_VERSION = 9;

export const STORES = {
  PRODUCTS: 'products',
  CUSTOMERS: 'customers',
  SALES: 'sales',
  SALE_ITEMS: 'saleItems',
  CREDITS: 'credits',
  RETURNS: 'returns',
  EXPENSES: 'expenses',
  STOCK_MOVEMENTS: 'stockMovements',
  BRANCHES: 'branches',
  USERS: 'users',
  INVENTORY: 'inventory',
  SUPPLIERS: 'suppliers',
  PURCHASE_ORDERS: 'purchaseOrders',
  GOODS_RECEIPTS: 'goodsReceipts',
  SUPPLIER_PAYMENTS: 'supplierPayments',
  TRANSFERS: 'transfers',
  CREDIT_PAYMENTS: 'creditPayments',
  FINANCIAL_TRANSACTIONS: 'financialTransactions',
  CASH_SESSIONS: 'cashSessions',
  CASH_RECONCILIATIONS: 'cashReconciliations',
  NOTIFICATIONS: 'notifications',
  ATTENDANCE: 'attendance',
  COMMISSIONS: 'commissions',
  COMMISSION_RULES: 'commissionRules',
  SETTINGS: 'settings',
  DATA_IMPORTS: 'dataImports',
  PENDING_OPERATIONS: 'pendingOperations',
  SYNC_METADATA: 'syncMetadata',
  SYNC_HISTORY: 'syncHistory',
  SYNC_CONFLICTS: 'syncConflicts'
} as const;

let dbPromise: Promise<IDBDatabase> | null = null;

export function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB is not supported in this environment.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Products
      if (!db.objectStoreNames.contains(STORES.PRODUCTS)) {
        const store = db.createObjectStore(STORES.PRODUCTS, { keyPath: 'id' });
        store.createIndex('branchId', 'branchId', { unique: false });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
        store.createIndex('syncStatus', 'syncStatus', { unique: false });
      }

      // Customers
      if (!db.objectStoreNames.contains(STORES.CUSTOMERS)) {
        const store = db.createObjectStore(STORES.CUSTOMERS, { keyPath: 'id' });
        store.createIndex('branchId', 'branchId', { unique: false });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
        store.createIndex('syncStatus', 'syncStatus', { unique: false });
      }

      // Sales
      if (!db.objectStoreNames.contains(STORES.SALES)) {
        const store = db.createObjectStore(STORES.SALES, { keyPath: 'id' });
        store.createIndex('branchId', 'branchId', { unique: false });
        store.createIndex('customerId', 'customerId', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('syncStatus', 'syncStatus', { unique: false });
      }

      // Sale Items
      if (!db.objectStoreNames.contains(STORES.SALE_ITEMS)) {
        const store = db.createObjectStore(STORES.SALE_ITEMS, { keyPath: 'id' });
        store.createIndex('saleId', 'saleId', { unique: false });
        store.createIndex('productId', 'productId', { unique: false });
      }

      // Credits
      if (!db.objectStoreNames.contains(STORES.CREDITS)) {
        const store = db.createObjectStore(STORES.CREDITS, { keyPath: 'id' });
        store.createIndex('branchId', 'branchId', { unique: false });
        store.createIndex('customerId', 'customerId', { unique: false });
        store.createIndex('saleId', 'saleId', { unique: false });
        store.createIndex('syncStatus', 'syncStatus', { unique: false });
      }

      // Credit Payments
      if (!db.objectStoreNames.contains(STORES.CREDIT_PAYMENTS)) {
        const store = db.createObjectStore(STORES.CREDIT_PAYMENTS, { keyPath: 'id' });
        store.createIndex('creditId', 'creditId', { unique: false });
        store.createIndex('customerId', 'customerId', { unique: false });
        store.createIndex('branchId', 'branchId', { unique: false });
        store.createIndex('syncStatus', 'syncStatus', { unique: false });
      }

      // Returns
      if (!db.objectStoreNames.contains(STORES.RETURNS)) {
        const store = db.createObjectStore(STORES.RETURNS, { keyPath: 'id' });
        store.createIndex('branchId', 'branchId', { unique: false });
        store.createIndex('customerId', 'customerId', { unique: false });
        store.createIndex('saleId', 'saleId', { unique: false });
        store.createIndex('syncStatus', 'syncStatus', { unique: false });
      }

      // Expenses
      if (!db.objectStoreNames.contains(STORES.EXPENSES)) {
        const store = db.createObjectStore(STORES.EXPENSES, { keyPath: 'id' });
        store.createIndex('branchId', 'branchId', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('syncStatus', 'syncStatus', { unique: false });
      }

      // Stock Movements
      if (!db.objectStoreNames.contains(STORES.STOCK_MOVEMENTS)) {
        const store = db.createObjectStore(STORES.STOCK_MOVEMENTS, { keyPath: 'id' });
        store.createIndex('branchId', 'branchId', { unique: false });
        store.createIndex('productId', 'productId', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('syncStatus', 'syncStatus', { unique: false });
      }

      // Branches
      if (!db.objectStoreNames.contains(STORES.BRANCHES)) {
        const store = db.createObjectStore(STORES.BRANCHES, { keyPath: 'id' });
        store.createIndex('syncStatus', 'syncStatus', { unique: false });
      }

      // Users
      if (!db.objectStoreNames.contains(STORES.USERS)) {
        const store = db.createObjectStore(STORES.USERS, { keyPath: 'id' });
        store.createIndex('branchId', 'branchId', { unique: false });
        store.createIndex('syncStatus', 'syncStatus', { unique: false });
      }

      // Inventory
      if (!db.objectStoreNames.contains(STORES.INVENTORY)) {
        const store = db.createObjectStore(STORES.INVENTORY, { keyPath: 'id' });
        store.createIndex('branchId', 'branchId', { unique: false });
        store.createIndex('productId', 'productId', { unique: false });
        store.createIndex('syncStatus', 'syncStatus', { unique: false });
      }

      // Suppliers
      if (!db.objectStoreNames.contains(STORES.SUPPLIERS)) {
        const store = db.createObjectStore(STORES.SUPPLIERS, { keyPath: 'id' });
        store.createIndex('syncStatus', 'syncStatus', { unique: false });
      }

      // Purchase Orders
      if (!db.objectStoreNames.contains(STORES.PURCHASE_ORDERS)) {
        const store = db.createObjectStore(STORES.PURCHASE_ORDERS, { keyPath: 'id' });
        store.createIndex('branchId', 'branchId', { unique: false });
        store.createIndex('supplierId', 'supplierId', { unique: false });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('syncStatus', 'syncStatus', { unique: false });
      }

      // Goods Receipts (GRN)
      if (!db.objectStoreNames.contains(STORES.GOODS_RECEIPTS)) {
        const store = db.createObjectStore(STORES.GOODS_RECEIPTS, { keyPath: 'id' });
        store.createIndex('purchaseOrderId', 'purchaseOrderId', { unique: false });
        store.createIndex('branchId', 'branchId', { unique: false });
        store.createIndex('supplierId', 'supplierId', { unique: false });
        store.createIndex('syncStatus', 'syncStatus', { unique: false });
      }

      // Supplier Payments
      if (!db.objectStoreNames.contains(STORES.SUPPLIER_PAYMENTS)) {
        const store = db.createObjectStore(STORES.SUPPLIER_PAYMENTS, { keyPath: 'id' });
        store.createIndex('supplierId', 'supplierId', { unique: false });
        store.createIndex('purchaseOrderId', 'purchaseOrderId', { unique: false });
        store.createIndex('branchId', 'branchId', { unique: false });
        store.createIndex('syncStatus', 'syncStatus', { unique: false });
      }

      // Transfers
      if (!db.objectStoreNames.contains(STORES.TRANSFERS)) {
        const store = db.createObjectStore(STORES.TRANSFERS, { keyPath: 'id' });
        store.createIndex('fromBranchId', 'fromBranchId', { unique: false });
        store.createIndex('toBranchId', 'toBranchId', { unique: false });
        store.createIndex('syncStatus', 'syncStatus', { unique: false });
      }

      // Financial Transactions
      if (!db.objectStoreNames.contains(STORES.FINANCIAL_TRANSACTIONS)) {
        const store = db.createObjectStore(STORES.FINANCIAL_TRANSACTIONS, { keyPath: 'id' });
        store.createIndex('branchId', 'branchId', { unique: false });
        store.createIndex('transactionType', 'transactionType', { unique: false });
        store.createIndex('referenceNumber', 'referenceNumber', { unique: false });
        store.createIndex('transactionDate', 'transactionDate', { unique: false });
        store.createIndex('syncStatus', 'syncStatus', { unique: false });
      }

      // Cash Sessions
      if (!db.objectStoreNames.contains(STORES.CASH_SESSIONS)) {
        const store = db.createObjectStore(STORES.CASH_SESSIONS, { keyPath: 'id' });
        store.createIndex('branchId', 'branchId', { unique: false });
        store.createIndex('date', 'date', { unique: false });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('syncStatus', 'syncStatus', { unique: false });
      }

      // Cash Reconciliations
      if (!db.objectStoreNames.contains(STORES.CASH_RECONCILIATIONS)) {
        const store = db.createObjectStore(STORES.CASH_RECONCILIATIONS, { keyPath: 'id' });
        store.createIndex('branchId', 'branchId', { unique: false });
        store.createIndex('date', 'date', { unique: false });
        store.createIndex('varianceType', 'varianceType', { unique: false });
        store.createIndex('syncStatus', 'syncStatus', { unique: false });
      }

      // Notifications & System Alerts
      if (!db.objectStoreNames.contains(STORES.NOTIFICATIONS)) {
        const store = db.createObjectStore(STORES.NOTIFICATIONS, { keyPath: 'id' });
        store.createIndex('branchId', 'branchId', { unique: false });
        store.createIndex('category', 'category', { unique: false });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('priority', 'priority', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('syncStatus', 'syncStatus', { unique: false });
      }

      // Staff Attendance
      if (!db.objectStoreNames.contains(STORES.ATTENDANCE)) {
        const store = db.createObjectStore(STORES.ATTENDANCE, { keyPath: 'id' });
        store.createIndex('userId', 'userId', { unique: false });
        store.createIndex('branchId', 'branchId', { unique: false });
        store.createIndex('date', 'date', { unique: false });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('syncStatus', 'syncStatus', { unique: false });
      }

      // Commissions
      if (!db.objectStoreNames.contains(STORES.COMMISSIONS)) {
        const store = db.createObjectStore(STORES.COMMISSIONS, { keyPath: 'id' });
        store.createIndex('userId', 'userId', { unique: false });
        store.createIndex('branchId', 'branchId', { unique: false });
        store.createIndex('periodMonth', 'periodMonth', { unique: false });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('syncStatus', 'syncStatus', { unique: false });
      }

      // Commission Rules
      if (!db.objectStoreNames.contains(STORES.COMMISSION_RULES)) {
        const store = db.createObjectStore(STORES.COMMISSION_RULES, { keyPath: 'id' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('ruleType', 'ruleType', { unique: false });
      }

      // System & Company Settings
      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS, { keyPath: 'id' });
      }

      // Bulk Data Import Records
      if (!db.objectStoreNames.contains(STORES.DATA_IMPORTS)) {
        const store = db.createObjectStore(STORES.DATA_IMPORTS, { keyPath: 'id' });
        store.createIndex('importType', 'importType', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('syncStatus', 'syncStatus', { unique: false });
      }

      // Pending Operations Queue
      if (!db.objectStoreNames.contains(STORES.PENDING_OPERATIONS)) {
        const store = db.createObjectStore(STORES.PENDING_OPERATIONS, { keyPath: 'id' });
        store.createIndex('entityType', 'entityType', { unique: false });
        store.createIndex('branchId', 'branchId', { unique: false });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // Sync Metadata
      if (!db.objectStoreNames.contains(STORES.SYNC_METADATA)) {
        db.createObjectStore(STORES.SYNC_METADATA, { keyPath: 'id' });
      }

      // Sync History
      if (!db.objectStoreNames.contains(STORES.SYNC_HISTORY)) {
        const store = db.createObjectStore(STORES.SYNC_HISTORY, { keyPath: 'id' });
        store.createIndex('startedAt', 'startedAt', { unique: false });
        store.createIndex('status', 'status', { unique: false });
      }

      // Sync Conflicts
      if (!db.objectStoreNames.contains(STORES.SYNC_CONFLICTS)) {
        const store = db.createObjectStore(STORES.SYNC_CONFLICTS, { keyPath: 'id' });
        store.createIndex('entityType', 'entityType', { unique: false });
        store.createIndex('status', 'status', { unique: false });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      console.error('Failed to open RoyalAgroDB IndexedDB:', request.error);
      reject(request.error);
    };
  });

  return dbPromise;
}

export async function getAllFromStore<T>(storeName: string): Promise<T[]> {
  const db = await getDB();
  if (!db.objectStoreNames.contains(storeName)) {
    console.warn(`Object store "${storeName}" does not exist in IndexedDB.`);
    return [];
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}

export async function getFromStore<T>(storeName: string, id: string): Promise<T | undefined> {
  const db = await getDB();
  if (!db.objectStoreNames.contains(storeName)) {
    console.warn(`Object store "${storeName}" does not exist in IndexedDB.`);
    return undefined;
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error);
  });
}

export async function putToStore<T>(storeName: string, item: T): Promise<T> {
  const db = await getDB();
  if (!db.objectStoreNames.contains(storeName)) {
    console.warn(`Object store "${storeName}" does not exist in IndexedDB. Skipping put.`);
    return item;
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(item);

    request.onsuccess = () => resolve(item);
    request.onerror = () => reject(request.error);
  });
}

export async function putBatchToStore<T>(storeName: string, items: T[]): Promise<void> {
  if (!items || items.length === 0) return;
  const db = await getDB();
  if (!db.objectStoreNames.contains(storeName)) {
    console.warn(`Object store "${storeName}" does not exist in IndexedDB. Skipping putBatch.`);
    return;
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);

    items.forEach((item) => store.put(item));

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteFromStore(storeName: string, id: string): Promise<void> {
  const db = await getDB();
  if (!db.objectStoreNames.contains(storeName)) {
    return;
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function clearStore(storeName: string): Promise<void> {
  const db = await getDB();
  if (!db.objectStoreNames.contains(storeName)) {
    return;
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
