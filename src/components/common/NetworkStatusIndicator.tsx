import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, AlertTriangle, CheckCircle2, CloudUpload, Clock, Server } from 'lucide-react';
import { useNetworkStatus } from '../../offline/networkStatus';
import { getPendingCount, getPendingOperations } from '../../offline/offlineQueue';
import { getSyncMetadata, triggerSync } from '../../offline/syncManager';
import { PendingOperation, SyncMetadata } from '../../offline/types';

export const NetworkStatusIndicator: React.FC = () => {
  const { isOnline, status } = useNetworkStatus();
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [syncMeta, setSyncMeta] = useState<SyncMetadata | null>(null);
  const [pendingOps, setPendingOps] = useState<PendingOperation[]>([]);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [isManualSyncing, setIsManualSyncing] = useState<boolean>(false);

  const refreshData = async () => {
    const count = await getPendingCount();
    setPendingCount(count);
    const meta = await getSyncMetadata();
    setSyncMeta(meta);
    const ops = await getPendingOperations();
    setPendingOps(ops);
  };

  useEffect(() => {
    refreshData();

    const handleQueueChange = () => refreshData();
    const handleSyncMetaChange = () => refreshData();

    if (typeof window !== 'undefined') {
      window.addEventListener('royal_agro_pending_queue_changed', handleQueueChange);
      window.addEventListener('royal_agro_sync_meta_changed', handleSyncMetaChange);
    }

    const interval = setInterval(refreshData, 5000);

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('royal_agro_pending_queue_changed', handleQueueChange);
        window.removeEventListener('royal_agro_sync_meta_changed', handleSyncMetaChange);
      }
      clearInterval(interval);
    };
  }, []);

  const handleManualSync = async () => {
    setIsManualSyncing(true);
    try {
      await triggerSync();
      await refreshData();
    } finally {
      setIsManualSyncing(false);
    }
  };

  const getStatusBadge = () => {
    if (!isOnline || status === 'OFFLINE') {
      return {
        bg: 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100',
        dot: 'bg-rose-500 animate-pulse',
        icon: <WifiOff className="w-3.5 h-3.5 text-rose-600 shrink-0" />,
        label: 'Offline'
      };
    }
    if (status === 'SYNCING' || isManualSyncing) {
      return {
        bg: 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100',
        dot: 'bg-amber-500 animate-spin',
        icon: <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin shrink-0" />,
        label: 'Syncing...'
      };
    }
    if (status === 'SYNC_ERROR') {
      return {
        bg: 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100',
        dot: 'bg-amber-600',
        icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />,
        label: 'Sync Error'
      };
    }
    return {
      bg: 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100',
      dot: 'bg-emerald-500',
      icon: <Wifi className="w-3.5 h-3.5 text-emerald-600 shrink-0" />,
      label: pendingCount > 0 ? 'Online (Pending Sync)' : 'Online'
    };
  };

  const badge = getStatusBadge();

  return (
    <>
      {/* Network Status Badge Button */}
      <button
        onClick={() => {
          refreshData();
          setShowModal(true);
        }}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold transition-all shadow-2xs ${badge.bg}`}
        title="View Offline & Sync Status"
      >
        <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
        {badge.icon}
        <span className="hidden xs:inline font-extrabold">{badge.label}</span>
        {pendingCount > 0 ? (
          <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-black shadow-xs">
            {pendingCount}
          </span>
        ) : (
          <CheckCircle2 className="w-3 h-3 text-emerald-600 hidden sm:inline" />
        )}
      </button>

      {/* Sync Status Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-600/30 rounded-xl border border-emerald-500/40">
                  <Server className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">Offline & Sync Status</h3>
                  <p className="text-[10px] text-slate-300">Royal Agro IndexedDB & Cloud Synchronization</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-4 text-xs">
              {/* Network Status Banner */}
              <div
                className={`p-3 rounded-xl border flex items-center justify-between ${
                  isOnline
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  {isOnline ? (
                    <Wifi className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <WifiOff className="w-4 h-4 text-rose-600" />
                  )}
                  <div>
                    <p className="font-bold">{isOnline ? 'Connected to Internet' : 'Offline Mode Active'}</p>
                    <p className="text-[10px] text-slate-600">
                      {isOnline
                        ? 'IndexedDB storage ready for cloud synchronization.'
                        : 'Transactions saved locally in IndexedDB until reconnected.'}
                    </p>
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                    isOnline ? 'bg-emerald-200 text-emerald-800' : 'bg-rose-200 text-rose-800'
                  }`}
                >
                  {isOnline ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>

              {/* Pending Queue Summary */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 flex items-center gap-1.5">
                    <CloudUpload className="w-4 h-4 text-blue-600" />
                    Pending Sync Queue
                  </span>
                  <span className="font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px]">
                    {pendingCount} {pendingCount === 1 ? 'record' : 'records'} waiting
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {pendingCount === 0
                    ? '✓ All local records in IndexedDB are fully synchronized.'
                    : 'Offline records queued in IndexedDB for cloud sync.'}
                </p>
              </div>

              {/* Metadata Info */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-[11px]">
                <div className="flex justify-between text-slate-600">
                  <span className="flex items-center gap-1 text-slate-500">
                    <Clock className="w-3 h-3" /> Last Sync Completed:
                  </span>
                  <span className="font-semibold text-slate-800">
                    {syncMeta?.lastSyncCompletedAt
                      ? new Date(syncMeta.lastSyncCompletedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })
                      : 'Not synced yet'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Last Known Status:</span>
                  <span className="font-bold text-slate-800">{syncMeta?.lastSyncStatus || 'N/A'}</span>
                </div>
                {syncMeta?.lastSyncError && (
                  <div className="p-2 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px]">
                    ⚠️ {syncMeta.lastSyncError}
                  </div>
                )}
              </div>

              {/* Pending Queue List preview */}
              {pendingOps.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-900 mb-2 text-[11px] uppercase tracking-wider">
                    Queued Offline Transactions ({pendingOps.length})
                  </h4>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 text-[10px]">
                    {pendingOps.map((op) => (
                      <div
                        key={op.id}
                        className="p-2 rounded-lg bg-amber-50/60 border border-amber-200 flex items-center justify-between"
                      >
                        <div>
                          <span className="font-extrabold text-slate-900 mr-2">
                            [{op.operationType}] {op.entityType}
                          </span>
                          <span className="text-slate-500">#{op.entityId.slice(0, 8)}</span>
                          <p className="text-[9px] text-slate-400">
                            {new Date(op.createdAt).toLocaleTimeString()}
                          </p>
                        </div>
                        <span className="px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 font-bold uppercase text-[9px]">
                          {op.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={handleManualSync}
                disabled={!isOnline || isManualSyncing}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs transition-colors text-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isManualSyncing ? 'animate-spin' : ''}`} />
                {isManualSyncing ? 'Syncing...' : 'Sync Now'}
              </button>

              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
