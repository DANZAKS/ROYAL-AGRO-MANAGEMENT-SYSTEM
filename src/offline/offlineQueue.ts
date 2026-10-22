import { STORES, getAllFromStore, putToStore, deleteFromStore, clearStore } from './indexedDB';
import { PendingOperation, OperationType, EntityType } from './types';

export async function queueOperation(data: {
  operationType: OperationType;
  entityType: EntityType;
  entityId: string;
  payload: any;
  branchId?: string;
}): Promise<PendingOperation> {
  const newOp: PendingOperation = {
    id: 'op-' + Date.now() + '-' + Math.floor(Math.random() * 10000),
    operationType: data.operationType,
    entityType: data.entityType,
    entityId: data.entityId,
    payload: data.payload,
    branchId: data.branchId,
    createdAt: new Date().toISOString(),
    retryCount: 0,
    status: 'pending'
  };

  await putToStore(STORES.PENDING_OPERATIONS, newOp);

  // Dispatch custom event so listeners (React status hook / indicator) can re-query
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('royal_agro_pending_queue_changed'));
  }

  return newOp;
}

export async function getPendingOperations(): Promise<PendingOperation[]> {
  try {
    if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
      return [];
    }
    const ops = await getAllFromStore<PendingOperation>(STORES.PENDING_OPERATIONS);
    return ops.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  } catch (err) {
    console.error('Error fetching pending operations:', err);
    return [];
  }
}

export async function getPendingCount(): Promise<number> {
  try {
    const ops = await getPendingOperations();
    return ops.filter((op) => op.status === 'pending' || op.status === 'failed' || op.status === 'syncing').length;
  } catch {
    return 0;
  }
}

export async function removePendingOperation(id: string): Promise<void> {
  await deleteFromStore(STORES.PENDING_OPERATIONS, id);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('royal_agro_pending_queue_changed'));
  }
}

export async function updatePendingOperation(op: PendingOperation): Promise<void> {
  await putToStore(STORES.PENDING_OPERATIONS, op);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('royal_agro_pending_queue_changed'));
  }
}

export async function clearPendingQueue(): Promise<void> {
  await clearStore(STORES.PENDING_OPERATIONS);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('royal_agro_pending_queue_changed'));
  }
}
