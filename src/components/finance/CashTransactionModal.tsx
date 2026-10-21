import React, { useState } from 'react';
import {
  X,
  PlusCircle,
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  FileText,
  Calendar,
  Building2,
  AlertCircle
} from 'lucide-react';
import { AppState, FinancialTransaction, User } from '../../types';

interface CashTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tx: FinancialTransaction) => void;
  state: AppState;
  currentUser: User;
}

export const CashTransactionModal: React.FC<CashTransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  state,
  currentUser
}) => {
  const [type, setType] = useState<'OTHER_INCOME' | 'OTHER_EXPENSE'>('OTHER_INCOME');
  const [branchId, setBranchId] = useState<string>(
    currentUser.role === 'ADMIN' || currentUser.role === 'FINANCE_OFFICER'
      ? (state.branches[0]?.id || 'br-1')
      : currentUser.branchId
  );
  const [amount, setAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'POS' | 'CHEQUE'>('CASH');
  const [description, setDescription] = useState('');
  const [referenceNumber, setReferenceNumber] = useState(`FIN-${Date.now().toString().slice(-6)}`);
  const [notes, setNotes] = useState('');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) {
      setError('Please enter a valid positive transaction amount.');
      return;
    }
    if (!description.trim()) {
      setError('Please provide a description or reason for this financial entry.');
      return;
    }

    const branch = state.branches.find((b) => b.id === branchId);
    const branchName = branch ? branch.name : 'Main Branch';

    const newTx: FinancialTransaction = {
      id: `fin-manual-${Date.now()}`,
      financialTransactionId: `fin-manual-${Date.now()}`,
      branchId,
      branchName,
      transactionType: type,
      referenceNumber: referenceNumber.trim() || `FIN-${Date.now().toString().slice(-6)}`,
      description: description.trim(),
      moneyIn: type === 'OTHER_INCOME' ? Number(amount) : 0,
      moneyOut: type === 'OTHER_EXPENSE' ? Number(amount) : 0,
      paymentMethod,
      paymentCategory: paymentMethod === 'CASH' ? 'CASH' : paymentMethod === 'POS' ? 'POS' : paymentMethod === 'CHEQUE' ? 'CHEQUE' : 'BANK',
      createdByUserId: currentUser.id,
      createdByUserName: currentUser.name,
      transactionDate,
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      status: 'COMPLETED',
      notes: notes.trim() || undefined
    };

    onSave(newTx);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-5 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md">
              <DollarSign className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Direct Financial Entry</h3>
              <p className="text-xs text-emerald-200">Record miscellaneous income or operational adjustments</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center space-x-3 text-rose-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Direction toggle */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Entry Type</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType('OTHER_INCOME')}
                className={`flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl border text-sm font-semibold transition-all ${
                  type === 'OTHER_INCOME'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ArrowDownRight className="w-4 h-4 text-emerald-600" />
                <span>Other Income (Inflow)</span>
              </button>
              <button
                type="button"
                onClick={() => setType('OTHER_EXPENSE')}
                className={`flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl border text-sm font-semibold transition-all ${
                  type === 'OTHER_EXPENSE'
                    ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ArrowUpRight className="w-4 h-4 text-rose-600" />
                <span>Expense / Outflow</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Branch</label>
              <div className="relative">
                <Building2 className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  disabled={currentUser.role !== 'ADMIN' && currentUser.role !== 'FINANCE_OFFICER'}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden bg-slate-50 disabled:opacity-60"
                >
                  {state.branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Transaction Date</label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="date"
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Amount (₦)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm font-bold text-slate-500">₦</span>
                <input
                  type="number"
                  min="1"
                  step="any"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden bg-white"
              >
                <option value="CASH">Physical Cash</option>
                <option value="BANK_TRANSFER">Direct Bank Transfer</option>
                <option value="POS">POS Terminal</option>
                <option value="CHEQUE">Bank Cheque</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Description / Narration</label>
            <input
              type="text"
              placeholder="e.g. Sale of empty seed bags, soil testing fee, transport refund"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Reference / Receipt Number</label>
            <div className="relative">
              <FileText className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Additional Notes (Optional)</label>
            <textarea
              rows={2}
              placeholder="Audit trail details, supervisor verification note..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-3">
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
              <PlusCircle className="w-4 h-4" />
              <span>Record Entry</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
