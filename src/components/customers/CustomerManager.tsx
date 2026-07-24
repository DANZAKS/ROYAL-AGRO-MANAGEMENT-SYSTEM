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
  Building2
} from 'lucide-react';
import { Customer, Sale, Branch } from '../../types';

interface CustomerManagerProps {
  customers: Customer[];
  sales: Sale[];
  branches: Branch[];
  onAddCustomer: (customer: Customer) => void;
  onUpdateCustomer: (customer: Customer) => void;
}

export const CustomerManager: React.FC<CustomerManagerProps> = ({
  customers = [],
  sales = [],
  branches = [],
  onAddCustomer,
  onUpdateCustomer
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showModal, setShowModal] = useState(false);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [state, setState] = useState('Kano');
  const [registeredBranchId, setRegisteredBranchId] = useState(branches[0]?.id || '');

  const handleOpenAdd = () => {
    setFullName('');
    setPhone('+234 ');
    setEmail('');
    setAddress('');
    setState('Kano');
    setRegisteredBranchId(branches[0]?.id || '');
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone) return;

    const newC: Customer = {
      id: 'cust-' + Date.now(),
      fullName,
      phone,
      email,
      address,
      state,
      totalPurchases: 0,
      totalSpent: 0,
      registeredBranchId,
      createdAt: new Date().toISOString().split('T')[0]
    };

    onAddCustomer(newC);
    setShowModal(false);
  };

  const searchLower = (searchTerm || '').toLowerCase();
  const filteredCustomers = (customers || []).filter(
    (c) =>
      (c.fullName || '').toLowerCase().includes(searchLower) ||
      (c.phone || '').includes(searchTerm) ||
      (c.state || '').toLowerCase().includes(searchLower)
  );

  const customerSales = selectedCustomer
    ? sales.filter((s) => s.customerId === selectedCustomer.id || s.customerName === selectedCustomer.fullName)
    : [];

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

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search customers by name, phone, state..."
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
                <th className="p-4">Customer Name</th>
                <th className="p-4">Contact Phone</th>
                <th className="p-4">Location / State</th>
                <th className="p-4">Home Branch</th>
                <th className="p-4">Total Orders</th>
                <th className="p-4">Lifetime Spent</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.map((c) => {
                const b = branches.find((br) => br.id === c.registeredBranchId);
                return (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-bold text-slate-900">{c.fullName}</td>
                    <td className="p-4 text-slate-700 font-medium">{c.phone}</td>
                    <td className="p-4 text-slate-600">📍 {c.state}</td>
                    <td className="p-4 text-slate-600">{b?.name || 'Central'}</td>
                    <td className="p-4 font-bold text-slate-800">{c.totalPurchases} orders</td>
                    <td className="p-4 font-extrabold text-emerald-700">₦{c.totalSpent.toLocaleString()}</td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setSelectedCustomer(c)}
                        className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-bold"
                      >
                        View History
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Purchase History Modal */}
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

            <div className="mt-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Purchase History</h4>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {customerSales.map((s) => (
                  <div key={s.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900">{s.receiptNo} ({s.branchName})</p>
                      <p className="text-[10px] text-slate-500">{s.date} • {(s.items || []).length} products purchased</p>
                    </div>
                    <div className="text-right">
                      <p className="font-extrabold text-emerald-700">₦{s.totalAmount.toLocaleString()}</p>
                      <span className="text-[10px] font-bold text-slate-500">{s.paymentMethod}</span>
                    </div>
                  </div>
                ))}

                {customerSales.length === 0 && (
                  <p className="text-xs text-slate-400 py-6 text-center">No past orders found for this customer.</p>
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

      {/* Add Customer Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Register New Customer</h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name / Co-op Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Alhaji Sani Dantata Farms"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none"
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
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">State Location</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Registering Branch</label>
                  <select
                    value={registeredBranchId}
                    onChange={(e) => setRegisteredBranchId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none"
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
                  Register Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
