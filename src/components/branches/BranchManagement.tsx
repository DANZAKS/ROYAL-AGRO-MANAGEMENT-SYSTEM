import React, { useState } from 'react';
import {
  Building2,
  Plus,
  Edit2,
  Power,
  Users,
  MapPin,
  Phone,
  Calendar,
  CheckCircle2,
  X,
  TrendingUp,
  DollarSign
} from 'lucide-react';
import { Branch, User, Sale, Expense } from '../../types';

interface BranchManagementProps {
  branches: Branch[];
  users: User[];
  sales: Sale[];
  expenses: Expense[];
  onAddBranch: (branch: Branch) => void;
  onUpdateBranch: (branch: Branch) => void;
  onToggleBranchStatus: (branchId: string) => void;
}

export const BranchManagement: React.FC<BranchManagementProps> = ({
  branches = [],
  users = [],
  sales = [],
  expenses = [],
  onAddBranch,
  onUpdateBranch,
  onToggleBranchStatus
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [state, setState] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [managerId, setManagerId] = useState('');

  const branchManagers = users.filter((u) => u.role === 'BRANCH_MANAGER' || u.role === 'CEO');

  const handleOpenModal = (b?: Branch) => {
    if (b) {
      setEditingBranch(b);
      setCode(b.code);
      setName(b.name);
      setState(b.state);
      setAddress(b.address);
      setPhone(b.phone);
      setManagerId(b.managerId || '');
    } else {
      setEditingBranch(null);
      setCode(`RA-${Math.floor(100 + Math.random() * 900)}`);
      setName('');
      setState('Kano');
      setAddress('');
      setPhone('+234 ');
      setManagerId('');
    }
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code) return;

    const mgr = users.find((u) => u.id === managerId);

    if (editingBranch) {
      onUpdateBranch({
        ...editingBranch,
        code,
        name,
        state,
        address,
        phone,
        managerId: managerId || null,
        managerName: mgr ? mgr.name : 'Pending Assignment'
      });
    } else {
      const newB: Branch = {
        id: 'br-' + Date.now(),
        code,
        name,
        state,
        address,
        phone,
        managerId: managerId || null,
        managerName: mgr ? mgr.name : 'Pending Assignment',
        status: 'ACTIVE',
        createdAt: new Date().toISOString().split('T')[0]
      };
      onAddBranch(newB);
    }

    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-6 h-6 text-emerald-600" />
            <h1 className="text-lg font-bold text-slate-900">Royal Agro Multi-Branch Management</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Centralized control over company branches in Kano, Abuja, Kaduna, Ibadan, Enugu, Sokoto and beyond.
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-900/30 flex items-center gap-2 transition-all shrink-0"
        >
          <Plus className="w-4 h-4 text-amber-300" /> Register New Branch
        </button>
      </div>

      {/* Branch Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {branches.map((b) => {
          const bSales = sales.filter((s) => s.branchId === b.id && s.status === 'COMPLETED');
          const bRev = bSales.reduce((acc, s) => acc + s.totalAmount, 0);
          const bExp = expenses.filter((e) => e.branchId === b.id).reduce((acc, e) => acc + e.amount, 0);
          const bProfit = bRev - bExp;
          const staffCount = users.filter((u) => u.branchId === b.id).length;

          return (
            <div
              key={b.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold font-mono bg-slate-900 text-amber-300">
                    {b.code}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      b.status === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {b.status}
                  </span>
                </div>

                <h3 className="text-base font-extrabold text-slate-900 mt-3">{b.name}</h3>
                <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5" /> {b.state} State
                </p>

                <div className="space-y-1.5 mt-4 text-xs text-slate-600 border-t border-slate-100 pt-3">
                  <p className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{b.address}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{b.phone}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>Manager: <strong>{b.managerName || 'Unassigned'}</strong> ({staffCount} Staff)</span>
                  </p>
                </div>

                {/* Branch Financial Metrics Box */}
                <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Revenue</span>
                    <span className="font-extrabold text-emerald-700">₦{bRev.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Net Profit</span>
                    <span className="font-extrabold text-slate-900">₦{bProfit.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] text-slate-400">Created: {b.createdAt}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenModal(b)}
                    className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    title="Edit Branch"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onToggleBranchStatus(b.id)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      b.status === 'ACTIVE' ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'
                    }`}
                    title={b.status === 'ACTIVE' ? 'Deactivate Branch' : 'Activate Branch'}
                  >
                    <Power className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Branch Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-600" />
                {editingBranch ? 'Edit Branch Details' : 'Register New Branch'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Branch Code *</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">State Location *</label>
                  <input
                    type="text"
                    required
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="e.g. Kano"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Branch Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Kano Central Hub"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Street Address *</label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Plot 42 Farm Center Road, Kano"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Branch Phone *</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Assign Manager</label>
                  <select
                    value={managerId}
                    onChange={(e) => setManagerId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none"
                  >
                    <option value="">Pending Assignment</option>
                    {branchManagers.map((m) => (
                      <option key={m.id} value={m.id}>
                        👤 {m.name} ({m.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
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
                  {editingBranch ? 'Save Branch' : 'Register Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
