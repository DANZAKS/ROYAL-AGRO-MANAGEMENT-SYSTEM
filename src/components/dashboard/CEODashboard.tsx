import React from 'react';
import {
  Building2,
  TrendingUp,
  AlertTriangle,
  ArrowRightLeft,
  ChevronRight
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import {
  Branch,
  Sale,
  Product,
  BranchInventory,
  Customer,
  Expense,
  StockTransfer,
  AuditLog,
  DateFilterOption
} from '../../types';

interface CEODashboardProps {
  branches?: Branch[];
  sales?: Sale[];
  products?: Product[];
  inventory?: BranchInventory[];
  customers?: Customer[];
  expenses?: Expense[];
  transfers?: StockTransfer[];
  auditLogs?: AuditLog[];
  dateFilter?: DateFilterOption | string;
  onNavigate?: (tab: string) => void;
  onApproveTransfer?: (transferId: string) => void;
  onSelectBranch?: (branchId: string) => void;
}

export const CEODashboard: React.FC<CEODashboardProps> = ({
  branches = [],
  sales = [],
  products = [],
  inventory = [],
  customers = [],
  expenses = [],
  transfers = [],
  auditLogs = [],
  onNavigate = (_tab: string) => {},
  onApproveTransfer = (_id: string) => {},
  onSelectBranch
}) => {
  // Financial Calculations
  const completedSales = (sales || []).filter((s) => s.status === 'COMPLETED');
  const totalRevenue = completedSales.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
  const totalExpensesAmount = (expenses || []).reduce((acc, e) => acc + (e.amount || 0), 0);
  const netProfit = totalRevenue - totalExpensesAmount;

  // Inventory Stock Calculations
  const lowStockItems = (inventory || []).filter((i) => i.quantity > 0 && i.quantity <= i.reorderLevel);
  const outOfStockItems = (inventory || []).filter((i) => i.quantity === 0);

  // Branch Performance Data for Bar Chart
  const branchPerformanceData = (branches || []).map((branch) => {
    const branchSales = completedSales.filter((s) => s.branchId === branch.id);
    const revenue = branchSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
    const branchExpenses = (expenses || []).filter((e) => e.branchId === branch.id);
    const exp = branchExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    return {
      name: (branch.name || '').replace(' Branch', '').replace(' Central Hub', '').replace(' Main Depot', ''),
      Revenue: revenue,
      Expenses: exp,
      Profit: revenue - exp,
      SalesCount: branchSales.length
    };
  });

  // Sales Category Pie Chart Data
  const categorySalesMap: Record<string, number> = {};
  completedSales.forEach((sale) => {
    (sale.items || []).forEach((item) => {
      const prod = (products || []).find((p) => p.id === item.productId);
      const cat = prod?.category || 'OTHER';
      categorySalesMap[cat] = (categorySalesMap[cat] || 0) + (item.subtotal || 0);
    });
  });

  const categoryPieData = Object.keys(categorySalesMap).map((cat) => ({
    name: cat,
    value: categorySalesMap[cat]
  }));

  const COLORS = ['#7E9D73', '#E07A5F', '#3B82F6', '#8B5CF6', '#F59E0B', '#10B981'];

  // Monthly Revenue Trend Data
  const monthlyTrendData = [
    { month: 'Jan', Revenue: 4200000, Expenses: 1800000, Profit: 2400000 },
    { month: 'Feb', Revenue: 5100000, Expenses: 2100000, Profit: 3000000 },
    { month: 'Mar', Revenue: 6800000, Expenses: 2400000, Profit: 4400000 },
    { month: 'Apr', Revenue: 7200000, Expenses: 2900000, Profit: 4300000 },
    { month: 'May', Revenue: 8500000, Expenses: 3100000, Profit: 5400000 },
    { month: 'Jun', Revenue: 9100000, Expenses: 3300000, Profit: 5800000 },
    { month: 'Jul', Revenue: totalRevenue || 9800000, Expenses: totalExpensesAmount || 3500000, Profit: netProfit || 6300000 }
  ];

  const pendingTransfers = (transfers || []).filter((t) => t.status === 'PENDING');

  return (
    <div className="space-y-6">
      {/* CEO Executive Banner - Deep Forest Green */}
      <div className="p-6 rounded-2xl bg-[#1B3022] text-white shadow-md border border-white/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#7E9D73]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[#7E9D73] font-bold text-xs uppercase tracking-widest mb-1">
              <Building2 className="w-4 h-4 text-[#7E9D73]" /> Central Command Overview • Royal Agro
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Executive Enterprise Dashboard
            </h1>
            <p className="text-stone-300 text-xs sm:text-sm mt-1 max-w-2xl">
              Real-time multi-branch operational monitoring, seed inventory valuation, and financial analytics.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('REPORTS')}
              className="px-4 py-2 bg-[#7E9D73] hover:bg-[#6c8a62] text-[#1B3022] text-xs font-bold rounded-lg shadow-sm flex items-center gap-2 transition-all"
            >
              <TrendingUp className="w-4 h-4 text-[#1B3022]" />
              Detailed Financial Reports
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div className="p-2.5 bg-[#7E9D73]/10 rounded-lg text-[#7E9D73] font-bold">
              ₦
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
              +18.4%
            </span>
          </div>
          <p className="mt-4 text-stone-500 text-xs font-semibold uppercase tracking-wider">Total Revenue</p>
          <h3 className="text-2xl font-bold text-stone-800 tracking-tight mt-1">
            ₦{totalRevenue.toLocaleString()}
          </h3>
          <p className="text-[11px] text-stone-400 mt-2">
            Based on {completedSales.length} completed transactions
          </p>
        </div>

        {/* Total Expenses */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div className="p-2.5 bg-[#E07A5F]/10 rounded-lg text-[#E07A5F] font-bold">
              ₦
            </div>
            <span className="text-xs font-bold text-stone-600 bg-stone-100 px-2 py-1 rounded">
              Operational
            </span>
          </div>
          <p className="mt-4 text-stone-500 text-xs font-semibold uppercase tracking-wider">Total Expenses</p>
          <h3 className="text-2xl font-bold text-stone-800 tracking-tight mt-1">
            ₦{totalExpensesAmount.toLocaleString()}
          </h3>
          <p className="text-[11px] text-stone-400 mt-2">
            {(expenses || []).length} recorded expense vouchers
          </p>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div className="p-2.5 bg-amber-100 rounded-lg text-amber-700">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-1 rounded">
              Action Needed
            </span>
          </div>
          <p className="mt-4 text-stone-500 text-xs font-semibold uppercase tracking-wider">Low Stock Alerts</p>
          <h3 className="text-2xl font-bold text-stone-800 tracking-tight mt-1">
            {lowStockItems.length + outOfStockItems.length} Products
          </h3>
          <p className="text-[11px] text-stone-400 mt-2">
            {outOfStockItems.length} completely out of stock
          </p>
        </div>

        {/* Net Profit Highlight Card */}
        <div className="bg-[#1B3022] p-5 rounded-2xl text-white shadow-md border border-white/10">
          <div className="flex justify-between items-start">
            <div className="p-2 bg-white/10 rounded-lg text-[#7E9D73]">
              <TrendingUp className="w-5 h-5 text-[#7E9D73]" />
            </div>
            <span className="text-[10px] font-bold bg-[#7E9D73]/20 text-[#7E9D73] px-2 py-1 rounded">
              MARGIN {totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0}%
            </span>
          </div>
          <p className="mt-4 text-white/60 text-xs font-semibold uppercase tracking-wider">Net Profit</p>
          <h3 className="text-2xl font-bold tracking-tight text-white mt-1">
            ₦{netProfit.toLocaleString()}
          </h3>
          <div className="mt-3 h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-[#7E9D73] w-[75%] rounded-full" />
          </div>
        </div>
      </div>

      {/* Stock Alerts & Pending Approvals Strip */}
      {(lowStockItems.length > 0 || outOfStockItems.length > 0 || pendingTransfers.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Inventory Health Alert */}
          <div className="bg-amber-50/90 border border-amber-200 p-4 rounded-2xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                Inventory Reorder Thresholds Reached
              </h3>
              <p className="text-xs text-amber-800 mt-1">
                There are <strong className="font-bold">{lowStockItems.length} low-stock</strong> items and{' '}
                <strong className="font-bold">{outOfStockItems.length} out-of-stock</strong> items across company branches.
              </p>
              <button
                onClick={() => onNavigate('INVENTORY')}
                className="mt-2 text-xs font-bold text-amber-900 hover:underline flex items-center gap-1"
              >
                Manage Branch Stock <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Pending Transfer Approval Alert */}
          <div className="bg-stone-100 border border-stone-200 p-4 rounded-2xl flex items-start gap-3">
            <ArrowRightLeft className="w-5 h-5 text-[#1B3022] shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                Pending Stock Transfer Approval ({pendingTransfers.length})
              </h3>
              {pendingTransfers.length > 0 ? (
                <div className="mt-2 space-y-2">
                  {pendingTransfers.slice(0, 2).map((t) => (
                    <div key={t.id} className="flex items-center justify-between text-xs bg-white p-2.5 rounded-xl border border-stone-200">
                      <div>
                        <p className="font-bold text-stone-800">{t.productName} ({t.quantity} units)</p>
                        <p className="text-[10px] text-stone-500">{t.sourceBranchName} ➔ {t.destinationBranchName}</p>
                      </div>
                      <button
                        onClick={() => onApproveTransfer(t.id)}
                        className="px-3 py-1 bg-[#1B3022] hover:bg-[#2D4536] text-white rounded-lg text-[10px] font-bold transition-colors"
                      >
                        Approve
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-stone-600 mt-1">No pending stock transfer requests requiring CEO authorization.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue & Profit Trend Area Chart */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-stone-800">Revenue & Profit Performance</h3>
              <p className="text-xs text-stone-500">Consolidated financial growth trajectory</p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#7E9D73]/15 text-[#1B3022] border border-[#7E9D73]/30">
              YTD Performance
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7E9D73" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#7E9D73" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E07A5F" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#E07A5F" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EC" />
                <XAxis dataKey="month" stroke="#78716C" fontSize={11} />
                <YAxis stroke="#78716C" fontSize={11} tickFormatter={(v) => `₦${(v / 1000000).toFixed(1)}M`} />
                <Tooltip
                  formatter={(value: any) => [`₦${Number(value).toLocaleString()}`, '']}
                  contentStyle={{ borderRadius: '12px', borderColor: '#E7E5E4', backgroundColor: '#FFFFFF' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Area type="monotone" dataKey="Revenue" stroke="#7E9D73" fillOpacity={1} fill="url(#colorRevenue)" />
                <Area type="monotone" dataKey="Expenses" stroke="#E07A5F" fillOpacity={1} fill="url(#colorExpenses)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sales by Category Pie Chart */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-stone-800">Sales by Product Category</h3>
              <p className="text-xs text-stone-500">Seed & agro input distribution</p>
            </div>
          </div>

          <div className="h-60 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryPieData.length > 0 ? categoryPieData : [{ name: 'Seeds', value: 100 }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => [`₦${Number(v).toLocaleString()}`, 'Sales']} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Custom Legend */}
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            {categoryPieData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="truncate text-stone-600 font-medium">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Branch Performance Comparison Bar Chart */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-stone-800">Branch Performance Comparison</h3>
            <p className="text-xs text-stone-500">Side-by-side branch sales and profitability</p>
          </div>
          <button
            onClick={() => onNavigate('BRANCHES')}
            className="text-xs font-bold text-[#7E9D73] hover:underline flex items-center gap-1"
          >
            Branch Hub <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={branchPerformanceData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EC" />
              <XAxis dataKey="name" stroke="#78716C" fontSize={11} />
              <YAxis stroke="#78716C" fontSize={11} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value: any) => [`₦${Number(value).toLocaleString()}`, '']} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Bar dataKey="Revenue" fill="#7E9D73" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Expenses" fill="#E07A5F" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Profit" fill="#1B3022" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Live Sales Transactions Table & Audit Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Sales Stream */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-5 border-b border-stone-100 flex justify-between items-center">
            <h4 className="font-bold text-stone-800">Live Transaction Stream</h4>
            <button
              onClick={() => onNavigate('POS')}
              className="text-xs font-bold text-[#7E9D73] hover:underline uppercase"
            >
              Open POS Terminal
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-stone-50">
                <tr className="text-[10px] uppercase text-stone-500 font-bold tracking-widest">
                  <th className="px-6 py-3">Receipt / Branch</th>
                  <th className="px-6 py-3">Customer</th>
                  <th className="px-6 py-3 text-right">Amount</th>
                  <th className="px-6 py-3 text-center">Payment</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-stone-100">
                {(sales || []).slice(0, 5).map((sale) => (
                  <tr key={sale.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-stone-800">{sale.receiptNo}</div>
                      <div className="text-[10px] text-stone-400">{sale.branchName}</div>
                    </td>
                    <td className="px-6 py-4 font-medium text-stone-700">{sale.customerName}</td>
                    <td className="px-6 py-4 text-right font-bold text-stone-800 tracking-tight">
                      ₦{(sale.totalAmount || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-2 py-1 bg-emerald-50 text-emerald-800 text-[10px] font-bold rounded-full uppercase">
                        {sale.paymentMethod}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Operational Alerts / System Audit Trail */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-5 border-b border-stone-100 flex items-center justify-between">
            <h4 className="font-bold text-stone-800">Operational Log Feed</h4>
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          </div>
          <div className="p-5 space-y-3">
            {(auditLogs || []).slice(0, 4).map((log) => (
              <div key={log.id} className="flex gap-3">
                <div className="w-1 bg-[#7E9D73] rounded-full shrink-0" />
                <div>
                  <p className="text-xs font-bold text-stone-800 uppercase tracking-tight">
                    {log.action}
                  </p>
                  <p className="text-xs text-stone-600 mt-0.5">{log.details || log.description}</p>
                  <p className="text-[10px] text-stone-400 mt-1 italic">{log.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-auto p-4 border-t border-stone-100">
            <div className="bg-[#F9FAF7] p-3 rounded-xl border border-[#7E9D73]/20">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-[#7E9D73] uppercase tracking-wider">System Status</span>
                <span className="text-[10px] font-semibold text-emerald-700">Online</span>
              </div>
              <p className="text-[11px] text-stone-600 leading-tight italic">
                All branches are currently syncing real-time sales and inventory data.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
