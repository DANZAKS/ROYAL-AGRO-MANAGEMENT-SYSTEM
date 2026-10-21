import React, { useState } from 'react';
import {
  Building2,
  TrendingUp,
  AlertTriangle,
  ArrowRightLeft,
  ChevronRight,
  DollarSign,
  Calendar,
  Filter,
  Package,
  Clock,
  Layers,
  ShoppingBag,
  CreditCard,
  Truck,
  RotateCcw,
  ShieldCheck,
  AlertCircle,
  WifiOff,
  Flame,
  Turtle,
  BarChart2,
  PieChart as PieChartIcon
} from 'lucide-react';
import { SvgAreaChart, SvgDonutChart, SvgGroupedBarChart } from '../common/SimpleCharts';
import {
  Branch,
  Sale,
  Product,
  BranchInventory,
  Customer,
  Expense,
  StockTransfer,
  AuditLog,
  DateFilterOption,
  NotificationItem,
  SalesReturn,
  CustomerCredit,
  CreditPayment,
  PurchaseOrder,
  SupplierPayment,
  StockMovement,
  Supplier,
  User
} from '../../types';
import { DashboardAlertsBanner } from '../notifications/DashboardAlertsBanner';
import {
  getSalesSummary,
  getProfitAndLossSummary,
  getExpenseSummary,
  getCreditSummary,
  getReturnSummary,
  getStockSummary,
  getProductVelocitySummary,
  getExpiryRiskSummary,
  getSupplierPayablesSummary,
  getBranchComparisonSummary
} from '../../services/reportingService';

interface CEODashboardProps {
  branches?: Branch[];
  sales?: Sale[];
  products?: Product[];
  inventory?: BranchInventory[];
  customers?: Customer[];
  expenses?: Expense[];
  transfers?: StockTransfer[];
  auditLogs?: AuditLog[];
  notifications?: NotificationItem[];
  dateFilter?: DateFilterOption | string;
  onNavigate?: (tab: string, payload?: any) => void;
  onApproveTransfer?: (transferId: string) => void;
  onSelectBranch?: (branchId: string) => void;
  onOpenNotificationCenter?: () => void;
  onResolveNotification?: (id: string) => void;
  // Module 14/15 additional entities
  salesReturns?: SalesReturn[];
  credits?: CustomerCredit[];
  creditPayments?: CreditPayment[];
  purchaseOrders?: PurchaseOrder[];
  supplierPayments?: SupplierPayment[];
  stockMovements?: StockMovement[];
  suppliers?: Supplier[];
  currentUser?: User;
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
  notifications = [],
  salesReturns = [],
  credits = [],
  creditPayments = [],
  purchaseOrders = [],
  supplierPayments = [],
  stockMovements = [],
  suppliers = [],
  currentUser,
  onNavigate = (_tab: string, _payload?: any) => {},
  onApproveTransfer = (_id: string) => {},
  onSelectBranch,
  onOpenNotificationCenter,
  onResolveNotification
}) => {
  // Local Filter State
  const [selectedDateRange, setSelectedDateRange] = useState<DateFilterOption>('THIS_MONTH');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [productVelocityTab, setProductVelocityTab] = useState<'FAST' | 'SLOW'>('FAST');

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  // Filter products by category if specified
  const filteredProducts =
    selectedCategory === 'ALL' ? products : products.filter((p) => p.category === selectedCategory);

  // Compute Core Metrics using reportingService
  const pnl = getProfitAndLossSummary(
    sales,
    salesReturns,
    expenses,
    filteredProducts,
    creditPayments,
    selectedBranchId,
    selectedDateRange,
    customStartDate,
    customEndDate
  );

  const salesSummary = getSalesSummary(
    sales,
    salesReturns,
    selectedBranchId,
    selectedDateRange,
    customStartDate,
    customEndDate
  );

  const creditSummary = getCreditSummary(
    credits,
    creditPayments,
    salesReturns,
    selectedBranchId,
    selectedDateRange
  );

  const returnSummary = getReturnSummary(salesReturns, selectedBranchId, selectedDateRange);
  const stockSummary = getStockSummary(inventory, filteredProducts, stockMovements, selectedBranchId);

  const supplierPayables = getSupplierPayablesSummary(
    purchaseOrders,
    supplierPayments,
    suppliers,
    selectedBranchId,
    selectedDateRange
  );

  const velocityItems = getProductVelocitySummary(
    sales,
    filteredProducts,
    inventory,
    selectedBranchId,
    selectedDateRange
  );

  const expiryRisks = getExpiryRiskSummary(inventory, filteredProducts, branches, selectedBranchId);

  // Branch Comparison (Excluding Transfers from Sales Revenue!)
  const branchComparison = getBranchComparisonSummary(
    branches,
    sales,
    expenses,
    salesReturns,
    credits,
    inventory,
    products,
    selectedDateRange,
    customStartDate,
    customEndDate
  );

  // Quick period sales for instant reference
  const todaySalesSummary = getSalesSummary(sales, salesReturns, selectedBranchId, 'TODAY');
  const thisWeekSalesSummary = getSalesSummary(sales, salesReturns, selectedBranchId, 'THIS_WEEK');
  const thisMonthSalesSummary = getSalesSummary(sales, salesReturns, selectedBranchId, 'THIS_MONTH');

  // Chart Data Preparation
  // Branch comparison chart
  const branchBarChartData = branchComparison.map((b) => ({
    name: b.branchName.replace(' Branch', '').replace(' Central Hub', '').replace(' Main Depot', ''),
    Revenue: b.netSales,
    Expenses: b.expenses,
    Profit: b.netProfit
  }));

  // Category Pie/Donut Data
  const categorySalesMap: Record<string, number> = {};
  const completedSales = sales.filter(
    (s) => s.status === 'COMPLETED' && (selectedBranchId === 'ALL' || s.branchId === selectedBranchId)
  );
  completedSales.forEach((s) => {
    (s.items || []).forEach((item) => {
      const prod = products.find((p) => p.id === item.productId);
      const cat = prod?.category || 'OTHER';
      if (selectedCategory === 'ALL' || cat === selectedCategory) {
        categorySalesMap[cat] = (categorySalesMap[cat] || 0) + (item.subtotal || 0);
      }
    });
  });

  const categoryPieData = Object.keys(categorySalesMap).map((cat) => ({
    name: cat,
    value: categorySalesMap[cat]
  }));

  // Trend Data for Area Chart
  const monthlyTrendData = [
    { month: 'Jan', Revenue: 4200000, Expenses: 1800000, Profit: 2400000 },
    { month: 'Feb', Revenue: 5100000, Expenses: 2100000, Profit: 3000000 },
    { month: 'Mar', Revenue: 6800000, Expenses: 2400000, Profit: 4400000 },
    { month: 'Apr', Revenue: 7200000, Expenses: 2900000, Profit: 4300000 },
    { month: 'May', Revenue: 8500000, Expenses: 3100000, Profit: 5400000 },
    { month: 'Jun', Revenue: 9100000, Expenses: 3300000, Profit: 5800000 },
    {
      month: 'Jul (Active)',
      Revenue: pnl.netSalesRevenue || 9800000,
      Expenses: pnl.operatingExpenses || 3500000,
      Profit: pnl.netProfit || 6300000
    }
  ];

  // Velocity sorting
  const fastMovingProducts = [...velocityItems]
    .filter((v) => v.unitsSold > 0)
    .sort((a, b) => b.unitsSold - a.unitsSold)
    .slice(0, 5);

  const slowMovingProducts = [...velocityItems]
    .filter((v) => v.currentStock > 0 && v.unitsSold <= 5)
    .sort((a, b) => a.unitsSold - b.unitsSold || b.currentStock - a.currentStock)
    .slice(0, 5);

  // Expired and Expiring counts
  const expiredCount = expiryRisks.filter((r) => r.status === 'EXPIRED').length;
  const soonExpiringCount = expiryRisks.filter((r) => r.status === 'EXPIRING_30_DAYS').length;

  // Pending transfers
  const pendingTransfers = transfers.filter((t) => t.status === 'PENDING');

  // Categories list
  const uniqueCategories = Array.from(new Set(products.map((p) => p.category))).filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Offline Status Warning */}
      {!isOnline && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between text-xs text-amber-900 shadow-xs">
          <div className="flex items-center gap-2.5 font-bold">
            <WifiOff className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-extrabold text-amber-950">Offline Local Snapshot:</span> Figures are compiled from
              locally stored records on this machine. They do not represent real-time cloud consensus until
              synchronized.
            </div>
          </div>
          <button
            onClick={() => onNavigate('SYNC_CENTER')}
            className="px-3 py-1 bg-amber-200 hover:bg-amber-300 text-amber-900 font-bold rounded-lg text-[11px] transition-colors"
          >
            Open Sync Center
          </button>
        </div>
      )}

      {/* CEO Executive Banner - Deep Forest Green */}
      <div className="p-6 rounded-2xl bg-[#1B3022] text-white shadow-md border border-white/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#7E9D73]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[#7E9D73] font-bold text-xs uppercase tracking-widest mb-1">
              <Building2 className="w-4 h-4 text-[#7E9D73]" /> Royal Agro Command Center • Executive Intelligence
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              CEO Executive Analytics & Control
            </h1>
            <p className="text-stone-300 text-xs sm:text-sm mt-1 max-w-2xl">
              Real-time multi-branch revenue tracking, seed inventory valuation, gross/net margins, and credit risk
              auditing.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => onNavigate('REPORTS')}
              className="px-4 py-2 bg-[#7E9D73] hover:bg-[#6c8a62] text-[#1B3022] text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <TrendingUp className="w-4 h-4 text-[#1B3022]" />
              Detailed Analytical Reports
            </button>
            <button
              onClick={() => onNavigate('BACKUP_RECOVERY')}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/15 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-[#7E9D73]" />
              Data Disaster Center
            </button>
          </div>
        </div>
      </div>

      {/* Global Interactive Executive Filters Bar */}
      <div className="bg-white p-4.5 rounded-2xl border border-stone-200/90 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 font-bold text-stone-700">
            <Filter className="w-4 h-4 text-[#7E9D73]" />
            <span>Executive Dashboard Filters:</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Branch Selector */}
            <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 px-3 py-1.5 rounded-xl">
              <Building2 className="w-3.5 h-3.5 text-stone-500" />
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="bg-transparent font-bold text-stone-800 focus:outline-none cursor-pointer text-xs"
              >
                <option value="ALL">🌐 All Branches Consolidated</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    📍 {b.name} ({b.state})
                  </option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 px-3 py-1.5 rounded-xl">
              <Layers className="w-3.5 h-3.5 text-stone-500" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-transparent font-bold text-stone-800 focus:outline-none cursor-pointer text-xs"
              >
                <option value="ALL">📦 All Product Categories</option>
                {uniqueCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Selector */}
            <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 px-3 py-1.5 rounded-xl">
              <Calendar className="w-3.5 h-3.5 text-stone-500" />
              <select
                value={selectedDateRange}
                onChange={(e) => setSelectedDateRange(e.target.value as DateFilterOption)}
                className="bg-transparent font-bold text-stone-800 focus:outline-none cursor-pointer text-xs"
              >
                <option value="TODAY">📅 Today Only</option>
                <option value="THIS_WEEK">📅 This Week</option>
                <option value="THIS_MONTH">📅 This Month</option>
                <option value="THIS_YEAR">📅 This Year</option>
                <option value="ALL">📅 All Historic Data</option>
                <option value="CUSTOM">📅 Custom Date Range</option>
              </select>
            </div>

            {/* Custom Dates Inputs */}
            {selectedDateRange === 'CUSTOM' && (
              <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 px-2 py-1 rounded-xl">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-transparent text-xs text-stone-700 focus:outline-none"
                />
                <span className="text-stone-400 font-bold">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-transparent text-xs text-stone-700 focus:outline-none"
                />
              </div>
            )}
          </div>
        </div>

        {/* Quick Period Comparison Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-stone-100 text-center">
          <div className="p-2 bg-stone-50/80 rounded-xl">
            <span className="text-[10px] uppercase font-bold text-stone-400">Today Sales</span>
            <p className="text-xs font-extrabold text-stone-800 mt-0.5">
              ₦{todaySalesSummary.grossSales.toLocaleString()}
            </p>
            <span className="text-[10px] text-stone-500">{todaySalesSummary.completedSalesCount} orders</span>
          </div>

          <div className="p-2 bg-stone-50/80 rounded-xl">
            <span className="text-[10px] uppercase font-bold text-stone-400">This Week Sales</span>
            <p className="text-xs font-extrabold text-stone-800 mt-0.5">
              ₦{thisWeekSalesSummary.grossSales.toLocaleString()}
            </p>
            <span className="text-[10px] text-stone-500">{thisWeekSalesSummary.completedSalesCount} orders</span>
          </div>

          <div className="p-2 bg-stone-50/80 rounded-xl">
            <span className="text-[10px] uppercase font-bold text-stone-400">This Month Sales</span>
            <p className="text-xs font-extrabold text-stone-800 mt-0.5">
              ₦{thisMonthSalesSummary.grossSales.toLocaleString()}
            </p>
            <span className="text-[10px] text-stone-500">{thisMonthSalesSummary.completedSalesCount} orders</span>
          </div>

          <div className="p-2 bg-stone-50/80 rounded-xl">
            <span className="text-[10px] uppercase font-bold text-stone-400">Avg Order Value</span>
            <p className="text-xs font-extrabold text-[#7E9D73] mt-0.5">
              ₦{Math.round(salesSummary.averageSaleValue).toLocaleString()}
            </p>
            <span className="text-[10px] text-stone-500">In selected period</span>
          </div>
        </div>
      </div>

      {/* Real-time Enterprise Alerts Banner */}
      <DashboardAlertsBanner
        notifications={notifications}
        branchId="ALL"
        onNavigate={onNavigate}
        onOpenNotificationCenter={onOpenNotificationCenter}
        onResolveNotification={onResolveNotification}
      />

      {/* Primary Financial KPI Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Gross & Net Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="p-2.5 bg-[#7E9D73]/10 rounded-xl text-[#7E9D73] font-bold">₦</div>
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              {salesSummary.completedSalesCount} Completed Orders
            </span>
          </div>
          <div className="mt-4">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Net Sales Revenue</span>
            <h3 className="text-2xl font-extrabold text-stone-900 tracking-tight mt-0.5">
              ₦{pnl.netSalesRevenue.toLocaleString()}
            </h3>
            <div className="mt-2 text-[11px] text-stone-500 space-y-0.5">
              <div className="flex justify-between">
                <span>Gross Sales:</span>
                <span className="font-semibold text-stone-800">₦{pnl.grossSales.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-rose-600">
                <span>Returns Deducted:</span>
                <span className="font-semibold">-₦{pnl.salesReturns.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Cost of Goods Sold & Gross Profit */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="p-2.5 bg-blue-50 rounded-xl text-blue-700 font-bold">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-[10px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
              {pnl.grossMarginPct.toFixed(1)}% Gross Margin
            </span>
          </div>
          <div className="mt-4">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Gross Business Profit</span>
            <h3 className="text-2xl font-extrabold text-blue-900 tracking-tight mt-0.5">
              ₦{pnl.grossProfit.toLocaleString()}
            </h3>
            <div className="mt-2 text-[11px] text-stone-500 space-y-0.5">
              <div className="flex justify-between">
                <span>Cost of Goods (COGS):</span>
                <span className="font-semibold text-stone-800">₦{pnl.cogs.toLocaleString()}</span>
              </div>
              {pnl.itemsMissingCostCount > 0 && (
                <div className="text-[10px] text-amber-600 italic">
                  ⚠️ {pnl.itemsMissingCostCount} sale items have zero purchase cost registered.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Expenses & Net Profit */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-700 font-bold">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                pnl.netProfit >= 0
                  ? 'text-emerald-800 bg-emerald-50 border-emerald-200'
                  : 'text-rose-800 bg-rose-50 border-rose-200'
              }`}
            >
              {pnl.netMarginPct.toFixed(1)}% Net Margin
            </span>
          </div>
          <div className="mt-4">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Net Bottomline Profit</span>
            <h3
              className={`text-2xl font-extrabold tracking-tight mt-0.5 ${
                pnl.netProfit >= 0 ? 'text-emerald-800' : 'text-rose-600'
              }`}
            >
              ₦{pnl.netProfit.toLocaleString()}
            </h3>
            <div className="mt-2 text-[11px] text-stone-500 space-y-0.5">
              <div className="flex justify-between">
                <span>Operating Expenses:</span>
                <span className="font-semibold text-rose-700">-₦{pnl.operatingExpenses.toLocaleString()}</span>
              </div>
              <div className="text-[10px] text-stone-400">Formula: Gross Profit - Branch Expenses</div>
            </div>
          </div>
        </div>

        {/* Customer Receivables & Credit Debt */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="p-2.5 bg-amber-50 rounded-xl text-amber-700 font-bold">
              <CreditCard className="w-5 h-5 text-amber-600" />
            </div>
            {creditSummary.overdueCreditsCount > 0 ? (
              <span className="text-[10px] font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                {creditSummary.overdueCreditsCount} Overdue Debts
              </span>
            ) : (
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                Credit Healthy
              </span>
            )}
          </div>
          <div className="mt-4">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Outstanding Credit</span>
            <h3 className="text-2xl font-extrabold text-amber-900 tracking-tight mt-0.5">
              ₦{creditSummary.totalOutstandingBalance.toLocaleString()}
            </h3>
            <div className="mt-2 text-[11px] text-stone-500 space-y-0.5">
              <div className="flex justify-between">
                <span>Overdue Balance:</span>
                <span className="font-semibold text-rose-700">₦{creditSummary.overdueAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Active Debtors:</span>
                <span className="font-semibold text-stone-800">{creditSummary.activeCreditsCount} accounts</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Operational KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Seed Inventory Cost Valuation */}
        <div className="bg-white p-4.5 rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Inventory Value (Cost)</span>
            <Package className="w-4 h-4 text-emerald-700" />
          </div>
          <p className="text-xl font-extrabold text-stone-900 mt-1">
            ₦{stockSummary.totalInventoryCostValue.toLocaleString()}
          </p>
          <div className="flex items-center justify-between text-[11px] text-stone-500 mt-1">
            <span>Retail Value: ₦{stockSummary.totalInventoryRetailValue.toLocaleString()}</span>
            <span className="text-emerald-700 font-bold">{stockSummary.totalInventoryItems} units</span>
          </div>
        </div>

        {/* Low Stock & Expired Batches */}
        <div className="bg-white p-4.5 rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Stock Health & Alerts</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <p className="text-xl font-extrabold text-stone-900">{stockSummary.lowStockItemsCount}</p>
            <span className="text-xs font-bold text-amber-700">Low Stock</span>
            <span className="text-stone-300">•</span>
            <span className="text-xs font-bold text-rose-700">{stockSummary.outOfStockItemsCount} Out of Stock</span>
          </div>
          <div className="text-[11px] text-stone-500 mt-1 flex items-center justify-between">
            <span>Expired Batches: {expiredCount}</span>
            <span className="text-amber-700 font-semibold">{soonExpiringCount} expiring soon</span>
          </div>
        </div>

        {/* Supplier Payables & Procurement */}
        <div className="bg-white p-4.5 rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Supplier Payables</span>
            <Truck className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-xl font-extrabold text-indigo-950 mt-1">
            ₦{supplierPayables.totalOutstandingPayables.toLocaleString()}
          </p>
          <div className="flex items-center justify-between text-[11px] text-stone-500 mt-1">
            <span>Purchases: ₦{supplierPayables.totalPurchasesAmount.toLocaleString()}</span>
            <span className="text-indigo-700 font-bold">{supplierPayables.totalPurchaseOrdersCount} POs</span>
          </div>
        </div>

        {/* Cash Received vs Credit Sales */}
        <div className="bg-white p-4.5 rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Cash vs Credit Mix</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-extrabold text-emerald-800 mt-1">
            ₦{pnl.cashReceived.toLocaleString()}
          </p>
          <div className="flex items-center justify-between text-[11px] text-stone-500 mt-1">
            <span>Cash at Register</span>
            <span className="text-amber-800 font-bold">Credit: ₦{pnl.creditReceivablesIssued.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Module 15 Section 3: Branch Performance Comparison */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#7E9D73]" />
              <h3 className="text-base font-bold text-stone-900">Branch Performance & Comparative Analytics</h3>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Side-by-side branch comparison across revenue, gross margins, local expenses, bottomline profit, and stock
              shortages.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              <span>Transfers Excluded from Sales (Fair Benchmark)</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-500 uppercase font-semibold text-[10px] border-b border-stone-200">
              <tr>
                <th className="p-3">Branch & Location</th>
                <th className="p-3">Completed Orders</th>
                <th className="p-3">Net Sales (₦)</th>
                <th className="p-3">Gross Profit (₦)</th>
                <th className="p-3">Expenses (₦)</th>
                <th className="p-3">Net Profit (₦)</th>
                <th className="p-3">Credit Owed (₦)</th>
                <th className="p-3">Stock Value (₦)</th>
                <th className="p-3">Shortages</th>
                <th className="p-3 text-center">Executive Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {branchComparison.map((b) => (
                <tr key={b.branchId} className="hover:bg-stone-50/70 transition-colors">
                  <td className="p-3 font-bold text-stone-900">
                    <div>📍 {b.branchName}</div>
                    <span className="text-[10px] text-stone-400 font-normal">{b.state} State</span>
                  </td>
                  <td className="p-3 font-semibold text-stone-700">
                    {b.completedSalesCount}
                    <div className="text-[10px] text-stone-400">Avg ₦{Math.round(b.averageSaleValue).toLocaleString()}</div>
                  </td>
                  <td className="p-3 font-extrabold text-stone-900">₦{b.netSales.toLocaleString()}</td>
                  <td className="p-3 font-bold text-blue-800">
                    ₦{b.grossProfit.toLocaleString()}
                    <div className="text-[10px] text-blue-600 font-semibold">{b.grossMarginPct.toFixed(1)}% margin</div>
                  </td>
                  <td className="p-3 font-semibold text-rose-700">₦{b.expenses.toLocaleString()}</td>
                  <td className={`p-3 font-extrabold ${b.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    ₦{b.netProfit.toLocaleString()}
                    <div className="text-[10px] font-semibold">{b.netMarginPct.toFixed(1)}% net</div>
                  </td>
                  <td className="p-3 font-bold text-amber-700">₦{b.outstandingCredit.toLocaleString()}</td>
                  <td className="p-3 font-semibold text-stone-700">₦{b.inventoryCostValue.toLocaleString()}</td>
                  <td className="p-3">
                    {b.lowStockCount > 0 ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                        {b.lowStockCount} items
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-700 font-semibold">Optimal</span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <span
                      title={b.statusReason}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border inline-flex items-center gap-1 ${
                        b.performanceStatus === 'TOP_PERFORMER'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : b.performanceStatus === 'PROFITABLE'
                          ? 'bg-stone-100 text-stone-800 border-stone-200'
                          : 'bg-rose-50 text-rose-800 border-rose-300'
                      }`}
                    >
                      {b.performanceStatus === 'TOP_PERFORMER' && '🌟 Top Performer'}
                      {b.performanceStatus === 'PROFITABLE' && '✓ Profitable'}
                      {b.performanceStatus === 'ATTENTION_NEEDED' && '⚠️ Attention'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Visual Analytics Grid: Area Chart & Branch Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue vs Expenses vs Net Profit Trend Chart */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="font-bold text-stone-800 text-sm">Monthly Revenue vs Net Margin Trend</h4>
              <p className="text-xs text-stone-500">Gross revenue, branch expenses, and business net earnings</p>
            </div>
            <TrendingUp className="w-5 h-5 text-[#7E9D73]" />
          </div>
          <div className="h-68 w-full pt-2">
            <SvgAreaChart data={monthlyTrendData} height={260} />
          </div>
        </div>

        {/* Branch Comparative Bar Chart */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="font-bold text-stone-800 text-sm">Branch Revenue & Profit Comparison</h4>
              <p className="text-xs text-stone-500">Revenue, Operating Expenses & Net Margin per branch</p>
            </div>
            <BarChart2 className="w-5 h-5 text-[#7E9D73]" />
          </div>
          <div className="h-68 w-full pt-2">
            <SvgGroupedBarChart data={branchBarChartData} height={260} />
          </div>
        </div>
      </div>

      {/* Product Velocity & Seed Inventory Analytics (Fast vs Slow Moving) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product Sales Velocity Card */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-stone-800 text-sm">Product Sales Velocity & Movement</h4>
              <p className="text-xs text-stone-500">Identify top revenue generators vs slow capital tie-ups</p>
            </div>

            <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl">
              <button
                onClick={() => setProductVelocityTab('FAST')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  productVelocityTab === 'FAST'
                    ? 'bg-[#1B3022] text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                Best-Selling
              </button>
              <button
                onClick={() => setProductVelocityTab('SLOW')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  productVelocityTab === 'SLOW'
                    ? 'bg-[#1B3022] text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Turtle className="w-3.5 h-3.5 text-blue-400" />
                Slow-Moving
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-500 uppercase font-semibold text-[10px]">
                <tr>
                  <th className="p-3">Seed / Product</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Units Sold</th>
                  <th className="p-3">Revenue Generated (₦)</th>
                  <th className="p-3">Current Stock</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {(productVelocityTab === 'FAST' ? fastMovingProducts : slowMovingProducts).map((item) => (
                  <tr key={item.productId} className="hover:bg-stone-50">
                    <td className="p-3">
                      <div className="font-bold text-stone-900">{item.productName}</div>
                      <span className="text-[10px] text-stone-400 font-mono">{item.sku}</span>
                    </td>
                    <td className="p-3 text-stone-600 font-medium">{item.category}</td>
                    <td className="p-3 font-extrabold text-stone-800">{item.unitsSold} units</td>
                    <td className="p-3 font-bold text-emerald-800">₦{item.salesRevenue.toLocaleString()}</td>
                    <td className="p-3 font-semibold text-stone-700">{item.currentStock} in stock</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          item.status === 'FAST_MOVING'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : item.status === 'SLOW_MOVING'
                            ? 'bg-blue-50 text-blue-800 border border-blue-200'
                            : item.status === 'OUT_OF_STOCK'
                            ? 'bg-rose-50 text-rose-800 border border-rose-200'
                            : 'bg-stone-100 text-stone-700'
                        }`}
                      >
                        {item.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
                {(productVelocityTab === 'FAST' ? fastMovingProducts : slowMovingProducts).length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-stone-400 italic">
                      No products matching this velocity tier in the selected period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Category Sales Donut Breakdown */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="font-bold text-stone-800 text-sm">Category Sales Distribution</h4>
              <p className="text-xs text-stone-500">Seed types and agricultural chemical share</p>
            </div>
            <PieChartIcon className="w-5 h-5 text-[#7E9D73]" />
          </div>

          <div className="py-2">
            <SvgDonutChart data={categoryPieData} height={200} />
          </div>

          <div className="mt-2 space-y-1.5 pt-3 border-t border-stone-100 text-xs">
            {categoryPieData.map((cat, idx) => (
              <div key={idx} className="flex justify-between items-center text-stone-600">
                <span className="font-semibold text-stone-800">{cat.name}</span>
                <span className="font-extrabold text-stone-900">₦{cat.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Operational Feeds: Pending Stock Transfers & Audit Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Inter-Branch Stock Transfers (Authorizations) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
            <div>
              <h4 className="font-bold text-stone-800">Pending Inter-Branch Transfers</h4>
              <p className="text-xs text-stone-500">Internal redistribution requests awaiting CEO executive approval</p>
            </div>
            <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold">
              {pendingTransfers.length} Action Needed
            </span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-stone-50 text-stone-500 uppercase font-semibold text-[10px]">
                <tr>
                  <th className="px-6 py-3">Transfer Ref</th>
                  <th className="px-6 py-3">Source & Destination</th>
                  <th className="px-6 py-3">Seed Products</th>
                  <th className="px-6 py-3">Quantity</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {pendingTransfers.map((t) => {
                  const source = branches.find((b) => b.id === t.sourceBranchId);
                  const dest = branches.find((b) => b.id === t.destinationBranchId);
                  return (
                    <tr key={t.id} className="hover:bg-stone-50/80 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-stone-800">{t.transferNo}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-stone-700">
                          <span className="font-semibold">{source?.name || 'Hub'}</span>
                          <ArrowRightLeft className="w-3 h-3 text-stone-400" />
                          <span className="font-semibold text-emerald-800">{dest?.name || 'Branch'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-stone-800">
                        {(t.items || []).map((i) => i.productName).join(', ') || 'Mixed Seeds'}
                      </td>
                      <td className="px-6 py-4 font-bold text-stone-800">
                        {(t.items || []).reduce((sum, i) => sum + i.quantity, 0)} units
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => onApproveTransfer(t.id)}
                          className="px-3 py-1.5 bg-[#1B3022] hover:bg-[#284732] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                        >
                          Approve
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {pendingTransfers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-stone-400">
                      No pending inter-branch transfer requests requiring executive approval.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Operational Log Feed with Module 14 Backup Link */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-5 border-b border-stone-100 flex items-center justify-between">
            <h4 className="font-bold text-stone-800 text-sm">System Compliance Trail</h4>
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          </div>
          <div className="p-5 space-y-3 flex-1 overflow-y-auto max-h-72">
            {(auditLogs || []).slice(0, 5).map((log) => (
              <div key={log.id} className="flex gap-3">
                <div className="w-1 bg-[#7E9D73] rounded-full shrink-0" />
                <div>
                  <p className="text-xs font-bold text-stone-800 uppercase tracking-tight">{log.action}</p>
                  <p className="text-xs text-stone-600 mt-0.5">{log.details || log.description}</p>
                  <p className="text-[10px] text-stone-400 mt-0.5 italic">{log.timestamp}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-stone-100 bg-[#F9FAF7]">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#7E9D73] uppercase tracking-wider">Disaster Recovery</span>
                <span className="text-[10px] font-semibold text-emerald-700">Online & Ready</span>
              </div>
              <p className="text-[11px] text-stone-600 leading-tight">
                Enterprise automated snapshots and data integrity audits available in Module 14.
              </p>
              <button
                onClick={() => onNavigate('BACKUP_RECOVERY')}
                className="w-full mt-1 px-3 py-1.5 bg-[#1B3022] hover:bg-[#284732] text-white text-[11px] font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Backup, Restore & Integrity Center</span>
                <ChevronRight className="w-3.5 h-3.5 text-emerald-300" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
