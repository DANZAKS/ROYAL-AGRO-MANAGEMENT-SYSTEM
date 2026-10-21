export type NetworkStatusType = 'ONLINE' | 'OFFLINE' | 'SYNCING' | 'SYNCED' | 'SYNC_ERROR' | 'PARTIAL';

export type SyncStatusType = 'synced' | 'pending' | 'failed' | 'conflict';

export type OperationType = 'CREATE' | 'UPDATE' | 'DELETE';

export type EntityType =
  | 'SALE'
  | 'CUSTOMER'
  | 'CREDIT'
  | 'CREDIT_PAYMENT'
  | 'RETURN'
  | 'EXPENSE'
  | 'STOCK_MOVEMENT'
  | 'PRODUCT'
  | 'USER'
  | 'BRANCH'
  | 'INVENTORY'
  | 'SUPPLIER'
  | 'PURCHASE_ORDER'
  | 'GOODS_RECEIPT'
  | 'SUPPLIER_PAYMENT'
  | 'TRANSFER'
  | 'FINANCIAL_TRANSACTION'
  | 'CASH_SESSION'
  | 'CASH_RECONCILIATION'
  | 'NOTIFICATION'
  | 'ATTENDANCE'
  | 'COMMISSION'
  | 'COMMISSION_RULE'
  | 'SETTINGS'
  | 'DATA_IMPORT';

export interface PendingOperation {
  id: string;
  operationType: OperationType;
  entityType: EntityType;
  entityId: string;
  payload: any;
  branchId?: string;
  createdAt: string;
  retryCount: number;
  status: 'pending' | 'syncing' | 'failed' | 'synced' | 'conflict';
  lastError?: string;
  lastAttemptAt?: string;
}

export interface SyncMetadata {
  id: string;
  lastSyncStartedAt?: string;
  lastSyncCompletedAt?: string;
  lastSyncStatus: NetworkStatusType;
  lastSyncError?: string;
  pendingCount: number;
  failedCount?: number;
  conflictsCount?: number;
  updatedAt: string;
}

export interface OfflineRecordMeta {
  id: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  branchId?: string;
  syncStatus?: SyncStatusType;
  lastSyncedAt?: string;
}

export interface SyncHistoryEntry {
  id: string;
  startedAt: string;
  completedAt: string;
  status: 'synced' | 'partial' | 'failed';
  recordsProcessed: number;
  recordsSucceeded: number;
  recordsFailed: number;
  errorCount: number;
  summary?: string;
  errors?: string[];
}

export interface SyncConflict {
  id: string;
  entityType: EntityType;
  entityId: string;
  entityName?: string;
  localData: any;
  serverData: any;
  detectedAt: string;
  status: 'unresolved' | 'resolved';
  resolvedChoice?: 'KEEP_LOCAL' | 'KEEP_SERVER';
  resolvedAt?: string;
}

export interface SyncProgressInfo {
  total: number;
  current: number;
  currentEntityType?: EntityType;
  currentEntityId?: string;
  countsByEntity?: Record<string, number>;
  statusMessage?: string;
}

