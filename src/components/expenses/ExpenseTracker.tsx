import React, { useState } from 'react';
import {
  Sliders,
  Plus,
  Building2,
  DollarSign,
  FileText,
  X,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { Expense, ExpenseCategory, Branch, User } from '../../types';

interface ExpenseTrackerProps {
  expenses: Expense[];
  branches: Branch[];
  currentUser: User;
  onRecordExpense: (expense: Expense) => void;
}

export const ExpenseTracker: React.FC<ExpenseTrackerProps> = ({
  expenses = [],
  branches = [],
  currentUser,
  onRecordExpense
}) => {
  const [showModal, setShowModal] = useState(false);
  const [branchId, setBranchId] = useState(currentUser?.branchId || branches[0]?.id || '');
  const [category, setCategory] = useState<ExpenseCategory>('ELECTRICITY_DIESEL');
  const [amount, setAmount] = useState<number>(50000);
  const [description, setDescription] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [receiptRef, setReceiptRef] = useState('');

  const handleRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || !description) return;

    const b = branches.find((br) => br.id === branchId);

    const newExp: Expense = {
      id: 'exp-' + Date.now(),
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
      status: 'APPROVED'
    };

    onRecordExpense(newExp);
    setShowModal(false);
    setDescription('');
    setVendorName('');
    setReceiptRef('');
  };

  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-6 h-6 text-emerald-600" />
            <h1 className="text-lg font-bold text-slate-900">Branch Operational Expense Tracker</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Record logistics, diesel fuel, warehouse rent, salaries, and branch maintenance vouchers.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-900/30 flex items-center gap-2 transition-all shrink-0"
        >
          <Plus className="w-4 h-4 text-amber-300" /> Record Expense Voucher
        </button>
      </div>

      {/* Summary Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Approved Expenses</span>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">₦{totalExpenses.toLocaleString()}</p>
        </div>
        <span className="px-3 py-1 bg-rose-100 text-rose-800 text-xs font-bold rounded-full">
          {expenses.length} Vouchers
        </span>
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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenses.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="p-4 font-mono text-slate-500">{e.date}</td>
                  <td className="p-4 font-bold text-slate-900">📍 {e.branchName}</td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                      {e.category}
                    </span>
                  </td>
                  <td className="p-4 text-slate-700 font-medium">{e.description}</td>
                  <td className="p-4 text-slate-600">{e.vendorName || '-'}</td>
                  <td className="p-4 font-extrabold text-rose-700">₦{e.amount.toLocaleString()}</td>
                  <td className="p-4 text-slate-600">{e.recordedByUserName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Expense Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Record Branch Expense</h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecord} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Branch Location *</label>
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
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
                  placeholder="e.g. Purchased 150 liters diesel for Kano store generator"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Vendor / Payee</label>
                <input
                  type="text"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  placeholder="TotalEnergies"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-xs"
                >
                  Save Expense Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
