import React, { useState } from 'react';
import {
  Building2,
  Plus,
  Edit2,
  Power,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  X,
  MapPin,
  Phone,
  UserCheck,
  CreditCard,
  ArrowRightLeft,
  Clock,
  FileText,
  Search,
  Filter
} from 'lucide-react';
import { Branch, User, Sale, BranchInventory, StockTransfer, StockMovement } from '../../types';

interface BranchConfigTabProps {
  branches: Branch[];
  users: User[];
  sales: Sale[];
  inventory: BranchInventory[];
  transfers: StockTransfer[];
  movements: StockMovement[];
  currentUser: User;
  onAddBranch: (branch: Branch) => void;
  onUpdateBranch: (branch: Branch, auditNote?: string) => void;
  onToggleBranchStatus: (branchId: string, reason?: string) => void;
}

export const BranchConfigTab: React.FC<BranchConfigTabProps> = ({
  branches = [],
  users = [],
  sales = [],
  inventory = [],
  transfers = [],
  movements = [],
  currentUser,
  onAddBranch,
  onUpdateBranch,
  onToggleBranchStatus
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Branch Edit/Add Modal
  const [showModal, setShowModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

  // Form State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [state, setState] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [managerId, setManagerId] = useState('');
  const [allowsCreditSales, setAllowsCreditSales] = useState(true);
  const [allowsTransfers, setAllowsTransfers] = useState(true);
  const [operatingHours, setOperatingHours] = useState('Mon - Sat: 08:00 - 18:00');
  const [customReceiptFooter, setCustomReceiptFooter] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Safe Deactivation Confirmation Modal
  const [deactivatingBranch, setDeactivatingBranch] = useState<Branch | null>(null);
  const [deactivationReason, setDeactivationReason] = useState('');

  const isCEO = currentUser.role === 'CEO';
  const branchManagers = users.filter((u) => u.role === 'BRANCH_MANAGER' || u.role === 'CEO');

  const filteredBranches = branches.filter((b) => {
    const matchesSearch =
      b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.state.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.managerName && b.managerName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getBranchHistoricalStats = (branchId: string) => {
    const branchSales = sales.filter((s) => s.branchId === branchId);
    const branchStockCount = inventory
      .filter((inv) => inv.branchId === branchId)
      .reduce((sum, i) => sum + i.quantity, 0);
    const branchTransfers = transfers.filter(
      (t) => t.sourceBranchId === branchId || t.destinationBranchId === branchId
    );
    const branchMovements = movements.filter((m) => m.branchId === branchId);

    const hasHistory =
      branchSales.length > 0 ||
      branchStockCount > 0 ||
      branchTransfers.length > 0 ||
      branchMovements.length > 0;

    return {
      salesCount: branchSales.length,
      stockCount: branchStockCount,
      transfersCount: branchTransfers.length,
      movementsCount: branchMovements.length,
      hasHistory
    };
  };

  const handleOpenModal = (b?: Branch) => {
    if (!isCEO) return;
    if (b) {
      setEditingBranch(b);
      setCode(b.code);
      setName(b.name);
      setState(b.state);
      setAddress(b.address);
      setPhone(b.phone);
      setEmail(b.email || '');
      setManagerId(b.managerId || '');
      setAllowsCreditSales(b.allowsCreditSales !== false);
      setAllowsTransfers(b.allowsTransfers !== false);
      setOperatingHours(b.operatingHours || 'Mon - Sat: 08:00 - 18:00');
      setCustomReceiptFooter(b.customReceiptFooter || '');
    } else {
      setEditingBranch(null);
      setCode(`RA-${Math.floor(100 + Math.random() * 900)}`);
      setName('');
      setState('Kano');
      setAddress('');
      setPhone('+234 ');
      setEmail('');
      setManagerId('');
      setAllowsCreditSales(true);
      setAllowsTransfers(true);
      setOperatingHours('Mon - Sat: 08:00 - 18:00');
      setCustomReceiptFooter('');
    }
    setFormError(null);
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCEO) {
      setFormError('Only CEO has authorization to modify branch configurations.');
      return;
    }

    if (!name.trim() || !code.trim()) {
      setFormError('Branch Code and Name are required.');
      return;
    }

    // Check code uniqueness
    const upperCode = code.trim().toUpperCase();
    const duplicate = branches.find(
      (b) => b.code.toUpperCase() === upperCode && (!editingBranch || b.id !== editingBranch.id)
    );
    if (duplicate) {
      setFormError(`Branch code "${code}" is already in use by "${duplicate.name}".`);
      return;
    }

    const mgr = users.find((u) => u.id === managerId);
    const nowIso = new Date().toISOString();

    if (editingBranch) {
      const updated: Branch = {
        ...editingBranch,
        code: upperCode,
        name: name.trim(),
        state: state.trim(),
        address: address.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        managerId: managerId || null,
        managerName: mgr ? mgr.name : 'Pending Assignment',
        allowsCreditSales,
        allowsTransfers,
        operatingHours,
        customReceiptFooter: customReceiptFooter.trim() || undefined,
        updatedAt: nowIso.replace('T', ' ').slice(0, 19)
      };
      onUpdateBranch(updated, `Configured branch details and business rules for ${updated.name} (${updated.code})`);
    } else {
      const newB: Branch = {
        id: 'br-' + Date.now(),
        code: upperCode,
        name: name.trim(),
        state: state.trim(),
        address: address.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        managerId: managerId || null,
        managerName: mgr ? mgr.name : 'Pending Assignment',
        status: 'ACTIVE',
        allowsCreditSales,
        allowsTransfers,
        operatingHours,
        customReceiptFooter: customReceiptFooter.trim() || undefined,
        createdAt: nowIso.split('T')[0]
      };
      onAddBranch(newB);
    }

    setShowModal(false);
  };

  const handleToggleClick = (branch: Branch) => {
    if (!isCEO) return;
    if (branch.status === 'ACTIVE') {
      // Prompt safe deactivation modal
      setDeactivatingBranch(branch);
      setDeactivationReason('');
    } else {
      // Re-activating is straightforward
      onToggleBranchStatus(branch.id, 'Re-activated branch operations');
    }
  };

  const handleConfirmDeactivation = () => {
    if (!deactivatingBranch) return;
    onToggleBranchStatus(
      deactivatingBranch.id,
      deactivationReason.trim() || 'Scheduled operational pause / maintenance'
    );
    setDeactivatingBranch(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by branch name, code, state, or manager..."
              className="w-full pl-9 pr-3.5 py-2 rounded-lg border border-stone-300 text-stone-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-stone-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="py-2 px-3 rounded-lg border border-stone-300 text-stone-800 text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">All Statuses ({branches.length})</option>
              <option value="ACTIVE">
                Active Only ({branches.filter((b) => b.status === 'ACTIVE').length})
              </option>
              <option value="INACTIVE">
                Inactive Only ({branches.filter((b) => b.status === 'INACTIVE').length})
              </option>
            </select>
          </div>
        </div>

        {isCEO && (
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" /> Add New Branch
          </button>
        )}
      </div>

      {/* Safety Notice Card */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-amber-900 text-xs">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold">Historical Record Protection Policy</p>
          <p className="mt-0.5 text-amber-800">
            Branches with completed sales, historical movements, or inventory cannot be deleted.
            They can be safely deactivated, which stops new sales and incoming transfers while keeping
            all ledger transactions, customer receivables, and financial audits intact.
          </p>
        </div>
      </div>

      {/* Branch Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredBranches.map((b) => {
          const stats = getBranchHistoricalStats(b.id);
          const isActive = b.status === 'ACTIVE';

          return (
            <div
              key={b.id}
              className={`bg-white rounded-xl border transition-all shadow-xs overflow-hidden flex flex-col justify-between ${
                isActive ? 'border-stone-200 hover:border-emerald-300' : 'border-stone-300 bg-stone-50/70 opacity-80'
              }`}
            >
              <div>
                {/* Header */}
                <div className="p-4 border-b border-stone-100 flex items-start justify-between bg-stone-50/50">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${
                        isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'
                      }`}
                    >
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-stone-900 text-sm">{b.name}</h4>
                      </div>
                      <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                        {b.code}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-700'
                    }`}
                  >
                    {isActive ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>

                {/* Details */}
                <div className="p-4 space-y-2.5 text-xs text-stone-600">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-stone-400 mt-0.5 shrink-0" />
                    <span>{b.address || 'Address not configured'}, {b.state}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    <span>{b.phone}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <UserCheck className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    <span className="font-medium text-stone-800">
                      Manager: {b.managerName || 'Pending Assignment'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    <span>{b.operatingHours || 'Mon - Sat: 08:00 - 18:00'}</span>
                  </div>

                  {/* Permitted Business Settings */}
                  <div className="pt-2 border-t border-stone-100 flex items-center gap-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                        b.allowsCreditSales !== false
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-stone-100 text-stone-500 line-through'
                      }`}
                    >
                      <CreditCard className="w-3 h-3" /> Credit Sales
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                        b.allowsTransfers !== false
                          ? 'bg-purple-50 text-purple-700'
                          : 'bg-stone-100 text-stone-500 line-through'
                      }`}
                    >
                      <ArrowRightLeft className="w-3 h-3" /> Inter-Transfers
                    </span>
                  </div>

                  {/* Historical Records Summary */}
                  <div className="mt-3 p-2.5 bg-stone-100/70 rounded-lg grid grid-cols-3 text-center text-[11px]">
                    <div>
                      <p className="font-bold text-stone-800">{stats.salesCount}</p>
                      <p className="text-[10px] text-stone-500 uppercase">Sales</p>
                    </div>
                    <div>
                      <p className="font-bold text-stone-800">{stats.stockCount.toLocaleString()}</p>
                      <p className="text-[10px] text-stone-500 uppercase">Stock Qty</p>
                    </div>
                    <div>
                      <p className="font-bold text-stone-800">{stats.transfersCount}</p>
                      <p className="text-[10px] text-stone-500 uppercase">Transfers</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              {isCEO && (
                <div className="p-3 bg-stone-50 border-t border-stone-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleOpenModal(b)}
                    className="flex-1 py-1.5 px-3 rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-stone-500" /> Configure
                  </button>

                  <button
                    onClick={() => handleToggleClick(b)}
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                      isActive
                        ? 'border border-rose-300 text-rose-700 hover:bg-rose-50'
                        : 'border border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                    {isActive ? 'Deactivate' : 'Reactivate'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Edit / Add Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 my-8">
            <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-700" />
                <h3 className="font-bold text-stone-900 text-base">
                  {editingBranch ? `Configure Branch: ${editingBranch.name}` : 'Register New Branch Hub'}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 flex items-center gap-2 font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-stone-700 mb-1 uppercase tracking-wider">
                    Unique Branch Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-stone-900 font-mono font-bold text-xs focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g. RA-KNO"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1 uppercase tracking-wider">
                    Branch Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-stone-900 text-xs focus:ring-2 focus:ring-emerald-500 font-medium"
                    placeholder="e.g. Kano Central Hub"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-stone-700 mb-1 uppercase tracking-wider">
                    State / Region
                  </label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-stone-900 text-xs focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g. Kano"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1 uppercase tracking-wider">
                    Branch Phone Contact
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-stone-900 text-xs focus:ring-2 focus:ring-emerald-500"
                    placeholder="+234 803 111 2233"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1 uppercase tracking-wider">
                  Physical Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-stone-900 text-xs focus:ring-2 focus:ring-emerald-500"
                  placeholder="Street, Landmark, Market Road"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-stone-700 mb-1 uppercase tracking-wider">
                    Branch Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-stone-900 text-xs focus:ring-2 focus:ring-emerald-500"
                    placeholder="kano@royalagro.ng"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1 uppercase tracking-wider">
                    Assign Branch Manager
                  </label>
                  <select
                    value={managerId}
                    onChange={(e) => setManagerId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-stone-900 text-xs focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- No Manager Assigned --</option>
                    {branchManagers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1 uppercase tracking-wider">
                  Operating Hours
                </label>
                <input
                  type="text"
                  value={operatingHours}
                  onChange={(e) => setOperatingHours(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-stone-900 text-xs focus:ring-2 focus:ring-emerald-500"
                  placeholder="Mon - Sat: 08:00 - 18:00"
                />
              </div>

              {/* Permitted Operations Toggles */}
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
                <p className="font-bold text-stone-800">Branch Operational Permissions</p>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowsCreditSales}
                      onChange={(e) => setAllowsCreditSales(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                    />
                    <span className="font-medium text-stone-700">Permit Credit Sales</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowsTransfers}
                      onChange={(e) => setAllowsTransfers(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                    />
                    <span className="font-medium text-stone-700">Permit Inter-Transfers</span>
                  </label>
                </div>
              </div>

              <div className="p-4 bg-stone-50 border-t border-stone-100 flex items-center justify-end gap-3 -mx-6 -mb-6 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg border border-stone-300 text-stone-700 font-bold hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-2 shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4" /> Save Branch Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Safe Deactivation Confirmation Modal */}
      {deactivatingBranch && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertTriangle className="w-7 h-7" />
              <div>
                <h3 className="font-bold text-stone-900 text-base">Confirm Safe Branch Deactivation</h3>
                <p className="text-xs text-stone-500">{deactivatingBranch.name} ({deactivatingBranch.code})</p>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1">
              <p className="font-bold">Important Data Safety Guarantee:</p>
              <p>
                Historical transactions, ledger records, customer receivables, and audit trails will
                remain 100% intact.
              </p>
              <p className="text-amber-800">
                Deactivation will hide this branch from new POS checkout selections and incoming
                stock transfers until reactivated.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Deactivation Reason / Operational Justification (For Audit Log):
              </label>
              <textarea
                rows={2}
                value={deactivationReason}
                onChange={(e) => setDeactivationReason(e.target.value)}
                placeholder="e.g. Branch renovation, warehouse lease expired, seasonal closure..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeactivatingBranch(null)}
                className="px-4 py-2 text-xs font-bold rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeactivation}
                className="px-5 py-2 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-2 shadow-xs"
              >
                <Power className="w-4 h-4" /> Confirm Deactivation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
