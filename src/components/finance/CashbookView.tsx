import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Download,
  Printer,
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  Calendar,
  Wallet,
  DollarSign,
  Layers,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  FileText,
  CreditCard,
  Plus
} from 'lucide-react';
import { AppState, FinancialTransaction, User, AuditLog } from '../../types';
import {
  deriveFinancialTransactions,
  filterFinancialTransactions,
  calculateChronologicalLedger,
  FinancialFilterOptions,
  exportToCSV
} from '../../services/financialService';

interface CashbookViewProps {
  state: AppState;
  currentUser: User;
  onOpenNewTransaction: () => void;
  onOpenReconciliation: () => void;
  onReverseTransaction: (tx: FinancialTransaction, reason: string) => void;
}

export const CashbookView: React.FC<CashbookViewProps> = ({
  state,
  currentUser,
  onOpenNewTransaction,
  onOpenReconciliation,
  onReverseTransaction
}) => {
  const isSuperUser = currentUser.role === 'ADMIN' || currentUser.role === 'FINANCE_OFFICER';

  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    isSuperUser ? 'ALL' : currentUser.branchId
  );
  const [preset, setPreset] = useState<FinancialFilterOptions['preset']>('THIS_MONTH');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [transactionType, setTransactionType] = useState('ALL');
  const [paymentCategory, setPaymentCategory] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [reversalModalTx, setReversalModalTx] = useState<FinancialTransaction | null>(null);
  const [reversalReason, setReversalReason] = useState('');

  // 1. Derive all unified transactions from existing state (Sales, Credit Payments, Expenses, Supplier Payments, Refunds, Manual Entries)
  const allTransactions = useMemo(() => {
    return deriveFinancialTransactions(state);
  }, [state]);

  // 2. Filter transactions based on current filters
  const filteredTransactions = useMemo(() => {
    return filterFinancialTransactions(allTransactions, {
      branchId: selectedBranchId === 'ALL' ? undefined : selectedBranchId,
      preset,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      transactionType,
      paymentCategory,
      searchTerm
    });
  }, [allTransactions, selectedBranchId, preset, startDate, endDate, transactionType, paymentCategory, searchTerm]);

  // 3. Compute ledger with running balance
  const ledger = useMemo(() => {
    return calculateChronologicalLedger(filteredTransactions, 0);
  }, [filteredTransactions]);

  // 4. Summaries for current filtered view
  const { totalIn, totalOut, netChange, cashIn, cashOut } = useMemo(() => {
    let tIn = 0;
    let tOut = 0;
    let cIn = 0;
    let cOut = 0;

    filteredTransactions.forEach((tx) => {
      tIn += tx.moneyIn || 0;
      tOut += tx.moneyOut || 0;
      if (tx.paymentCategory === 'CASH') {
        cIn += tx.moneyIn || 0;
        cOut += tx.moneyOut || 0;
      }
    });

    return {
      totalIn: tIn,
      totalOut: tOut,
      netChange: tIn - tOut,
      cashIn: cIn,
      cashOut: cOut
    };
  }, [filteredTransactions]);

  const handleExportCSV = () => {
    const rows = ledger.map((tx) => ({
      'Transaction ID': tx.referenceNumber,
      'Date': tx.transactionDate,
      'Branch': tx.branchName,
      'Type': tx.transactionType,
      'Description': tx.description,
      'Payment Method': tx.paymentMethod || 'CASH',
      'Category': tx.paymentCategory || 'CASH',
      'Money In (₦)': tx.moneyIn,
      'Money Out (₦)': tx.moneyOut,
      'Running Balance (₦)': tx.runningBalance,
      'Recorded By': tx.createdByUserName,
      'Status': tx.status
    }));

    exportToCSV(`Royal_Agro_Cashbook_${selectedBranchId}_${Date.now()}.csv`, rows);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleConfirmReversal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reversalModalTx || !reversalReason.trim()) return;

    onReverseTransaction(reversalModalTx, reversalReason.trim());
    setReversalModalTx(null);
    setReversalReason('');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Action Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-emerald-50 rounded-xl text-emerald-700">
              <Wallet className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-800">Cashbook & Transaction Register</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time financial journal capturing all operational cash flows, bank transfers, collections, and disbursements.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onOpenNewTransaction}
            className="flex items-center space-x-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-sm font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Direct Entry / Misc Income</span>
          </button>

          <button
            onClick={onOpenReconciliation}
            className="flex items-center space-x-2 px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-sm font-semibold shadow-xs transition-colors"
          >
            <FileText className="w-4 h-4" />
            <span>Daily Cash Count & Reconcile</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-medium transition-colors"
            title="Export to Excel / CSV"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center space-x-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-medium transition-colors"
            title="Print Cashbook"
          >
            <Printer className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Inflow */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <ArrowDownRight className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Total Inflows (Revenue)
            </span>
            <div className="text-xl font-bold text-emerald-700">₦{totalIn.toLocaleString()}</div>
            <span className="text-[11px] text-slate-400">Cash: ₦{cashIn.toLocaleString()}</span>
          </div>
        </div>

        {/* Total Outflow */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <ArrowUpRight className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Total Outflows (Paid)
            </span>
            <div className="text-xl font-bold text-rose-600">₦{totalOut.toLocaleString()}</div>
            <span className="text-[11px] text-slate-400">Cash: ₦{cashOut.toLocaleString()}</span>
          </div>
        </div>

        {/* Net Flow */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center space-x-3">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
              netChange >= 0 ? 'bg-teal-50 text-teal-700' : 'bg-amber-50 text-amber-700'
            }`}
          >
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Net Period Cash Flow
            </span>
            <div
              className={`text-xl font-black ${
                netChange >= 0 ? 'text-teal-800' : 'text-amber-700'
              }`}
            >
              {netChange >= 0 ? '+' : ''}₦{netChange.toLocaleString()}
            </div>
            <span className="text-[11px] text-slate-400">
              {filteredTransactions.length} recorded entries
            </span>
          </div>
        </div>

        {/* Physical Cash Net Balance */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Drawer Physical Net
            </span>
            <div className="text-xl font-bold text-indigo-800">
              ₦{(cashIn - cashOut).toLocaleString()}
            </div>
            <span className="text-[11px] text-slate-400">Excludes bank transfers</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Branch selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
              Branch
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                disabled={!isSuperUser}
                className="w-full pl-8 pr-2 py-1.5 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 bg-slate-50 disabled:opacity-75"
              >
                {isSuperUser && <option value="ALL">All Branches</option>}
                {state.branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Preset Date Range */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
              Period
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
              <select
                value={preset}
                onChange={(e) => setPreset(e.target.value as any)}
                className="w-full pl-8 pr-2 py-1.5 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="TODAY">Today</option>
                <option value="YESTERDAY">Yesterday</option>
                <option value="THIS_WEEK">This Week</option>
                <option value="THIS_MONTH">This Month</option>
                <option value="THIS_YEAR">This Year</option>
                <option value="ALL">All History</option>
                <option value="CUSTOM">Custom Date</option>
              </select>
            </div>
          </div>

          {/* Transaction Type Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
              Transaction Type
            </label>
            <select
              value={transactionType}
              onChange={(e) => setTransactionType(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              <option value="ALL">All Types</option>
              <option value="SALE">Sales (Revenue)</option>
              <option value="CUSTOMER_CREDIT_PAYMENT">Customer Credit Payments</option>
              <option value="EXPENSE">Operating Expenses</option>
              <option value="SUPPLIER_PAYMENT">Supplier Settlements</option>
              <option value="REFUND">Sales Returns (Refunds)</option>
              <option value="OTHER_INCOME">Other Income</option>
            </select>
          </div>

          {/* Payment Method / Category */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
              Payment Category
            </label>
            <div className="relative">
              <CreditCard className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
              <select
                value={paymentCategory}
                onChange={(e) => setPaymentCategory(e.target.value)}
                className="w-full pl-8 pr-2 py-1.5 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="ALL">All Modes</option>
                <option value="CASH">Cash Drawer</option>
                <option value="BANK">Bank Transfer</option>
                <option value="POS">POS Terminal</option>
                <option value="CHEQUE">Bank Cheque</option>
              </select>
            </div>
          </div>

          {/* Search bar */}
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
              Search Reference / Narration
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Receipt #, customer name, note, payee..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Custom date range fields if selected */}
        {preset === 'CUSTOM' && (
          <div className="flex items-center space-x-3 pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500 font-medium">Custom Range:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1 border border-slate-200 rounded-lg text-xs"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1 border border-slate-200 rounded-lg text-xs"
            />
          </div>
        )}
      </div>

      {/* Main Cashbook Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-3">Branch</th>
                <th className="py-3 px-3">Reference #</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-4">Description / Narration</th>
                <th className="py-3 px-3">Mode</th>
                <th className="py-3 px-3 text-right text-emerald-700">Money In (₦)</th>
                <th className="py-3 px-3 text-right text-rose-600">Money Out (₦)</th>
                <th className="py-3 px-4 text-right text-slate-900">Running Balance (₦)</th>
                <th className="py-3 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ledger.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <Wallet className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-medium">No financial transactions match the selected filters.</p>
                  </td>
                </tr>
              ) : (
                ledger.map((tx) => {
                  const isInflow = tx.moneyIn > 0;
                  const isReversed = tx.status === 'REVERSED';

                  return (
                    <tr
                      key={tx.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isReversed ? 'bg-slate-50/50 opacity-60 line-through' : ''
                      }`}
                    >
                      {/* Date */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-semibold text-slate-800 block">
                          {tx.transactionDate}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {tx.timestamp ? tx.timestamp.split('T')[1]?.slice(0, 5) || '' : ''}
                        </span>
                      </td>

                      {/* Branch */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-medium text-slate-700">{tx.branchName}</span>
                      </td>

                      {/* Reference */}
                      <td className="py-3 px-3 whitespace-nowrap font-mono text-[11px] text-slate-600">
                        {tx.referenceNumber}
                      </td>

                      {/* Transaction Type Tag */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {tx.transactionType === 'SALE' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Sale
                          </span>
                        )}
                        {tx.transactionType === 'CUSTOMER_CREDIT_PAYMENT' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800">
                            Credit Repayment
                          </span>
                        )}
                        {tx.transactionType === 'EXPENSE' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                            Expense
                          </span>
                        )}
                        {tx.transactionType === 'SUPPLIER_PAYMENT' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                            Supplier Pay
                          </span>
                        )}
                        {tx.transactionType === 'REFUND' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            Refund
                          </span>
                        )}
                        {tx.transactionType === 'OTHER_INCOME' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 text-cyan-800">
                            Other Income
                          </span>
                        )}
                        {tx.transactionType === 'OTHER_EXPENSE' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800">
                            Other Outflow
                          </span>
                        )}
                        {tx.transactionType === 'REVERSAL' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-800">
                            Reversal
                          </span>
                        )}
                      </td>

                      {/* Description */}
                      <td className="py-3 px-4 max-w-xs truncate" title={tx.description}>
                        <span className="text-slate-800 font-medium block">{tx.description}</span>
                        <span className="text-[10px] text-slate-400">
                          By: {tx.createdByUserName} {tx.notes ? `• ${tx.notes}` : ''}
                        </span>
                      </td>

                      {/* Mode / Category */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                            tx.paymentCategory === 'CASH'
                              ? 'bg-emerald-50 text-emerald-700'
                              : tx.paymentCategory === 'BANK'
                              ? 'bg-blue-50 text-blue-700'
                              : tx.paymentCategory === 'POS'
                              ? 'bg-purple-50 text-purple-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {tx.paymentCategory || tx.paymentMethod}
                        </span>
                      </td>

                      {/* Money In */}
                      <td className="py-3 px-3 text-right whitespace-nowrap font-semibold text-emerald-700">
                        {tx.moneyIn > 0 ? `+₦${tx.moneyIn.toLocaleString()}` : '-'}
                      </td>

                      {/* Money Out */}
                      <td className="py-3 px-3 text-right whitespace-nowrap font-semibold text-rose-600">
                        {tx.moneyOut > 0 ? `-₦${tx.moneyOut.toLocaleString()}` : '-'}
                      </td>

                      {/* Running Balance */}
                      <td className="py-3 px-4 text-right whitespace-nowrap font-bold text-slate-900">
                        ₦{(tx.runningBalance || 0).toLocaleString()}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {!isReversed && isSuperUser && (
                          <button
                            onClick={() => setReversalModalTx(tx)}
                            title="Reverse transaction (authorized correction)"
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {isReversed && (
                          <span className="text-[10px] text-slate-400 font-semibold">Reversed</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Reversal Modal */}
      {reversalModalTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                <RotateCcw className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-800">Reverse Financial Entry</h3>
                <p className="text-xs text-slate-500">
                  Ref: {reversalModalTx.referenceNumber} (₦
                  {(reversalModalTx.moneyIn || reversalModalTx.moneyOut).toLocaleString()})
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Accounting integrity rule: Transactions are never deleted. A reversal creates an
              opposing adjusting entry and logs an audit trail record.
            </p>

            <form onSubmit={handleConfirmReversal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Reversal *
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Duplicate receipt recorded, erroneous cash deposit..."
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 outline-hidden"
                  required
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReversalModalTx(null)}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm"
                >
                  Confirm Reversal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
