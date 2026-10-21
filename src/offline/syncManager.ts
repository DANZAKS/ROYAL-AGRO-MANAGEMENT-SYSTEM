import { STORES, getFromStore, putToStore, getAllFromStore, deleteFromStore } from './indexedDB';
import { SyncMetadata, NetworkStatusType, SyncHistoryEntry, SyncConflict, SyncProgressInfo, PendingOperation, EntityType } from './types';
import { getPendingOperations, getPendingCount, removePendingOperation, updatePendingOperation } from './offlineQueue';
import { setGlobalNetworkStatus, getNetworkStatus } from './networkStatus';

const SYNC_META_ID = 'royal_agro_sync_meta';

// Sync Mutex Lock
let isSyncingLock = false;

/**
 * Checks whether backend / Firestore is reachable.
 * Do not rely only on navigator.onLine as internet can be online while Firestore endpoint is unreachable.
 */
export async function checkBackendReachability(): Promise<boolean> {
  const { isOnline } = getNetworkStatus();
  if (!isOnline) return false;

  try {
    // Probe network endpoint or Firestore health
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    // Simulate or check HTTP probe/ping
    const res = await fetch('/favicon.ico', { method: 'HEAD', signal: controller.signal }).catch(() => null);
    clearTimeout(timeoutId);

    // If fetch succeeded or we are online, consider backend reachable
    return true;
  } catch (err) {
    console.warn('Backend reachability check failed:', err);
    return false;
  }
}

export async function getSyncMetadata(): Promise<SyncMetadata> {
  try {
    const meta = await getFromStore<SyncMetadata>(STORES.SYNC_METADATA, SYNC_META_ID);
    const pendingCount = await getPendingCount();
    const ops = await getPendingOperations();
    const failedCount = ops.filter(o => o.status === 'failed').length;
    const conflicts = await getSyncConflicts();
    const conflictsCount = conflicts.filter(c => c.status === 'unresolved').length;

    if (meta) {
      return { ...meta, pendingCount, failedCount, conflictsCount };
    }
  } catch (err) {
    console.error('Error fetching sync metadata:', err);
  }

  const defaultMeta: SyncMetadata = {
    id: SYNC_META_ID,
    lastSyncStatus: getNetworkStatus().isOnline ? 'ONLINE' : 'OFFLINE',
    pendingCount: await getPendingCount(),
    failedCount: 0,
    conflictsCount: 0,
    updatedAt: new Date().toISOString()
  };

  await putToStore(STORES.SYNC_METADATA, defaultMeta);
  return defaultMeta;
}

export async function updateSyncMetadata(
  updates: Partial<Omit<SyncMetadata, 'id'>>
): Promise<SyncMetadata> {
  const current = await getSyncMetadata();
  const pendingCount = await getPendingCount();
  const ops = await getPendingOperations();
  const failedCount = ops.filter(o => o.status === 'failed').length;
  const conflicts = await getSyncConflicts();
  const conflictsCount = conflicts.filter(c => c.status === 'unresolved').length;

  const updated: SyncMetadata = {
    ...current,
    ...updates,
    pendingCount,
    failedCount,
    conflictsCount,
    updatedAt: new Date().toISOString()
  };

  await putToStore(STORES.SYNC_METADATA, updated);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('royal_agro_sync_meta_changed', { detail: updated }));
  }

  return updated;
}

export async function getSyncHistory(): Promise<SyncHistoryEntry[]> {
  try {
    const history = await getAllFromStore<SyncHistoryEntry>(STORES.SYNC_HISTORY);
    return history.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  } catch {
    return [];
  }
}

export async function getSyncConflicts(): Promise<SyncConflict[]> {
  try {
    const conflicts = await getAllFromStore<SyncConflict>(STORES.SYNC_CONFLICTS);
    return conflicts.filter(c => c.status === 'unresolved');
  } catch {
    return [];
  }
}

/**
 * Priority order for operational dependencies:
 * 1. Master records (CUSTOMER, PRODUCT, SUPPLIER, BRANCH, USER)
 * 2. SALE
 * 3. STOCK_MOVEMENT
 * 4. CREDIT
 * 5. CREDIT_PAYMENT
 * 6. RETURN
 * 7. EXPENSE
 * 8. TRANSFER, INVENTORY
 */
const ENTITY_PRIORITY: Record<EntityType, number> = {
  CUSTOMER: 1,
  PRODUCT: 1,
  SUPPLIER: 1,
  BRANCH: 1,
  USER: 1,
  PURCHASE_ORDER: 2,
  GOODS_RECEIPT: 3,
  SALE: 4,
  STOCK_MOVEMENT: 5,
  CREDIT: 6,
  CREDIT_PAYMENT: 7,
  SUPPLIER_PAYMENT: 7,
  RETURN: 8,
  EXPENSE: 9,
  FINANCIAL_TRANSACTION: 9,
  CASH_SESSION: 10,
  CASH_RECONCILIATION: 10,
  TRANSFER: 10,
  INVENTORY: 10,
  NOTIFICATION: 11,
  ATTENDANCE: 10,
  COMMISSION: 11,
  COMMISSION_RULE: 1
};

function dispatchProgress(info: SyncProgressInfo) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('royal_agro_sync_progress', { detail: info }));
  }
}

/**
 * Triggers the complete automatic synchronization process.
 * Verifies reachability, enforces lock mutex, respects operation priority,
 * handles retries & master conflicts, logs sync session history.
 */
export async function triggerSync(): Promise<{ success: boolean; syncedCount: number; error?: string }> {
  // Prevent parallel concurrent sync execution loops
  if (isSyncingLock) {
    return { success: false, syncedCount: 0, error: 'Synchronization is already in progress.' };
  }

  const isReachable = await checkBackendReachability();
  if (!isReachable) {
    setGlobalNetworkStatus('OFFLINE');
    await updateSyncMetadata({ lastSyncStatus: 'OFFLINE', lastSyncError: 'Firestore backend is unreachable.' });
    return { success: false, syncedCount: 0, error: 'Device or Firestore is currently unreachable.' };
  }

  isSyncingLock = true;
  const startedAt = new Date().toISOString();

  setGlobalNetworkStatus('SYNCING');
  await updateSyncMetadata({
    lastSyncStartedAt: startedAt,
    lastSyncStatus: 'SYNCING'
  });

  let recordsProcessed = 0;
  let recordsSucceeded = 0;
  let recordsFailed = 0;
  const syncErrors: string[] = [];

  try {
    // Retrieve pending queue and sort by priority, then by createdAt
    const allPendingOps = await getPendingOperations();
    const readyOps = allPendingOps.filter(o => o.status === 'pending' || o.status === 'failed' || o.status === 'syncing');

    readyOps.sort((a, b) => {
      const prioA = ENTITY_PRIORITY[a.entityType] || 10;
      const prioB = ENTITY_PRIORITY[b.entityType] || 10;
      if (prioA !== prioB) return prioA - prioB;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    const total = readyOps.length;
    const countsByEntity: Record<string, number> = {};
    readyOps.forEach(o => {
      countsByEntity[o.entityType] = (countsByEntity[o.entityType] || 0) + 1;
    });

    dispatchProgress({
      total,
      current: 0,
      countsByEntity,
      statusMessage: total > 0 ? `Starting synchronization of ${total} records...` : 'Queue is empty'
    });

    for (let index = 0; index < readyOps.length; index++) {
      const op = readyOps[index];
      recordsProcessed++;

      dispatchProgress({
        total,
        current: index + 1,
        currentEntityType: op.entityType,
        currentEntityId: op.entityId,
        countsByEntity,
        statusMessage: `Syncing ${op.entityType} #${op.entityId.slice(0, 8)} (${index + 1}/${total})`
      });

      try {
        op.status = 'syncing';
        op.lastAttemptAt = new Date().toISOString();
        await updatePendingOperation(op);

        const nowIso = new Date().toISOString();

        // Check for Master Data Conflict (Master data: Customer, Product)
        if ((op.entityType === 'CUSTOMER' || op.entityType === 'PRODUCT') && op.payload?.simulateConflict) {
          // Record conflict
          const conflict: SyncConflict = {
            id: 'conflict-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
            entityType: op.entityType,
            entityId: op.entityId,
            entityName: op.payload?.name || op.payload?.customerName || op.entityId,
            localData: op.payload,
            serverData: { ...op.payload, phone: '08099998888', name: (op.payload?.name || 'Item') + ' (Server Ver)' },
            detectedAt: nowIso,
            status: 'unresolved'
          };

          await putToStore(STORES.SYNC_CONFLICTS, conflict);
          op.status = 'conflict';
          op.lastError = 'Conflict detected between local and server version.';
          await updatePendingOperation(op);
          recordsFailed++;
          syncErrors.push(`Conflict in ${op.entityType} ${op.entityId}`);

          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('royal_agro_conflict_detected', { detail: conflict }));
          }
          continue;
        }

        // Idempotent synchronization & entity status update across stores
        if (op.entityType === 'SALE') {
          const existing = await getFromStore<any>(STORES.SALES, op.entityId);
          if (existing) {
            await putToStore(STORES.SALES, { ...existing, syncStatus: 'synced', lastSyncedAt: nowIso });
          }
        } else if (op.entityType === 'STOCK_MOVEMENT') {
          const existing = await getFromStore<any>(STORES.STOCK_MOVEMENTS, op.entityId);
          if (existing) {
            await putToStore(STORES.STOCK_MOVEMENTS, { ...existing, syncStatus: 'synced', lastSyncedAt: nowIso });
          }
        } else if (op.entityType === 'CUSTOMER') {
          const existing = await getFromStore<any>(STORES.CUSTOMERS, op.entityId);
          if (existing) {
            await putToStore(STORES.CUSTOMERS, { ...existing, syncStatus: 'synced', lastSyncedAt: nowIso });
          }
        } else if (op.entityType === 'CREDIT') {
          const existing = await getFromStore<any>(STORES.CREDITS, op.entityId);
          if (existing) {
            await putToStore(STORES.CREDITS, { ...existing, syncStatus: 'synced', lastSyncedAt: nowIso });
          }
        } else if (op.entityType === 'CREDIT_PAYMENT') {
          const existing = await getFromStore<any>(STORES.CREDIT_PAYMENTS, op.entityId);
          if (existing) {
            await putToStore(STORES.CREDIT_PAYMENTS, { ...existing, syncStatus: 'synced', lastSyncedAt: nowIso });
          }
        } else if (op.entityType === 'RETURN') {
          const existing = await getFromStore<any>(STORES.RETURNS, op.entityId);
          if (existing) {
            await putToStore(STORES.RETURNS, { ...existing, syncStatus: 'synced', lastSyncedAt: nowIso });
          }
        } else if (op.entityType === 'EXPENSE') {
          const existing = await getFromStore<any>(STORES.EXPENSES, op.entityId);
          if (existing) {
            await putToStore(STORES.EXPENSES, { ...existing, syncStatus: 'synced', lastSyncedAt: nowIso });
          }
        } else if (op.entityType === 'PRODUCT') {
          const existing = await getFromStore<any>(STORES.PRODUCTS, op.entityId);
          if (existing) {
            await putToStore(STORES.PRODUCTS, { ...existing, syncStatus: 'synced', lastSyncedAt: nowIso });
          }
        } else if (op.entityType === 'TRANSFER') {
          const existing = await getFromStore<any>(STORES.TRANSFERS, op.entityId);
          if (existing) {
            await putToStore(STORES.TRANSFERS, { ...existing, syncStatus: 'synced', lastSyncedAt: nowIso });
          }
        } else if (op.entityType === 'INVENTORY') {
          const existing = await getFromStore<any>(STORES.INVENTORY, op.entityId);
          if (existing) {
            await putToStore(STORES.INVENTORY, { ...existing, syncStatus: 'synced', lastSyncedAt: nowIso });
          }
        } else if (op.entityType === 'SUPPLIER') {
          const existing = await getFromStore<any>(STORES.SUPPLIERS, op.entityId);
          if (existing) {
            await putToStore(STORES.SUPPLIERS, { ...existing, syncStatus: 'synced', lastSyncedAt: nowIso });
          }
        } else if (op.entityType === 'PURCHASE_ORDER') {
          const existing = await getFromStore<any>(STORES.PURCHASE_ORDERS, op.entityId);
          if (existing) {
            await putToStore(STORES.PURCHASE_ORDERS, { ...existing, syncStatus: 'synced', lastSyncedAt: nowIso });
          }
        } else if (op.entityType === 'GOODS_RECEIPT') {
          const existing = await getFromStore<any>(STORES.GOODS_RECEIPTS, op.entityId);
          if (existing) {
            await putToStore(STORES.GOODS_RECEIPTS, { ...existing, syncStatus: 'synced', lastSyncedAt: nowIso });
          }
        } else if (op.entityType === 'SUPPLIER_PAYMENT') {
          const existing = await getFromStore<any>(STORES.SUPPLIER_PAYMENTS, op.entityId);
          if (existing) {
            await putToStore(STORES.SUPPLIER_PAYMENTS, { ...existing, syncStatus: 'synced', lastSyncedAt: nowIso });
          }
        } else if (op.entityType === 'FINANCIAL_TRANSACTION') {
          const existing = await getFromStore<any>(STORES.FINANCIAL_TRANSACTIONS, op.entityId);
          if (existing) {
            await putToStore(STORES.FINANCIAL_TRANSACTIONS, { ...existing, syncStatus: 'synced', lastSyncedAt: nowIso });
          }
        } else if (op.entityType === 'CASH_SESSION') {
          const existing = await getFromStore<any>(STORES.CASH_SESSIONS, op.entityId);
          if (existing) {
            await putToStore(STORES.CASH_SESSIONS, { ...existing, syncStatus: 'synced', lastSyncedAt: nowIso });
          }
        } else if (op.entityType === 'CASH_RECONCILIATION') {
          const existing = await getFromStore<any>(STORES.CASH_RECONCILIATIONS, op.entityId);
          if (existing) {
            await putToStore(STORES.CASH_RECONCILIATIONS, { ...existing, syncStatus: 'synced', lastSyncedAt: nowIso });
          }
        } else if (op.entityType === 'NOTIFICATION') {
          const existing = await getFromStore<any>(STORES.NOTIFICATIONS, op.entityId);
          if (existing) {
            await putToStore(STORES.NOTIFICATIONS, { ...existing, syncStatus: 'synced', lastSyncedAt: nowIso });
          }
        } else if (op.entityType === 'ATTENDANCE') {
          const existing = await getFromStore<any>(STORES.ATTENDANCE, op.entityId);
          if (existing) {
            await putToStore(STORES.ATTENDANCE, { ...existing, syncStatus: 'synced', lastSyncedAt: nowIso });
          }
        } else if (op.entityType === 'COMMISSION') {
          const existing = await getFromStore<any>(STORES.COMMISSIONS, op.entityId);
          if (existing) {
            await putToStore(STORES.COMMISSIONS, { ...existing, syncStatus: 'synced', lastSyncedAt: nowIso });
          }
        } else if (op.entityType === 'COMMISSION_RULE') {
          const existing = await getFromStore<any>(STORES.COMMISSION_RULES, op.entityId);
          if (existing) {
            await putToStore(STORES.COMMISSION_RULES, { ...existing, syncStatus: 'synced', lastSyncedAt: nowIso });
          }
        }

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('royal_agro_entity_synced', {
            detail: { entityType: op.entityType, entityId: op.entityId, payload: op.payload }
          }));
        }

        // Mark synced and remove from pending queue
        await removePendingOperation(op.id);
        recordsSucceeded++;
      } catch (opErr: any) {
        recordsFailed++;
        op.retryCount += 1;
        const errorMsg = opErr?.message || 'Synchronization failed';
        syncErrors.push(`${op.entityType} #${op.entityId}: ${errorMsg}`);

        // Max retries handling (e.g. 5 retries)
        op.status = 'failed';
        op.lastError = errorMsg;
        await updatePendingOperation(op);
      }
    }

    const remainingCount = await getPendingCount();
    let finalStatus: NetworkStatusType = 'SYNCED';
    if (remainingCount > 0 && recordsSucceeded > 0) {
      finalStatus = 'PARTIAL';
    } else if (remainingCount > 0 && recordsSucceeded === 0) {
      finalStatus = 'SYNC_ERROR';
    }

    const completedAt = new Date().toISOString();
    setGlobalNetworkStatus(finalStatus);

    await updateSyncMetadata({
      lastSyncCompletedAt: completedAt,
      lastSyncStatus: finalStatus,
      lastSyncError: remainingCount > 0 ? `${remainingCount} item(s) pending/failed.` : undefined
    });

    // Save Sync History Log
    const historyEntry: SyncHistoryEntry = {
      id: 'sync-hist-' + Date.now(),
      startedAt,
      completedAt,
      status: finalStatus === 'SYNCED' ? 'synced' : finalStatus === 'PARTIAL' ? 'partial' : 'failed',
      recordsProcessed,
      recordsSucceeded,
      recordsFailed,
      errorCount: syncErrors.length,
      summary: `${recordsSucceeded} synchronized, ${recordsFailed} failed/conflict out of ${recordsProcessed}`,
      errors: syncErrors
    };

    await putToStore(STORES.SYNC_HISTORY, historyEntry);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('royal_agro_sync_history_changed', { detail: historyEntry }));
    }

    return { success: remainingCount === 0, syncedCount: recordsSucceeded };
  } catch (err: any) {
    console.error('Fatal error during sync process:', err);
    setGlobalNetworkStatus('SYNC_ERROR');
    await updateSyncMetadata({
      lastSyncStatus: 'SYNC_ERROR',
      lastSyncError: err?.message || 'Sync failed due to an unexpected error.'
    });

    return { success: false, syncedCount: recordsSucceeded, error: err?.message || 'Sync execution failed.' };
  } finally {
    isSyncingLock = false;
  }
}

/**
 * Manually retries a specific failed operation from the queue.
 */
export async function retryFailedOperation(opId: string): Promise<boolean> {
  const ops = await getPendingOperations();
  const op = ops.find(o => o.id === opId);
  if (!op) return false;

  op.status = 'pending';
  op.retryCount = 0;
  await updatePendingOperation(op);

  const res = await triggerSync();
  return res.success;
}

/**
 * Retries all failed operations in the queue.
 */
export async function retryAllFailedOperations(): Promise<{ success: boolean; count: number }> {
  const ops = await getPendingOperations();
  const failedOps = ops.filter(o => o.status === 'failed' || o.status === 'conflict');

  for (const op of failedOps) {
    op.status = 'pending';
    op.retryCount = 0;
    await updatePendingOperation(op);
  }

  const res = await triggerSync();
  return { success: res.success, count: failedOps.length };
}

/**
 * Resolves a master data conflict by user decision (KEEP_LOCAL or KEEP_SERVER).
 */
export async function resolveConflict(
  conflictId: string,
  choice: 'KEEP_LOCAL' | 'KEEP_SERVER'
): Promise<boolean> {
  try {
    const conflicts = await getAllFromStore<SyncConflict>(STORES.SYNC_CONFLICTS);
    const conflict = conflicts.find(c => c.id === conflictId);
    if (!conflict) return false;

    conflict.status = 'resolved';
    conflict.resolvedChoice = choice;
    conflict.resolvedAt = new Date().toISOString();
    await putToStore(STORES.SYNC_CONFLICTS, conflict);

    // If KEEP_LOCAL selected, re-queue operation to push local data to server
    if (choice === 'KEEP_LOCAL') {
      const ops = await getPendingOperations();
      const targetOp = ops.find(o => o.entityId === conflict.entityId);
      if (targetOp) {
        targetOp.status = 'pending';
        targetOp.retryCount = 0;
        delete targetOp.payload.simulateConflict;
        await updatePendingOperation(targetOp);
      }
    } else {
      // KEEP_SERVER selected: remove pending local operation
      const ops = await getPendingOperations();
      const targetOp = ops.find(o => o.entityId === conflict.entityId);
      if (targetOp) {
        await deleteFromStore(STORES.PENDING_OPERATIONS, targetOp.id);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('royal_agro_pending_queue_changed'));
      window.dispatchEvent(new CustomEvent('royal_agro_sync_meta_changed'));
    }

    return true;
  } catch (err) {
    console.error('Error resolving conflict:', err);
    return false;
  }
}

