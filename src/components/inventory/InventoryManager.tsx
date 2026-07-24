import React, { useState } from 'react';
import {
  Boxes,
  Building2,
  AlertTriangle,
  Plus,
  ArrowRightLeft,
  Search,
  History,
  FileSpreadsheet,
  CheckCircle,
  X,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import {
  BranchInventory,
  Product,
  Branch,
  StockMovement,
  StockMovementType,
  User
} from '../../types';

interface InventoryManagerProps {
  inventory: BranchInventory[];
  products: Product[];
  branches: Branch[];
  movements: StockMovement[];
  activeBranch: Branch | null;
  currentUser: User;
  onUpdateStock: (
    productId: string,
    branchId: string,
    delta: number,
    type: StockMovementType,
    notes?: string
  ) => void;
}

export const InventoryManager: React.FC<InventoryManagerProps> = ({
  inventory = [],
  products = [],
  branches = [],
  movements = [],
  activeBranch,
  currentUser,
  onUpdateStock
}) => {
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    activeBranch?.id || 'ALL'
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'STOCK' | 'LOGS'>('STOCK');

  // Adjust / Damaged Modal state
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustProductId, setAdjustProductId] = useState('');
  const [adjustBranchId, setAdjustBranchId] = useState(activeBranch?.id || branches[0]?.id || '');
  const [adjustType, setAdjustType] = useState<StockMovementType>('PURCHASE');
  const [adjustQty, setAdjustQty] = useState<number>(10);
  const [adjustNotes, setAdjustNotes] = useState('');

  const canManage =
    currentUser.role === 'CEO' ||
    currentUser.role === 'INVENTORY_OFFICER' ||
    currentUser.role === 'BRANCH_MANAGER';

  const handleOpenAdjust = (prodId?: string, branchId?: string, type: StockMovementType = 'PURCHASE') => {
    setAdjustProductId(prodId || products[0]?.id || '');
    setAdjustBranchId(branchId || activeBranch?.id || branches[0]?.id || '');
    setAdjustType(type);
    setAdjustQty(10);
    setAdjustNotes('');
    setShowAdjustModal(true);
  };

  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustProductId || !adjustBranchId || adjustQty <= 0) return;

    // Delta is negative for DAMAGED, EXPIRED, LOST, SALE, TRANSFER_OUT
    const isNegative = ['DAMAGED', 'EXPIRED', 'LOST', 'TRANSFER_OUT'].includes(adjustType);
    const finalDelta = isNegative ? -Math.abs(adjustQty) : Math.abs(adjustQty);

    onUpdateStock(adjustProductId, adjustBranchId, finalDelta, adjustType, adjustNotes);
    setShowAdjustModal(false);
  };

  // Filtered inventory
  const filteredInventory = inventory.filter((inv) => {
    const matchesBranch = selectedBranchId === 'ALL' || inv.branchId === selectedBranchId;
    const prod = products.find((p) => p.id === inv.productId);
    const searchLower = (searchTerm || '').toLowerCase();
    const matchesSearch =
      (prod?.name || '').toLowerCase().includes(searchLower) ||
      (prod?.sku || '').toLowerCase().includes(searchLower);
    return matchesBranch && matchesSearch;
  });

  // Filtered movements
  const filteredMovements = movements.filter((m) => {
    const matchesBranch = selectedBranchId === 'ALL' || m.branchId === selectedBranchId;
    return matchesBranch;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Boxes className="w-6 h-6 text-emerald-600" />
            <h1 className="text-lg font-bold text-slate-900">Branch Stock & Inventory Control</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Track multi-branch stock levels, record stock received, log damaged/expired items, and view audit history.
          </p>
        </div>

        {canManage && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleOpenAdjust(undefined, undefined, 'DAMAGED')}
              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 flex items-center gap-1.5 transition-colors"
            >
              <AlertTriangle className="w-4 h-4" /> Log Damaged / Expired Stock
            </button>
            <button
              onClick={() => handleOpenAdjust(undefined, undefined, 'PURCHASE')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-900/30 flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4 text-amber-300" /> Receive / Add Stock
            </button>
          </div>
        )}
      </div>

      {/* Navigation Tabs & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('STOCK')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              activeTab === 'STOCK'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Current Stock Levels
          </button>
          <button
            onClick={() => setActiveTab('LOGS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              activeTab === 'LOGS'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Stock Movement History ({movements.length})
          </button>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Branch Filter */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs w-full md:w-auto">
            <Building2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
            >
              <option value="ALL">🌐 All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  📍 {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search stock..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Tab 1: Current Stock Table */}
      {activeTab === 'STOCK' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px]">
                <tr>
                  <th className="p-4">Product Name</th>
                  <th className="p-4">SKU / Code</th>
                  <th className="p-4">Branch Location</th>
                  <th className="p-4">Current Stock</th>
                  <th className="p-4">Reorder Min</th>
                  <th className="p-4">Health Status</th>
                  <th className="p-4">Last Updated</th>
                  {canManage && <th className="p-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInventory.map((inv) => {
                  const prod = products.find((p) => p.id === inv.productId);
                  const branch = branches.find((b) => b.id === inv.branchId);
                  const isZero = inv.quantity === 0;
                  const isLow = inv.quantity > 0 && inv.quantity <= inv.reorderLevel;

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={prod?.imageUrl}
                            alt={prod?.name}
                            className="w-9 h-9 rounded-xl object-cover ring-1 ring-slate-200 shrink-0"
                          />
                          <div>
                            <p className="font-bold text-slate-900">{prod?.name || 'Unknown'}</p>
                            <p className="text-[10px] text-amber-700 font-semibold">{prod?.seedVariety}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-mono font-bold text-slate-800">{prod?.sku}</td>
                      <td className="p-4 font-medium text-slate-700">{branch?.name}</td>
                      <td className="p-4 font-extrabold text-slate-900 text-sm">{inv.quantity} {prod?.unit}</td>
                      <td className="p-4 text-slate-500 font-medium">{inv.reorderLevel} {prod?.unit}</td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                            isZero
                              ? 'bg-rose-100 text-rose-700'
                              : isLow
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isZero ? 'OUT OF STOCK' : isLow ? 'LOW STOCK' : 'HEALTHY'}
                        </span>
                      </td>
                      <td className="p-4 text-slate-400">{inv.lastUpdated}</td>
                      {canManage && (
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleOpenAdjust(inv.productId, inv.branchId, 'PURCHASE')}
                            className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] rounded-lg"
                          >
                            Adjust Stock
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Stock Movement Logs */}
      {activeTab === 'LOGS' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px]">
                <tr>
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">Product</th>
                  <th className="p-4">Branch</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Qty Delta</th>
                  <th className="p-4">New Stock Level</th>
                  <th className="p-4">Responsible Staff</th>
                  <th className="p-4">Notes / Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMovements.map((m) => {
                  const isPositive = m.quantityDelta > 0;
                  return (
                    <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-mono text-slate-500">{m.date}</td>
                      <td className="p-4 font-bold text-slate-900">{m.productName}</td>
                      <td className="p-4 text-slate-700">{m.branchName}</td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                          {m.type}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`font-extrabold flex items-center gap-0.5 ${
                            isPositive ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {isPositive ? '+' : ''}
                          {m.quantityDelta}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-slate-800">{m.newQty}</td>
                      <td className="p-4 text-slate-600 font-medium">{m.userName}</td>
                      <td className="p-4 text-slate-500 italic">{m.notes || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stock Adjustment / Receiving / Damaged Log Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Boxes className="w-5 h-5 text-emerald-600" /> Stock Movement & Adjustment
              </h3>
              <button onClick={() => setShowAdjustModal(false)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Product *</label>
                <select
                  value={adjustProductId}
                  onChange={(e) => setAdjustProductId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold focus:outline-none"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Branch Location *</label>
                <select
                  value={adjustBranchId}
                  onChange={(e) => setAdjustBranchId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      📍 {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Movement Action Type *</label>
                <select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value as StockMovementType)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold focus:outline-none"
                >
                  <option value="PURCHASE">➕ Receive New Stock (Purchase)</option>
                  <option value="ADJUSTMENT">🔄 Manual Stock Adjustment (+)</option>
                  <option value="DAMAGED">⚠️ Damaged Stock (-)</option>
                  <option value="EXPIRED">⏳ Expired Seed / Product (-)</option>
                  <option value="LOST">❌ Lost / Missing Stock (-)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Quantity *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mandatory Reason / Notes</label>
                <textarea
                  required={['DAMAGED', 'EXPIRED', 'LOST', 'ADJUSTMENT'].includes(adjustType)}
                  rows={2}
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  placeholder="Explain reason for adjustment or supplier waybill reference..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-xs"
                >
                  Confirm Stock Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
