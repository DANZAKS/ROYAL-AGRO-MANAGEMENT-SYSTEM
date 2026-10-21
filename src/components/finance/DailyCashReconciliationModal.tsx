import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Coins,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Building2,
  Calendar
} from 'lucide-react';
import {
  AppState,
  CashSession,
  CashReconciliation,
  CashDenominations,
  User,
  AuditLog
} from '../../types';
import { calculateDailyCashSummary } from '../../services/financialService';

interface DailyCashReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: AppState;
  currentUser: User;
  onSaveSession: (session: CashSession, reconciliation?: CashReconciliation, audit?: AuditLog) => void;
}

export const DailyCashReconciliationModal: React.FC<DailyCashReconciliationModalProps> = ({
  isOpen,
  onClose,
  state,
  currentUser,
  onSaveSession
}) => {
  const [branchId, setBranchId] = useState<string>(
    currentUser.role === 'ADMIN' || currentUser.role === 'FINANCE_OFFICER'
      ? (state.branches[0]?.id || 'br-1')
      : currentUser.branchId
  );
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Denominations count
  const [denominations, setDenominations] = useState<CashDenominations>({
    notes1000: 0,
    notes500: 0,
    notes200: 0,
    notes100: 0,
    notes50: 0,
    notes20: 0,
    notes10: 0,
    coins: 0
  });

  const [openingFloat, setOpeningFloat] = useState<number>(200000);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [actionType, setActionType] = useState<'OPEN_SESSION' | 'CLOSE_RECONCILE'>('CLOSE_RECONCILE');

  // Compute expected cash values for selected branch and date
  const cashSummary = useMemo(() => {
    return calculateDailyCashSummary(state, branchId, date);
  }, [state, branchId, date]);

  // Existing session state
  useEffect(() => {
    if (cashSummary.activeSession) {
      if (cashSummary.activeSession.openingCash) {
        setOpeningFloat(cashSummary.activeSession.openingCash);
      }
      if (cashSummary.activeSession.denominations) {
        setDenominations({
          notes1000: cashSummary.activeSession.denominations.notes1000 || 0,
          notes500: cashSummary.activeSession.denominations.notes500 || 0,
          notes200: cashSummary.activeSession.denominations.notes200 || 0,
          notes100: cashSummary.activeSession.denominations.notes100 || 0,
          notes50: cashSummary.activeSession.denominations.notes50 || 0,
          notes20: cashSummary.activeSession.denominations.notes20 || 0,
          notes10: cashSummary.activeSession.denominations.notes10 || 0,
          coins: cashSummary.activeSession.denominations.coins || 0
        });
      }
    }
  }, [cashSummary.activeSession]);

  // Calculate physical total from denominations
  const totalPhysicalCash = useMemo(() => {
    return (
      (denominations.notes1000 || 0) * 1000 +
      (denominations.notes500 || 0) * 500 +
      (denominations.notes200 || 0) * 200 +
      (denominations.notes100 || 0) * 100 +
      (denominations.notes50 || 0) * 50 +
      (denominations.notes20 || 0) * 20 +
      (denominations.notes10 || 0) * 10 +
      (denominations.coins || 0)
    );
  }, [denominations]);

  const expectedClosing = cashSummary.openingCash + cashSummary.totalCashIn - cashSummary.totalCashOut;
  const variance = totalPhysicalCash - expectedClosing;

  let varianceType: 'BALANCED' | 'SHORTAGE' | 'SURPLUS' = 'BALANCED';
  if (variance < -1) varianceType = 'SHORTAGE';
  else if (variance > 1) varianceType = 'SURPLUS';

  if (!isOpen) return null;

  const handleDenominationChange = (field: keyof CashDenominations, val: string) => {
    const num = parseInt(val, 10);
    setDenominations(prev => ({
      ...prev,
      [field]: isNaN(num) || num < 0 ? 0 : num
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const branch = state.branches.find(b => b.id === branchId);
    const branchName = branch ? branch.name : 'Branch';

    const sessionId = cashSummary.activeSession?.id || `cs-${branchId}-${date.replace(/-/g, '')}`;

    if (actionType === 'OPEN_SESSION') {
      const openSession: CashSession = {
        id: sessionId,
        branchId,
        branchName,
        date,
        openingCash: Number(openingFloat),
        expectedClosingCash: Number(openingFloat),
        status: 'OPEN',
        openedByUserId: currentUser.id,
        openedByUserName: currentUser.name,
        openedAt: new Date().toISOString(),
        notes: notes.trim() || 'Daily shift opened.'
      };

      const audit: AuditLog = {
        id: `aud-${Date.now()}`,
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'FINANCIAL_TRANSACTION_REVERSED',
        entity: 'FINANCE',
        entityId: openSession.id,
        details: `Opened cash session for ${branchName} on ${date} with ₦${openingFloat.toLocaleString()} opening float.`,
        branchId,
        timestamp: new Date().toISOString()
      };

      onSaveSession(openSession, undefined, audit);
      onClose();
      return;
    }

    // Closing / Reconciliation
    const closedSession: CashSession = {
      id: sessionId,
      branchId,
      branchName,
      date,
      openingCash: openingFloat,
      expectedClosingCash: expectedClosing,
      actualClosingCash: totalPhysicalCash,
      variance,
      varianceReason: variance !== 0 ? reason : undefined,
      status: Math.abs(variance) < 1 ? 'RECONCILED' : 'CLOSED',
      openedByUserId: cashSummary.activeSession?.openedByUserId || currentUser.id,
      openedByUserName: cashSummary.activeSession?.openedByUserName || currentUser.name,
      openedAt: cashSummary.activeSession?.openedAt || `${date}T08:00:00Z`,
      closedByUserId: currentUser.id,
      closedByUserName: currentUser.name,
      closedAt: new Date().toISOString(),
      denominations,
      notes: notes.trim() || undefined
    };

    const reconciliationNo = `REC-${date.replace(/-/g, '')}-${branchId.toUpperCase().slice(-3)}`;
    const recon: CashReconciliation = {
      id: `recon-${Date.now()}`,
      reconciliationNo,
      branchId,
      branchName,
      sessionId,
      date,
      expectedCashAmount: expectedClosing,
      physicalCashAmount: totalPhysicalCash,
      variance,
      varianceType,
      reason: variance !== 0 ? reason : undefined,
      investigationStatus: variance === 0 ? 'RESOLVED' : 'PENDING_INVESTIGATION',
      reconciledByUserId: currentUser.id,
      reconciledByUserName: currentUser.name,
      approvedByUserId: currentUser.role === 'ADMIN' ? currentUser.id : undefined,
      approvedByUserName: currentUser.role === 'ADMIN' ? currentUser.name : undefined,
      approvedAt: currentUser.role === 'ADMIN' ? new Date().toISOString() : undefined,
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString()
    };

    const audit: AuditLog = {
      id: `aud-${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      action: 'SYSTEM_SETTINGS_UPDATE',
      entity: 'FINANCE',
      entityId: recon.id,
      details: `Reconciled daily cash for ${branchName} (${date}): Expected ₦${expectedClosing.toLocaleString()}, Counted ₦${totalPhysicalCash.toLocaleString()}, Variance: ₦${variance.toLocaleString()} (${varianceType}).`,
      branchId,
      timestamp: new Date().toISOString()
    };

    onSaveSession(closedSession, recon, audit);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-5 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md">
              <Coins className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Daily Cash Drawer & Reconciliation</h3>
              <p className="text-xs text-emerald-200">Physical denomination counting & cashbook balance verification</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5">
          {/* Header Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Branch</label>
              <div className="relative">
                <Building2 className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  disabled={currentUser.role !== 'ADMIN' && currentUser.role !== 'FINANCE_OFFICER'}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 bg-slate-50 disabled:opacity-75"
                >
                  {state.branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Date</label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Workflow Action</label>
              <select
                value={actionType}
                onChange={(e) => setActionType(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-emerald-800 bg-emerald-50 focus:ring-2 focus:ring-emerald-500"
              >
                <option value="CLOSE_RECONCILE">Close & Reconcile Shift</option>
                <option value="OPEN_SESSION">Open Morning Shift Float</option>
              </select>
            </div>
          </div>

          {actionType === 'OPEN_SESSION' ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
              <h4 className="text-sm font-bold text-emerald-900 flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>Morning Cash Float Setup</span>
              </h4>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Starting Cash Float Amount (₦)
                </label>
                <input
                  type="number"
                  min="0"
                  value={openingFloat}
                  onChange={(e) => setOpeningFloat(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-800 text-lg bg-white"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">
                  This sets the opening cash baseline for today's transactions in this branch.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Expected System Summary Box */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 block mb-0.5">Opening Float</span>
                  <span className="font-bold text-slate-800 text-sm">
                    ₦{openingFloat.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-emerald-700 block mb-0.5 font-medium">+ Cash Inflows</span>
                  <span className="font-bold text-emerald-700 text-sm">
                    ₦{cashSummary.totalCashIn.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-rose-600 block mb-0.5 font-medium">- Cash Outflows</span>
                  <span className="font-bold text-rose-600 text-sm">
                    ₦{cashSummary.totalCashOut.toLocaleString()}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                  <span className="text-slate-500 block mb-0.5 font-semibold">Expected Closing</span>
                  <span className="font-black text-slate-900 text-sm">
                    ₦{expectedClosing.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Physical Cash Denomination Breakdown */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Physical Denomination Count
                  </label>
                  <span className="text-xs font-bold text-slate-600">
                    Counted Total:{' '}
                    <strong className="text-emerald-800 text-sm">
                      ₦{totalPhysicalCash.toLocaleString()}
                    </strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white border border-slate-200 p-3.5 rounded-xl">
                  {/* ₦1000 */}
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">
                      ₦1,000 Notes
                    </label>
                    <div className="flex items-center space-x-1">
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={denominations.notes1000 || ''}
                        onChange={(e) => handleDenominationChange('notes1000', e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-semibold"
                      />
                    </div>
                    <span className="text-[11px] text-slate-400">
                      = ₦{((denominations.notes1000 || 0) * 1000).toLocaleString()}
                    </span>
                  </div>

                  {/* ₦500 */}
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">
                      ₦500 Notes
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={denominations.notes500 || ''}
                      onChange={(e) => handleDenominationChange('notes500', e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-semibold"
                    />
                    <span className="text-[11px] text-slate-400">
                      = ₦{((denominations.notes500 || 0) * 500).toLocaleString()}
                    </span>
                  </div>

                  {/* ₦200 */}
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">
                      ₦200 Notes
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={denominations.notes200 || ''}
                      onChange={(e) => handleDenominationChange('notes200', e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-semibold"
                    />
                    <span className="text-[11px] text-slate-400">
                      = ₦{((denominations.notes200 || 0) * 200).toLocaleString()}
                    </span>
                  </div>

                  {/* ₦100 */}
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">
                      ₦100 Notes
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={denominations.notes100 || ''}
                      onChange={(e) => handleDenominationChange('notes100', e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-semibold"
                    />
                    <span className="text-[11px] text-slate-400">
                      = ₦{((denominations.notes100 || 0) * 100).toLocaleString()}
                    </span>
                  </div>

                  {/* ₦50 */}
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">
                      ₦50 Notes
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={denominations.notes50 || ''}
                      onChange={(e) => handleDenominationChange('notes50', e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-semibold"
                    />
                    <span className="text-[11px] text-slate-400">
                      = ₦{((denominations.notes50 || 0) * 50).toLocaleString()}
                    </span>
                  </div>

                  {/* ₦20 */}
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">
                      ₦20 Notes
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={denominations.notes20 || ''}
                      onChange={(e) => handleDenominationChange('notes20', e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-semibold"
                    />
                    <span className="text-[11px] text-slate-400">
                      = ₦{((denominations.notes20 || 0) * 20).toLocaleString()}
                    </span>
                  </div>

                  {/* ₦10 */}
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">
                      ₦10 Notes
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={denominations.notes10 || ''}
                      onChange={(e) => handleDenominationChange('notes10', e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-semibold"
                    />
                    <span className="text-[11px] text-slate-400">
                      = ₦{((denominations.notes10 || 0) * 10).toLocaleString()}
                    </span>
                  </div>

                  {/* Direct Sum / Coins */}
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">
                      Coins / Misc (₦)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={denominations.coins || ''}
                      onChange={(e) => handleDenominationChange('coins', e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-semibold"
                    />
                    <span className="text-[11px] text-slate-400">
                      = ₦{(denominations.coins || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Variance Indicator Banner */}
              <div
                className={`p-4 rounded-xl border flex items-center justify-between ${
                  varianceType === 'BALANCED'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : varianceType === 'SHORTAGE'
                    ? 'bg-rose-50 border-rose-300 text-rose-900'
                    : 'bg-amber-50 border-amber-300 text-amber-900'
                }`}
              >
                <div className="flex items-center space-x-3">
                  {varianceType === 'BALANCED' ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                  ) : varianceType === 'SHORTAGE' ? (
                    <TrendingDown className="w-6 h-6 text-rose-600 shrink-0" />
                  ) : (
                    <TrendingUp className="w-6 h-6 text-amber-600 shrink-0" />
                  )}
                  <div>
                    <h5 className="font-bold text-sm">
                      {varianceType === 'BALANCED'
                        ? 'Cash Balanced Perfectly'
                        : varianceType === 'SHORTAGE'
                        ? `Cash Shortage of ₦${Math.abs(variance).toLocaleString()}`
                        : `Cash Surplus of ₦${Math.abs(variance).toLocaleString()}`}
                    </h5>
                    <p className="text-xs opacity-90">
                      {varianceType === 'BALANCED'
                        ? 'Counted cash matches calculated system expected cash exactly.'
                        : 'Physical count deviates from expected transaction balance. Explanation required below.'}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs uppercase font-semibold block opacity-75">Variance</span>
                  <span className="text-lg font-black">
                    {variance > 0 ? '+' : ''}₦{variance.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Variance reason required if non-zero */}
              {variance !== 0 && (
                <div>
                  <label className="block text-xs font-semibold text-rose-700 mb-1">
                    Explanation / Root Cause for Variance *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Unrecorded customer change given at counter 1, dispenser issue..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-3 py-2 border border-rose-300 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-hidden bg-rose-50/50"
                    required
                  />
                </div>
              )}
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              General Auditor / Supervisor Notes (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Comments on shift handover, verified bank lodgements..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-hidden"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <div className="text-xs text-slate-500 flex items-center space-x-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Signed by {currentUser.name} ({currentUser.role})</span>
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-md transition-colors flex items-center space-x-2"
              >
                <FileCheck className="w-4 h-4" />
                <span>
                  {actionType === 'OPEN_SESSION' ? 'Set Opening Float' : 'Submit Reconciliation'}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
