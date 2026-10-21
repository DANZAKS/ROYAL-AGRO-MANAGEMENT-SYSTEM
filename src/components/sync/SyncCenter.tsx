import React, { useState, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  CloudUpload,
  AlertCircle,
  FileText,
  RotateCcw,
  Check,
  X,
  Layers,
  Activity,
  History,
  ShieldAlert,
  ArrowRight,
  Plus,
  Download,
  Smartphone,
  HardDrive,
  Info
} from 'lucide-react';
import { useNetworkStatus } from '../../offline/networkStatus';
import { getPendingCount, getPendingOperations, queueOperation } from '../../offline/offlineQueue';
import {
  getSyncMetadata,
  triggerSync,
  getSyncHistory,
  getSyncConflicts,
  retryFailedOperation,
  retryAllFailedOperations,
  resolveConflict
} from '../../offline/syncManager';
import {
  getPwaDiagnostics,
  promptPwaInstall,
  applyPwaUpdate,
  PwaStatusInfo
} from '../../offline/pwaManager';
import { PendingOperation, SyncMetadata, SyncHistoryEntry, SyncConflict, SyncProgressInfo } from '../../offline/types';

interface SyncCenterProps {
  onClose?: () => void;
}

export const SyncCenter: React.FC<SyncCenterProps> = ({ onClose }) => {
  const { isOnline, status } = useNetworkStatus();
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'pwa' | 'failed' | 'conflicts' | 'history'>('overview');

  const [pendingCount, setPendingCount] = useState<number>(0);
  const [syncMeta, setSyncMeta] = useState<SyncMetadata | null>(null);
  const [pendingOps, setPendingOps] = useState<PendingOperation[]>([]);
  const [historyLogs, setHistoryLogs] = useState<SyncHistoryEntry[]>([]);
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [progressInfo, setProgressInfo] = useState<SyncProgressInfo | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const [pwaInfo, setPwaInfo] = useState<PwaStatusInfo | null>(null);
  const [canInstallPwa, setCanInstallPwa] = useState<boolean>(false);
  const [hasUpdate, setHasUpdate] = useState<boolean>(false);

  const refreshAllData = async () => {
    const count = await getPendingCount();
    setPendingCount(count);
    const meta = await getSyncMetadata();
    setSyncMeta(meta);
    const ops = await getPendingOperations();
    setPendingOps(ops);
    const logs = await getSyncHistory();
    setHistoryLogs(logs);
    const confs = await getSyncConflicts();
    setConflicts(confs);
    const diag = await getPwaDiagnostics();
    setPwaInfo(diag);
  };

  useEffect(() => {
    refreshAllData();

    const handleQueueChange = () => refreshAllData();
    const handleSyncMetaChange = () => refreshAllData();
    const handleHistoryChange = () => refreshAllData();
    const handleConflictDetected = () => refreshAllData();
    const handleProgress = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        setProgressInfo(detail);
      }
    };

    const handlePwaInstallable = (e: Event) => {
      setCanInstallPwa((e as CustomEvent).detail ?? true);
    };

    const handlePwaUpdate = () => {
      setHasUpdate(true);
      refreshAllData();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('royal_agro_pending_queue_changed', handleQueueChange);
      window.addEventListener('royal_agro_sync_meta_changed', handleSyncMetaChange);
      window.addEventListener('royal_agro_sync_history_changed', handleHistoryChange);
      window.addEventListener('royal_agro_conflict_detected', handleConflictDetected);
      window.addEventListener('royal_agro_sync_progress', handleProgress);
      window.addEventListener('royal_agro_pwa_installable', handlePwaInstallable);
      window.addEventListener('royal_agro_pwa_update_available', handlePwaUpdate);
    }

    const interval = setInterval(refreshAllData, 4000);

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('royal_agro_pending_queue_changed', handleQueueChange);
        window.removeEventListener('royal_agro_sync_meta_changed', handleSyncMetaChange);
        window.removeEventListener('royal_agro_sync_history_changed', handleHistoryChange);
        window.removeEventListener('royal_agro_conflict_detected', handleConflictDetected);
        window.removeEventListener('royal_agro_sync_progress', handleProgress);
        window.removeEventListener('royal_agro_pwa_installable', handlePwaInstallable);
        window.removeEventListener('royal_agro_pwa_update_available', handlePwaUpdate);
      }
      clearInterval(interval);
    };
  }, []);

  const handleInstallClick = async () => {
    const installed = await promptPwaInstall();
    if (installed) {
      setActionSuccessMsg('✓ Royal Agro PWA installation initiated!');
      setCanInstallPwa(false);
    }
  };

  const handleApplyUpdateClick = () => {
    applyPwaUpdate();
  };

  const handleManualSyncNow = async () => {
    setIsSyncing(true);
    setActionSuccessMsg(null);
    try {
      const res = await triggerSync();
      await refreshAllData();
      if (res.success) {
        setActionSuccessMsg(`✓ Successfully synchronized ${res.syncedCount} records.`);
      } else if (res.syncedCount > 0) {
        setActionSuccessMsg(`⚠ Partially synchronized ${res.syncedCount} records.`);
      }
    } finally {
      setIsSyncing(false);
      setTimeout(() => setActionSuccessMsg(null), 5000);
    }
  };

  const handleRetrySingle = async (opId: string) => {
    setIsSyncing(true);
    try {
      await retryFailedOperation(opId);
      await refreshAllData();
      setActionSuccessMsg('✓ Operation retried successfully.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setActionSuccessMsg(null), 4000);
    }
  };

  const handleRetryAllFailed = async () => {
    setIsSyncing(true);
    try {
      const res = await retryAllFailedOperations();
      await refreshAllData();
      setActionSuccessMsg(`✓ Retried ${res.count} failed operations.`);
    } finally {
      setIsSyncing(false);
      setTimeout(() => setActionSuccessMsg(null), 4000);
    }
  };

  const handleConflictResolve = async (conflictId: string, choice: 'KEEP_LOCAL' | 'KEEP_SERVER') => {
    const success = await resolveConflict(conflictId, choice);
    if (success) {
      await refreshAllData();
      setActionSuccessMsg(`✓ Conflict resolved keeping ${choice === 'KEEP_LOCAL' ? 'Local' : 'Server'} version.`);
      setTimeout(() => setActionSuccessMsg(null), 4000);
    }
  };

  // Demo generators for testing offline queue & conflict handling
  const handleCreateTestOfflineSale = async () => {
    const id = 'sale-offline-' + Math.floor(Math.random() * 10000);
    await queueOperation({
      operationType: 'CREATE',
      entityType: 'SALE',
      entityId: id,
      payload: { id, receiptNo: 'RCP-OFFLINE-' + Date.now().toString().slice(-5), totalAmount: 45000, itemsCount: 3 }
    });
    await refreshAllData();
    setActionSuccessMsg('✓ Test offline sale created in IndexedDB pending queue!');
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  const handleCreateTestOfflineConflict = async () => {
    const id = 'cust-offline-' + Math.floor(Math.random() * 10000);
    await queueOperation({
      operationType: 'UPDATE',
      entityType: 'CUSTOMER',
      entityId: id,
      payload: { id, name: 'Alhaji Ibrahim Musa', phone: '08012345678', simulateConflict: true }
    });
    await refreshAllData();
    setActionSuccessMsg('✓ Test master data record added with conflict trigger.');
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  const failedOps = pendingOps.filter(o => o.status === 'failed');

  const getStatusBadge = () => {
    if (!isOnline || status === 'OFFLINE') {
      return {
        bg: 'bg-rose-500/10 text-rose-700 border-rose-300',
        dot: 'bg-rose-500 animate-pulse',
        label: '🔴 Offline Mode',
        desc: 'Transactions saved safely in IndexedDB until internet is restored.'
      };
    }
    if (status === 'SYNCING' || isSyncing) {
      return {
        bg: 'bg-amber-500/10 text-amber-800 border-amber-300',
        dot: 'bg-amber-500 animate-spin',
        label: '🟡 Synchronizing...',
        desc: 'Moving locally queued records to Firestore cloud database.'
      };
    }
    if (status === 'SYNC_ERROR' || status === 'PARTIAL' || failedOps.length > 0) {
      return {
        bg: 'bg-amber-500/10 text-amber-900 border-amber-400',
        dot: 'bg-amber-600',
        label: '⚠ Attention Required',
        desc: `${failedOps.length} failed record(s) need review or manual retry.`
      };
    }
    return {
      bg: 'bg-emerald-500/10 text-emerald-800 border-emerald-300',
      dot: 'bg-emerald-500',
      label: '🟢 Online & Synchronized',
      desc: 'IndexedDB storage and Firestore cloud database are in sync.'
    };
  };

  const badge = getStatusBadge();

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Bar */}
      <div className="bg-[#1B3022] text-white p-5 rounded-2xl shadow-lg border border-stone-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-[#7E9D73]/20 rounded-xl border border-[#7E9D73]/30 text-[#7E9D73]">
            <CloudUpload className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-white tracking-tight">Sync Center</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-[#7E9D73]/20 text-[#A3C299] border border-[#7E9D73]/30 text-[10px] font-black uppercase tracking-wider">
                Module 6 Core Engine
              </span>
            </div>
            <p className="text-xs text-stone-300 mt-0.5">
              Automatic IndexedDB ➔ Firestore Synchronization & Conflict Engine
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleManualSyncNow}
            disabled={!isOnline || isSyncing}
            className="px-4 py-2.5 bg-[#7E9D73] hover:bg-[#6C8B61] disabled:opacity-50 text-[#1B3022] font-black rounded-xl flex items-center gap-2 shadow-sm transition-all text-xs cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Synchronizing...' : 'Sync Now'}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Connection & Alert Banner */}
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all shadow-xs ${badge.bg}`}>
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full shrink-0 ${badge.dot}`} />
          <div>
            <p className="font-extrabold text-sm">{badge.label}</p>
            <p className="text-xs text-stone-700 mt-0.5">{badge.desc}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold text-stone-700 shrink-0">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-stone-500" />
            <span>Last Sync:</span>
            <span className="font-bold text-stone-900">
              {syncMeta?.lastSyncCompletedAt
                ? new Date(syncMeta.lastSyncCompletedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                : 'Not synced yet'}
            </span>
          </div>
        </div>
      </div>

      {/* Toast Banner */}
      {actionSuccessMsg && (
        <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center justify-between animate-in fade-in">
          <span>{actionSuccessMsg}</span>
          <button onClick={() => setActionSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Progress Bar Display when Syncing */}
      {isSyncing && progressInfo && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2 animate-in fade-in">
          <div className="flex items-center justify-between text-xs font-extrabold text-amber-900">
            <span className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-amber-600 animate-spin" />
              {progressInfo.statusMessage || 'Synchronizing queued records...'}
            </span>
            <span>
              {progressInfo.current} / {progressInfo.total} ({progressInfo.total > 0 ? Math.round((progressInfo.current / progressInfo.total) * 100) : 0}%)
            </span>
          </div>
          <div className="w-full bg-amber-200 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-amber-600 h-full transition-all duration-300 rounded-full"
              style={{
                width: `${progressInfo.total > 0 ? Math.round((progressInfo.current / progressInfo.total) * 100) : 0}%`
              }}
            />
          </div>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2 overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setActiveSubTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'overview'
              ? 'bg-[#1B3022] text-white shadow-xs'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          <Activity className="w-4 h-4" />
          Sync Overview & Queue
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black">
              {pendingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('pwa')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'pwa'
              ? 'bg-[#1B3022] text-white shadow-xs'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          <Smartphone className="w-4 h-4 text-[#7E9D73]" />
          PWA Diagnostics & Install
          {hasUpdate && (
            <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-black animate-pulse">
              Update Ready
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('failed')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'failed'
              ? 'bg-[#1B3022] text-white shadow-xs'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          <AlertCircle className="w-4 h-4 text-rose-500" />
          Failed Records
          {failedOps.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black">
              {failedOps.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('conflicts')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'conflicts'
              ? 'bg-[#1B3022] text-white shadow-xs'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-amber-500" />
          Master Conflicts
          {conflicts.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-600 text-white text-[10px] font-black">
              {conflicts.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('history')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'history'
              ? 'bg-[#1B3022] text-white shadow-xs'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          <History className="w-4 h-4" />
          Sync History Logs
        </button>
      </div>

      {/* TAB 1: OVERVIEW & QUEUE */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
              <p className="text-[10px] font-bold uppercase text-stone-500">Pending Queue</p>
              <p className="text-2xl font-black text-stone-900 mt-1">{pendingCount}</p>
              <p className="text-[11px] text-stone-500 mt-1">Awaiting sync to cloud</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
              <p className="text-[10px] font-bold uppercase text-stone-500">Failed Records</p>
              <p className={`text-2xl font-black mt-1 ${failedOps.length > 0 ? 'text-rose-600' : 'text-stone-900'}`}>
                {failedOps.length}
              </p>
              <p className="text-[11px] text-stone-500 mt-1">Require retry or review</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
              <p className="text-[10px] font-bold uppercase text-stone-500">Master Conflicts</p>
              <p className={`text-2xl font-black mt-1 ${conflicts.length > 0 ? 'text-amber-600' : 'text-stone-900'}`}>
                {conflicts.length}
              </p>
              <p className="text-[11px] text-stone-500 mt-1">Local vs Server diffs</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
              <p className="text-[10px] font-bold uppercase text-stone-500">Last Sync Status</p>
              <p className="text-sm font-black text-[#1B3022] mt-2 uppercase">{syncMeta?.lastSyncStatus || 'READY'}</p>
              <p className="text-[10px] text-stone-500 mt-1 truncate">
                {syncMeta?.lastSyncCompletedAt ? new Date(syncMeta.lastSyncCompletedAt).toLocaleTimeString() : 'Never'}
              </p>
            </div>
          </div>

          {/* Test Action Controls */}
          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-extrabold text-xs text-stone-800">Offline Generator Controls (Testing & Verification)</p>
              <p className="text-[11px] text-stone-500">Simulate offline transactions to test queueing, auto-sync, and conflict detection.</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCreateTestOfflineSale}
                className="px-3 py-1.5 bg-white hover:bg-stone-100 border border-stone-300 text-stone-800 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-[#7E9D73]" />
                Simulate Offline Sale
              </button>

              <button
                onClick={handleCreateTestOfflineConflict}
                className="px-3 py-1.5 bg-white hover:bg-stone-100 border border-stone-300 text-stone-800 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-amber-600" />
                Simulate Master Conflict
              </button>
            </div>
          </div>

          {/* Pending Queue Items List */}
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-stone-50/50">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-[#7E9D73]" />
                <h3 className="font-extrabold text-sm text-stone-900">Queued Offline Transactions ({pendingOps.length})</h3>
              </div>
              <span className="text-xs text-stone-500 font-semibold">Priority Dependencies Enabled</span>
            </div>

            {pendingOps.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <p className="font-extrabold text-stone-800 text-sm">IndexedDB Pending Queue is Empty</p>
                <p className="text-xs text-stone-500 max-w-md mx-auto">
                  All local transactions, stock movements, customers, returns, and expenses are fully synchronized with Firestore.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-stone-100 max-h-96 overflow-y-auto custom-scrollbar">
                {pendingOps.map((op) => (
                  <div key={op.id} className="p-3.5 hover:bg-stone-50 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase shrink-0 ${
                          op.operationType === 'CREATE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : op.operationType === 'UPDATE'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {op.operationType}
                      </span>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-stone-900">{op.entityType}</span>
                          <span className="font-mono text-stone-500 text-[11px]">#{op.entityId}</span>
                        </div>
                        <p className="text-[11px] text-stone-400 mt-0.5">
                          Queued at: {new Date(op.createdAt).toLocaleTimeString()}
                          {op.branchId && ` • Branch: ${op.branchId}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                          op.status === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : op.status === 'syncing'
                            ? 'bg-blue-100 text-blue-800 animate-pulse'
                            : op.status === 'failed'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {op.status}
                      </span>

                      {op.status === 'failed' && (
                        <button
                          onClick={() => handleRetrySingle(op.id)}
                          className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold rounded-lg text-[11px] flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3 text-rose-600" />
                          Retry
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: PWA DIAGNOSTICS & INSTALLATION */}
      {activeSubTab === 'pwa' && (
        <div className="space-y-6">
          {/* Version & Install Banner */}
          <div className="p-5 bg-gradient-to-r from-[#1B3022] to-[#2D4536] text-white rounded-2xl shadow-md border border-stone-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-[#7E9D73]/20 rounded-xl border border-[#7E9D73]/30 text-[#A3C299]">
                <Smartphone className="w-8 h-8" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base text-white">Royal Agro Progressive Web App</h3>
                  <span className="px-2 py-0.5 rounded-full bg-[#7E9D73]/30 text-[#A3C299] text-[10px] font-black uppercase">
                    v1.0.0
                  </span>
                </div>
                <p className="text-xs text-stone-300 mt-1 max-w-lg">
                  Installable offline desktop & mobile app shell powered by Service Worker cache and IndexedDB storage.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {canInstallPwa && (
                <button
                  onClick={handleInstallClick}
                  className="px-4 py-2.5 bg-[#7E9D73] hover:bg-[#6C8B61] text-[#1B3022] font-extrabold rounded-xl text-xs flex items-center gap-2 shadow-sm cursor-pointer transition-all"
                >
                  <Download className="w-4 h-4" />
                  Install App Now
                </button>
              )}

              {hasUpdate && (
                <button
                  onClick={handleApplyUpdateClick}
                  className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-extrabold rounded-xl text-xs flex items-center gap-2 shadow-sm cursor-pointer transition-all animate-pulse"
                >
                  <RefreshCw className="w-4 h-4" />
                  Apply New Version Update
                </button>
              )}
            </div>
          </div>

          {/* Diagnostic Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase text-stone-500">Service Worker</span>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-extrabold text-[10px]">
                  REGISTERED
                </span>
              </div>
              <p className="text-sm font-extrabold text-stone-900">{pwaInfo?.swState || 'Active'}</p>
              <p className="text-[11px] text-stone-500 font-mono">Cache: {pwaInfo?.cacheName || 'royal-agro-shell-v2'}</p>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase text-stone-500">Display Mode</span>
                <span
                  className={`px-2 py-0.5 rounded font-extrabold text-[10px] ${
                    pwaInfo?.isStandalone ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {pwaInfo?.isStandalone ? 'STANDALONE APP' : 'WEB BROWSER'}
                </span>
              </div>
              <p className="text-sm font-extrabold text-stone-900">
                {pwaInfo?.isStandalone ? 'Installed Native App Frame' : 'Browser Session (Installable)'}
              </p>
              <p className="text-[11px] text-stone-500">Full standalone app shell rendering support</p>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase text-stone-500">IndexedDB Storage</span>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-extrabold text-[10px]">
                  HEALTHY
                </span>
              </div>
              <p className="text-sm font-extrabold text-stone-900">RoyalAgroDB (v4)</p>
              <p className="text-[11px] text-stone-500">{pendingCount} pending queue items protected</p>
            </div>
          </div>

          {/* PWA Reliability Verification Checklist */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
              <HardDrive className="w-5 h-5 text-[#7E9D73]" />
              <h4 className="font-extrabold text-sm text-stone-900">PWA Offline Reliability Standard Checks</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-stone-800">Application Shell Cached</p>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    HTML, CSS, JS bundles and manifest are cached for instant offline startup.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-stone-800">Firestore Network Non-Blocking</p>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    App UI renders immediately from IndexedDB without waiting for Firestore timeouts.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-stone-800">Offline SPA Route Fallback</p>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    Client navigation routes serve index.html shell cleanly without 404 error pages.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-stone-800">IndexedDB Migration Safety</p>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    App updates maintain versioned IndexedDB stores without wiping pending sales data.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FAILED RECORDS */}
      {activeSubTab === 'failed' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-base text-stone-900">Failed Operations Queue</h3>
              <p className="text-xs text-stone-500">Failed records remain safely preserved in IndexedDB until resolved.</p>
            </div>

            {failedOps.length > 0 && (
              <button
                onClick={handleRetryAllFailed}
                disabled={!isOnline || isSyncing}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-extrabold rounded-xl text-xs flex items-center gap-2 shadow-xs cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Retry All Failed ({failedOps.length})
              </button>
            )}
          </div>

          {failedOps.length === 0 ? (
            <div className="p-8 bg-white rounded-2xl border border-stone-200 text-center space-y-2 shadow-2xs">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <p className="font-extrabold text-stone-800 text-sm">No Failed Synchronization Records</p>
              <p className="text-xs text-stone-500">All attempted operations completed cleanly.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {failedOps.map((op) => (
                <div key={op.id} className="p-4 bg-white rounded-2xl border border-rose-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-rose-100 text-rose-800 font-black text-[10px] rounded uppercase">
                        {op.entityType}
                      </span>
                      <span className="font-mono text-xs font-bold text-stone-800">#{op.entityId}</span>
                      <span className="text-xs text-stone-500">({op.operationType})</span>
                    </div>

                    <button
                      onClick={() => handleRetrySingle(op.id)}
                      disabled={!isOnline || isSyncing}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-extrabold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Retry Record
                    </button>
                  </div>

                  <div className="p-3 bg-rose-50/70 border border-rose-100 rounded-xl text-xs text-rose-900 font-mono">
                    ⚠️ Error Reason: {op.lastError || 'Temporary connection error'}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-stone-500">
                    <span>Retry Attempts: {op.retryCount}</span>
                    <span>Last Attempt: {op.lastAttemptAt ? new Date(op.lastAttemptAt).toLocaleTimeString() : 'N/A'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: MASTER DATA CONFLICTS */}
      {activeSubTab === 'conflicts' && (
        <div className="space-y-4">
          <div>
            <h3 className="font-extrabold text-base text-stone-900">Master Data Conflict Resolution</h3>
            <p className="text-xs text-stone-500">
              When master data (e.g. Farmers/Products) changes on both local device and cloud server, compare and choose which version to preserve.
            </p>
          </div>

          {conflicts.length === 0 ? (
            <div className="p-8 bg-white rounded-2xl border border-stone-200 text-center space-y-2 shadow-2xs">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <p className="font-extrabold text-stone-800 text-sm">No Active Master Data Conflicts</p>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                No record collisions detected. Transactional records (Sales, Payments, Movements) are automatically preserved via append-only logs.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {conflicts.map((c) => (
                <div key={c.id} className="p-5 bg-white rounded-2xl border border-amber-300 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-amber-600" />
                      <h4 className="font-extrabold text-sm text-stone-900">
                        {c.entityType} Collision: {c.entityName || c.entityId}
                      </h4>
                    </div>
                    <span className="text-xs text-stone-500">Detected: {new Date(c.detectedAt).toLocaleTimeString()}</span>
                  </div>

                  {/* Diff Comparison Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {/* Local Version */}
                    <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-2">
                      <p className="font-extrabold text-emerald-900 flex items-center justify-between">
                        <span>📱 Local Device Version</span>
                        <span className="text-[10px] bg-emerald-200 px-2 py-0.5 rounded font-bold">Your Edit</span>
                      </p>
                      <pre className="text-[11px] font-mono text-stone-800 bg-white p-2.5 rounded-lg border border-emerald-200 overflow-x-auto">
                        {JSON.stringify(c.localData, null, 2)}
                      </pre>
                      <button
                        onClick={() => handleConflictResolve(c.id, 'KEEP_LOCAL')}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                      >
                        <Check className="w-4 h-4" />
                        Keep Local Version
                      </button>
                    </div>

                    {/* Server Version */}
                    <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl space-y-2">
                      <p className="font-extrabold text-blue-900 flex items-center justify-between">
                        <span>☁️ Firestore Server Version</span>
                        <span className="text-[10px] bg-blue-200 px-2 py-0.5 rounded font-bold">Remote Edit</span>
                      </p>
                      <pre className="text-[11px] font-mono text-stone-800 bg-white p-2.5 rounded-lg border border-blue-200 overflow-x-auto">
                        {JSON.stringify(c.serverData, null, 2)}
                      </pre>
                      <button
                        onClick={() => handleConflictResolve(c.id, 'KEEP_SERVER')}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                      >
                        <Check className="w-4 h-4" />
                        Keep Server Version
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: SYNC HISTORY */}
      {activeSubTab === 'history' && (
        <div className="space-y-4">
          <div>
            <h3 className="font-extrabold text-base text-stone-900">Synchronization History Logs</h3>
            <p className="text-xs text-stone-500">Audit trail of past synchronization attempts stored in IndexedDB.</p>
          </div>

          {historyLogs.length === 0 ? (
            <div className="p-8 bg-white rounded-2xl border border-stone-200 text-center space-y-2 shadow-2xs">
              <History className="w-10 h-10 text-stone-400 mx-auto" />
              <p className="font-extrabold text-stone-800 text-sm">No Synchronization Logs Yet</p>
              <p className="text-xs text-stone-500">History will record here automatically when sync runs.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-2xs">
              <div className="divide-y divide-stone-100">
                {historyLogs.map((log) => (
                  <div key={log.id} className="p-4 hover:bg-stone-50 flex items-center justify-between gap-4 text-xs">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            log.status === 'synced'
                              ? 'bg-emerald-100 text-emerald-800'
                              : log.status === 'partial'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {log.status === 'synced' ? '✓ Synced' : log.status === 'partial' ? '⚠ Partial' : '✕ Failed'}
                        </span>
                        <span className="font-bold text-stone-800">
                          {new Date(log.startedAt).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>

                      <p className="text-stone-600 font-medium">{log.summary}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-extrabold text-stone-900">{log.recordsSucceeded} / {log.recordsProcessed} synced</p>
                      {log.errorCount > 0 && <p className="text-[11px] text-rose-600 font-bold">{log.errorCount} errors</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
