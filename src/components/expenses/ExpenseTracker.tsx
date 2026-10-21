import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Plus,
  Building2,
  DollarSign,
  FileText,
  X,
  CheckCircle2,
  Clock,
  WifiOff,
  Edit2,
  Trash2,
  Filter,
  Search
} from 'lucide-react';
import { Expense, ExpenseCategory, Branch, User } from '../../types';
import { getNetworkStatus } from '../../offline/networkStatus';

interface ExpenseTrackerProps {
  expenses: Expense[];
  branches: Branch[];
  currentUser: User;
  onRecordExpense: (expense: Expense) => void;
  onEditExpense?: (expense: Expense) => void;
  onCancelExpense?: (expenseId: string, reason?: string) => void;
}

export const ExpenseTracker: React.FC<ExpenseTrackerProps> = ({
  expenses = [],
  branches = [],
  currentUser,
  onRecordExpense,
  onEditExpense,
  onCancelExpense
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const [filterBranchId, setFilterBranchId] = useState<string>(currentUser?.branchId || 'ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Form states
  const [branchId, setBranchId] = useState(currentUser?.branchId || branches[0]?.id || '');
  const [category, setCategory] = useState<ExpenseCategory>('ELECTRICITY_DIESEL');
  const [amount, setAmount] = useState<number>(50000);
  const [description, setDescription] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [receiptRef, setReceiptRef] = useState('');
  const [recordSuccessMessage, setRecordSuccessMessage] = useState<string | null>(null);

  // Cancellation state
  const [cancellingExpenseId, setCancellingExpenseId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');

  useEffect(() => {
    const handleStatusChange = () => {
      setIsOnline(navigator.onLine);
    };
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);
    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  const resetForm = () => {
    setEditingExpense(null);
    setBranchId(currentUser?.branchId || branches[0]?.id || '');
    setCategory('ELECTRICITY_DIESEL');
    setAmount(50000);
    setDescription('');
    setVendorName('');
    setReceiptRef('');
  };

  const handleOpenCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const handleOpenEditModal = (exp: Expense) => {
    setEditingExpense(exp);
    setBranchId(exp.branchId);
    setCategory(exp.category);
    setAmount(exp.amount);
    setDescription(exp.description);
    setVendorName(exp.vendorName || '');
    setReceiptRef(exp.receiptRef || '');
    setShowModal(true);
  };

  const handleRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || !description.trim() || !branchId) return;

    const b = branches.find((br) => br.id === branchId);

    if (editingExpense) {
      const updated: Expense = {
        ...editingExpense,
        branchId,
        branchName: b?.name || editingExpense.branchName,
        category,
        amount,
        description,
        vendorName: vendorName || undefined,
        receiptRef: receiptRef || undefined,
        status: editingExpense.status
      };
      if (onEditExpense) onEditExpense(updated);
      setRecordSuccessMessage(
        isOnline
          ? '✓ Expense voucher updated and synchronized.'
          : '✓ Expense voucher updated locally. ⏳ Waiting for synchronization.'
      );
    } else {
      const newExp: Expense = {
        id: 'exp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        branchId,
        branchName: b?.name || '',
        category,
        amount,
        description,
        vendorName: vendorName || undefined,
        date: new Date().toISOString().split('T')[0],
        recordedByUserId: currentUser.id,
        recordedByUserName: currentUser.name,
        receiptRef: receiptRef || undefined,
        status: 'APPROVED',
        createdAt: new Date().toISOString()
      };

      onRecordExpense(newExp);
      setRecordSuccessMessage(
        isOnline
          ? '✓ Expense recorded and synchronized.'
          : '✓ Expense recorded locally. ⏳ Waiting for synchronization.'
      );
    }

    setShowModal(false);
    resetForm();

    setTimeout(() => {
      setRecordSuccessMessage(null);
    }, 4000);
  };

  const handleConfirmCancel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingExpenseId) return;
    if (onCancelExpense) {
      onCancelExpense(cancellingExpenseId, cancelReason || 'Cancelled by manager');
    }
    setCancellingExpenseId(null);
    setCancelReason('');
  };

  // Filtered expenses
  const filteredExpenses = expenses.filter((e) => {
    const matchesBranch = filterBranchId === 'ALL' || e.branchId === filterBranchId;
    const matchesCategory = filterCategory === 'ALL' || e.category === filterCategory;
    const matchesSearch =
      !searchTerm ||
      e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.vendorName && e.vendorName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (e.receiptRef && e.receiptRef.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesBranch && matchesCategory && matchesSearch;
  });

  const totalFilteredExpenses = filteredExpenses
    .filter((e) => e.status !== 'CANCELLED')
    .reduce((acc, e) => acc + e.amount, 0);

  return (
    <div className="space-y-6">
      {/* Offline Status Banner */}
      {!isOnline && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center justify-between text-xs text-amber-800 shadow-xs">
          <div className="flex items-center gap-2.5 font-bold">
            <WifiOff className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Offline Mode Active:</strong> New and edited expense vouchers will be saved locally to IndexedDB and automatically synchronized when connectivity is restored.
            </span>
          </div>
          <span className="px-2.5 py-1 bg-amber-200 text-amber-900 rounded-lg text-[10px] font-extrabold uppercase shrink-0">
            Offline Storage
          </span>
        </div>
      )}

      {/* Success Notification */}
      {recordSuccessMessage && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-800 font-bold shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{recordSuccessMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-6 h-6 text-emerald-600" />
            <h1 className="text-lg font-bold text-slate-900">Branch Operational Expense Tracker</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Record logistics, diesel fuel, warehouse rent, salaries, and branch maintenance vouchers offline or online.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-900/30 flex items-center gap-2 transition-all shrink-0"
        >
          <Plus className="w-4 h-4 text-amber-300" /> Record Expense Voucher
        </button>
      </div>

      {/* Filters & Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Summary */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between col-span-1">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Approved Expenses
            </span>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">₦{totalFilteredExpenses.toLocaleString()}</p>
          </div>
          <span className="px-3 py-1 bg-rose-100 text-rose-800 text-xs font-bold rounded-full">
            {filteredExpenses.filter((e) => e.status !== 'CANCELLED').length} Vouchers
          </span>
        </div>

        {/* Filter Controls */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs md:col-span-2 flex flex-col sm:flex-row gap-3 items-center">
          <div className="w-full sm:w-1/3">
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Branch</label>
            <select
              value={filterBranchId}
              onChange={(e) => setFilterBranchId(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none"
            >
              <option value="ALL">📍 All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  📍 {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full sm:w-1/3">
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Category</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none"
            >
              <option value="ALL">🏷️ All Categories</option>
              <option value="ELECTRICITY_DIESEL">ELECTRICITY / DIESEL</option>
              <option value="LOGISTICS">LOGISTICS / HAULAGE</option>
              <option value="TRANSPORTATION">TRANSPORTATION</option>
              <option value="RENT">WAREHOUSE RENT</option>
              <option value="SALARY">STAFF SALARY</option>
              <option value="MAINTENANCE">EQUIPMENT MAINTENANCE</option>
              <option value="MARKETING">MARKETING</option>
              <option value="EQUIPMENT">EQUIPMENT</option>
              <option value="OTHER">OTHER</option>
            </select>
          </div>

          <div className="w-full sm:w-1/3">
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Search</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search description, payee..."
                className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Expense Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px]">
              <tr>
                <th className="p-4">Date</th>
                <th className="p-4">Branch</th>
                <th className="p-4">Category</th>
                <th className="p-4">Description</th>
                <th className="p-4">Vendor / Payee</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Recorded By</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Sync</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400 italic">
                    No expense vouchers found matching the active criteria.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((e) => {
                  const isCancelled = e.status === 'CANCELLED';

                  return (
                    <tr key={e.id} className={`hover:bg-slate-50 ${isCancelled ? 'opacity-50 bg-slate-50/50' : ''}`}>
                      <td className="p-4 font-mono text-slate-500">{e.date}</td>
                      <td className="p-4 font-bold text-slate-900">📍 {e.branchName}</td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                          {e.category}
                        </span>
                      </td>
                      <td className="p-4 text-slate-700 font-medium">{e.description}</td>
                      <td className="p-4 text-slate-600">{e.vendorName || '-'}</td>
                      <td className={`p-4 font-extrabold ${isCancelled ? 'line-through text-slate-400' : 'text-rose-700'}`}>
                        ₦{e.amount.toLocaleString()}
                      </td>
                      <td className="p-4 text-slate-600">{e.recordedByUserName}</td>
                      <td className="p-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                            isCancelled
                              ? 'bg-rose-100 text-rose-800'
                              : e.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {e.status}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
                            e.syncStatus === 'synced'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                          }`}
                        >
                          {e.syncStatus === 'synced' ? 'Synced' : 'Pending'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {!isCancelled && (
                          <div className="flex items-center justify-end gap-1.5">
                            {onEditExpense && (
                              <button
                                onClick={() => handleOpenEditModal(e)}
                                title="Edit Expense"
                                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {onCancelExpense && (
                              <button
                                onClick={() => setCancellingExpenseId(e.id)}
                                title="Cancel Voucher"
                                className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
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

      {/* Record / Edit Expense Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                {editingExpense ? 'Edit Expense Voucher' : 'Record Branch Expense'}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecord} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Branch Location *</label>
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold focus:outline-none"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      📍 {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold focus:outline-none"
                  >
                    <option value="ELECTRICITY_DIESEL">ELECTRICITY / DIESEL</option>
                    <option value="LOGISTICS">LOGISTICS / HAULAGE</option>
                    <option value="TRANSPORTATION">TRANSPORTATION</option>
                    <option value="RENT">WAREHOUSE RENT</option>
                    <option value="SALARY">STAFF SALARY</option>
                    <option value="MAINTENANCE">EQUIPMENT MAINTENANCE</option>
                    <option value="MARKETING">MARKETING</option>
                    <option value="EQUIPMENT">EQUIPMENT</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Amount (₦) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description *</label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Purchased 150 liters diesel for generator"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Vendor / Payee</label>
                <input
                  type="text"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  placeholder="e.g. TotalEnergies / Local Service Provider"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Receipt / Voucher Reference</label>
                <input
                  type="text"
                  value={receiptRef}
                  onChange={(e) => setReceiptRef(e.target.value)}
                  placeholder="e.g. REC-883920"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-xs"
                >
                  {editingExpense ? 'Update Expense' : 'Save Expense Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Expense Modal */}
      {cancellingExpenseId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6">
            <h3 className="text-sm font-bold text-slate-900">Confirm Expense Cancellation</h3>
            <p className="text-xs text-slate-500 mt-1">
              Cancelling an expense voucher will mark it as CANCELLED and exclude it from operational expense totals.
            </p>

            <form onSubmit={handleConfirmCancel} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Cancellation Reason *</label>
                <input
                  type="text"
                  required
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Duplicate voucher entry / Payment refunded"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCancellingExpenseId(null);
                    setCancelReason('');
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-semibold"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold shadow-xs"
                >
                  Cancel Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
