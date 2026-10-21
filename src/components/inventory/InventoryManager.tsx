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
  ArrowDownRight,
  Calculator,
  RefreshCw,
  WifiOff
} from 'lucide-react';
import {
  BranchInventory,
  Product,
  Branch,
  StockMovement,
  StockMovementType,
  User,
  AdjustmentReason,
  StockAdjustment
} from '../../types';

interface InventoryManagerProps {
  inventory: BranchInventory[];
  products: Product[];
  branches: Branch[];
  movements: StockMovement[];
  stockAdjustments?: StockAdjustment[];
  activeBranch: Branch | null;
  currentUser: User;
  onUpdateStock: (
    productId: string,
    branchId: string,
    delta: number,
    type: StockMovementType,
    notes?: string
  ) => void;
  onRecordStockAdjustment?: (adjustment: StockAdjustment) => void;
}

export const InventoryManager: React.FC<InventoryManagerProps> = ({
  inventory = [],
  products = [],
  branches = [],
  movements = [],
  stockAdjustments = [],
  activeBranch,
  currentUser,
  onUpdateStock,
  onRecordStockAdjustment
}) => {
  const [isOnline] = useState<boolean>(navigator.onLine);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(activeBranch?.id || 'ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'STOCK' | 'AUDIT' | 'LOGS'>('STOCK');
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>('ALL');

  // Adjust / Damaged Modal state
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustProductId, setAdjustProductId] = useState('');
  const [adjustBranchId, setAdjustBranchId] = useState(activeBranch?.id || branches[0]?.id || '');
  const [adjustType, setAdjustType] = useState<StockMovementType>('PURCHASE');
  const [adjustQty, setAdjustQty] = useState<number>(10);
  const [adjustNotes, setAdjustNotes] = useState('');

  // Physical Stock Audit Modal state
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditBranchId, setAuditBranchId] = useState(activeBranch?.id || branches[0]?.id || '');
  const [auditProductId, setAuditProductId] = useState(products[0]?.id || '');
  const [physicalQty, setPhysicalQty] = useState<number>(0);
  const [auditReason, setAuditReason] = useState<AdjustmentReason>('COUNTING_ERROR');
  const [auditNotes, setAuditNotes] = useState('');

  const canManage =
    currentUser.role === 'CEO' ||
    currentUser.role === 'INVENTORY_OFFICER' ||
    currentUser.role === 'BRANCH_MANAGER';

  // Get current system quantity for a product at a branch
  const getSystemStock = (bId: string, pId: string): number => {
    const item = inventory.find((i) => i.branchId === bId && i.productId === pId);
    return item ? item.quantity : 0;
  };

  const handleOpenAdjust = (prodId?: string, branchId?: string, type: StockMovementType = 'PURCHASE') => {
    setAdjustProductId(prodId || products[0]?.id || '');
    setAdjustBranchId(branchId || activeBranch?.id || branches[0]?.id || '');
    setAdjustType(type);
    setAdjustQty(10);
    setAdjustNotes('');
    setShowAdjustModal(true);
  };

  const handleOpenAudit = (prodId?: string, branchId?: string) => {
    const bId = branchId || activeBranch?.id || branches[0]?.id || '';
    const pId = prodId || products[0]?.id || '';
    const sysStock = getSystemStock(bId, pId);

    setAuditBranchId(bId);
    setAuditProductId(pId);
    setPhysicalQty(sysStock);
    setAuditReason('COUNTING_ERROR');
    setAuditNotes('');
    setShowAuditModal(true);
  };

  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustProductId || !adjustBranchId || adjustQty <= 0) return;

    const isNegative = ['DAMAGED', 'EXPIRED', 'LOST', 'TRANSFER_OUT', 'ADJUSTMENT_OUT'].includes(adjustType);
    const finalDelta = isNegative ? -Math.abs(adjustQty) : Math.abs(adjustQty);

    onUpdateStock(adjustProductId, adjustBranchId, finalDelta, adjustType, adjustNotes);
    setShowAdjustModal(false);
  };

  const handleSavePhysicalAudit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!auditProductId || !auditBranchId) return;

    const sysStock = getSystemStock(auditBranchId, auditProductId);
    const diff = physicalQty - sysStock;

    if (diff === 0) {
      alert('Physical count matches current system stock level. No adjustment needed.');
      setShowAuditModal(false);
      return;
    }

    const adjType: StockMovementType = diff > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT';
    const prod = products.find((p) => p.id === auditProductId);
    const branch = branches.find((b) => b.id === auditBranchId);

    const adjustmentRecord: StockAdjustment = {
      id: 'adj-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      adjustmentNo: `ADJ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      productId: auditProductId,
      productName: prod?.name || 'Agro Product',
      productSku: prod?.sku || 'SKU-000',
      branchId: auditBranchId,
      branchName: branch?.name || 'Branch',
      type: diff > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
      reason: auditReason,
      quantity: Math.abs(diff),
      systemQuantity: sysStock,
      physicalQuantity: physicalQty,
      notes: auditNotes || `Physical audit discrepancy: ${diff > 0 ? '+' : ''}${diff} units (${auditReason})`,
      createdByUserId: currentUser.id,
      createdByUserName: currentUser.name,
      createdAt: new Date().toISOString(),
      syncStatus: isOnline ? 'synced' : 'pending'
    };

    if (onRecordStockAdjustment) {
      onRecordStockAdjustment(adjustmentRecord);
    } else {
      onUpdateStock(auditProductId, auditBranchId, diff, adjType, adjustmentRecord.notes);
    }

    setShowAuditModal(false);
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
    const matchesType = movementTypeFilter === 'ALL' || m.type === movementTypeFilter;
    const searchLower = (searchTerm || '').toLowerCase();
    const matchesSearch =
      (m.productName || '').toLowerCase().includes(searchLower) ||
      (m.notes || '').toLowerCase().includes(searchLower) ||
      (m.userName || '').toLowerCase().includes(searchLower);
    return matchesBranch && matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Offline Alert */}
      {!isOnline && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center justify-between text-xs text-amber-900 shadow-xs">
          <div className="flex items-center gap-2.5 font-bold">
            <WifiOff className="w-4.5 h-4.5 text-amber-600 shrink-0" />
            <div>
              <span className="font-extrabold text-amber-950">Offline Inventory Control:</span> All stock movements, physical audits, and stock adjustments will be stored locally in IndexedDB and automatically synced when back online.
            </div>
          </div>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Boxes className="w-6 h-6 text-emerald-600" />
            <h1 className="text-lg font-bold text-slate-900">Branch Stock & Physical Inventory Control</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Multi-branch inventory levels, physical stock audit reconciliations, damaged stock logs, and stock movement trails.
          </p>
        </div>

        {canManage && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleOpenAudit()}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-xs rounded-xl border border-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Calculator className="w-4 h-4 text-emerald-700" /> Physical Stock Audit
            </button>
            <button
              onClick={() => handleOpenAdjust(undefined, undefined, 'DAMAGED')}
              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <AlertTriangle className="w-4 h-4" /> Log Damaged / Expired
            </button>
            <button
              onClick={() => handleOpenAdjust(undefined, undefined, 'PURCHASE')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-900/30 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-amber-300" /> Receive / Add Stock
            </button>
          </div>
        )}
      </div>

      {/* Navigation Tabs & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
          <button
            onClick={() => setActiveTab('STOCK')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors shrink-0 ${
              activeTab === 'STOCK'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Current Stock Levels
          </button>

          <button
            onClick={() => setActiveTab('AUDIT')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors shrink-0 ${
              activeTab === 'AUDIT'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Physical Stock Audit History ({stockAdjustments.length})
          </button>

          <button
            onClick={() => setActiveTab('LOGS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors shrink-0 ${
              activeTab === 'LOGS'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Stock Movement Trail ({movements.length})
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
                      <td className="p-4 font-extrabold text-slate-900 text-sm">
                        {inv.quantity} {prod?.unit}
                      </td>
                      <td className="p-4 text-slate-500 font-medium">
                        {inv.reorderLevel} {prod?.unit}
                      </td>
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
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenAudit(inv.productId, inv.branchId)}
                              title="Physical Stock Audit"
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] rounded-lg cursor-pointer"
                            >
                              Audit Count
                            </button>
                            <button
                              onClick={() => handleOpenAdjust(inv.productId, inv.branchId, 'PURCHASE')}
                              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] rounded-lg cursor-pointer"
                            >
                              Adjust
                            </button>
                          </div>
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

      {/* Tab 2: Physical Stock Audit History */}
      {activeTab === 'AUDIT' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Controlled Stock Adjustment & Reconciliations Audit Log</span>
            <button
              onClick={() => handleOpenAudit()}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1"
            >
              <Calculator className="w-3.5 h-3.5" /> Perform New Stock Audit
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px]">
                <tr>
                  <th className="p-4">Adjustment #</th>
                  <th className="p-4">Branch</th>
                  <th className="p-4">Product Name</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Reason</th>
                  <th className="p-4 text-right">System Qty</th>
                  <th className="p-4 text-right">Physical Count</th>
                  <th className="p-4 text-right">Diff / Delta</th>
                  <th className="p-4">Audited By</th>
                  <th className="p-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stockAdjustments.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400">
                      No stock audit adjustments logged yet.
                    </td>
                  </tr>
                ) : (
                  stockAdjustments.map((adj) => (
                    <tr key={adj.id} className="hover:bg-slate-50">
                      <td className="p-4 font-mono font-bold text-slate-900">{adj.adjustmentNo}</td>
                      <td className="p-4 text-slate-800 font-semibold">📍 {adj.branchName}</td>
                      <td className="p-4 font-bold text-slate-900">{adj.productName}</td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            adj.type === 'ADJUSTMENT_IN'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {adj.type}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-slate-700">{adj.reason}</td>
                      <td className="p-4 text-right text-slate-600">{adj.systemQuantity ?? '-'}</td>
                      <td className="p-4 text-right font-extrabold text-slate-900">{adj.physicalQuantity ?? '-'}</td>
                      <td className={`p-4 text-right font-black ${
                        adj.type === 'ADJUSTMENT_IN' ? 'text-emerald-700' : 'text-rose-700'
                      }`}>
                        {adj.type === 'ADJUSTMENT_IN' ? '+' : '-'}{adj.quantity}
                      </td>
                      <td className="p-4 text-slate-600">{adj.createdByUserName}</td>
                      <td className="p-4 text-slate-400 text-[11px]">{adj.createdAt.split('T')[0]}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Stock Movement Logs */}
      {activeTab === 'LOGS' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Movement Type Filter */}
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 text-xs">
            <span className="font-bold text-slate-700">Filter Stock Movement Type:</span>
            <select
              value={movementTypeFilter}
              onChange={(e) => setMovementTypeFilter(e.target.value)}
              className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Movement Types</option>
              <option value="TRANSFER_IN">TRANSFER IN</option>
              <option value="TRANSFER_OUT">TRANSFER OUT</option>
              <option value="ADJUSTMENT_IN">ADJUSTMENT IN</option>
              <option value="ADJUSTMENT_OUT">ADJUSTMENT OUT</option>
              <option value="PURCHASE">PURCHASE / RECEIVED</option>
              <option value="SALE">SALE DEDUCTION</option>
              <option value="DAMAGED">DAMAGED STOCK</option>
              <option value="EXPIRED">EXPIRED SEEDS</option>
              <option value="LOST">LOST STOCK</option>
              <option value="RETURN">RETURN REVERSAL</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px]">
                <tr>
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">Product</th>
                  <th className="p-4">Branch</th>
                  <th className="p-4">Movement Type</th>
                  <th className="p-4">Qty Delta</th>
                  <th className="p-4">New Stock Level</th>
                  <th className="p-4">Responsible Staff</th>
                  <th className="p-4">Notes / Reference</th>
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
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                          m.type.includes('TRANSFER')
                            ? 'bg-purple-100 text-purple-900'
                            : m.type.includes('ADJUSTMENT')
                            ? 'bg-blue-100 text-blue-900'
                            : isPositive
                            ? 'bg-emerald-100 text-emerald-900'
                            : 'bg-rose-100 text-rose-900'
                        }`}>
                          {m.type}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`font-extrabold flex items-center gap-0.5 ${
                            isPositive ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {isPositive ? '+' : ''}
                          {m.quantityDelta}
                        </span>
                      </td>
                      <td className="p-4 font-extrabold text-slate-800">{m.newQty}</td>
                      <td className="p-4 text-slate-600 font-medium">{m.userName}</td>
                      <td className="p-4 text-slate-500 italic">{m.notes || m.referenceNo || '-'}</td>
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
                  <option value="PURCHASE">➕ Receive New Stock (Supplier Purchase)</option>
                  <option value="ADJUSTMENT_IN">➕ Manual Stock Addition (Found / Extra)</option>
                  <option value="ADJUSTMENT_OUT">➖ Manual Stock Reduction</option>
                  <option value="DAMAGED">⚠️ Damaged Stock (-)</option>
                  <option value="EXPIRED">⏳ Expired Seed / Chemical (-)</option>
                  <option value="LOST">❌ Lost / Missing Stock (-)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Quantity Units *</label>
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
                  required={['DAMAGED', 'EXPIRED', 'LOST', 'ADJUSTMENT_OUT', 'ADJUSTMENT_IN'].includes(adjustType)}
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
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                >
                  Confirm Stock Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Physical Stock Audit Modal */}
      {showAuditModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-emerald-600" /> Physical Stock Audit & Reconciliation
              </h3>
              <button onClick={() => setShowAuditModal(false)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePhysicalAudit} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Branch Location *</label>
                <select
                  value={auditBranchId}
                  onChange={(e) => setAuditBranchId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold focus:outline-none"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      📍 {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Product to Audit *</label>
                <select
                  value={auditProductId}
                  onChange={(e) => {
                    setAuditProductId(e.target.value);
                    setPhysicalQty(getSystemStock(auditBranchId, e.target.value));
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold focus:outline-none"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>

              {/* Current System vs Physical Count Comparison */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-2 gap-3 text-center">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Current System Stock</span>
                  <span className="text-lg font-black text-slate-900">
                    {getSystemStock(auditBranchId, auditProductId)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Physical Count Diff</span>
                  <span className={`text-lg font-black ${
                    physicalQty - getSystemStock(auditBranchId, auditProductId) === 0
                      ? 'text-slate-700'
                      : physicalQty - getSystemStock(auditBranchId, auditProductId) > 0
                      ? 'text-emerald-700'
                      : 'text-rose-700'
                  }`}>
                    {physicalQty - getSystemStock(auditBranchId, auditProductId) > 0 ? '+' : ''}
                    {physicalQty - getSystemStock(auditBranchId, auditProductId)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Actual Physical Counted Quantity *</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={physicalQty}
                  onChange={(e) => setPhysicalQty(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-black text-base text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Audit Discrepancy Reason *</label>
                <select
                  value={auditReason}
                  onChange={(e) => setAuditReason(e.target.value as AdjustmentReason)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold focus:outline-none"
                >
                  <option value="COUNTING_ERROR">Counting Error / Discrepancy</option>
                  <option value="DAMAGED">Damaged Goods Found</option>
                  <option value="EXPIRED">Expired Product / Seeds</option>
                  <option value="LOST">Lost / Unaccounted Stock</option>
                  <option value="FOUND">Unrecorded Found Extra Stock</option>
                  <option value="OPENING_BALANCE">Opening Stock Adjustment</option>
                  <option value="OTHER">Other Reason</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Audit Notes / Explanation</label>
                <textarea
                  rows={2}
                  value={auditNotes}
                  onChange={(e) => setAuditNotes(e.target.value)}
                  placeholder="e.g. Verified during quarterly warehouse physical stock count..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAuditModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                >
                  Save Stock Audit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
