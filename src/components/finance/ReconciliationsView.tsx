import React, { useState, useMemo } from 'react';
import {
  Coins,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Calendar,
  Building2,
  Search,
  Check,
  ShieldCheck,
  Plus
} from 'lucide-react';
import { AppState, CashReconciliation, CashSession, User, AuditLog } from '../../types';

interface ReconciliationsViewProps {
  state: AppState;
  currentUser: User;
  onOpenReconciliationModal: () => void;
  onApproveReconciliation: (reconId: string) => void;
}

export const ReconciliationsView: React.FC<ReconciliationsViewProps> = ({
  state,
  currentUser,
  onOpenReconciliationModal,
  onApproveReconciliation
}) => {
  const isSuperUser = currentUser.role === 'ADMIN' || currentUser.role === 'FINANCE_OFFICER';

  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    isSuperUser ? 'ALL' : currentUser.branchId
  );
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const reconciliations = state.cashReconciliations || [];

  const filteredReconciliations = useMemo(() => {
    return reconciliations.filter((r) => {
      if (selectedBranchId !== 'ALL' && r.branchId !== selectedBranchId) return false;
      if (statusFilter !== 'ALL' && r.varianceType !== statusFilter) return false;
      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase();
        const matchNo = r.reconciliationNo?.toLowerCase().includes(term);
        const matchBranch = r.branchName?.toLowerCase().includes(term);
        const matchUser = r.reconciledByUserName?.toLowerCase().includes(term);
        const matchReason = r.reason?.toLowerCase().includes(term);
        if (!matchNo && !matchBranch && !matchUser && !matchReason) return false;
      }
      return true;
    });
  }, [reconciliations, selectedBranchId, statusFilter, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-teal-50 rounded-xl text-teal-700">
              <Coins className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-800">
              Cash Drawer Shift Reconciliations
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Physical cash count logs, denomination breakdowns, shortage/surplus audits, and supervisor sign-offs.
          </p>
        </div>

        <button
          onClick={onOpenReconciliationModal}
          className="flex items-center space-x-2 px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-sm font-semibold shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Daily Cash Count</span>
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-wrap items-center gap-3">
        {/* Branch */}
        <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
          <Building2 className="w-4 h-4 text-slate-400" />
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            disabled={!isSuperUser}
            className="bg-transparent text-xs font-semibold text-slate-700 outline-hidden"
          >
            {isSuperUser && <option value="ALL">All Branches</option>}
            {state.branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Variance Status */}
        <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-transparent text-xs font-semibold text-slate-700 outline-hidden"
          >
            <option value="ALL">All Variance Statuses</option>
            <option value="BALANCED">Balanced Perfectly</option>
            <option value="SHORTAGE">Cash Shortage</option>
            <option value="SURPLUS">Cash Surplus</option>
          </select>
        </div>

        {/* Search */}
        <div className="grow max-w-sm relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search reconciliation #, branch, user..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden"
          />
        </div>
      </div>

      {/* Table of Reconciliations */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Reconciliation #</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Branch</th>
                <th className="py-3 px-3 text-right">Expected Cash (₦)</th>
                <th className="py-3 px-3 text-right">Counted Cash (₦)</th>
                <th className="py-3 px-3 text-right">Variance (₦)</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4">Auditor / Notes</th>
                <th className="py-3 px-3 text-center">Approval</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReconciliations.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Coins className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-medium">No reconciliation records found.</p>
                  </td>
                </tr>
              ) : (
                filteredReconciliations.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      {r.reconciliationNo}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-700">{r.date}</td>
                    <td className="py-3 px-3">{r.branchName}</td>
                    <td className="py-3 px-3 text-right font-medium">
                      ₦{r.expectedCashAmount.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      ₦{r.physicalCashAmount.toLocaleString()}
                    </td>
                    <td
                      className={`py-3 px-3 text-right font-black ${
                        r.variance === 0
                          ? 'text-emerald-700'
                          : r.variance < 0
                          ? 'text-rose-600'
                          : 'text-amber-600'
                      }`}
                    >
                      {r.variance > 0 ? '+' : ''}₦{r.variance.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.varianceType === 'BALANCED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : r.varianceType === 'SHORTAGE'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {r.varianceType}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate">
                      <span className="text-slate-800 font-medium block">
                        Counted by: {r.reconciledByUserName}
                      </span>
                      {r.reason && (
                        <span className="text-[10px] text-rose-600 font-medium block truncate">
                          Reason: {r.reason}
                        </span>
                      )}
                      {r.notes && (
                        <span className="text-[10px] text-slate-400 block truncate">
                          {r.notes}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {r.approvedByUserName ? (
                        <div className="flex flex-col items-center">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 flex items-center space-x-1">
                            <ShieldCheck className="w-3 h-3" />
                            <span>Approved</span>
                          </span>
                          <span className="text-[9px] text-slate-400 mt-0.5">
                            {r.approvedByUserName}
                          </span>
                        </div>
                      ) : isSuperUser ? (
                        <button
                          onClick={() => onApproveReconciliation(r.id)}
                          className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[10px] font-bold shadow-xs transition-colors flex items-center space-x-1 mx-auto"
                        >
                          <Check className="w-3 h-3" />
                          <span>Authorize</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-amber-600 font-semibold">
                          Pending Approval
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
