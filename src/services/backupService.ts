import {
  AppState,
  BackupPackage,
  BackupMetadata,
  BackupLogEntry,
  RestoreOptions,
  RestoreResult,
  User,
  Sale,
  Product,
  Customer,
  Supplier,
  Branch,
  StockMovement,
  CustomerCredit,
  CreditPayment,
  GoodsReceipt,
  SupplierPayment,
  StockTransfer,
  FinancialTransaction
} from '../types';
import { getNetworkStatus } from '../offline/networkStatus';
import { getPendingCount } from '../offline/offlineQueue';

export const APP_VERSION = '1.4.0';
export const SCHEMA_VERSION = '1.4.0';
export const SAFETY_BACKUP_STORAGE_KEY = 'ROYAL_AGRO_SAFETY_BACKUP_V1';

/**
 * Generates a SHA-256 hex string for a given payload text.
 */
export async function computeChecksum(content: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined') {
    try {
      const msgBuffer = new TextEncoder().encode(content);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fallback simple hash
    }
  }

  // Non-crypto fallback hash
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return 'chk_' + Math.abs(hash).toString(16);
}

/**
 * Creates a complete structured backup package.
 */
export async function createBackupPackage(
  state: AppState,
  currentUser: User,
  options: {
    scope?: 'FULL_SYSTEM' | 'BRANCH_SNAPSHOT';
    branchId?: string;
    description?: string;
    includeAuditLogs?: boolean;
  } = {}
): Promise<BackupPackage> {
  const {
    scope = 'FULL_SYSTEM',
    branchId,
    description = 'Standard system backup',
    includeAuditLogs = true
  } = options;

  const branch = branchId ? state.branches.find((b) => b.id === branchId) : undefined;
  const isBranchScoped = scope === 'BRANCH_SNAPSHOT' && !!branchId;

  // Filter or capture entities based on scope
  const targetProducts = state.products || [];
  const targetBranches = state.branches || [];
  const targetUsers = state.users || [];
  const targetInventory = isBranchScoped
    ? (state.inventory || []).filter((i) => i.branchId === branchId)
    : state.inventory || [];
  const targetSales = isBranchScoped
    ? (state.sales || []).filter((s) => s.branchId === branchId)
    : state.sales || [];
  const targetTransfers = isBranchScoped
    ? (state.transfers || []).filter(
        (t) => t.sourceBranchId === branchId || t.destinationBranchId === branchId
      )
    : state.transfers || [];
  const targetCustomers = isBranchScoped
    ? (state.customers || []).filter((c) => c.registeredBranchId === branchId)
    : state.customers || [];
  const targetSuppliers = state.suppliers || [];
  const targetPurchaseOrders = isBranchScoped
    ? (state.purchaseOrders || state.purchases || []).filter((p) => p.branchId === branchId)
    : state.purchaseOrders || state.purchases || [];
  const targetGoodsReceipts = isBranchScoped
    ? (state.goodsReceipts || []).filter((g) => g.branchId === branchId)
    : state.goodsReceipts || [];
  const targetSupplierPayments = isBranchScoped
    ? (state.supplierPayments || []).filter((p) => p.branchId === branchId)
    : state.supplierPayments || [];
  const targetExpenses = isBranchScoped
    ? (state.expenses || []).filter((e) => e.branchId === branchId)
    : state.expenses || [];
  const targetStockMovements = isBranchScoped
    ? (state.stockMovements || state.movements || []).filter((m) => m.branchId === branchId)
    : state.stockMovements || state.movements || [];
  const targetStockAdjustments = isBranchScoped
    ? (state.stockAdjustments || []).filter((a) => a.branchId === branchId)
    : state.stockAdjustments || [];
  const targetCredits = isBranchScoped
    ? (state.credits || []).filter((c) => c.branchId === branchId)
    : state.credits || [];
  const targetCreditPayments = isBranchScoped
    ? (state.creditPayments || []).filter((p) => p.branchId === branchId)
    : state.creditPayments || [];
  const targetSalesReturns = isBranchScoped
    ? (state.salesReturns || []).filter((r) => r.branchId === branchId)
    : state.salesReturns || [];
  const targetFinancialTransactions = isBranchScoped
    ? (state.financialTransactions || []).filter((f) => f.branchId === branchId)
    : state.financialTransactions || [];
  const targetCashSessions = isBranchScoped
    ? (state.cashSessions || []).filter((c) => c.branchId === branchId)
    : state.cashSessions || [];
  const targetCashReconciliations = isBranchScoped
    ? (state.cashReconciliations || []).filter((c) => c.branchId === branchId)
    : state.cashReconciliations || [];
  const targetNotifications = isBranchScoped
    ? (state.notifications || []).filter((n) => !n.branchId || n.branchId === branchId)
    : state.notifications || [];
  const targetAuditLogs = includeAuditLogs
    ? isBranchScoped
      ? (state.auditLogs || []).filter((a) => !a.branchId || a.branchId === branchId)
      : state.auditLogs || []
    : [];

  const recordCounts: Record<string, number> = {
    branches: targetBranches.length,
    users: targetUsers.length,
    products: targetProducts.length,
    inventory: targetInventory.length,
    sales: targetSales.length,
    transfers: targetTransfers.length,
    customers: targetCustomers.length,
    suppliers: targetSuppliers.length,
    purchaseOrders: targetPurchaseOrders.length,
    goodsReceipts: targetGoodsReceipts.length,
    supplierPayments: targetSupplierPayments.length,
    expenses: targetExpenses.length,
    stockMovements: targetStockMovements.length,
    stockAdjustments: targetStockAdjustments.length,
    credits: targetCredits.length,
    creditPayments: targetCreditPayments.length,
    salesReturns: targetSalesReturns.length,
    financialTransactions: targetFinancialTransactions.length,
    cashSessions: targetCashSessions.length,
    cashReconciliations: targetCashReconciliations.length,
    notifications: targetNotifications.length,
    auditLogs: targetAuditLogs.length
  };

  const totalRecords = Object.values(recordCounts).reduce((a, b) => a + b, 0);

  // Network & Offline context
  const network = getNetworkStatus();
  const isOffline = !network.isOnline;
  let pendingOps = 0;
  try {
    pendingOps = await getPendingCount();
  } catch {
    // ignore
  }

  const backupData = {
    branches: targetBranches,
    users: targetUsers,
    products: targetProducts,
    inventory: targetInventory,
    sales: targetSales,
    transfers: targetTransfers,
    customers: targetCustomers,
    suppliers: targetSuppliers,
    purchaseOrders: targetPurchaseOrders,
    goodsReceipts: targetGoodsReceipts,
    supplierPayments: targetSupplierPayments,
    expenses: targetExpenses,
    stockMovements: targetStockMovements,
    stockAdjustments: targetStockAdjustments,
    credits: targetCredits,
    creditPayments: targetCreditPayments,
    salesReturns: targetSalesReturns,
    financialTransactions: targetFinancialTransactions,
    cashSessions: targetCashSessions,
    cashReconciliations: targetCashReconciliations,
    notifications: targetNotifications,
    auditLogs: targetAuditLogs,
    notificationSettings: state.notificationSettings
  };

  const dataString = JSON.stringify(backupData);
  const checksum = await computeChecksum(dataString);
  const fileSizeBytes = new Blob([dataString]).size;

  const metadata: BackupMetadata = {
    id: `backup-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
    appName: 'Royal Agro Management System',
    appVersion: APP_VERSION,
    schemaVersion: SCHEMA_VERSION,
    createdByUserId: currentUser.id,
    createdByUserName: currentUser.name,
    createdByUserRole: currentUser.role,
    backupScope: scope,
    branchId: branch?.id,
    branchName: branch?.name,
    isOfflineSnapshot: isOffline,
    pendingOfflineOpsCount: pendingOps,
    checksum,
    recordCounts,
    totalRecords,
    description: isOffline
      ? `${description} (OFFLINE SNAPSHOT - contains ${pendingOps} unsynchronized local changes)`
      : description,
    storageLocation: 'CLIENT_DOWNLOAD',
    fileSizeBytes
  };

  return {
    metadata,
    data: backupData
  };
}

/**
 * Triggers clean browser JSON download without alerts or window.open.
 */
export function downloadBackupPackage(backupPackage: BackupPackage): void {
  const jsonStr = JSON.stringify(backupPackage, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const dateStr = new Date().toISOString().slice(0, 10);
  const scopeTag = backupPackage.metadata.backupScope === 'BRANCH_SNAPSHOT'
    ? `_${(backupPackage.metadata.branchName || 'branch').replace(/[^a-z0-9]/gi, '_').toLowerCase()}`
    : '_full';
  const offlineTag = backupPackage.metadata.isOfflineSnapshot ? '_offline' : '';

  link.href = url;
  link.download = `royal_agro_backup${scopeTag}${offlineTag}_${dateStr}_v${SCHEMA_VERSION}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Validates a candidate backup file text before restoring.
 */
export async function validateBackupContent(fileText: string): Promise<{
  isValid: boolean;
  errors: string[];
  warnings: string[];
  backupPackage?: BackupPackage;
}> {
  const errors: string[] = [];
  const warnings: string[] = [];

  let parsed: any;
  try {
    parsed = JSON.parse(fileText);
  } catch (err: any) {
    return {
      isValid: false,
      errors: [`JSON syntax error: The file is corrupted or not a valid JSON document (${err.message}).`],
      warnings: []
    };
  }

  if (!parsed || typeof parsed !== 'object') {
    return {
      isValid: false,
      errors: ['Invalid root structure: expected an object with metadata and data blocks.'],
      warnings: []
    };
  }

  // Check top-level properties
  if (!parsed.metadata) {
    errors.push('Missing top-level "metadata" block.');
  }
  if (!parsed.data || typeof parsed.data !== 'object') {
    errors.push('Missing top-level "data" payload block.');
  }

  if (errors.length > 0) {
    return { isValid: false, errors, warnings };
  }

  const meta = parsed.metadata as BackupMetadata;

  // Validate required metadata fields
  if (!meta.id) errors.push('Backup metadata is missing "id".');
  if (!meta.createdAt) errors.push('Backup metadata is missing "createdAt" timestamp.');
  if (!meta.schemaVersion) errors.push('Backup metadata is missing "schemaVersion".');
  if (!meta.recordCounts || typeof meta.recordCounts !== 'object') {
    errors.push('Backup metadata is missing "recordCounts" summary.');
  }

  // Version compatibility check
  if (meta.schemaVersion) {
    const major = meta.schemaVersion.split('.')[0];
    const currentMajor = SCHEMA_VERSION.split('.')[0];
    if (major !== currentMajor) {
      errors.push(
        `Incompatible schema version: file has version ${meta.schemaVersion}, but application requires version ${currentMajor}.x.`
      );
    }
  }

  // Checksum verification
  if (meta.checksum) {
    try {
      const computed = await computeChecksum(JSON.stringify(parsed.data));
      if (computed !== meta.checksum) {
        warnings.push(
          'Checksum discrepancy: The computed data checksum does not match metadata signature. The data may have been manually modified.'
        );
      }
    } catch {
      warnings.push('Could not compute verification checksum in current browser context.');
    }
  } else {
    warnings.push('Backup package does not contain an integrity checksum.');
  }

  // Offline snapshot warning
  if (meta.isOfflineSnapshot) {
    warnings.push(
      `Notice: This backup was generated offline and may have contained ${
        meta.pendingOfflineOpsCount || 0
      } unsynchronized changes at the time of creation.`
    );
  }

  // Check data consistency
  const data = parsed.data;
  if (!data.products && !data.sales && !data.branches && !data.customers) {
    warnings.push('The backup file contains empty or minimal primary business collections.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    backupPackage: errors.length === 0 ? (parsed as BackupPackage) : undefined
  };
}

/**
 * Creates and stores an emergency local safety backup in localStorage.
 */
let inMemoryLatestSafetyBackup: BackupPackage | null = null;

export function createSafetyBackup(state: AppState, reason: string): BackupPackage {
  const safetyData = {
    branches: state.branches,
    users: state.users,
    products: state.products,
    inventory: state.inventory,
    sales: state.sales,
    transfers: state.transfers,
    customers: state.customers,
    suppliers: state.suppliers,
    purchaseOrders: state.purchaseOrders || state.purchases,
    goodsReceipts: state.goodsReceipts,
    supplierPayments: state.supplierPayments,
    expenses: state.expenses,
    stockMovements: state.stockMovements || state.movements,
    stockAdjustments: state.stockAdjustments,
    credits: state.credits,
    creditPayments: state.creditPayments,
    salesReturns: state.salesReturns,
    financialTransactions: state.financialTransactions,
    cashSessions: state.cashSessions,
    cashReconciliations: state.cashReconciliations,
    notifications: state.notifications,
    auditLogs: state.auditLogs,
    notificationSettings: state.notificationSettings
  };

  const recordCounts: Record<string, number> = {
    branches: (state.branches || []).length,
    users: (state.users || []).length,
    products: (state.products || []).length,
    inventory: (state.inventory || []).length,
    sales: (state.sales || []).length,
    transfers: (state.transfers || []).length,
    customers: (state.customers || []).length,
    suppliers: (state.suppliers || []).length,
    purchaseOrders: (state.purchaseOrders || state.purchases || []).length,
    goodsReceipts: (state.goodsReceipts || []).length,
    supplierPayments: (state.supplierPayments || []).length,
    expenses: (state.expenses || []).length,
    stockMovements: (state.stockMovements || state.movements || []).length,
    stockAdjustments: (state.stockAdjustments || []).length,
    credits: (state.credits || []).length,
    creditPayments: (state.creditPayments || []).length,
    salesReturns: (state.salesReturns || []).length,
    financialTransactions: (state.financialTransactions || []).length,
    cashSessions: (state.cashSessions || []).length,
    cashReconciliations: (state.cashReconciliations || []).length,
    notifications: (state.notifications || []).length,
    auditLogs: (state.auditLogs || []).length
  };

  const totalRecords = Object.values(recordCounts).reduce((a, b) => a + b, 0);

  const isOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false;

  const metadata: BackupMetadata = {
    id: `safety-${Date.now()}`,
    createdAt: new Date().toISOString(),
    appName: 'Royal Agro Management System',
    appVersion: APP_VERSION,
    schemaVersion: SCHEMA_VERSION,
    createdByUserId: state.currentUser?.id || 'system',
    createdByUserName: state.currentUser?.name || 'System Safety Engine',
    createdByUserRole: state.currentUser?.role || 'CEO',
    backupScope: 'FULL_SYSTEM',
    isOfflineSnapshot: isOffline,
    checksum: 'safety_snapshot',
    recordCounts,
    totalRecords,
    description: `Auto safety backup before: ${reason}`,
    storageLocation: 'INDEXED_DB'
  };

  const pkg: BackupPackage = {
    metadata,
    data: safetyData
  };

  inMemoryLatestSafetyBackup = pkg;

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(SAFETY_BACKUP_STORAGE_KEY, JSON.stringify(pkg));
    } catch (err) {
      console.warn('Could not persist safety backup to localStorage due to quota limit:', err);
    }
  }

  return pkg;
}

/**
 * Retrieves the most recent automatic safety backup if available.
 */
export function getLatestSafetyBackup(): BackupPackage | null {
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(SAFETY_BACKUP_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
  }
  return inMemoryLatestSafetyBackup;
}

/**
 * Restores data into existing AppState with strict duplicate prevention and safety guards.
 */
export function executeRestore(
  currentState: AppState,
  backupPackage: BackupPackage,
  currentUser: User,
  options: RestoreOptions
): { updatedState: AppState; result: RestoreResult } {
  // 1. Enforce Role Permission
  if (currentUser.role !== 'CEO') {
    throw new Error('Access Denied: Only CEO / Super Admin can perform restoration operations.');
  }

  const warnings: string[] = [];
  const errors: string[] = [];
  const recordsRestored: Record<string, number> = {};
  const recordsSkipped: Record<string, number> = {};

  let safetyBackupId: string | undefined;

  // 2. Safety Backup Creation
  if (options.createSafetyBackup) {
    const safetyPkg = createSafetyBackup(
      currentState,
      `Restore from backup #${backupPackage.metadata.id} (${options.mode})`
    );
    safetyBackupId = safetyPkg.metadata.id;
  }

  const bData = backupPackage.data || {};

  let nextState: AppState = { ...currentState };

  if (options.mode === 'FULL_OVERWRITE') {
    // FULL REPLACEMENT: Overwrite existing business collections with backup snapshot,
    // preserving only the active currentUser session.
    nextState = {
      ...nextState,
      branches: bData.branches || currentState.branches,
      users: bData.users || currentState.users,
      products: bData.products || currentState.products,
      inventory: bData.inventory || currentState.inventory,
      sales: bData.sales || currentState.sales,
      transfers: bData.transfers || currentState.transfers,
      customers: bData.customers || currentState.customers,
      suppliers: bData.suppliers || currentState.suppliers,
      purchaseOrders: bData.purchaseOrders || currentState.purchaseOrders || [],
      purchases: bData.purchaseOrders || currentState.purchaseOrders || [],
      goodsReceipts: bData.goodsReceipts || currentState.goodsReceipts || [],
      supplierPayments: bData.supplierPayments || currentState.supplierPayments || [],
      expenses: bData.expenses || currentState.expenses,
      stockMovements: bData.stockMovements || currentState.stockMovements || [],
      stockAdjustments: bData.stockAdjustments || currentState.stockAdjustments || [],
      credits: bData.credits || currentState.credits || [],
      creditPayments: bData.creditPayments || currentState.creditPayments || [],
      salesReturns: bData.salesReturns || currentState.salesReturns || [],
      financialTransactions: bData.financialTransactions || currentState.financialTransactions || [],
      cashSessions: bData.cashSessions || currentState.cashSessions || [],
      cashReconciliations: bData.cashReconciliations || currentState.cashReconciliations || [],
      notifications: bData.notifications || currentState.notifications || [],
      auditLogs: bData.auditLogs || currentState.auditLogs || [],
      notificationSettings: bData.notificationSettings || currentState.notificationSettings
    };

    Object.entries(backupPackage.metadata.recordCounts || {}).forEach(([k, count]) => {
      recordsRestored[k] = count;
      recordsSkipped[k] = 0;
    });
  } else {
    // MERGE & DEDUPLICATE MODE (Recommended)
    // Merges missing items and updates existing without duplicating financial/inventory records!

    // Helper for deduplicating arrays
    function mergeCollections<T extends { id: string }>(
      currentList: T[],
      incomingList: T[] | undefined,
      collectionName: string,
      isDuplicateFn?: (current: T, incoming: T) => boolean
    ): T[] {
      if (!incomingList || incomingList.length === 0) {
        recordsRestored[collectionName] = 0;
        recordsSkipped[collectionName] = 0;
        return currentList;
      }

      const existingMap = new Map<string, T>();
      currentList.forEach((item) => existingMap.set(item.id, item));

      let restoredCount = 0;
      let skippedCount = 0;

      const result = [...currentList];

      incomingList.forEach((incoming) => {
        // Check primary ID
        const existsById = existingMap.get(incoming.id);

        // Check secondary uniqueness (receiptNo, paymentNo, etc.)
        let isDuplicate = !!existsById;
        if (!isDuplicate && isDuplicateFn) {
          isDuplicate = currentList.some((existing) => isDuplicateFn(existing, incoming));
        }

        if (isDuplicate) {
          skippedCount++;
        } else {
          result.push(incoming);
          existingMap.set(incoming.id, incoming);
          restoredCount++;
        }
      });

      recordsRestored[collectionName] = restoredCount;
      recordsSkipped[collectionName] = skippedCount;
      return result;
    }

    // Products (id or SKU)
    nextState.products = mergeCollections(
      currentState.products || [],
      bData.products,
      'products',
      (a, b) => a.sku?.toLowerCase() === b.sku?.toLowerCase()
    );

    // Branches (id or Code)
    nextState.branches = mergeCollections(
      currentState.branches || [],
      bData.branches,
      'branches',
      (a, b) => a.code?.toLowerCase() === b.code?.toLowerCase()
    );

    // Users (id or Email)
    nextState.users = mergeCollections(
      currentState.users || [],
      bData.users,
      'users',
      (a, b) => a.email?.toLowerCase() === b.email?.toLowerCase()
    );

    // Customers (id or Phone)
    nextState.customers = mergeCollections(
      currentState.customers || [],
      bData.customers,
      'customers',
      (a, b) => a.phone && b.phone && a.phone === b.phone
    );

    // Suppliers (id or Phone/Email)
    nextState.suppliers = mergeCollections(
      currentState.suppliers || [],
      bData.suppliers,
      'suppliers',
      (a, b) => (a.phone && b.phone && a.phone === b.phone) || (a.email && b.email && a.email === b.email)
    );

    // Sales (id or receiptNo - CRITICAL duplicate prevention)
    nextState.sales = mergeCollections(
      currentState.sales || [],
      bData.sales,
      'sales',
      (a, b) =>
        options.skipDuplicateReceipts &&
        !!a.receiptNo &&
        !!b.receiptNo &&
        a.receiptNo.toLowerCase() === b.receiptNo.toLowerCase()
    );

    // Credits (id or creditNo)
    nextState.credits = mergeCollections(
      currentState.credits || [],
      bData.credits,
      'credits',
      (a, b) => !!a.creditNo && !!b.creditNo && a.creditNo === b.creditNo
    );

    // Credit Payments (id or paymentNo)
    nextState.creditPayments = mergeCollections(
      currentState.creditPayments || [],
      bData.creditPayments,
      'creditPayments',
      (a, b) =>
        options.skipDuplicatePayments &&
        !!a.paymentNo &&
        !!b.paymentNo &&
        a.paymentNo === b.paymentNo
    );

    // Stock Movements (id or composite reference)
    nextState.stockMovements = mergeCollections(
      currentState.stockMovements || currentState.movements || [],
      bData.stockMovements,
      'stockMovements',
      (a, b) =>
        options.skipDuplicateStockMovements &&
        !!a.referenceNo &&
        !!b.referenceNo &&
        a.referenceNo === b.referenceNo &&
        a.productId === b.productId &&
        a.branchId === b.branchId &&
        a.quantityDelta === b.quantityDelta
    );

    // Stock Adjustments
    nextState.stockAdjustments = mergeCollections(
      currentState.stockAdjustments || [],
      bData.stockAdjustments,
      'stockAdjustments',
      (a, b) => !!a.adjustmentNo && !!b.adjustmentNo && a.adjustmentNo === b.adjustmentNo
    );

    // Transfers
    nextState.transfers = mergeCollections(
      currentState.transfers || [],
      bData.transfers,
      'transfers',
      (a, b) => !!a.transferNo && !!b.transferNo && a.transferNo === b.transferNo
    );

    // Purchase Orders
    nextState.purchaseOrders = mergeCollections(
      currentState.purchaseOrders || currentState.purchases || [],
      bData.purchaseOrders,
      'purchaseOrders',
      (a, b) => !!a.orderNo && !!b.orderNo && a.orderNo === b.orderNo
    );
    nextState.purchases = nextState.purchaseOrders;

    // Goods Receipts (GRN)
    nextState.goodsReceipts = mergeCollections(
      currentState.goodsReceipts || [],
      bData.goodsReceipts,
      'goodsReceipts',
      (a, b) => !!a.grnNumber && !!b.grnNumber && a.grnNumber === b.grnNumber
    );

    // Supplier Payments
    nextState.supplierPayments = mergeCollections(
      currentState.supplierPayments || [],
      bData.supplierPayments,
      'supplierPayments',
      (a, b) =>
        options.skipDuplicatePayments &&
        !!a.paymentNo &&
        !!b.paymentNo &&
        a.paymentNo === b.paymentNo
    );

    // Sales Returns
    nextState.salesReturns = mergeCollections(
      currentState.salesReturns || [],
      bData.salesReturns,
      'salesReturns',
      (a, b) => !!a.returnNo && !!b.returnNo && a.returnNo === b.returnNo
    );

    // Expenses
    nextState.expenses = mergeCollections(
      currentState.expenses || [],
      bData.expenses,
      'expenses',
      (a, b) =>
        !!a.receiptRef &&
        !!b.receiptRef &&
        a.receiptRef === b.receiptRef &&
        a.amount === b.amount &&
        a.branchId === b.branchId
    );

    // Financial Transactions
    nextState.financialTransactions = mergeCollections(
      currentState.financialTransactions || [],
      bData.financialTransactions,
      'financialTransactions',
      (a, b) =>
        !!a.referenceNumber &&
        !!b.referenceNumber &&
        a.referenceNumber === b.referenceNumber &&
        a.branchId === b.branchId
    );

    // Cash Sessions
    nextState.cashSessions = mergeCollections(
      currentState.cashSessions || [],
      bData.cashSessions,
      'cashSessions',
      (a, b) => a.branchId === b.branchId && a.date === b.date
    );

    // Cash Reconciliations
    nextState.cashReconciliations = mergeCollections(
      currentState.cashReconciliations || [],
      bData.cashReconciliations,
      'cashReconciliations',
      (a, b) => !!a.reconciliationNo && !!b.reconciliationNo && a.reconciliationNo === b.reconciliationNo
    );

    // Inventory Balances
    // In merge mode, if branch inventory exists, we keep the latest updated
    if (bData.inventory && bData.inventory.length > 0) {
      const invMap = new Map<string, any>();
      (currentState.inventory || []).forEach((item) => {
        invMap.set(`${item.branchId}_${item.productId}`, item);
      });

      let invRestored = 0;
      let invSkipped = 0;

      bData.inventory.forEach((item) => {
        const key = `${item.branchId}_${item.productId}`;
        if (!invMap.has(key)) {
          invMap.set(key, item);
          invRestored++;
        } else {
          invSkipped++;
        }
      });

      nextState.inventory = Array.from(invMap.values());
      recordsRestored.inventory = invRestored;
      recordsSkipped.inventory = invSkipped;
    }

    // Notifications & Audit Logs (append unique only)
    if (bData.notifications && bData.notifications.length > 0) {
      nextState.notifications = mergeCollections(
        currentState.notifications || [],
        bData.notifications,
        'notifications'
      );
    }

    if (bData.auditLogs && bData.auditLogs.length > 0) {
      nextState.auditLogs = mergeCollections(
        currentState.auditLogs || [],
        bData.auditLogs,
        'auditLogs'
      );
    }
  }

  const totalRestored = Object.values(recordsRestored).reduce((a, b) => a + b, 0);
  const totalSkipped = Object.values(recordsSkipped).reduce((a, b) => a + b, 0);

  // 3. Record Audit Log for the Restore Event
  const auditEntry = {
    id: `audit-restore-${Date.now()}`,
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: 'DISASTER_RECOVERY_RESTORE',
    details: `Executed restore in ${options.mode} mode from backup #${backupPackage.metadata.id}. Restored ${totalRestored} records, skipped ${totalSkipped} duplicate records.`,
    timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
    ipAddress: '127.0.0.1'
  };

  nextState.auditLogs = [auditEntry, ...(nextState.auditLogs || [])];

  // 4. Update Backup History in AppState
  const historyEntry: BackupLogEntry = {
    id: `restore-log-${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: 'RESTORE_OPERATION',
    status: errors.length === 0 ? 'SUCCESS' : 'WARNING',
    performedBy: currentUser.name,
    userRole: currentUser.role,
    details: `Restored ${totalRestored} records (${options.mode} mode). ${totalSkipped} duplicates skipped.`,
    backupId: backupPackage.metadata.id,
    recordsCount: totalRestored
  };

  nextState.backupHistory = [historyEntry, ...(nextState.backupHistory || [])];

  const result: RestoreResult = {
    success: errors.length === 0,
    mode: options.mode,
    recordsRestored,
    recordsSkipped,
    totalRestored,
    totalSkipped,
    safetyBackupId,
    warnings,
    errors,
    timestamp: new Date().toISOString()
  };

  return {
    updatedState: nextState,
    result
  };
}

/**
 * Communicates with backend backup API (if server is reachable).
 */
export async function uploadBackupToServer(backupPackage: BackupPackage): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch('/api/backup/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': backupPackage.metadata.createdByUserRole
      },
      body: JSON.stringify(backupPackage)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, message: err.error || 'Server rejected backup storage.' };
    }
    return { success: true, message: 'Backup successfully archived on backend server.' };
  } catch (err: any) {
    return { success: false, message: `Server backup sync unavailable: ${err.message}` };
  }
}

export async function fetchServerBackupHistory(): Promise<BackupLogEntry[]> {
  try {
    const res = await fetch('/api/backup/history');
    if (res.ok) {
      const data = await res.json();
      return data.backups || [];
    }
  } catch {
    // Offline or server route not reached
  }
  return [];
}
