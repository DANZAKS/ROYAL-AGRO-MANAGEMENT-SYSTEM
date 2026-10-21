import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  ShoppingBag,
  Receipt,
  X,
  Building2,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  DollarSign
} from 'lucide-react';
import { Customer, Sale, Branch, PaymentMethod, SalesReturn } from '../../types';

interface CustomerManagerProps {
  customers: Customer[];
  sales: Sale[];
  salesReturns?: SalesReturn[];
  branches: Branch[];
  onAddCustomer: (customer: Customer) => void;
  onUpdateCustomer: (customer: Customer) => void;
  onRecordDebtRepayment?: (
    customerId: string,
    saleId: string | null,
    repaymentAmount: number,
    paymentMethod: PaymentMethod,
    reference?: string
  ) => void;
}

export const CustomerManager: React.FC<CustomerManagerProps> = ({
  customers = [],
  sales = [],
  salesReturns = [],
  branches = [],
  onAddCustomer,
  onUpdateCustomer,
  onRecordDebtRepayment
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Debt Repayment Modal state
  const [repaymentSale, setRepaymentSale] = useState<Sale | null>(null);
  const [repaymentAmount, setRepaymentAmount] = useState<number>(0);
  const [repaymentMethod, setRepaymentMethod] = useState<PaymentMethod>('CASH');
  const [repaymentRef, setRepaymentRef] = useState<string>('');

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [state, setState] = useState('Kano');
  const [creditLimit, setCreditLimit] = useState<number>(500000);
  const [registeredBranchId, setRegisteredBranchId] = useState(branches[0]?.id || '');

  // Edit Customer Modal
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Duplicate warning state
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);

  const handleOpenAdd = () => {
    setFullName('');
    setPhone('+234 ');
    setEmail('');
    setAddress('');
    setState('Kano');
    setCreditLimit(500000);
    setRegisteredBranchId(branches[0]?.id || '');
    setDuplicateWarning(null);
    setShowModal(true);
  };

  const handleOpenEdit = (cust: Customer) => {
    setEditingCustomer(cust);
    setFullName(cust.fullName);
    setPhone(cust.phone);
    setEmail(cust.email || '');
    setAddress(cust.address || '');
    setState(cust.state || 'Kano');
    setCreditLimit(cust.creditLimit ?? 500000);
    setRegisteredBranchId(cust.registeredBranchId || branches[0]?.id || '');
    setDuplicateWarning(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone) return;

    const cleanPhone = phone.replace(/\D/g, '');
    if (!editingCustomer && !duplicateWarning) {
      const existingDup = customers.find(
        (c) => c.phone.replace(/\D/g, '') === cleanPhone && cleanPhone.length > 5
      );
      if (existingDup) {
        setDuplicateWarning(
          `A customer with this phone number (${existingDup.fullName} - ${existingDup.phone}) already exists. Please verify before creating another record.`
        );
        return;
      }
    }

    if (editingCustomer) {
      const updated: Customer = {
        ...editingCustomer,
        fullName,
        phone,
        email,
        address,
        state,
        creditLimit,
        registeredBranchId
      };
      onUpdateCustomer(updated);
      setEditingCustomer(null);
      setSaveSuccessNotice(`Updated customer details for ${fullName}.`);
    } else {
      const uniqueId = `cust-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newC: Customer = {
        id: uniqueId,
        customerCode: `CUST-${Math.floor(1000 + Math.random() * 9000)}`,
        fullName,
        phone,
        email,
        address,
        state,
        creditLimit,
        totalPurchases: 0,
        totalSpent: 0,
        creditBalance: 0,
        registeredBranchId,
        createdAt: new Date().toISOString().split('T')[0]
      };

      onAddCustomer(newC);
      setShowModal(false);
      setSaveSuccessNotice(`✓ Customer saved ${navigator.onLine ? '' : 'locally'}. Will synchronize automatically.`);
    }

    setDuplicateWarning(null);
    setTimeout(() => setSaveSuccessNotice(null), 5000);
  };

  const getCustomerOutstandingDebt = (cust: Customer): number => {
    const custSales = (sales || []).filter(
      (s) => (s.customerId === cust.id || s.customerName === cust.fullName) && s.status === 'COMPLETED'
    );
    const salesDebt = custSales.reduce((sum, s) => sum + (s.balanceDue || 0), 0);
    return Math.max(salesDebt, cust.creditBalance || 0);
  };

  const totalNetworkDebt = (customers || []).reduce((sum, c) => sum + getCustomerOutstandingDebt(c), 0);

  const searchLower = (searchTerm || '').toLowerCase();
  const filteredCustomers = (customers || []).filter(
    (c) =>
      (c.fullName || '').toLowerCase().includes(searchLower) ||
      (c.customerCode || '').toLowerCase().includes(searchLower) ||
      (c.phone || '').includes(searchTerm) ||
      (c.state || '').toLowerCase().includes(searchLower) ||
      (c.address || '').toLowerCase().includes(searchLower)
  );

  const customerSales = selectedCustomer
    ? sales.filter((s) => s.customerId === selectedCustomer.id || s.customerName === selectedCustomer.fullName)
    : [];

  const handleOpenRepayment = (sale: Sale) => {
    setRepaymentSale(sale);
    setRepaymentAmount(sale.balanceDue || 0);
    setRepaymentMethod('CASH');
    setRepaymentRef('');
  };

  const handleSubmitRepayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || repaymentAmount <= 0) return;

    if (onRecordDebtRepayment) {
      onRecordDebtRepayment(
        selectedCustomer.id,
        repaymentSale ? repaymentSale.id : null,
        repaymentAmount,
        repaymentMethod,
        repaymentRef
      );
    }

    setRepaymentSale(null);
    setRepaymentAmount(0);
    setRepaymentRef('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-600" />
            <h1 className="text-lg font-bold text-slate-900">Farmer & Customer Directory</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage commercial farms, farmer co-operatives, and retail buyer purchase histories.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-900/30 flex items-center gap-2 transition-all shrink-0"
        >
          <Plus className="w-4 h-4 text-amber-300" /> Register New Customer
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase">Registered Customers</p>
            <p className="text-xl font-extrabold text-slate-900 mt-1">{customers.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase">Total Lifetime Sales</p>
            <p className="text-xl font-extrabold text-emerald-700 mt-1">
              ₦{customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0).toLocaleString()}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase">Total Customer Debt Owed</p>
            <p className="text-xl font-extrabold text-rose-700 mt-1">
              ₦{totalNetworkDebt.toLocaleString()}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Save Success Notice Banner */}
      {saveSuccessNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs rounded-xl flex items-center justify-between">
          <span>{saveSuccessNotice}</span>
          <button onClick={() => setSaveSuccessNotice(null)} className="text-emerald-600 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search customers by code, name, phone, state..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px]">
              <tr>
                <th className="p-4">Customer Code & Name</th>
                <th className="p-4">Contact Phone</th>
                <th className="p-4">Location / State</th>
                <th className="p-4">Home Branch</th>
                <th className="p-4">Credit Limit</th>
                <th className="p-4">Credit / Debt Owed</th>
                <th className="p-4">Sync Status</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.map((c) => {
                const b = branches.find((br) => br.id === c.registeredBranchId);
                const debt = getCustomerOutstandingDebt(c);
                const limit = c.creditLimit ?? 500000;
                const isSynced = c.syncStatus === 'synced';
                return (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-900">{c.fullName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{c.customerCode || c.id}</div>
                    </td>
                    <td className="p-4 text-slate-700 font-medium">{c.phone}</td>
                    <td className="p-4 text-slate-600">📍 {c.state}</td>
                    <td className="p-4 text-slate-600">{b?.name || 'Central'}</td>
                    <td className="p-4 font-bold text-slate-700">₦{limit.toLocaleString()}</td>
                    <td className="p-4">
                      {debt > 0 ? (
                        <span className="px-2 py-1 rounded-lg bg-rose-100 text-rose-800 font-extrabold text-[11px] inline-flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> ₦{debt.toLocaleString()} Owed
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-[11px] inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Clean Record
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      {isSynced ? (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold inline-flex items-center gap-1">
                          ✓ Synced
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold inline-flex items-center gap-1">
                          ⏳ Pending Sync
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEdit(c)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setSelectedCustomer(c)}
                        className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-bold"
                      >
                        Details & Credit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Purchase History & Credit Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl p-6 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{selectedCustomer.fullName}</h3>
                <p className="text-xs text-slate-500">
                  {selectedCustomer.phone} • {selectedCustomer.address}, {selectedCustomer.state}
                </p>
              </div>
              <button onClick={() => setSelectedCustomer(null)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Customer Financial & Returns Summary Grid */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] uppercase font-bold text-slate-400">Total Purchases</p>
                <p className="font-extrabold text-slate-900 mt-0.5">₦{(selectedCustomer.totalSpent || 0).toLocaleString()}</p>
                <p className="text-[9px] text-slate-500">{customerSales.length} Invoices</p>
              </div>

              <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200">
                <p className="text-[10px] uppercase font-bold text-amber-800">Total Returns</p>
                <p className="font-extrabold text-amber-950 mt-0.5">
                  {salesReturns.filter((r) => r.customerId === selectedCustomer.id || r.customerName === selectedCustomer.fullName).length} Returns
                </p>
                <p className="text-[9px] text-amber-700">
                  Val: ₦{salesReturns
                    .filter((r) => (r.customerId === selectedCustomer.id || r.customerName === selectedCustomer.fullName) && (r.status === 'APPROVED' || r.status === 'COMPLETED'))
                    .reduce((sum, r) => sum + r.totalReturnValue, 0)
                    .toLocaleString()}
                </p>
              </div>

              <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-200">
                <p className="text-[10px] uppercase font-bold text-blue-800">Store Credit Balance</p>
                <p className="font-extrabold text-blue-950 mt-0.5">
                  ₦{(selectedCustomer.storeCreditBalance || 0).toLocaleString()}
                </p>
                <p className="text-[9px] text-blue-700">Available for future orders</p>
              </div>

              <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-200">
                <p className="text-[10px] uppercase font-bold text-rose-800">Outstanding Debt</p>
                <p className="font-extrabold text-rose-950 mt-0.5">
                  ₦{getCustomerOutstandingDebt(selectedCustomer).toLocaleString()}
                </p>
                <p className="text-[9px] text-rose-700">Unpaid balance</p>
              </div>
            </div>

            {/* Credit Ledger Banner */}
            {getCustomerOutstandingDebt(selectedCustomer) > 0 ? (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-rose-900 block">
                    🔴 Total Credit Balance Owed: ₦{getCustomerOutstandingDebt(selectedCustomer).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-rose-700">
                    Customer has unpaid invoices or partial credit balance.
                  </span>
                </div>
                <button
                  onClick={() => {
                    const firstSaleWithBalance = customerSales.find((s) => (s.balanceDue || 0) > 0);
                    if (firstSaleWithBalance) {
                      handleOpenRepayment(firstSaleWithBalance);
                    } else {
                      setRepaymentSale(null);
                      setRepaymentAmount(getCustomerOutstandingDebt(selectedCustomer));
                      setRepaymentMethod('CASH');
                      setRepaymentRef('');
                    }
                  }}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs shadow-xs"
                >
                  💳 Record Debt Repayment
                </button>
              </div>
            ) : (
              <div className="mt-4 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                No outstanding credit debt recorded for this customer.
              </div>
            )}

            <div className="mt-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Purchase History & Payment Status</h4>
              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {customerSales.map((s) => {
                  const bal = s.balanceDue ?? 0;
                  const paid = s.amountPaid ?? s.totalAmount;
                  return (
                    <div key={s.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-900">{s.receiptNo} ({s.branchName})</p>
                          <p className="text-[10px] text-slate-500">{s.date} • {(s.items || []).length} items • Method: {s.paymentMethod}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-extrabold text-slate-900">Total: ₦{s.totalAmount.toLocaleString()}</p>
                          <p className="text-[10px] font-bold text-emerald-700">Paid: ₦{paid.toLocaleString()}</p>
                        </div>
                      </div>

                      {bal > 0 ? (
                        <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                          <span className="font-bold text-rose-700 text-[11px] bg-rose-100 px-2 py-0.5 rounded">
                            ⚠️ Outstanding Balance: ₦{bal.toLocaleString()} {s.creditDueDate ? `(Due: ${s.creditDueDate})` : ''}
                          </span>
                          <button
                            onClick={() => handleOpenRepayment(s)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] rounded-lg"
                          >
                            Pay Balance
                          </button>
                        </div>
                      ) : (
                        <div className="pt-1 text-right text-[10px] font-bold text-emerald-600">
                          ✓ Fully Paid
                        </div>
                      )}
                    </div>
                  );
                })}

                {customerSales.length === 0 && (
                  <p className="text-xs text-slate-400 py-6 text-center">No past orders found for this customer.</p>
                )}
              </div>
            </div>

            {/* Sales Return History Section */}
            <div className="mt-4 space-y-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Customer Sales Return History</h4>
              <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                {salesReturns
                  .filter((r) => r.customerId === selectedCustomer.id || r.customerName === selectedCustomer.fullName)
                  .map((ret) => (
                    <div key={ret.id} className="p-2.5 rounded-xl bg-amber-50/50 border border-amber-200/80 text-xs flex items-center justify-between">
                      <div>
                        <p className="font-extrabold text-slate-900">{ret.returnNo} (Invoice #{ret.receiptNo})</p>
                        <p className="text-[10px] text-slate-500">{ret.returnDate} • Reason: {ret.returnReason.replace('_', ' ')} • Type: {ret.returnType}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-amber-900">₦{ret.totalReturnValue.toLocaleString()}</p>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase">
                          {ret.status}
                        </span>
                      </div>
                    </div>
                  ))}

                {salesReturns.filter((r) => r.customerId === selectedCustomer.id || r.customerName === selectedCustomer.fullName).length === 0 && (
                  <p className="text-xs text-slate-400 py-2 text-center">No returns recorded for this customer.</p>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 text-right">
              <button
                onClick={() => setSelectedCustomer(null)}
                className="px-4 py-2 bg-slate-800 text-white font-bold text-xs rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Repayment Modal */}
      {(repaymentSale !== null || repaymentAmount > 0) && selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Record Credit Debt Repayment</h3>
              <button onClick={() => { setRepaymentSale(null); setRepaymentAmount(0); }} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitRepayment} className="space-y-3 mt-4 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <p className="font-bold text-slate-800">Customer: {selectedCustomer.fullName}</p>
                {repaymentSale && (
                  <p className="text-[11px] text-slate-500">
                    Receipt #{repaymentSale.receiptNo} • Outstanding: ₦{(repaymentSale.balanceDue || 0).toLocaleString()}
                  </p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Repayment Amount (₦) *</label>
                <input
                  type="number"
                  min="1"
                  max={repaymentSale ? (repaymentSale.balanceDue || getCustomerOutstandingDebt(selectedCustomer)) : getCustomerOutstandingDebt(selectedCustomer)}
                  required
                  value={repaymentAmount || ''}
                  onChange={(e) => setRepaymentAmount(Number(e.target.value))}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Method *</label>
                <select
                  value={repaymentMethod}
                  onChange={(e) => setRepaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none"
                >
                  <option value="CASH">CASH</option>
                  <option value="POS">POS CARD TERMINAL</option>
                  <option value="BANK_TRANSFER">BANK TRANSFER</option>
                </select>
              </div>

              {(repaymentMethod === 'POS' || repaymentMethod === 'BANK_TRANSFER') && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Reference / RRR</label>
                  <input
                    type="text"
                    placeholder="Enter reference or transaction ID..."
                    value={repaymentRef}
                    onChange={(e) => setRepaymentRef(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setRepaymentSale(null); setRepaymentAmount(0); }}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-xs"
                >
                  Submit Repayment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Customer Modal */}
      {(showModal || editingCustomer) && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                {editingCustomer ? 'Edit Customer Details' : 'Register New Customer'}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingCustomer(null);
                  setDuplicateWarning(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {duplicateWarning && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="font-semibold">{duplicateWarning}</p>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setDuplicateWarning(null)}
                    className="px-2.5 py-1 bg-amber-200 hover:bg-amber-300 text-amber-900 font-bold text-[10px] rounded-lg"
                  >
                    Proceed Anyway
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name / Co-op Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Alhaji Sani Dantata Farms"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone Number *</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+234 803 000 0000"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Credit Limit (₦)</label>
                  <input
                    type="number"
                    min="0"
                    step="10000"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">State Location</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="optional@farm.ng"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Registering Branch</label>
                  <select
                    value={registeredBranchId}
                    onChange={(e) => setRegisteredBranchId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Farm / Street Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingCustomer(null);
                    setDuplicateWarning(null);
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-xs"
                >
                  {editingCustomer ? 'Save Changes' : 'Register Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
