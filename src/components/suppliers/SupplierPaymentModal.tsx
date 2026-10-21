import React, { useState, useEffect } from 'react';
import {
  X,
  DollarSign,
  Building2,
  CreditCard,
  FileText,
  Calendar,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import {
  Supplier,
  SupplierPayment,
  SupplierPaymentMethod,
  PurchaseOrder,
  Branch,
  User
} from '../../types';

interface SupplierPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSavePayment: (payment: SupplierPayment) => void;
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  branches: Branch[];
  currentUser: User;
  selectedSupplier?: Supplier | null;
}

export const SupplierPaymentModal: React.FC<SupplierPaymentModalProps> = ({
  isOpen,
  onClose,
  onSavePayment,
  suppliers = [],
  purchaseOrders = [],
  branches = [],
  currentUser,
  selectedSupplier
}) => {
  const [supplierId, setSupplierId] = useState<string>('');
  const [purchaseOrderId, setPurchaseOrderId] = useState<string>('');
  const [branchId, setBranchId] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<SupplierPaymentMethod>('BANK_TRANSFER');
  const [reference, setReference] = useState<string>('');
  const [bankName, setBankName] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setPaymentDate(today);
    setReference(`TXN-${Math.floor(100000 + Math.random() * 900000)}`);
    setNotes('');
    setErrorMessage('');

    const targetSup = selectedSupplier || (suppliers.length > 0 ? suppliers[0] : null);
    if (targetSup) {
      setSupplierId(targetSup.id);
      setBankName(targetSup.bankName || 'First Bank of Nigeria');
      setAccountNumber(targetSup.bankAccountNumber || '');
    } else {
      setSupplierId('');
      setBankName('');
      setAccountNumber('');
    }

    setBranchId(currentUser?.branchId || branches[0]?.id || '');
    setPurchaseOrderId('');
    setAmount(0);
  }, [selectedSupplier, isOpen]);

  const handleSupplierChange = (supId: string) => {
    setSupplierId(supId);
    const sup = suppliers.find((s) => s.id === supId);
    if (sup) {
      setBankName(sup.bankName || '');
      setAccountNumber(sup.bankAccountNumber || '');
    }
  };

  const handlePOSelect = (poId: string) => {
    setPurchaseOrderId(poId);
    const po = purchaseOrders.find((p) => p.id === poId);
    if (po) {
      setAmount(po.totalAmount);
    }
  };

  if (!isOpen) return null;

  const currentSup = suppliers.find((s) => s.id === supplierId);
  const supplierPOs = purchaseOrders.filter(
    (po) => po.supplierId === supplierId && po.status !== 'CANCELLED' && po.status !== 'REJECTED'
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!supplierId || !currentSup) {
      setErrorMessage('Please select a supplier.');
      return;
    }
    if (amount <= 0) {
      setErrorMessage('Payment amount must be greater than 0.');
      return;
    }

    const paymentNo = `SPM-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const branch = branches.find((b) => b.id === branchId);
    const po = purchaseOrders.find((p) => p.id === purchaseOrderId);
    const nowIso = new Date().toISOString();

    const payment: SupplierPayment = {
      id: 'spay-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
      paymentNo,
      supplierId: currentSup.id,
      supplierName: currentSup.companyName,
      purchaseOrderId: po ? po.id : undefined,
      purchaseOrderNo: po ? po.orderNo : undefined,
      branchId: branch?.id || undefined,
      branchName: branch?.name || 'Central Treasury',
      amount,
      paymentDate: paymentDate || new Date().toISOString().split('T')[0],
      paymentMethod,
      reference: reference.trim() || undefined,
      bankName: bankName.trim() || undefined,
      accountNumber: accountNumber.trim() || undefined,
      notes: notes.trim() || undefined,
      paidByUserId: currentUser?.id || 'usr-1',
      paidByUserName: currentUser?.name || 'Treasury Officer',
      status: 'PAID',
      createdAt: nowIso,
      updatedAt: nowIso
    };

    onSavePayment(payment);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between p-5 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Record Supplier Payment Voucher</h2>
              <p className="text-xs text-slate-300">
                Issue settlement for agricultural inputs and update supplier payables ledger
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Supplier Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Supplier Beneficiary <span className="text-rose-500">*</span>
              </label>
              <select
                value={supplierId}
                onChange={(e) => handleSupplierChange(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden font-bold text-slate-900"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.companyName} {s.state ? `(${s.state})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Associated Purchase Order (Optional)
              </label>
              <select
                value={purchaseOrderId}
                onChange={(e) => handlePOSelect(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden font-mono"
              >
                <option value="">-- General Account Settlement --</option>
                {supplierPOs.map((po) => (
                  <option key={po.id} value={po.id}>
                    #{po.orderNo} — ₦{po.totalAmount.toLocaleString()} ({po.orderDate})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Payment Amount & Method */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Amount (₦) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                min="1"
                step="100"
                value={amount || ''}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                placeholder="₦ 0.00"
                className="w-full px-3.5 py-2 text-xs font-mono font-bold text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Method <span className="text-rose-500">*</span>
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as SupplierPaymentMethod)}
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden font-semibold"
              >
                <option value="BANK_TRANSFER">Bank Electronic Transfer</option>
                <option value="CHEQUE">Bank Cheque</option>
                <option value="CASH">Petty / Treasury Cash</option>
                <option value="BANK_DRAFT">Official Bank Draft</option>
                <option value="OTHER">Other / Offset</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Settlement Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
            </div>
          </div>

          {/* Reference & Banking Details */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-emerald-600" /> Electronic Transaction & Bank Trace Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-2xs font-semibold text-slate-600 mb-1">
                  Bank / Session Reference #
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g. NIP-881920-ZEN"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-hidden font-mono"
                />
              </div>

              <div>
                <label className="block text-2xs font-semibold text-slate-600 mb-1">
                  Disbursing / Beneficiary Bank
                </label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. First Bank / GTBank"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-hidden"
                />
              </div>

              <div>
                <label className="block text-2xs font-semibold text-slate-600 mb-1">
                  Account Number
                </label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="10-digit NUBAN"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-hidden font-mono"
                />
              </div>
            </div>
          </div>

          {/* Internal Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Payment Remarks / Treasury Authorization
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Paid in full for Foundation Maize Seed Batch #4..."
              className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-900/20 transition-all flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Post Payment to Supplier Ledger
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
