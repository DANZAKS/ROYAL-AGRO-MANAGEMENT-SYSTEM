import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Download,
  Printer,
  Calendar,
  Building2,
  DollarSign,
  Boxes,
  Users,
  PieChart as PieChartIcon,
  WifiOff,
  Clock,
  RotateCcw,
  CreditCard,
  FileText,
  Search,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Truck,
  Package,
  Layers,
  ShoppingBag,
  ShieldCheck,
  AlertTriangle,
  Flame,
  Turtle,
  Wallet,
  CheckCircle2
} from 'lucide-react';
import {
  Sale,
  Expense,
  Branch,
  Product,
  BranchInventory,
  Customer,
  SalesReturn,
  CustomerCredit,
  CreditPayment,
  StockMovement,
  StockAdjustment,
  PurchaseOrder,
  SupplierPayment,
  Supplier,
  FinancialTransaction,
  CashSession,
  CashReconciliation,
  DateFilterOption,
  User
} from '../../types';
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
  getCashbookSummary,
  getBranchComparisonSummary
} from '../../services/reportingService';
import { getSyncMetadata } from '../../offline/syncManager';
import { getPendingOperations } from '../../offline/offlineQueue';

interface ReportsAnalyticsProps {
  sales?: Sale[];
  expenses?: Expense[];
  branches?: Branch[];
  products?: Product[];
  inventory?: BranchInventory[];
  customers?: Customer[];
  salesReturns?: SalesReturn[];
  credits?: CustomerCredit[];
  creditPayments?: CreditPayment[];
  stockMovements?: StockMovement[];
  stockAdjustments?: StockAdjustment[];
  purchaseOrders?: PurchaseOrder[];
  supplierPayments?: SupplierPayment[];
  suppliers?: Supplier[];
  financialTransactions?: FinancialTransaction[];
  cashSessions?: CashSession[];
  cashReconciliations?: CashReconciliation[];
  currentUser?: User;
}

type ReportTab = 'FINANCIAL' | 'SALES' | 'INVENTORY' | 'CREDIT' | 'SUPPLIERS' | 'EXPENSES' | 'CASHBOOK';

export const ReportsAnalytics: React.FC<ReportsAnalyticsProps> = ({
  sales = [],
  expenses = [],
  branches = [],
  products = [],
  inventory = [],
  customers = [],
  salesReturns = [],
  credits = [],
  creditPayments = [],
  stockMovements = [],
  stockAdjustments = [],
  purchaseOrders = [],
  supplierPayments = [],
  suppliers = [],
  financialTransactions = [],
  cashSessions = [],
  cashReconciliations = [],
  currentUser
}) => {
  const isCEO = currentUser?.role === 'CEO';
  const isBranchManager = currentUser?.role === 'BRANCH_MANAGER';
  const isSalesStaff = currentUser?.role === 'SALES_STAFF' || currentUser?.role === 'SALES_CASHIER';
  const isInventoryOfficer = currentUser?.role === 'INVENTORY_OFFICER';

  const canViewFinancial = isCEO || isBranchManager;
  const canViewSales = isCEO || isBranchManager || isSalesStaff;
  const canViewInventory = isCEO || isBranchManager || isInventoryOfficer;
  const canViewCredit = isCEO || isBranchManager || isSalesStaff;
  const canViewSuppliers = isCEO || isBranchManager || isInventoryOfficer;
  const canViewExpenses = isCEO || isBranchManager;
  const canViewCashbook = isCEO || isBranchManager;

  const defaultBranch = isBranchManager && currentUser?.branchId ? currentUser.branchId : (isSalesStaff || isInventoryOfficer) && currentUser?.branchId ? currentUser.branchId : 'ALL';
  const initialTab: ReportTab = isInventoryOfficer ? 'INVENTORY' : isSalesStaff ? 'SALES' : 'FINANCIAL';

  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [reportTab, setReportTab] = useState<ReportTab>(initialTab);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(defaultBranch);
  const [dateFilter, setDateFilter] = useState<DateFilterOption>('THIS_MONTH');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [pendingOpsCount, setPendingOpsCount] = useState<number>(0);

  // Search & Pagination & Sort State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(15);
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'ASC' | 'DESC'>('DESC');

  // Sub-tab selectors
  const [inventorySubTab, setInventorySubTab] = useState<'STOCK' | 'VELOCITY' | 'EXPIRY' | 'MOVEMENTS'>('STOCK');
  const [salesSubTab, setSalesSubTab] = useState<'ALL_SALES' | 'BY_STAFF' | 'BY_CATEGORY'>('ALL_SALES');
  const [creditSubTab, setCreditSubTab] = useState<'ACCOUNTS' | 'AGING' | 'REPAYMENTS'>('ACCOUNTS');

  // Monitor network & pending sync status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    getSyncMetadata().then((meta) => {
      if (meta?.lastSyncCompletedAt) {
        setLastSyncTime(new Date(meta.lastSyncCompletedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }
    });

    getPendingOperations().then((ops) => {
      setPendingOpsCount(ops.length);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Reset page when tab or filters change
  useEffect(() => {
    setCurrentPage(1);
    setSearchQuery('');
  }, [reportTab, selectedBranchId, dateFilter, inventorySubTab, salesSubTab, creditSubTab]);

  // Compute Core Summaries
  const pnl = useMemo(
    () =>
      getProfitAndLossSummary(
        sales,
        salesReturns,
        expenses,
        products,
        creditPayments,
        selectedBranchId,
        dateFilter,
        customStartDate,
        customEndDate
      ),
    [sales, salesReturns, expenses, products, creditPayments, selectedBranchId, dateFilter, customStartDate, customEndDate]
  );

  const salesSummary = useMemo(
    () => getSalesSummary(sales, salesReturns, selectedBranchId, dateFilter, customStartDate, customEndDate),
    [sales, salesReturns, selectedBranchId, dateFilter, customStartDate, customEndDate]
  );

  const expenseSummary = useMemo(
    () => getExpenseSummary(expenses, selectedBranchId, dateFilter, customStartDate, customEndDate),
    [expenses, selectedBranchId, dateFilter, customStartDate, customEndDate]
  );

  const creditSummary = useMemo(
    () => getCreditSummary(credits, creditPayments, salesReturns, selectedBranchId, dateFilter),
    [credits, creditPayments, salesReturns, selectedBranchId, dateFilter]
  );

  const returnSummary = useMemo(
    () => getReturnSummary(salesReturns, selectedBranchId, dateFilter),
    [salesReturns, selectedBranchId, dateFilter]
  );

  const stockSummary = useMemo(
    () => getStockSummary(inventory, products, stockMovements, selectedBranchId),
    [inventory, products, stockMovements, selectedBranchId]
  );

  const supplierPayables = useMemo(
    () => getSupplierPayablesSummary(purchaseOrders, supplierPayments, suppliers, selectedBranchId, dateFilter),
    [purchaseOrders, supplierPayments, suppliers, selectedBranchId, dateFilter]
  );

  const cashbookSummary = useMemo(
    () => getCashbookSummary(financialTransactions, cashSessions, cashReconciliations, selectedBranchId, dateFilter),
    [financialTransactions, cashSessions, cashReconciliations, selectedBranchId, dateFilter]
  );

  const velocityItems = useMemo(
    () => getProductVelocitySummary(sales, products, inventory, selectedBranchId, dateFilter),
    [sales, products, inventory, selectedBranchId, dateFilter]
  );

  const expiryRisks = useMemo(
    () => getExpiryRiskSummary(inventory, products, branches, selectedBranchId),
    [inventory, products, branches, selectedBranchId]
  );

  const branchComparison = useMemo(
    () =>
      getBranchComparisonSummary(
        branches,
        sales,
        expenses,
        salesReturns,
        credits,
        inventory,
        products,
        dateFilter,
        customStartDate,
        customEndDate
      ),
    [branches, sales, expenses, salesReturns, credits, inventory, products, dateFilter, customStartDate, customEndDate]
  );

  // Sales by staff aggregation
  const salesByStaff = useMemo(() => {
    const staffMap: Record<string, { staffName: string; branchName: string; count: number; totalAmount: number }> = {};
    const filteredSales = sales.filter(
      (s) => s.status === 'COMPLETED' && (selectedBranchId === 'ALL' || s.branchId === selectedBranchId)
    );

    filteredSales.forEach((s) => {
      const staff = s.staffName || 'Staff Member';
      if (!staffMap[staff]) {
        staffMap[staff] = {
          staffName: staff,
          branchName: s.branchName,
          count: 0,
          totalAmount: 0
        };
      }
      staffMap[staff].count += 1;
      staffMap[staff].totalAmount += s.totalAmount || 0;
    });

    return Object.values(staffMap).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [sales, selectedBranchId]);

  // Sales by Category aggregation
  const salesByCategory = useMemo(() => {
    const catMap: Record<string, { category: string; unitsSold: number; revenue: number }> = {};
    const filteredSales = sales.filter(
      (s) => s.status === 'COMPLETED' && (selectedBranchId === 'ALL' || s.branchId === selectedBranchId)
    );

    filteredSales.forEach((s) => {
      (s.items || []).forEach((item) => {
        const prod = products.find((p) => p.id === item.productId || p.sku === item.sku);
        const cat = prod?.category || 'OTHER';
        if (!catMap[cat]) {
          catMap[cat] = { category: cat, unitsSold: 0, revenue: 0 };
        }
        catMap[cat].unitsSold += item.quantity || 0;
        catMap[cat].revenue += item.subtotal || 0;
      });
    });

    return Object.values(catMap).sort((a, b) => b.revenue - a.revenue);
  }, [sales, products, selectedBranchId]);

  // Sorting Helper
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortField(field);
      setSortDirection('ASC');
    }
  };

  // CSV Export with Metadata Header
  const handleExportCSV = () => {
    const dateRangeLabel =
      dateFilter === 'CUSTOM'
        ? `${customStartDate || 'Start'} to ${customEndDate || 'End'}`
        : dateFilter;
    const branchLabel =
      selectedBranchId === 'ALL'
        ? 'All Branches Consolidated'
        : branches.find((b) => b.id === selectedBranchId)?.name || selectedBranchId;
    const timestamp = new Date().toISOString();
    const generatedBy = currentUser?.name ? `${currentUser.name} (${currentUser.role})` : 'Authorized User';

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += `"ROYAL AGRO MANAGEMENT SYSTEM - EXECUTIVE AUDIT REPORT"\n`;
    csvContent += `"Report Module:","${reportTab}"\n`;
    csvContent += `"Branch Scope:","${branchLabel}"\n`;
    csvContent += `"Date Filter:","${dateRangeLabel}"\n`;
    csvContent += `"Generated By:","${generatedBy}"\n`;
    csvContent += `"Timestamp:","${timestamp}"\n\n`;

    if (reportTab === 'FINANCIAL') {
      csvContent += `"Branch","State","Completed Sales","Gross Sales (NGN)","Returns (NGN)","Net Sales (NGN)","COGS (NGN)","Gross Profit (NGN)","Expenses (NGN)","Net Profit (NGN)","Outstanding Credit (NGN)","Stock Value (NGN)"\n`;
      branchComparison.forEach((b) => {
        csvContent += `"${b.branchName}","${b.state}",${b.completedSalesCount},${b.grossSales},${b.returnsValue},${b.netSales},${b.cogs},${b.grossProfit},${b.expenses},${b.netProfit},${b.outstandingCredit},${b.inventoryCostValue}\n`;
      });
    } else if (reportTab === 'SALES') {
      csvContent += `"Receipt No","Branch","Customer","Date","Payment Method","Gross Amount (NGN)","Paid Amount (NGN)","Balance Due (NGN)","Staff","Sync Status"\n`;
      sales
        .filter((s) => selectedBranchId === 'ALL' || s.branchId === selectedBranchId)
        .forEach((s) => {
          csvContent += `"${s.receiptNo}","${s.branchName}","${s.customerName}","${s.date}","${s.paymentMethod}",${s.totalAmount},${s.amountPaid || s.totalAmount},${s.balanceDue || 0},"${s.staffName}","${s.syncStatus || 'synced'}"\n`;
        });
    } else if (reportTab === 'INVENTORY') {
      csvContent += `"Product Name","SKU","Category","Unit Cost (NGN)","Selling Price (NGN)","Units in Stock","Cost Value (NGN)","Retail Value (NGN)"\n`;
      products.forEach((p) => {
        const units = inventory
          .filter((i) => (selectedBranchId === 'ALL' || i.branchId === selectedBranchId) && i.productId === p.id)
          .reduce((sum, item) => sum + item.quantity, 0);
        csvContent += `"${p.name}","${p.sku}","${p.category}",${p.purchasePrice},${p.sellingPrice},${units},${units * p.purchasePrice},${units * p.sellingPrice}\n`;
      });
    } else if (reportTab === 'CREDIT') {
      csvContent += `"Credit Ref","Branch","Customer","Phone","Sale Date","Due Date","Original Credit (NGN)","Amount Paid (NGN)","Remaining Balance (NGN)","Status"\n`;
      credits
        .filter((c) => selectedBranchId === 'ALL' || c.branchId === selectedBranchId)
        .forEach((c) => {
          csvContent += `"${c.creditNo}","${c.branchName}","${c.customerName}","${c.customerPhone}","${c.saleDate}","${c.dueDate}",${c.creditAmount},${c.amountPaid},${c.remainingBalance},"${c.creditStatus}"\n`;
        });
    } else if (reportTab === 'SUPPLIERS') {
      csvContent += `"Supplier Name","Phone","Total Orders","Purchases Amount (NGN)","Amount Paid (NGN)","Balance Owed (NGN)"\n`;
      supplierPayables.supplierBalances.forEach((s) => {
        csvContent += `"${s.supplierName}","${s.phone || '-'} ",${s.totalOrders},${s.totalAmount},${s.totalPaid},${s.balanceOwed}\n`;
      });
    } else if (reportTab === 'EXPENSES') {
      csvContent += `"Voucher ID","Branch","Category","Description","Vendor","Amount (NGN)","Date","Recorded By"\n`;
      expenses
        .filter((e) => selectedBranchId === 'ALL' || e.branchId === selectedBranchId)
        .forEach((e) => {
          csvContent += `"${e.id}","${e.branchName}","${e.category}","${e.description}","${e.vendorName || '-'} ",${e.amount},"${e.date}","${e.recordedByUserName}"\n`;
        });
    } else if (reportTab === 'CASHBOOK') {
      csvContent += `"Transaction Ref","Branch","Type","Description","Money In (NGN)","Money Out (NGN)","Method","Date","Status"\n`;
      financialTransactions
        .filter((tx) => selectedBranchId === 'ALL' || tx.branchId === selectedBranchId)
        .forEach((tx) => {
          csvContent += `"${tx.referenceNumber}","${tx.branchName || '-'} ","${tx.transactionType}","${tx.description}",${tx.moneyIn},${tx.moneyOut},"${tx.paymentMethod}","${tx.transactionDate}","${tx.status}"\n`;
        });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Royal_Agro_${reportTab}_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  // Generic Pagination Calculator
  const paginate = <T,>(items: T[]) => {
    const totalItems = items.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedItems = items.slice(startIndex, startIndex + itemsPerPage);

    return {
      totalItems,
      totalPages,
      paginatedItems,
      startIndex,
      endIndex: Math.min(startIndex + itemsPerPage, totalItems)
    };
  };

  return (
    <div className="space-y-6">
      {/* Offline Status Warning Banner */}
      {!isOnline && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 shadow-xs">
          <div className="flex items-center gap-2.5 font-bold">
            <WifiOff className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-extrabold text-amber-950">Offline Local Mode Active:</span> Report metrics are
              calculated strictly from the local browser storage on this device. Cloud consensus may be pending.
              {pendingOpsCount > 0 && (
                <span className="ml-1 text-amber-800">({pendingOpsCount} offline changes pending sync)</span>
              )}
            </div>
          </div>
          {lastSyncTime && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-950 rounded-lg text-[10px] font-extrabold shrink-0">
              <Clock className="w-3.5 h-3.5 text-amber-700" />
              <span>Last cloud sync: {lastSyncTime}</span>
            </div>
          )}
        </div>
      )}

      {/* Corporate Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#7E9D73] uppercase tracking-wider mb-0.5">
            <BarChart3 className="w-4 h-4 text-[#7E9D73]" /> Module 15 • Enterprise Analytics Suite
          </div>
          <h1 className="text-xl font-extrabold text-stone-900">Advanced Business Reports & Financial Analytics</h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Consolidated Profit & Loss, sales auditing, seed inventory valuation, customer credit aging, and cashbook.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs rounded-xl border border-stone-200 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-700" /> Export CSV Sheet
          </button>
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-[#1B3022] hover:bg-[#284732] text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-amber-300" /> Print Clean Report
          </button>
        </div>
      </div>

      {/* Main Module Tabs & Primary Filters */}
      <div className="bg-white p-4.5 rounded-2xl border border-stone-200/80 shadow-xs space-y-3.5">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-xs">
          {canViewFinancial && (
            <button
              onClick={() => setReportTab('FINANCIAL')}
              className={`px-4 py-2 rounded-xl font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                reportTab === 'FINANCIAL' ? 'bg-[#1B3022] text-white shadow-xs' : 'bg-stone-100 text-stone-600 hover:text-stone-900'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              Financial P&L & Comparison
            </button>
          )}

          {canViewSales && (
            <button
              onClick={() => setReportTab('SALES')}
              className={`px-4 py-2 rounded-xl font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                reportTab === 'SALES' ? 'bg-[#1B3022] text-white shadow-xs' : 'bg-stone-100 text-stone-600 hover:text-stone-900'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5 text-blue-400" />
              Sales & Revenue Reports
            </button>
          )}

          {canViewInventory && (
            <button
              onClick={() => setReportTab('INVENTORY')}
              className={`px-4 py-2 rounded-xl font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                reportTab === 'INVENTORY' ? 'bg-[#1B3022] text-white shadow-xs' : 'bg-stone-100 text-stone-600 hover:text-stone-900'
              }`}
            >
              <Package className="w-3.5 h-3.5 text-amber-400" />
              Inventory & Valuation
            </button>
          )}

          {canViewCredit && (
            <button
              onClick={() => setReportTab('CREDIT')}
              className={`px-4 py-2 rounded-xl font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                reportTab === 'CREDIT' ? 'bg-[#1B3022] text-white shadow-xs' : 'bg-stone-100 text-stone-600 hover:text-stone-900'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5 text-rose-400" />
              Credit & Debt Aging
            </button>
          )}

          {canViewSuppliers && (
            <button
              onClick={() => setReportTab('SUPPLIERS')}
              className={`px-4 py-2 rounded-xl font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                reportTab === 'SUPPLIERS' ? 'bg-[#1B3022] text-white shadow-xs' : 'bg-stone-100 text-stone-600 hover:text-stone-900'
              }`}
            >
              <Truck className="w-3.5 h-3.5 text-indigo-400" />
              Suppliers & Payables
            </button>
          )}

          {canViewExpenses && (
            <button
              onClick={() => setReportTab('EXPENSES')}
              className={`px-4 py-2 rounded-xl font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                reportTab === 'EXPENSES' ? 'bg-[#1B3022] text-white shadow-xs' : 'bg-stone-100 text-stone-600 hover:text-stone-900'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5 text-orange-400" />
              Operating Expenses
            </button>
          )}

          {canViewCashbook && (
            <button
              onClick={() => setReportTab('CASHBOOK')}
              className={`px-4 py-2 rounded-xl font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                reportTab === 'CASHBOOK' ? 'bg-[#1B3022] text-white shadow-xs' : 'bg-stone-100 text-stone-600 hover:text-stone-900'
              }`}
            >
              <Wallet className="w-3.5 h-3.5 text-emerald-400" />
              Cashbook & Drawer
            </button>
          )}
        </div>

        {/* Global Filter Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-3 border-t border-stone-100 text-xs">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Branch Selector */}
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#7E9D73] shrink-0" />
              <select
                disabled={isBranchManager && !isCEO}
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="bg-stone-50 border border-stone-200 px-3 py-1.5 rounded-xl font-bold text-stone-900 focus:outline-none cursor-pointer"
              >
                {isCEO && <option value="ALL">🌐 All Branches Consolidated</option>}
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    📍 {b.name} ({b.state})
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Selector */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#7E9D73] shrink-0" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as DateFilterOption)}
                className="bg-stone-50 border border-stone-200 px-3 py-1.5 rounded-xl font-bold text-stone-900 focus:outline-none cursor-pointer"
              >
                <option value="TODAY">📅 Today</option>
                <option value="THIS_WEEK">📅 This Week</option>
                <option value="THIS_MONTH">📅 This Month</option>
                <option value="THIS_YEAR">📅 This Year</option>
                <option value="ALL">📅 All Time Records</option>
                <option value="CUSTOM">📅 Custom Date Range</option>
              </select>

              {dateFilter === 'CUSTOM' && (
                <div className="flex items-center gap-1">
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="px-2 py-1 bg-stone-50 border border-stone-200 rounded-lg text-xs"
                  />
                  <span className="text-stone-400 font-bold">-</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="px-2 py-1 bg-stone-50 border border-stone-200 rounded-lg text-xs"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Live Search Box */}
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search report records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:outline-none focus:border-[#7E9D73]"
            />
          </div>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Gross Sales Revenue */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Gross Sales</span>
          <p className="text-xl font-extrabold text-stone-900 mt-1">₦{salesSummary.grossSales.toLocaleString()}</p>
          <span className="text-[10px] text-stone-500">{salesSummary.completedSalesCount} completed orders</span>
        </div>

        {/* Returns & Refunds */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Product Returns</span>
          <p className="text-xl font-extrabold text-rose-700 mt-1">₦{salesSummary.totalReturnsValue.toLocaleString()}</p>
          <span className="text-[10px] text-stone-500">{returnSummary.totalReturnsCount} returns approved</span>
        </div>

        {/* Cost of Goods Sold (COGS) */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">COGS & Margin</span>
          <p className="text-xl font-extrabold text-blue-900 mt-1">₦{pnl.cogs.toLocaleString()}</p>
          <span className="text-[10px] text-blue-600 font-semibold">{pnl.grossMarginPct.toFixed(1)}% Gross Margin</span>
        </div>

        {/* Operating Expenses */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Operating Expenses</span>
          <p className="text-xl font-extrabold text-stone-900 mt-1">₦{expenseSummary.totalExpensesAmount.toLocaleString()}</p>
          <span className="text-[10px] text-stone-500">{expenseSummary.totalExpensesCount} vouchers</span>
        </div>

        {/* Net Bottomline Profit */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Net Business Profit</span>
          <p className={`text-xl font-extrabold mt-1 ${pnl.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
            ₦{pnl.netProfit.toLocaleString()}
          </p>
          <span className="text-[10px] text-stone-400">Formula: Gross Profit - Expenses</span>
        </div>
      </div>

      {/* Main Tab Content Canvas */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden p-6 space-y-4">
        {/* TAB 1: FINANCIAL P&L & BRANCH COMPARISON */}
        {reportTab === 'FINANCIAL' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-stone-900">Profit & Loss Statement by Branch</h3>
                <p className="text-xs text-stone-500">
                  Comprehensive financial breakdown showing gross sales, returns, COGS, gross margin, expenses, and net profit.
                </p>
              </div>
              <div className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-bold">
                ✓ Transfers strictly excluded from revenue
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 text-stone-500 uppercase font-semibold text-[10px] border-b border-stone-200">
                  <tr>
                    <th className="p-3">Branch Location</th>
                    <th className="p-3 cursor-pointer" onClick={() => handleSort('grossSales')}>
                      <div className="flex items-center gap-1">
                        Gross Sales (₦) <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="p-3">Returns (₦)</th>
                    <th className="p-3">Net Sales (₦)</th>
                    <th className="p-3">COGS (₦)</th>
                    <th className="p-3">Gross Profit (₦)</th>
                    <th className="p-3">Expenses (₦)</th>
                    <th className="p-3">Net Profit (₦)</th>
                    <th className="p-3">Stock Valuation (₦)</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {branchComparison.map((b) => (
                    <tr key={b.branchId} className="hover:bg-stone-50">
                      <td className="p-3 font-bold text-stone-900">
                        📍 {b.branchName} <span className="text-[10px] text-stone-400">({b.state})</span>
                      </td>
                      <td className="p-3 font-extrabold text-stone-900">₦{b.grossSales.toLocaleString()}</td>
                      <td className="p-3 font-bold text-rose-700">₦{b.returnsValue.toLocaleString()}</td>
                      <td className="p-3 font-extrabold text-stone-800">₦{b.netSales.toLocaleString()}</td>
                      <td className="p-3 font-semibold text-stone-600">₦{b.cogs.toLocaleString()}</td>
                      <td className="p-3 font-bold text-blue-800">
                        ₦{b.grossProfit.toLocaleString()}
                        <div className="text-[10px] text-blue-600">{b.grossMarginPct.toFixed(1)}%</div>
                      </td>
                      <td className="p-3 font-semibold text-rose-700">₦{b.expenses.toLocaleString()}</td>
                      <td className={`p-3 font-extrabold ${b.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                        ₦{b.netProfit.toLocaleString()}
                        <div className="text-[10px]">{b.netMarginPct.toFixed(1)}% net</div>
                      </td>
                      <td className="p-3 font-bold text-stone-700">₦{b.inventoryCostValue.toLocaleString()}</td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            b.performanceStatus === 'TOP_PERFORMER'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : b.performanceStatus === 'PROFITABLE'
                              ? 'bg-stone-100 text-stone-700 border-stone-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}
                        >
                          {b.performanceStatus === 'TOP_PERFORMER' ? '🌟 Top' : b.performanceStatus === 'PROFITABLE' ? 'Profit' : 'Review'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cash vs Credit Sales Breakdown Card */}
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
              <h4 className="font-bold text-stone-800 text-xs uppercase tracking-wider">Accounting Distinction & Cash Flow Notes</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-stone-500 font-semibold">Cash Collected at Register:</span>
                  <p className="font-extrabold text-stone-900 mt-0.5">₦{pnl.cashReceived.toLocaleString()}</p>
                  <p className="text-[10px] text-stone-400">Actual cash/transfer/POS funds in hand</p>
                </div>
                <div>
                  <span className="text-stone-500 font-semibold">Credit Sales Issued:</span>
                  <p className="font-extrabold text-amber-700 mt-0.5">₦{pnl.creditReceivablesIssued.toLocaleString()}</p>
                  <p className="text-[10px] text-stone-400">Accounts receivable debt due from farmers</p>
                </div>
                <div>
                  <span className="text-stone-500 font-semibold">Customer Credit Repayments:</span>
                  <p className="font-extrabold text-emerald-700 mt-0.5">₦{pnl.customerCreditRepayments.toLocaleString()}</p>
                  <p className="text-[10px] text-stone-400">Debt recovered (excluded from sales revenue)</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SALES REPORTS */}
        {reportTab === 'SALES' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSalesSubTab('ALL_SALES')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                    salesSubTab === 'ALL_SALES' ? 'bg-[#1B3022] text-white' : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  All Sales Orders
                </button>
                <button
                  onClick={() => setSalesSubTab('BY_STAFF')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                    salesSubTab === 'BY_STAFF' ? 'bg-[#1B3022] text-white' : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  Sales by Staff / Cashier
                </button>
                <button
                  onClick={() => setSalesSubTab('BY_CATEGORY')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                    salesSubTab === 'BY_CATEGORY' ? 'bg-[#1B3022] text-white' : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  Sales by Seed Category
                </button>
              </div>
            </div>

            {salesSubTab === 'ALL_SALES' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 text-stone-500 uppercase font-semibold text-[10px]">
                    <tr>
                      <th className="p-3">Receipt No</th>
                      <th className="p-3">Branch</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Staff</th>
                      <th className="p-3">Payment Method</th>
                      <th className="p-3">Gross Amount (₦)</th>
                      <th className="p-3">Date</th>
                      <th className="p-3 text-center">Sync Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {paginate(
                      sales
                        .filter(
                          (s) =>
                            (selectedBranchId === 'ALL' || s.branchId === selectedBranchId) &&
                            (!searchQuery ||
                              s.receiptNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              s.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              s.staffName.toLowerCase().includes(searchQuery.toLowerCase()))
                        )
                    ).paginatedItems.map((s) => (
                      <tr key={s.id} className="hover:bg-stone-50">
                        <td className="p-3 font-bold font-mono text-stone-900">{s.receiptNo}</td>
                        <td className="p-3 text-stone-700">{s.branchName}</td>
                        <td className="p-3 font-medium text-stone-800">{s.customerName}</td>
                        <td className="p-3 text-stone-600">{s.staffName}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-stone-100 text-stone-800">
                            {s.paymentMethod}
                          </span>
                        </td>
                        <td className="p-3 font-extrabold text-emerald-800">₦{s.totalAmount.toLocaleString()}</td>
                        <td className="p-3 text-stone-500">{s.date}</td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                              s.syncStatus === 'synced'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {s.syncStatus === 'synced' ? 'Synced' : 'Pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {salesSubTab === 'BY_STAFF' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 text-stone-500 uppercase font-semibold text-[10px]">
                    <tr>
                      <th className="p-3">Staff / Cashier Name</th>
                      <th className="p-3">Branch Location</th>
                      <th className="p-3">Orders Processed</th>
                      <th className="p-3">Total Sales Amount (₦)</th>
                      <th className="p-3">Average Ticket (₦)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {salesByStaff.map((st, idx) => (
                      <tr key={idx} className="hover:bg-stone-50">
                        <td className="p-3 font-bold text-stone-900">{st.staffName}</td>
                        <td className="p-3 text-stone-600">{st.branchName}</td>
                        <td className="p-3 font-semibold text-stone-800">{st.count} sales</td>
                        <td className="p-3 font-extrabold text-emerald-800">₦{st.totalAmount.toLocaleString()}</td>
                        <td className="p-3 font-bold text-stone-700">
                          ₦{st.count > 0 ? Math.round(st.totalAmount / st.count).toLocaleString() : 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {salesSubTab === 'BY_CATEGORY' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 text-stone-500 uppercase font-semibold text-[10px]">
                    <tr>
                      <th className="p-3">Product Category</th>
                      <th className="p-3">Total Units Sold</th>
                      <th className="p-3">Total Revenue Generated (₦)</th>
                      <th className="p-3">Share of Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {salesByCategory.map((cat, idx) => (
                      <tr key={idx} className="hover:bg-stone-50">
                        <td className="p-3 font-bold text-stone-900">{cat.category}</td>
                        <td className="p-3 font-semibold text-stone-800">{cat.unitsSold} units</td>
                        <td className="p-3 font-extrabold text-emerald-800">₦{cat.revenue.toLocaleString()}</td>
                        <td className="p-3 font-bold text-blue-700">
                          {pnl.grossSales > 0 ? ((cat.revenue / pnl.grossSales) * 100).toFixed(1) : 0}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: INVENTORY & VALUATION */}
        {reportTab === 'INVENTORY' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setInventorySubTab('STOCK')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                    inventorySubTab === 'STOCK' ? 'bg-[#1B3022] text-white' : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  Stock Valuation
                </button>
                <button
                  onClick={() => setInventorySubTab('VELOCITY')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                    inventorySubTab === 'VELOCITY' ? 'bg-[#1B3022] text-white' : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  Velocity (Fast / Slow)
                </button>
                <button
                  onClick={() => setInventorySubTab('EXPIRY')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                    inventorySubTab === 'EXPIRY' ? 'bg-[#1B3022] text-white' : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  Expiry Risk Analysis
                </button>
                <button
                  onClick={() => setInventorySubTab('MOVEMENTS')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                    inventorySubTab === 'MOVEMENTS' ? 'bg-[#1B3022] text-white' : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  Movement History
                </button>
              </div>
            </div>

            {inventorySubTab === 'STOCK' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 text-stone-500 uppercase font-semibold text-[10px]">
                    <tr>
                      <th className="p-3">Product Name</th>
                      <th className="p-3">SKU</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Unit Cost (₦)</th>
                      <th className="p-3">Selling Price (₦)</th>
                      <th className="p-3">In Stock</th>
                      <th className="p-3">Cost Valuation (₦)</th>
                      <th className="p-3">Retail Valuation (₦)</th>
                      <th className="p-3">Potential Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {paginate(
                      products.filter(
                        (p) =>
                          !searchQuery ||
                          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.category.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                    ).paginatedItems.map((p) => {
                      const units = inventory
                        .filter((i) => (selectedBranchId === 'ALL' || i.branchId === selectedBranchId) && i.productId === p.id)
                        .reduce((sum, item) => sum + item.quantity, 0);
                      const costVal = units * p.purchasePrice;
                      const retailVal = units * p.sellingPrice;
                      const profit = retailVal - costVal;

                      return (
                        <tr key={p.id} className="hover:bg-stone-50">
                          <td className="p-3 font-bold text-stone-900">{p.name}</td>
                          <td className="p-3 font-mono font-bold text-stone-700">{p.sku}</td>
                          <td className="p-3 text-stone-600">{p.category}</td>
                          <td className="p-3 font-semibold text-stone-800">₦{p.purchasePrice.toLocaleString()}</td>
                          <td className="p-3 font-semibold text-stone-800">₦{p.sellingPrice.toLocaleString()}</td>
                          <td className="p-3 font-extrabold text-stone-900">
                            {units} {p.unit}
                          </td>
                          <td className="p-3 font-bold text-blue-900">₦{costVal.toLocaleString()}</td>
                          <td className="p-3 font-bold text-stone-800">₦{retailVal.toLocaleString()}</td>
                          <td className="p-3 font-extrabold text-emerald-700">₦{profit.toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {inventorySubTab === 'VELOCITY' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 text-stone-500 uppercase font-semibold text-[10px]">
                    <tr>
                      <th className="p-3">Product Name</th>
                      <th className="p-3">SKU</th>
                      <th className="p-3">Units Sold</th>
                      <th className="p-3">Revenue (₦)</th>
                      <th className="p-3">Current Stock</th>
                      <th className="p-3">Velocity Classification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {velocityItems
                      .filter(
                        (v) =>
                          !searchQuery ||
                          v.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          v.sku.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((item) => (
                        <tr key={item.productId} className="hover:bg-stone-50">
                          <td className="p-3 font-bold text-stone-900">{item.productName}</td>
                          <td className="p-3 font-mono text-stone-600">{item.sku}</td>
                          <td className="p-3 font-extrabold text-stone-800">{item.unitsSold} units</td>
                          <td className="p-3 font-bold text-emerald-800">₦{item.salesRevenue.toLocaleString()}</td>
                          <td className="p-3 font-semibold text-stone-700">{item.currentStock}</td>
                          <td className="p-3">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                                item.status === 'FAST_MOVING'
                                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                                  : item.status === 'SLOW_MOVING'
                                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                                  : item.status === 'OUT_OF_STOCK'
                                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                                  : 'bg-stone-100 text-stone-700 border-stone-200'
                              }`}
                            >
                              {item.status.replace('_', ' ')}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {inventorySubTab === 'EXPIRY' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 text-stone-500 uppercase font-semibold text-[10px]">
                    <tr>
                      <th className="p-3">Seed / Product</th>
                      <th className="p-3">Batch Number</th>
                      <th className="p-3">Branch Location</th>
                      <th className="p-3">Units in Batch</th>
                      <th className="p-3">Expiry Date</th>
                      <th className="p-3">Days Remaining</th>
                      <th className="p-3">Asset Value at Risk</th>
                      <th className="p-3">Risk Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {expiryRisks.map((item, idx) => (
                      <tr key={idx} className="hover:bg-stone-50">
                        <td className="p-3 font-bold text-stone-900">{item.productName}</td>
                        <td className="p-3 font-mono text-stone-700">{item.batchNumber}</td>
                        <td className="p-3 text-stone-600">{item.branchName}</td>
                        <td className="p-3 font-semibold text-stone-800">{item.quantity}</td>
                        <td className="p-3 text-stone-600">{item.expiryDate}</td>
                        <td className="p-3 font-bold">
                          {item.daysRemaining <= 0 ? (
                            <span className="text-rose-700">Expired ({Math.abs(item.daysRemaining)} days ago)</span>
                          ) : (
                            <span>{item.daysRemaining} days</span>
                          )}
                        </td>
                        <td className="p-3 font-extrabold text-stone-800">₦{item.estimatedCostValue.toLocaleString()}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              item.status === 'EXPIRED'
                                ? 'bg-rose-100 text-rose-800'
                                : item.status === 'EXPIRING_30_DAYS'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-50 text-emerald-800'
                            }`}
                          >
                            {item.status.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {expiryRisks.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-4 text-center text-stone-400 italic">
                          No seed batches recorded with imminent expiry risk.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {inventorySubTab === 'MOVEMENTS' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 text-stone-500 uppercase font-semibold text-[10px]">
                    <tr>
                      <th className="p-3">Movement Type</th>
                      <th className="p-3">Product Name</th>
                      <th className="p-3">Quantity Delta</th>
                      <th className="p-3">Reference / Reason</th>
                      <th className="p-3">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {paginate(
                      stockMovements.filter(
                        (m) =>
                          (selectedBranchId === 'ALL' || m.branchId === selectedBranchId) &&
                          (!searchQuery ||
                            m.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            m.type.toLowerCase().includes(searchQuery.toLowerCase()))
                      )
                    ).paginatedItems.map((m) => (
                      <tr key={m.id} className="hover:bg-stone-50">
                        <td className="p-3 font-bold uppercase">{m.type}</td>
                        <td className="p-3 font-medium text-stone-800">{m.productName}</td>
                        <td
                          className={`p-3 font-extrabold ${
                            (m.quantityDelta || 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {(m.quantityDelta || 0) > 0 ? `+${m.quantityDelta}` : m.quantityDelta}
                        </td>
                        <td className="p-3 text-stone-600">{m.referenceType || m.notes || '-'}</td>
                        <td className="p-3 text-stone-500">{m.timestamp || m.createdAt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: CUSTOMER CREDIT & AGING REPORTS */}
        {reportTab === 'CREDIT' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCreditSubTab('ACCOUNTS')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                    creditSubTab === 'ACCOUNTS' ? 'bg-[#1B3022] text-white' : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  Customer Credit Ledger
                </button>
                <button
                  onClick={() => setCreditSubTab('AGING')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                    creditSubTab === 'AGING' ? 'bg-[#1B3022] text-white' : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  Aging Analysis (0-30, 31-60, 61-90, 90+)
                </button>
                <button
                  onClick={() => setCreditSubTab('REPAYMENTS')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                    creditSubTab === 'REPAYMENTS' ? 'bg-[#1B3022] text-white' : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  Credit Repayments Ledger
                </button>
              </div>
            </div>

            {creditSubTab === 'ACCOUNTS' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 text-stone-500 uppercase font-semibold text-[10px]">
                    <tr>
                      <th className="p-3">Credit Ref</th>
                      <th className="p-3">Branch</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Phone</th>
                      <th className="p-3">Original Credit (₦)</th>
                      <th className="p-3">Amount Paid (₦)</th>
                      <th className="p-3">Remaining Balance (₦)</th>
                      <th className="p-3">Due Date</th>
                      <th className="p-3">Credit Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {credits
                      .filter(
                        (c) =>
                          (selectedBranchId === 'ALL' || c.branchId === selectedBranchId) &&
                          (!searchQuery ||
                            c.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            c.creditNo.toLowerCase().includes(searchQuery.toLowerCase()))
                      )
                      .map((c) => (
                        <tr key={c.id} className="hover:bg-stone-50">
                          <td className="p-3 font-mono font-bold text-stone-900">{c.creditNo}</td>
                          <td className="p-3 text-stone-700">{c.branchName}</td>
                          <td className="p-3 font-medium text-stone-800">{c.customerName}</td>
                          <td className="p-3 text-stone-600">{c.customerPhone}</td>
                          <td className="p-3 font-semibold text-stone-800">₦{c.creditAmount.toLocaleString()}</td>
                          <td className="p-3 font-semibold text-emerald-700">₦{c.amountPaid.toLocaleString()}</td>
                          <td className="p-3 font-extrabold text-rose-700">₦{c.remainingBalance.toLocaleString()}</td>
                          <td className="p-3 text-stone-500">{c.dueDate}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                c.creditStatus === 'OVERDUE'
                                  ? 'bg-rose-100 text-rose-800'
                                  : c.remainingBalance === 0
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {c.creditStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {creditSubTab === 'AGING' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                    <span className="font-bold text-emerald-900">Current (0–30 Days)</span>
                    <p className="text-lg font-extrabold text-emerald-800 mt-1">
                      ₦{creditSummary.aging.current.amount.toLocaleString()}
                    </p>
                    <span className="text-[10px] text-emerald-700">{creditSummary.aging.current.count} credit files</span>
                  </div>

                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                    <span className="font-bold text-amber-900">31–60 Days Overdue</span>
                    <p className="text-lg font-extrabold text-amber-800 mt-1">
                      ₦{creditSummary.aging.days31to60.amount.toLocaleString()}
                    </p>
                    <span className="text-[10px] text-amber-700">{creditSummary.aging.days31to60.count} credit files</span>
                  </div>

                  <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
                    <span className="font-bold text-orange-900">61–90 Days Overdue</span>
                    <p className="text-lg font-extrabold text-orange-800 mt-1">
                      ₦{creditSummary.aging.days61to90.amount.toLocaleString()}
                    </p>
                    <span className="text-[10px] text-orange-700">{creditSummary.aging.days61to90.count} credit files</span>
                  </div>

                  <div className="p-4 bg-rose-50 rounded-xl border border-rose-200">
                    <span className="font-bold text-rose-900">&gt;90 Days Critical</span>
                    <p className="text-lg font-extrabold text-rose-800 mt-1">
                      ₦{creditSummary.aging.over90Days.amount.toLocaleString()}
                    </p>
                    <span className="text-[10px] text-rose-700">{creditSummary.aging.over90Days.count} credit files</span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-50 text-stone-500 uppercase font-semibold text-[10px]">
                      <tr>
                        <th className="p-3">Customer</th>
                        <th className="p-3">Branch</th>
                        <th className="p-3">Due Date</th>
                        <th className="p-3">Aging Group</th>
                        <th className="p-3">Remaining Balance (₦)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {[
                        ...creditSummary.aging.over90Days.credits.map((c) => ({ ...c, group: '>90 Days Overdue' })),
                        ...creditSummary.aging.days61to90.credits.map((c) => ({ ...c, group: '61–90 Days Overdue' })),
                        ...creditSummary.aging.days31to60.credits.map((c) => ({ ...c, group: '31–60 Days Overdue' })),
                        ...creditSummary.aging.current.credits.map((c) => ({ ...c, group: 'Current (0–30 Days)' }))
                      ].map((c, idx) => (
                        <tr key={idx} className="hover:bg-stone-50">
                          <td className="p-3 font-bold text-stone-900">{c.customerName}</td>
                          <td className="p-3 text-stone-600">{c.branchName}</td>
                          <td className="p-3 text-stone-600">{c.dueDate}</td>
                          <td className="p-3 font-bold text-stone-800">{c.group}</td>
                          <td className="p-3 font-extrabold text-rose-700">₦{c.remainingBalance.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {creditSubTab === 'REPAYMENTS' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 text-stone-500 uppercase font-semibold text-[10px]">
                    <tr>
                      <th className="p-3">Payment No</th>
                      <th className="p-3">Customer Name</th>
                      <th className="p-3">Receipt Ref</th>
                      <th className="p-3">Amount Repaid (₦)</th>
                      <th className="p-3">Payment Method</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Received By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {creditPayments
                      .filter(
                        (p) =>
                          (selectedBranchId === 'ALL' || p.branchId === selectedBranchId) &&
                          (!searchQuery || p.customerName.toLowerCase().includes(searchQuery.toLowerCase()))
                      )
                      .map((p) => (
                        <tr key={p.id} className="hover:bg-stone-50">
                          <td className="p-3 font-mono font-bold text-stone-900">{p.paymentNo}</td>
                          <td className="p-3 font-medium text-stone-800">{p.customerName}</td>
                          <td className="p-3 font-mono text-stone-600">{p.receiptNo}</td>
                          <td className="p-3 font-extrabold text-emerald-700">₦{p.amountPaid.toLocaleString()}</td>
                          <td className="p-3 font-semibold text-stone-700">{p.paymentMethod}</td>
                          <td className="p-3 text-stone-500">{p.paymentDate}</td>
                          <td className="p-3 text-stone-600">{p.receivedByUserName}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: SUPPLIERS & PAYABLES */}
        {reportTab === 'SUPPLIERS' && (
          <div className="space-y-4">
            <h4 className="font-bold text-stone-800 text-sm">Supplier Purchases & Outstanding Payables</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 text-stone-500 uppercase font-semibold text-[10px]">
                  <tr>
                    <th className="p-3">Supplier Name</th>
                    <th className="p-3">Phone</th>
                    <th className="p-3">Purchase Orders Count</th>
                    <th className="p-3">Total Purchases Amount (₦)</th>
                    <th className="p-3">Total Paid to Supplier (₦)</th>
                    <th className="p-3">Outstanding Payable Balance (₦)</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {supplierPayables.supplierBalances
                    .filter(
                      (s) =>
                        !searchQuery ||
                        s.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (s.phone && s.phone.includes(searchQuery))
                    )
                    .map((s) => (
                      <tr key={s.supplierId} className="hover:bg-stone-50">
                        <td className="p-3 font-bold text-stone-900">{s.supplierName}</td>
                        <td className="p-3 text-stone-600">{s.phone || '-'}</td>
                        <td className="p-3 font-semibold text-stone-800">{s.totalOrders} POs</td>
                        <td className="p-3 font-bold text-stone-900">₦{s.totalAmount.toLocaleString()}</td>
                        <td className="p-3 font-semibold text-emerald-700">₦{s.totalPaid.toLocaleString()}</td>
                        <td className="p-3 font-extrabold text-rose-700">₦{s.balanceOwed.toLocaleString()}</td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              s.balanceOwed === 0
                                ? 'bg-emerald-50 text-emerald-800'
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {s.balanceOwed === 0 ? 'Settled' : 'Payable'}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: OPERATING EXPENSES */}
        {reportTab === 'EXPENSES' && (
          <div className="space-y-4">
            <h4 className="font-bold text-stone-800 text-sm">Branch Operational Expense Vouchers</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 text-stone-500 uppercase font-semibold text-[10px]">
                  <tr>
                    <th className="p-3">Voucher Ref</th>
                    <th className="p-3">Branch</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Description</th>
                    <th className="p-3">Vendor</th>
                    <th className="p-3">Amount (₦)</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Recorded By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {paginate(
                    expenses.filter(
                      (e) =>
                        (selectedBranchId === 'ALL' || e.branchId === selectedBranchId) &&
                        (!searchQuery ||
                          e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          e.category.toLowerCase().includes(searchQuery.toLowerCase()))
                    )
                  ).paginatedItems.map((e) => (
                    <tr key={e.id} className="hover:bg-stone-50">
                      <td className="p-3 font-mono text-stone-600">{e.id}</td>
                      <td className="p-3 font-bold text-stone-900">📍 {e.branchName}</td>
                      <td className="p-3 font-bold">{e.category}</td>
                      <td className="p-3 text-stone-700">{e.description}</td>
                      <td className="p-3 text-stone-600">{e.vendorName || '-'}</td>
                      <td className="p-3 font-extrabold text-rose-700">₦{e.amount.toLocaleString()}</td>
                      <td className="p-3 text-stone-500">{e.date}</td>
                      <td className="p-3 text-stone-600">{e.recordedByUserName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 7: CASHBOOK & DRAWER */}
        {reportTab === 'CASHBOOK' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                <span className="font-bold text-emerald-900">Total Money In:</span>
                <p className="text-xl font-extrabold text-emerald-800 mt-1">
                  ₦{cashbookSummary.totalMoneyIn.toLocaleString()}
                </p>
                <span className="text-[10px] text-emerald-700">Sales & debt collections</span>
              </div>
              <div className="p-4 bg-rose-50 rounded-xl border border-rose-200">
                <span className="font-bold text-rose-900">Total Money Out:</span>
                <p className="text-xl font-extrabold text-rose-800 mt-1">
                  ₦{cashbookSummary.totalMoneyOut.toLocaleString()}
                </p>
                <span className="text-[10px] text-rose-700">Expenses, payouts, supplier payments</span>
              </div>
              <div className="p-4 bg-stone-100 rounded-xl border border-stone-200">
                <span className="font-bold text-stone-900">Net Cashflow:</span>
                <p
                  className={`text-xl font-extrabold mt-1 ${
                    cashbookSummary.netCashFlow >= 0 ? 'text-emerald-700' : 'text-rose-600'
                  }`}
                >
                  ₦{cashbookSummary.netCashFlow.toLocaleString()}
                </p>
                <span className="text-[10px] text-stone-500">Net liquid drawer balance</span>
              </div>
            </div>

            <h4 className="font-bold text-stone-800 text-sm mt-4">Cash Transactions & Inflow / Outflow Audit</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 text-stone-500 uppercase font-semibold text-[10px]">
                  <tr>
                    <th className="p-3">Reference No</th>
                    <th className="p-3">Branch</th>
                    <th className="p-3">Transaction Type</th>
                    <th className="p-3">Description</th>
                    <th className="p-3">Money In (₦)</th>
                    <th className="p-3">Money Out (₦)</th>
                    <th className="p-3">Method</th>
                    <th className="p-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {paginate(
                    financialTransactions.filter(
                      (tx) =>
                        (selectedBranchId === 'ALL' || tx.branchId === selectedBranchId) &&
                        (!searchQuery ||
                          tx.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          tx.description.toLowerCase().includes(searchQuery.toLowerCase()))
                    )
                  ).paginatedItems.map((tx) => (
                    <tr key={tx.id} className="hover:bg-stone-50">
                      <td className="p-3 font-mono font-bold text-stone-900">{tx.referenceNumber}</td>
                      <td className="p-3 text-stone-700">{tx.branchName || '-'}</td>
                      <td className="p-3 font-bold">{tx.transactionType}</td>
                      <td className="p-3 text-stone-600">{tx.description}</td>
                      <td className="p-3 font-extrabold text-emerald-700">
                        {tx.moneyIn > 0 ? `₦${tx.moneyIn.toLocaleString()}` : '-'}
                      </td>
                      <td className="p-3 font-extrabold text-rose-700">
                        {tx.moneyOut > 0 ? `₦${tx.moneyOut.toLocaleString()}` : '-'}
                      </td>
                      <td className="p-3 font-semibold text-stone-700">{tx.paymentMethod}</td>
                      <td className="p-3 text-stone-500">{tx.transactionDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Global Pagination Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-stone-100 text-xs text-stone-500">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-stone-50 border border-stone-200 px-2 py-1 rounded-lg text-xs font-bold text-stone-800 focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-lg disabled:opacity-40 cursor-pointer"
            >
              Previous
            </button>
            <span className="font-bold text-stone-800">Page {currentPage}</span>
            <button
              onClick={() => setCurrentPage((p) => p + 1)}
              className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-lg cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
