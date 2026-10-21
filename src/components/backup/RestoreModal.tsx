import React, { useState } from 'react';
import {
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  X,
  FileCheck,
  RefreshCw,
  CopyCheck,
  RotateCcw,
  Info,
  ShieldAlert
} from 'lucide-react';
import { BackupPackage, RestoreOptions, AppState } from '../../types';

interface RestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  backupPackage: BackupPackage | null;
  currentState: AppState;
  onConfirmRestore: (options: RestoreOptions) => void;
  isRestoring?: boolean;
}

export const RestoreModal: React.FC<RestoreModalProps> = ({
  isOpen,
  onClose,
  backupPackage,
  currentState,
  onConfirmRestore,
  isRestoring = false
}) => {
  const [mode, setMode] = useState<'MERGE_DEDUPLICATE' | 'FULL_OVERWRITE'>('MERGE_DEDUPLICATE');
  const [createSafetyBackup, setCreateSafetyBackup] = useState(true);
  const [skipDuplicateReceipts, setSkipDuplicateReceipts] = useState(true);
  const [skipDuplicatePayments, setSkipDuplicatePayments] = useState(true);
  const [skipDuplicateStockMovements, setSkipDuplicateStockMovements] = useState(true);
  const [confirmationInput, setConfirmationInput] = useState('');

  if (!isOpen || !backupPackage) return null;

  const { metadata, data } = backupPackage;
  const isConfirmed = confirmationInput.trim().toUpperCase() === 'RESTORE';

  const entityComparisons = [
    { label: 'Products & Varieties', current: currentState.products?.length || 0, incoming: data.products?.length || 0 },
    { label: 'Point of Sale (Sales)', current: currentState.sales?.length || 0, incoming: data.sales?.length || 0 },
    { label: 'Branch Inventory Records', current: currentState.inventory?.length || 0, incoming: data.inventory?.length || 0 },
    { label: 'Stock Movements', current: (currentState.stockMovements || currentState.movements || []).length, incoming: (data.stockMovements || []).length },
    { label: 'Farmers & Customers', current: currentState.customers?.length || 0, incoming: data.customers?.length || 0 },
    { label: 'Customer Credit Records', current: currentState.credits?.length || 0, incoming: data.credits?.length || 0 },
    { label: 'Credit Repayments', current: currentState.creditPayments?.length || 0, incoming: data.creditPayments?.length || 0 },
    { label: 'Operating Branches', current: currentState.branches?.length || 0, incoming: data.branches?.length || 0 },
    { label: 'Staff Accounts', current: currentState.users?.length || 0, incoming: data.users?.length || 0 },
    { label: 'Suppliers', current: currentState.suppliers?.length || 0, incoming: data.suppliers?.length || 0 },
    { label: 'Purchase Orders', current: (currentState.purchaseOrders || currentState.purchases || []).length, incoming: (data.purchaseOrders || []).length },
    { label: 'Goods Receipts (GRN)', current: currentState.goodsReceipts?.length || 0, incoming: data.goodsReceipts?.length || 0 },
    { label: 'Supplier Payments', current: currentState.supplierPayments?.length || 0, incoming: data.supplierPayments?.length || 0 },
    { label: 'Branch Expenses', current: currentState.expenses?.length || 0, incoming: data.expenses?.length || 0 },
    { label: 'Stock Transfers', current: currentState.transfers?.length || 0, incoming: data.transfers?.length || 0 },
    { label: 'Sales Returns', current: currentState.salesReturns?.length || 0, incoming: data.salesReturns?.length || 0 },
    { label: 'Financial Cashbook', current: currentState.financialTransactions?.length || 0, incoming: data.financialTransactions?.length || 0 },
    { label: 'Audit Trail Records', current: currentState.auditLogs?.length || 0, incoming: data.auditLogs?.length || 0 }
  ];

  const handleExecute = () => {
    if (!isConfirmed) return;
    onConfirmRestore({
      mode,
      createSafetyBackup,
      skipDuplicateReceipts,
      skipDuplicatePayments,
      skipDuplicateStockMovements
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-[#1B3022] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#7E9D73]/20 border border-[#7E9D73]/40 flex items-center justify-center text-[#7E9D73]">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Review & Confirm Data Restoration</h3>
              <p className="text-xs text-stone-300">
                Backup ID: <span className="font-mono text-emerald-300">{metadata.id}</span> • Schema v{metadata.schemaVersion}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isRestoring}
            className="text-stone-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-stone-800">
          {/* Metadata Card */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-stone-50 rounded-xl border border-stone-200 text-xs">
            <div>
              <span className="text-stone-500 block">Created On</span>
              <span className="font-semibold text-stone-900">{new Date(metadata.createdAt).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-stone-500 block">Created By</span>
              <span className="font-semibold text-stone-900">{metadata.createdByUserName} ({metadata.createdByUserRole})</span>
            </div>
            <div>
              <span className="text-stone-500 block">Backup Scope</span>
              <span className="font-semibold text-stone-900">{metadata.backupScope} {metadata.branchName ? `(${metadata.branchName})` : ''}</span>
            </div>
            <div>
              <span className="text-stone-500 block">Total Records</span>
              <span className="font-semibold text-emerald-800 font-mono text-sm">{metadata.totalRecords.toLocaleString()}</span>
            </div>
          </div>

          {/* Offline Snapshot Warning */}
          {metadata.isOfflineSnapshot && (
            <div className="flex items-start gap-3 p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Offline Snapshot Notice</p>
                <p className="text-amber-800 mt-0.5">
                  This backup was generated while disconnected from the cloud. It may contain {metadata.pendingOfflineOpsCount || 0} unsynchronized records. Restoring will not overwrite newer cloud data if duplicate prevention is enabled.
                </p>
              </div>
            </div>
          )}

          {/* Restoration Strategy Selection */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <CopyCheck className="w-4 h-4 text-emerald-700" />
              Select Restoration Strategy
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                onClick={() => setMode('MERGE_DEDUPLICATE')}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  mode === 'MERGE_DEDUPLICATE'
                    ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                    : 'border-stone-200 hover:border-stone-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-stone-900">Merge & Deduplicate</span>
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                    Recommended
                  </span>
                </div>
                <p className="text-xs text-stone-600 mt-1.5 leading-relaxed">
                  Safely restores missing records while checking unique identifiers (receipt numbers, credit numbers, transaction references). Prevents accidental duplicate sales and payments.
                </p>
              </div>

              <div
                onClick={() => setMode('FULL_OVERWRITE')}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  mode === 'FULL_OVERWRITE'
                    ? 'border-red-600 bg-red-50/60 ring-2 ring-red-500/20'
                    : 'border-stone-200 hover:border-stone-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-stone-900">Clean Full Restore</span>
                  <span className="text-[10px] font-bold bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
                    Caution
                  </span>
                </div>
                <p className="text-xs text-stone-600 mt-1.5 leading-relaxed">
                  Replaces the current working state completely with the backup image. Recommended for disaster recovery when production data is completely corrupted.
                </p>
              </div>
            </div>
          </div>

          {/* Protection Checkboxes */}
          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-stone-600">Disaster Recovery Protections</h5>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={createSafetyBackup}
                onChange={(e) => setCreateSafetyBackup(e.target.checked)}
                className="mt-0.5 rounded text-emerald-700 focus:ring-emerald-600"
              />
              <div className="text-xs">
                <span className="font-semibold text-stone-900">Create Automatic Safety Snapshot</span>
                <p className="text-stone-500">
                  Takes a snapshot of current data before applying changes, allowing immediate rollback if needed.
                </p>
              </div>
            </label>

            {mode === 'MERGE_DEDUPLICATE' && (
              <>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={skipDuplicateReceipts}
                    onChange={(e) => setSkipDuplicateReceipts(e.target.checked)}
                    className="mt-0.5 rounded text-emerald-700 focus:ring-emerald-600"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-stone-900">Prevent Duplicate Sales Receipts</span>
                    <p className="text-stone-500">
                      Ignores backup sales whose receipt numbers already exist in the database.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={skipDuplicatePayments}
                    onChange={(e) => setSkipDuplicatePayments(e.target.checked)}
                    className="mt-0.5 rounded text-emerald-700 focus:ring-emerald-600"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-stone-900">Prevent Duplicate Credit & Supplier Payments</span>
                    <p className="text-stone-500">
                      Preserves financial integrity by avoiding duplicate payment postings.
                    </p>
                  </div>
                </label>
              </>
            )}
          </div>

          {/* Entity Counts Summary Grid */}
          <div>
            <h4 className="text-sm font-bold text-stone-900 mb-2">Record Counts Comparison</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {entityComparisons.map((col, idx) => (
                <div key={idx} className="p-2.5 rounded-lg border border-stone-100 bg-stone-50/50 flex justify-between items-center">
                  <span className="text-stone-600 truncate pr-1">{col.label}</span>
                  <div className="text-right shrink-0">
                    <span className="text-stone-400 font-mono text-[11px]">{col.current}</span>
                    <span className="text-stone-400 mx-1">→</span>
                    <span className="font-bold text-emerald-800 font-mono text-[11px]">{col.incoming}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Confirmation Input Gate */}
          <div className="p-4 rounded-xl border border-red-200 bg-red-50/40 space-y-2">
            <div className="flex items-center gap-2 text-red-900 font-bold text-xs uppercase tracking-wide">
              <ShieldAlert className="w-4 h-4 text-red-600" />
              Safety Confirmation Gate
            </div>
            <p className="text-xs text-stone-600">
              To prevent accidental execution, type <span className="font-mono font-bold text-red-700">RESTORE</span> in the box below to authorize this procedure.
            </p>
            <input
              type="text"
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              placeholder="Type RESTORE to confirm"
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-hidden bg-white uppercase font-mono"
            />
          </div>
        </div>

        {/* Action Footer */}
        <div className="px-6 py-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            disabled={isRestoring}
            className="px-4 py-2 border border-stone-300 rounded-lg text-sm font-semibold text-stone-700 hover:bg-stone-100 transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleExecute}
            disabled={!isConfirmed || isRestoring}
            className={`px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${
              isConfirmed && !isRestoring
                ? 'bg-[#1B3022] hover:bg-[#284732] text-white shadow-md'
                : 'bg-stone-300 text-stone-500 cursor-not-allowed'
            }`}
          >
            {isRestoring ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-300" />
                Applying Restoration...
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Execute Restoration
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
