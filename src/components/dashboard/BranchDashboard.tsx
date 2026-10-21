import React from 'react';
import {
  Building2,
  ShoppingCart,
  Boxes,
  AlertTriangle,
  ArrowRightLeft
} from 'lucide-react';
import {
  Branch,
  User,
  Sale,
  BranchInventory,
  Product,
  StockTransfer,
  Expense,
  NotificationItem
} from '../../types';
import { DashboardAlertsBanner } from '../notifications/DashboardAlertsBanner';

interface BranchDashboardProps {
  branch?: Branch | null;
  activeBranch?: Branch | null;
  currentUser?: User;
  sales?: Sale[];
  inventory?: BranchInventory[];
  products?: Product[];
  transfers?: StockTransfer[];
  expenses?: Expense[];
  notifications?: NotificationItem[];
  onNavigate?: (tab: string, payload?: any) => void;
  onOpenNotificationCenter?: () => void;
  onResolveNotification?: (id: string) => void;
}

export const BranchDashboard: React.FC<BranchDashboardProps> = ({
  branch,
  activeBranch,
  currentUser,
  sales = [],
  inventory = [],
  products = [],
  transfers = [],
  expenses = [],
  notifications = [],
  onNavigate = (_tab: string, _payload?: any) => {},
  onOpenNotificationCenter,
  onResolveNotification
}) => {
  const targetBranch = branch || activeBranch;

  if (!targetBranch) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-stone-200 shadow-sm">
        <Building2 className="w-12 h-12 text-[#7E9D73] mx-auto mb-3" />
        <h2 className="text-lg font-bold text-stone-800">No Branch Selected</h2>
        <p className="text-sm text-stone-500 mt-1 max-w-md mx-auto">
          Please select a branch from the header selector above to view local branch operations and statistics.
        </p>
      </div>
    );
  }

  const currentBranch = targetBranch;

  // Branch specific metrics
  const branchSales = (sales || []).filter((s) => s.branchId === currentBranch.id && s.status === 'COMPLETED');
  const todayDate = new Date().toISOString().split('T')[0];
  const todaySales = branchSales.filter((s) => s.date === todayDate);

  const todayRevenue = todaySales.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
  const totalRevenue = branchSales.reduce((acc, s) => acc + (s.totalAmount || 0), 0);

  const branchInventory = (inventory || []).filter((i) => i.branchId === currentBranch.id);
  const lowStock = branchInventory.filter((i) => i.quantity > 0 && i.quantity <= i.reorderLevel);
  const outOfStock = branchInventory.filter((i) => i.quantity === 0);

  const branchExpenses = (expenses || []).filter((e) => e.branchId === currentBranch.id);
  const totalExpenses = branchExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Branch Header Banner - Natural Tones Deep Green */}
      <div className="p-6 rounded-2xl bg-[#1B3022] text-white shadow-md border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#7E9D73] font-bold text-xs uppercase tracking-widest mb-1">
            <Building2 className="w-4 h-4 text-[#7E9D73]" /> {currentBranch.name} • {currentBranch.state} State Branch
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Branch Operations Portal
          </h1>
          <p className="text-stone-300 text-xs sm:text-sm mt-1">
            {currentUser && (
              <>Logged in as <strong className="font-semibold text-white">{currentUser.name}</strong> ({currentUser.role}). </>
            )}
            Manage point-of-sale, store stock, and local branch records.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {(!currentUser || currentUser.role === 'SALES_STAFF' || currentUser.role === 'SALES_CASHIER' || currentUser.role === 'BRANCH_MANAGER' || currentUser.role === 'CEO') && (
            <button
              onClick={() => onNavigate('POS')}
              className="px-4 py-2.5 bg-[#7E9D73] hover:bg-[#6c8a62] text-[#1B3022] text-xs font-bold rounded-lg shadow-sm flex items-center gap-2 transition-all"
            >
              <ShoppingCart className="w-4 h-4 text-[#1B3022]" />
              Open Point of Sale (POS)
            </button>
          )}

          {(!currentUser || currentUser.role === 'INVENTORY_OFFICER' || currentUser.role === 'BRANCH_MANAGER' || currentUser.role === 'CEO') && (
            <button
              onClick={() => onNavigate('INVENTORY')}
              className="px-4 py-2.5 bg-black/30 hover:bg-black/40 text-white text-xs font-bold rounded-lg border border-white/20 flex items-center gap-2 transition-all"
            >
              <Boxes className="w-4 h-4 text-[#7E9D73]" />
              Check Branch Inventory
            </button>
          )}
        </div>
      </div>

      {/* Real-time Branch Alerts Banner */}
      <DashboardAlertsBanner
        notifications={notifications}
        branchId={currentBranch.id}
        onNavigate={onNavigate}
        onOpenNotificationCenter={onOpenNotificationCenter}
        onResolveNotification={onResolveNotification}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Today's Sales */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Today's Sales</span>
            <div className="w-10 h-10 rounded-xl bg-[#7E9D73]/10 text-[#7E9D73] flex items-center justify-center font-bold">
              ₦
            </div>
          </div>
          <p className="text-2xl font-bold text-stone-800 tracking-tight mt-2">
            ₦{todayRevenue.toLocaleString()}
          </p>
          <p className="text-xs text-stone-500 mt-1">{todaySales.length} transactions completed today</p>
        </div>

        {/* Total Branch Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Branch Revenue</span>
            <div className="w-10 h-10 rounded-xl bg-[#7E9D73]/10 text-[#7E9D73] flex items-center justify-center font-bold">
              ₦
            </div>
          </div>
          <p className="text-2xl font-bold text-stone-800 tracking-tight mt-2">
            ₦{totalRevenue.toLocaleString()}
          </p>
          <p className="text-xs text-stone-500 mt-1">{branchSales.length} total completed sales</p>
        </div>

        {/* Inventory Stock Status */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Stock Health</span>
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-stone-800 tracking-tight mt-2">
            {branchInventory.length} Items
          </p>
          <p className="text-xs text-amber-700 font-semibold mt-1">
            {lowStock.length} Low Stock • {outOfStock.length} Out of Stock
          </p>
        </div>

        {/* Branch Expenses */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Branch Expenses</span>
            <div className="w-10 h-10 rounded-xl bg-[#E07A5F]/10 text-[#E07A5F] flex items-center justify-center font-bold">
              ₦
            </div>
          </div>
          <p className="text-2xl font-bold text-stone-800 tracking-tight mt-2">
            ₦{totalExpenses.toLocaleString()}
          </p>
          <p className="text-xs text-stone-500 mt-1">{branchExpenses.length} expense vouchers recorded</p>
        </div>
      </div>

      {/* Stock Alerts & Transfers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Branch Low Stock Alerts */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <div>
                <h3 className="text-sm font-bold text-stone-800">Branch Stock Alerts</h3>
                <p className="text-xs text-stone-500">Items needing reorder or replenishment</p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('TRANSFERS')}
              className="text-xs font-bold text-[#7E9D73] hover:underline"
            >
              Request Stock Transfer
            </button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
            {branchInventory
              .filter((i) => i.quantity <= i.reorderLevel)
              .map((inv) => {
                const prod = (products || []).find((p) => p.id === inv.productId);
                const isZero = inv.quantity === 0;
                return (
                  <div
                    key={inv.id}
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                      isZero ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200'
                    }`}
                  >
                    <div>
                      <p className="font-bold text-stone-800">{prod?.name || 'Unknown Product'}</p>
                      <p className="text-[10px] text-stone-500">
                        SKU: {prod?.sku} • Min Level: {inv.reorderLevel} units
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                        isZero ? 'bg-rose-600 text-white' : 'bg-amber-600 text-white'
                      }`}
                    >
                      {isZero ? 'OUT OF STOCK' : `${inv.quantity} UNITS LEFT`}
                    </span>
                  </div>
                );
              })}

            {branchInventory.filter((i) => i.quantity <= i.reorderLevel).length === 0 && (
              <p className="text-xs text-[#7E9D73] font-medium text-center py-6">
                ✅ All inventory levels at this branch are healthy!
              </p>
            )}
          </div>
        </div>

        {/* Recent Branch Transfers */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-[#1B3022]" />
              <div>
                <h3 className="text-sm font-bold text-stone-800">Inter-Branch Stock Transfers</h3>
                <p className="text-xs text-stone-500">Incoming & outgoing stock transfer status</p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('TRANSFERS')}
              className="text-xs font-bold text-[#7E9D73] hover:underline"
            >
              View All Transfers
            </button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
            {(transfers || [])
              .filter((t) => t.sourceBranchId === currentBranch.id || t.destinationBranchId === currentBranch.id)
              .map((transfer) => (
                <div key={transfer.id} className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs flex items-center justify-between">
                  <div>
                    <p className="font-bold text-stone-800">{transfer.productName} ({transfer.quantity} units)</p>
                    <p className="text-[10px] text-stone-500">
                      {transfer.sourceBranchName} ➔ {transfer.destinationBranchName}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#7E9D73]/15 text-[#1B3022]">
                    {transfer.status}
                  </span>
                </div>
              ))}

            {(transfers || []).filter((t) => t.sourceBranchId === currentBranch.id || t.destinationBranchId === currentBranch.id).length === 0 && (
              <p className="text-xs text-stone-400 text-center py-6">No stock transfers recorded for this branch yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Branch Sales Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm flex flex-col overflow-hidden">
        <div className="p-5 border-b border-stone-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-stone-800">Recent Branch Sales History</h3>
            <p className="text-xs text-stone-500">Latest completed sales from {currentBranch.name}</p>
          </div>
          <button
            onClick={() => onNavigate('POS')}
            className="text-xs font-bold text-[#7E9D73] hover:underline"
          >
            Go to POS Terminal
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-stone-50">
              <tr className="text-[10px] uppercase text-stone-500 font-bold tracking-widest">
                <th className="px-6 py-3">Receipt No</th>
                <th className="px-6 py-3">Customer</th>
                <th className="px-6 py-3">Staff</th>
                <th className="px-6 py-3">Items</th>
                <th className="px-6 py-3 text-right">Amount</th>
                <th className="px-6 py-3 text-center">Payment</th>
                <th className="px-6 py-3 text-center">Sync Status</th>
                <th className="px-6 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-stone-100">
              {branchSales.slice(0, 5).map((sale) => (
                <tr key={sale.id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-stone-800">{sale.receiptNo}</td>
                  <td className="px-6 py-4 text-stone-700 font-medium">{sale.customerName}</td>
                  <td className="px-6 py-4 text-stone-600">{sale.staffName}</td>
                  <td className="px-6 py-4 text-stone-600">{(sale.items || []).length} product(s)</td>
                  <td className="px-6 py-4 text-right font-bold text-stone-800 tracking-tight">₦{(sale.totalAmount || 0).toLocaleString()}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="px-2 py-1 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 uppercase">
                      {sale.paymentMethod}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {sale.syncStatus === 'pending' ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        🔴 Offline Queue
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        ✓ Synced
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-stone-500">{sale.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
