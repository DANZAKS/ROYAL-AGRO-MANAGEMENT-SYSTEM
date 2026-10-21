import {
  STORES,
  getAllFromStore,
  getFromStore,
  putToStore,
  putBatchToStore,
  deleteFromStore
} from './indexedDB';
import {
  queueOperation,
  getPendingOperations,
  getPendingCount,
  removePendingOperation,
  updatePendingOperation
} from './offlineQueue';
import { getNetworkStatus } from './networkStatus';
import { getSyncMetadata, triggerSync } from './syncManager';
import { AppState } from '../lib/storage';
import { OperationType, EntityType } from './types';

export async function getLocalData<T>(storeName: string): Promise<T[]> {
  try {
    return await getAllFromStore<T>(storeName);
  } catch (err) {
    console.error(`Error reading store ${storeName} from IndexedDB:`, err);
    return [];
  }
}

export async function saveLocalData<T extends { id: string }>(
  storeName: string,
  data: T,
  operationType: OperationType = 'CREATE',
  entityType?: EntityType,
  branchId?: string
): Promise<T> {
  try {
    const saved = await putToStore(storeName, data);

    // Queue pending operation if offline or if entity tracking requested
    if (entityType) {
      await queueOperation({
        operationType,
        entityType,
        entityId: data.id,
        payload: data,
        branchId
      });
    }

    return saved;
  } catch (err) {
    console.error(`Error saving to store ${storeName} in IndexedDB:`, err);
    throw err;
  }
}

export async function updateLocalData<T extends { id: string }>(
  storeName: string,
  data: T,
  entityType?: EntityType,
  branchId?: string
): Promise<T> {
  return saveLocalData(storeName, data, 'UPDATE', entityType, branchId);
}

export async function deleteLocalData(
  storeName: string,
  id: string,
  entityType?: EntityType,
  branchId?: string
): Promise<void> {
  try {
    await deleteFromStore(storeName, id);

    if (entityType) {
      await queueOperation({
        operationType: 'DELETE',
        entityType,
        entityId: id,
        payload: { id },
        branchId
      });
    }
  } catch (err) {
    console.error(`Error deleting item ${id} from store ${storeName} in IndexedDB:`, err);
    throw err;
  }
}

/**
 * Synchronizes the full in-memory AppState into IndexedDB stores for offline persistence.
 */
export async function syncFullAppStateToIndexedDB(state: AppState): Promise<void> {
  try {
    if (state.products?.length) await putBatchToStore(STORES.PRODUCTS, state.products).catch((e) => console.warn('Sync products error:', e));
    if (state.customers?.length) await putBatchToStore(STORES.CUSTOMERS, state.customers).catch((e) => console.warn('Sync customers error:', e));
    if (state.sales?.length) await putBatchToStore(STORES.SALES, state.sales).catch((e) => console.warn('Sync sales error:', e));
    if (state.credits?.length) await putBatchToStore(STORES.CREDITS, state.credits).catch((e) => console.warn('Sync credits error:', e));
    if (state.creditPayments?.length) await putBatchToStore(STORES.CREDIT_PAYMENTS, state.creditPayments).catch((e) => console.warn('Sync creditPayments error:', e));
    if (state.salesReturns?.length) await putBatchToStore(STORES.RETURNS, state.salesReturns).catch((e) => console.warn('Sync salesReturns error:', e));
    if (state.expenses?.length) await putBatchToStore(STORES.EXPENSES, state.expenses).catch((e) => console.warn('Sync expenses error:', e));

    const movements = state.stockMovements || state.movements || [];
    if (movements.length) await putBatchToStore(STORES.STOCK_MOVEMENTS, movements).catch((e) => console.warn('Sync stockMovements error:', e));

    if (state.branches?.length) await putBatchToStore(STORES.BRANCHES, state.branches).catch((e) => console.warn('Sync branches error:', e));
    if (state.users?.length) await putBatchToStore(STORES.USERS, state.users).catch((e) => console.warn('Sync users error:', e));
    if (state.inventory?.length) await putBatchToStore(STORES.INVENTORY, state.inventory).catch((e) => console.warn('Sync inventory error:', e));
    if (state.suppliers?.length) await putBatchToStore(STORES.SUPPLIERS, state.suppliers).catch((e) => console.warn('Sync suppliers error:', e));
    const poList = state.purchaseOrders || state.purchases || [];
    if (poList.length) await putBatchToStore(STORES.PURCHASE_ORDERS, poList).catch((e) => console.warn('Sync purchaseOrders error:', e));
    if (state.goodsReceipts?.length) await putBatchToStore(STORES.GOODS_RECEIPTS, state.goodsReceipts).catch((e) => console.warn('Sync goodsReceipts error:', e));
    if (state.supplierPayments?.length) await putBatchToStore(STORES.SUPPLIER_PAYMENTS, state.supplierPayments).catch((e) => console.warn('Sync supplierPayments error:', e));
    if (state.transfers?.length) await putBatchToStore(STORES.TRANSFERS, state.transfers).catch((e) => console.warn('Sync transfers error:', e));
    if (state.financialTransactions?.length) await putBatchToStore(STORES.FINANCIAL_TRANSACTIONS, state.financialTransactions).catch((e) => console.warn('Sync financialTransactions error:', e));
    if (state.cashSessions?.length) await putBatchToStore(STORES.CASH_SESSIONS, state.cashSessions).catch((e) => console.warn('Sync cashSessions error:', e));
    if (state.cashReconciliations?.length) await putBatchToStore(STORES.CASH_RECONCILIATIONS, state.cashReconciliations).catch((e) => console.warn('Sync cashReconciliations error:', e));
    if (state.notifications?.length) await putBatchToStore(STORES.NOTIFICATIONS, state.notifications).catch((e) => console.warn('Sync notifications error:', e));
    if (state.attendance?.length) await putBatchToStore(STORES.ATTENDANCE, state.attendance).catch((e) => console.warn('Sync attendance error:', e));
    if (state.commissions?.length) await putBatchToStore(STORES.COMMISSIONS, state.commissions).catch((e) => console.warn('Sync commissions error:', e));
    if (state.commissionRules?.length) await putBatchToStore(STORES.COMMISSION_RULES, state.commissionRules).catch((e) => console.warn('Sync commissionRules error:', e));
    if (state.companySettings) await putToStore(STORES.SETTINGS, state.companySettings).catch((e) => console.warn('Sync companySettings error:', e));
    if (state.businessRules) await putToStore(STORES.SETTINGS, state.businessRules).catch((e) => console.warn('Sync businessRules error:', e));
    if (state.dataImports?.length) await putBatchToStore(STORES.DATA_IMPORTS, state.dataImports).catch((e) => console.warn('Sync dataImports error:', e));
  } catch (err) {
    console.error('Failed to sync AppState into IndexedDB:', err);
  }
}

/**
 * Loads full AppState stored in IndexedDB.
 */
export async function loadAppStateFromIndexedDB(): Promise<Partial<AppState> | null> {
  try {
    const products = await getAllFromStore(STORES.PRODUCTS);
    const customers = await getAllFromStore(STORES.CUSTOMERS);
    const sales = await getAllFromStore(STORES.SALES);
    const credits = await getAllFromStore(STORES.CREDITS);
    const creditPayments = await getAllFromStore(STORES.CREDIT_PAYMENTS);
    const salesReturns = await getAllFromStore(STORES.RETURNS);
    const expenses = await getAllFromStore(STORES.EXPENSES);
    const stockMovements = await getAllFromStore(STORES.STOCK_MOVEMENTS);
    const branches = await getAllFromStore(STORES.BRANCHES);
    const users = await getAllFromStore(STORES.USERS);
    const inventory = await getAllFromStore(STORES.INVENTORY);
    const suppliers = await getAllFromStore(STORES.SUPPLIERS);
    const purchaseOrders = await getAllFromStore(STORES.PURCHASE_ORDERS);
    const goodsReceipts = await getAllFromStore(STORES.GOODS_RECEIPTS);
    const supplierPayments = await getAllFromStore(STORES.SUPPLIER_PAYMENTS);
    const transfers = await getAllFromStore(STORES.TRANSFERS);
    const financialTransactions = await getAllFromStore(STORES.FINANCIAL_TRANSACTIONS);
    const cashSessions = await getAllFromStore(STORES.CASH_SESSIONS);
    const cashReconciliations = await getAllFromStore(STORES.CASH_RECONCILIATIONS);
    const notifications = await getAllFromStore(STORES.NOTIFICATIONS);

    if (!products.length && !sales.length && !customers.length) {
      return null;
    }

    return {
      products: products as any,
      customers: customers as any,
      sales: sales as any,
      credits: credits as any,
      creditPayments: creditPayments as any,
      salesReturns: salesReturns as any,
      expenses: expenses as any,
      stockMovements: stockMovements as any,
      movements: stockMovements as any,
      branches: branches as any,
      users: users as any,
      inventory: inventory as any,
      suppliers: suppliers as any,
      purchaseOrders: purchaseOrders as any,
      purchases: purchaseOrders as any,
      goodsReceipts: goodsReceipts as any,
      supplierPayments: supplierPayments as any,
      transfers: transfers as any,
      financialTransactions: financialTransactions as any,
      cashSessions: cashSessions as any,
      cashReconciliations: cashReconciliations as any,
      notifications: (notifications && notifications.length > 0 ? notifications : undefined) as any
    };
  } catch (err) {
    console.error('Failed to load AppState from IndexedDB:', err);
    return null;
  }
}

export async function markOperationSynced(id: string): Promise<void> {
  await removePendingOperation(id);
}

export async function markOperationFailed(id: string, error: string): Promise<void> {
  const ops = await getPendingOperations();
  const target = ops.find((o) => o.id === id);
  if (target) {
    target.status = 'failed';
    target.retryCount += 1;
    target.lastError = error;
    await updatePendingOperation(target);
  }
}

export async function getLastSync() {
  return await getSyncMetadata();
}

export {
  queueOperation,
  getPendingOperations,
  getPendingCount,
  getNetworkStatus,
  triggerSync
};
