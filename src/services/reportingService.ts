import {
  Sale,
  Expense,
  CustomerCredit,
  CreditPayment,
  SalesReturn,
  BranchInventory,
  Product,
  StockMovement,
  StockAdjustment,
  PurchaseOrder,
  SupplierPayment,
  Supplier,
  Branch,
  Customer,
  FinancialTransaction,
  CashSession,
  CashReconciliation,
  DateFilterOption
} from '../types';

export interface SalesSummary {
  totalSalesCount: number;
  completedSalesCount: number;
  cancelledSalesCount: number;
  grossSales: number;
  totalDiscounts: number;
  totalReturnsValue: number;
  netSales: number;
  totalCashReceived: number;
  totalCreditSales: number;
  averageSaleValue: number;
  salesByPaymentMethod: Record<string, { count: number; amount: number }>;
}

export interface ProfitAndLossSummary {
  grossSales: number;
  totalDiscounts: number;
  salesReturns: number;
  netSalesRevenue: number;
  cogs: number;
  itemsMissingCostCount: number;
  grossProfit: number;
  grossMarginPct: number;
  operatingExpenses: number;
  netProfit: number;
  netMarginPct: number;
  cashReceived: number;
  creditReceivablesIssued: number;
  customerCreditRepayments: number;
}

export interface ExpenseSummary {
  totalExpensesCount: number;
  totalExpensesAmount: number;
  expensesByCategory: Array<{ category: string; amount: number; count: number }>;
  expensesByBranch: Array<{ branchId: string; branchName: string; amount: number }>;
}

export interface CreditAgingGroup {
  label: string;
  count: number;
  amount: number;
  credits: CustomerCredit[];
}

export interface CreditSummary {
  totalCreditIssued: number;
  totalCreditPaid: number;
  totalReturnAdjustments: number;
  totalOutstandingBalance: number;
  activeCreditsCount: number;
  overdueCreditsCount: number;
  overdueAmount: number;
  aging: {
    current: CreditAgingGroup; // 0-30 days
    days31to60: CreditAgingGroup;
    days61to90: CreditAgingGroup;
    over90Days: CreditAgingGroup;
  };
}

export interface ReturnSummary {
  totalReturnsCount: number;
  totalReturnedItemsCount: number;
  totalReturnValue: number;
  totalRefundsAmount: number;
  totalCreditAdjustments: number;
  returnsByReason: Array<{ reason: string; count: number; value: number }>;
  returnsByType: Array<{ type: string; count: number; value: number }>;
}

export interface StockSummary {
  totalInventoryItems: number;
  totalInventoryCostValue: number;
  totalInventoryRetailValue: number;
  potentialGrossProfit: number;
  lowStockItemsCount: number;
  outOfStockItemsCount: number;
  totalStockSold: number;
  totalStockReturned: number;
  totalStockAdjusted: number;
}

export interface ProductVelocityItem {
  productId: string;
  productName: string;
  sku: string;
  category: string;
  unitsSold: number;
  salesRevenue: number;
  currentStock: number;
  unitCost: number;
  unitPrice: number;
  status: 'FAST_MOVING' | 'MODERATE' | 'SLOW_MOVING' | 'NON_MOVING' | 'OUT_OF_STOCK';
}

export interface ExpiryRiskItem {
  productId: string;
  productName: string;
  sku: string;
  branchName: string;
  batchNumber: string;
  quantity: number;
  expiryDate: string;
  daysRemaining: number;
  status: 'EXPIRED' | 'EXPIRING_30_DAYS' | 'EXPIRING_60_DAYS' | 'EXPIRING_90_DAYS' | 'SAFE';
  estimatedCostValue: number;
}

export interface SupplierPayablesSummary {
  totalPurchaseOrdersCount: number;
  totalPurchasesAmount: number;
  totalPaymentsToSuppliers: number;
  totalOutstandingPayables: number;
  supplierBalances: Array<{
    supplierId: string;
    supplierName: string;
    totalOrders: number;
    totalAmount: number;
    totalPaid: number;
    balanceOwed: number;
    phone?: string;
  }>;
}

export interface CashbookSummary {
  totalMoneyIn: number;
  totalMoneyOut: number;
  netCashFlow: number;
  totalTransactionsCount: number;
  openSessionsCount: number;
  reconciledSessionsCount: number;
  totalVariances: number;
}

export interface BranchComparisonItem {
  branchId: string;
  branchName: string;
  state: string;
  completedSalesCount: number;
  grossSales: number;
  returnsValue: number;
  netSales: number;
  cogs: number;
  grossProfit: number;
  grossMarginPct: number;
  expenses: number;
  netProfit: number;
  netMarginPct: number;
  outstandingCredit: number;
  inventoryCostValue: number;
  lowStockCount: number;
  averageSaleValue: number;
  performanceStatus: 'TOP_PERFORMER' | 'PROFITABLE' | 'ATTENTION_NEEDED';
  statusReason: string;
}

/**
 * Filter items by date range option or custom start/end dates
 */
export function filterItemsByDate<T extends Record<string, any>>(
  items: T[],
  dateFilter: DateFilterOption = 'ALL',
  customStartDate?: string,
  customEndDate?: string
): T[] {
  if (dateFilter === 'ALL') return items;

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  return items.filter((item) => {
    const rawDate =
      item.date ||
      item.saleDate ||
      item.orderDate ||
      item.transactionDate ||
      item.paymentDate ||
      item.receivedDate ||
      item.createdAt ||
      item.timestamp ||
      '';

    if (!rawDate) return true;
    const dateStr = rawDate.split('T')[0];

    if (dateFilter === 'TODAY') {
      return dateStr === todayStr;
    }

    if (dateFilter === 'THIS_WEEK') {
      const itemDate = new Date(dateStr);
      const startOfWeek = new Date(now);
      const day = now.getDay();
      startOfWeek.setDate(now.getDate() - day);
      startOfWeek.setHours(0, 0, 0, 0);
      return itemDate >= startOfWeek && itemDate <= now;
    }

    if (dateFilter === 'THIS_MONTH') {
      const yearMonth = todayStr.substring(0, 7);
      return dateStr.startsWith(yearMonth);
    }

    if (dateFilter === 'THIS_YEAR') {
      const year = todayStr.substring(0, 4);
      return dateStr.startsWith(year);
    }

    if (dateFilter === 'CUSTOM' && customStartDate && customEndDate) {
      return dateStr >= customStartDate && dateStr <= customEndDate;
    }

    return true;
  });
}

/**
 * Calculates sales and revenue summary
 */
export function getSalesSummary(
  sales: Sale[] = [],
  returns: SalesReturn[] = [],
  branchId: string = 'ALL',
  dateFilter: DateFilterOption = 'ALL',
  customStartDate?: string,
  customEndDate?: string
): SalesSummary {
  let filteredSales = sales;
  let filteredReturns = returns.filter((r) => r.status === 'APPROVED' || r.status === 'COMPLETED');

  if (branchId !== 'ALL') {
    filteredSales = filteredSales.filter((s) => s.branchId === branchId);
    filteredReturns = filteredReturns.filter((r) => r.branchId === branchId);
  }

  filteredSales = filterItemsByDate(filteredSales, dateFilter, customStartDate, customEndDate);
  filteredReturns = filterItemsByDate(filteredReturns, dateFilter, customStartDate, customEndDate);

  const completed = filteredSales.filter((s) => s.status === 'COMPLETED');
  const cancelled = filteredSales.filter((s) => s.status === 'CANCELLED');

  const grossSales = completed.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
  const totalDiscounts = completed.reduce((sum, s) => sum + (s.discount || 0), 0);
  const totalReturnsValue = filteredReturns.reduce((sum, r) => sum + (r.totalReturnValue || 0), 0);
  const netSales = Math.max(0, grossSales - totalReturnsValue);

  // Distinguish cash received at POS from credit sales
  let totalCashReceived = 0;
  let totalCreditSales = 0;

  const paymentMethodMap: Record<string, { count: number; amount: number }> = {};

  completed.forEach((s) => {
    const method = s.paymentMethod || 'CASH';
    if (!paymentMethodMap[method]) {
      paymentMethodMap[method] = { count: 0, amount: 0 };
    }
    paymentMethodMap[method].count += 1;
    paymentMethodMap[method].amount += s.totalAmount || 0;

    if (method === 'CREDIT') {
      totalCreditSales += s.totalAmount || 0;
      if (s.amountPaid && s.amountPaid > 0) {
        totalCashReceived += s.amountPaid;
      }
    } else {
      const paid = s.amountPaid !== undefined ? s.amountPaid : s.totalAmount || 0;
      totalCashReceived += paid;
      if (s.balanceDue && s.balanceDue > 0) {
        totalCreditSales += s.balanceDue;
      }
    }
  });

  const averageSaleValue = completed.length > 0 ? grossSales / completed.length : 0;

  return {
    totalSalesCount: filteredSales.length,
    completedSalesCount: completed.length,
    cancelledSalesCount: cancelled.length,
    grossSales,
    totalDiscounts,
    totalReturnsValue,
    netSales,
    totalCashReceived,
    totalCreditSales,
    averageSaleValue,
    salesByPaymentMethod: paymentMethodMap
  };
}

/**
 * Calculates Profit and Loss breakdown with COGS, Gross Profit, and Net Profit
 */
export function getProfitAndLossSummary(
  sales: Sale[] = [],
  returns: SalesReturn[] = [],
  expenses: Expense[] = [],
  products: Product[] = [],
  creditPayments: CreditPayment[] = [],
  branchId: string = 'ALL',
  dateFilter: DateFilterOption = 'ALL',
  customStartDate?: string,
  customEndDate?: string
): ProfitAndLossSummary {
  const salesSummary = getSalesSummary(sales, returns, branchId, dateFilter, customStartDate, customEndDate);
  const expenseSummary = getExpenseSummary(expenses, branchId, dateFilter, customStartDate, customEndDate);

  let filteredSales = sales.filter((s) => s.status === 'COMPLETED');
  let filteredReturns = returns.filter((r) => r.status === 'APPROVED' || r.status === 'COMPLETED');

  if (branchId !== 'ALL') {
    filteredSales = filteredSales.filter((s) => s.branchId === branchId);
    filteredReturns = filteredReturns.filter((r) => r.branchId === branchId);
  }

  filteredSales = filterItemsByDate(filteredSales, dateFilter, customStartDate, customEndDate);
  filteredReturns = filterItemsByDate(filteredReturns, dateFilter, customStartDate, customEndDate);

  // Compute Cost of Goods Sold (COGS)
  let cogs = 0;
  let itemsMissingCostCount = 0;

  filteredSales.forEach((s) => {
    (s.items || []).forEach((item) => {
      const prod = products.find((p) => p.id === item.productId || p.sku === item.sku);
      const unitCost = prod?.purchasePrice || 0;
      if (!unitCost || unitCost === 0) {
        itemsMissingCostCount += 1;
      }
      cogs += (item.quantity || 0) * unitCost;
    });
  });

  // Subtract cost of goods that were returned in GOOD condition and restocked
  filteredReturns.forEach((r) => {
    (r.items || []).forEach((item) => {
      if (item.condition === 'GOOD') {
        const prod = products.find((p) => p.id === item.productId);
        const unitCost = prod?.purchasePrice || 0;
        cogs = Math.max(0, cogs - (item.quantity || 0) * unitCost);
      }
    });
  });

  const grossProfit = salesSummary.netSales - cogs;
  const grossMarginPct = salesSummary.netSales > 0 ? (grossProfit / salesSummary.netSales) * 100 : 0;

  const operatingExpenses = expenseSummary.totalExpensesAmount;
  const netProfit = grossProfit - operatingExpenses;
  const netMarginPct = salesSummary.netSales > 0 ? (netProfit / salesSummary.netSales) * 100 : 0;

  // Repayments collected in the period
  let filteredPayments = creditPayments;
  if (branchId !== 'ALL') {
    filteredPayments = filteredPayments.filter((p) => p.branchId === branchId);
  }
  filteredPayments = filterItemsByDate(filteredPayments, dateFilter, customStartDate, customEndDate);
  const customerCreditRepayments = filteredPayments.reduce((sum, p) => sum + (p.amountPaid || 0), 0);

  return {
    grossSales: salesSummary.grossSales,
    totalDiscounts: salesSummary.totalDiscounts,
    salesReturns: salesSummary.totalReturnsValue,
    netSalesRevenue: salesSummary.netSales,
    cogs,
    itemsMissingCostCount,
    grossProfit,
    grossMarginPct,
    operatingExpenses,
    netProfit,
    netMarginPct,
    cashReceived: salesSummary.totalCashReceived,
    creditReceivablesIssued: salesSummary.totalCreditSales,
    customerCreditRepayments
  };
}

/**
 * Calculates expense summary
 */
export function getExpenseSummary(
  expenses: Expense[] = [],
  branchId: string = 'ALL',
  dateFilter: DateFilterOption = 'ALL',
  customStartDate?: string,
  customEndDate?: string
): ExpenseSummary {
  let filtered = expenses.filter((e) => e.status === 'APPROVED');

  if (branchId !== 'ALL') {
    filtered = filtered.filter((e) => e.branchId === branchId);
  }

  filtered = filterItemsByDate(filtered, dateFilter, customStartDate, customEndDate);

  const totalExpensesAmount = filtered.reduce((sum, e) => sum + (e.amount || 0), 0);

  const categoryMap: Record<string, { amount: number; count: number }> = {};
  const branchMap: Record<string, { branchName: string; amount: number }> = {};

  filtered.forEach((e) => {
    const cat = e.category || 'OTHER';
    if (!categoryMap[cat]) {
      categoryMap[cat] = { amount: 0, count: 0 };
    }
    categoryMap[cat].amount += e.amount;
    categoryMap[cat].count += 1;

    const bId = e.branchId || 'UNKNOWN';
    if (!branchMap[bId]) {
      branchMap[bId] = { branchName: e.branchName || 'Unknown Branch', amount: 0 };
    }
    branchMap[bId].amount += e.amount;
  });

  const expensesByCategory = Object.entries(categoryMap).map(([category, data]) => ({
    category,
    amount: data.amount,
    count: data.count
  }));

  const expensesByBranch = Object.entries(branchMap).map(([bId, data]) => ({
    branchId: bId,
    branchName: data.branchName,
    amount: data.amount
  }));

  return {
    totalExpensesCount: filtered.length,
    totalExpensesAmount,
    expensesByCategory,
    expensesByBranch
  };
}

/**
 * Calculates customer credit summary and aging schedule
 */
export function getCreditSummary(
  credits: CustomerCredit[] = [],
  payments: CreditPayment[] = [],
  returns: SalesReturn[] = [],
  branchId: string = 'ALL',
  dateFilter: DateFilterOption = 'ALL'
): CreditSummary {
  let filteredCredits = credits;
  let filteredPayments = payments;
  let filteredReturns = returns.filter((r) => r.status === 'APPROVED' || r.status === 'COMPLETED');

  if (branchId !== 'ALL') {
    filteredCredits = filteredCredits.filter((c) => c.branchId === branchId);
    filteredPayments = filteredPayments.filter((p) => p.branchId === branchId);
    filteredReturns = filteredReturns.filter((r) => r.branchId === branchId);
  }

  filteredCredits = filterItemsByDate(filteredCredits, dateFilter);
  filteredPayments = filterItemsByDate(filteredPayments, dateFilter);
  filteredReturns = filterItemsByDate(filteredReturns, dateFilter);

  const totalCreditIssued = filteredCredits.reduce((sum, c) => sum + (c.creditAmount || 0), 0);
  const totalCreditPaid = filteredPayments.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
  const totalReturnAdjustments = filteredReturns.reduce((sum, r) => sum + (r.creditAdjustment || 0), 0);

  const activeCredits = filteredCredits.filter((c) => (c.remainingBalance || 0) > 0);
  const totalOutstandingBalance = activeCredits.reduce((sum, c) => sum + (c.remainingBalance || 0), 0);

  // Aging Analysis
  const now = new Date();
  const aging = {
    current: { label: 'Current (0–30 days)', count: 0, amount: 0, credits: [] as CustomerCredit[] },
    days31to60: { label: '31–60 days overdue', count: 0, amount: 0, credits: [] as CustomerCredit[] },
    days61to90: { label: '61–90 days overdue', count: 0, amount: 0, credits: [] as CustomerCredit[] },
    over90Days: { label: 'Over 90 days overdue', count: 0, amount: 0, credits: [] as CustomerCredit[] }
  };

  let overdueAmount = 0;
  let overdueCreditsCount = 0;

  activeCredits.forEach((c) => {
    const rawDue = c.dueDate || c.saleDate || c.createdAt || '';
    const dueDate = new Date(rawDue);
    const diffDays = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    const balance = c.remainingBalance || 0;

    if (diffDays <= 0 || c.creditStatus === 'GOOD') {
      aging.current.count += 1;
      aging.current.amount += balance;
      aging.current.credits.push(c);
    } else {
      overdueAmount += balance;
      overdueCreditsCount += 1;

      if (diffDays <= 30) {
        aging.current.count += 1;
        aging.current.amount += balance;
        aging.current.credits.push(c);
      } else if (diffDays <= 60) {
        aging.days31to60.count += 1;
        aging.days31to60.amount += balance;
        aging.days31to60.credits.push(c);
      } else if (diffDays <= 90) {
        aging.days61to90.count += 1;
        aging.days61to90.amount += balance;
        aging.days61to90.credits.push(c);
      } else {
        aging.over90Days.count += 1;
        aging.over90Days.amount += balance;
        aging.over90Days.credits.push(c);
      }
    }
  });

  return {
    totalCreditIssued,
    totalCreditPaid,
    totalReturnAdjustments,
    totalOutstandingBalance,
    activeCreditsCount: activeCredits.length,
    overdueCreditsCount,
    overdueAmount,
    aging
  };
}

/**
 * Calculates returns summary
 */
export function getReturnSummary(
  returns: SalesReturn[] = [],
  branchId: string = 'ALL',
  dateFilter: DateFilterOption = 'ALL'
): ReturnSummary {
  let filtered = returns.filter((r) => r.status === 'APPROVED' || r.status === 'COMPLETED');

  if (branchId !== 'ALL') {
    filtered = filtered.filter((r) => r.branchId === branchId);
  }

  filtered = filterItemsByDate(filtered, dateFilter);

  const totalReturnsCount = filtered.length;
  const totalReturnValue = filtered.reduce((sum, r) => sum + (r.totalReturnValue || 0), 0);
  const totalRefundsAmount = filtered.reduce((sum, r) => sum + (r.refundAmount || 0), 0);
  const totalCreditAdjustments = filtered.reduce((sum, r) => sum + (r.creditAdjustment || 0), 0);

  let totalReturnedItemsCount = 0;
  const reasonMap: Record<string, { count: number; value: number }> = {};
  const typeMap: Record<string, { count: number; value: number }> = {};

  filtered.forEach((r) => {
    (r.items || []).forEach((item) => {
      totalReturnedItemsCount += item.quantity || 0;
    });

    const reason = r.returnReason || 'OTHER';
    if (!reasonMap[reason]) {
      reasonMap[reason] = { count: 0, value: 0 };
    }
    reasonMap[reason].count += 1;
    reasonMap[reason].value += r.totalReturnValue || 0;

    const t = r.returnType || 'REFUND';
    if (!typeMap[t]) {
      typeMap[t] = { count: 0, value: 0 };
    }
    typeMap[t].count += 1;
    typeMap[t].value += r.totalReturnValue || 0;
  });

  const returnsByReason = Object.entries(reasonMap).map(([reason, data]) => ({
    reason,
    count: data.count,
    value: data.value
  }));

  const returnsByType = Object.entries(typeMap).map(([type, data]) => ({
    type,
    count: data.count,
    value: data.value
  }));

  return {
    totalReturnsCount,
    totalReturnedItemsCount,
    totalReturnValue,
    totalRefundsAmount,
    totalCreditAdjustments,
    returnsByReason,
    returnsByType
  };
}

/**
 * Calculates stock and inventory valuation summary
 */
export function getStockSummary(
  inventory: BranchInventory[] = [],
  products: Product[] = [],
  movements: StockMovement[] = [],
  branchId: string = 'ALL'
): StockSummary {
  let filteredInventory = inventory;
  let filteredMovements = movements;

  if (branchId !== 'ALL') {
    filteredInventory = filteredInventory.filter((inv) => inv.branchId === branchId);
    filteredMovements = filteredMovements.filter((m) => m.branchId === branchId);
  }

  const totalInventoryItems = filteredInventory.reduce((sum, inv) => sum + (inv.quantity || 0), 0);

  let totalInventoryCostValue = 0;
  let totalInventoryRetailValue = 0;
  let lowStockItemsCount = 0;
  let outOfStockItemsCount = 0;

  filteredInventory.forEach((inv) => {
    const prod = products.find((p) => p.id === inv.productId);
    const cost = prod?.purchasePrice || 0;
    const price = prod?.sellingPrice || 0;
    const qty = inv.quantity || 0;

    totalInventoryCostValue += cost * qty;
    totalInventoryRetailValue += price * qty;

    const reorderLevel = inv.reorderLevel || prod?.minStockLevel || 10;
    if (qty === 0) {
      outOfStockItemsCount += 1;
    } else if (qty <= reorderLevel) {
      lowStockItemsCount += 1;
    }
  });

  const potentialGrossProfit = totalInventoryRetailValue - totalInventoryCostValue;

  const totalStockSold = filteredMovements
    .filter((m) => m.type === 'SALE' || m.type === 'TRANSFER_OUT')
    .reduce((sum, m) => sum + Math.abs(m.quantityDelta || 0), 0);

  const totalStockReturned = filteredMovements
    .filter((m) => m.type === 'RETURN' || m.type === 'TRANSFER_IN')
    .reduce((sum, m) => sum + Math.abs(m.quantityDelta || 0), 0);

  const totalStockAdjusted = filteredMovements
    .filter((m) => m.type === 'ADJUSTMENT' || m.type === 'LOST')
    .reduce((sum, m) => sum + Math.abs(m.quantityDelta || 0), 0);

  return {
    totalInventoryItems,
    totalInventoryCostValue,
    totalInventoryRetailValue,
    potentialGrossProfit,
    lowStockItemsCount,
    outOfStockItemsCount,
    totalStockSold,
    totalStockReturned,
    totalStockAdjusted
  };
}

/**
 * Calculates Product Sales Velocity (Fast-moving vs Slow-moving items)
 */
export function getProductVelocitySummary(
  sales: Sale[] = [],
  products: Product[] = [],
  inventory: BranchInventory[] = [],
  branchId: string = 'ALL',
  dateFilter: DateFilterOption = 'ALL'
): ProductVelocityItem[] {
  let filteredSales = sales.filter((s) => s.status === 'COMPLETED');
  if (branchId !== 'ALL') {
    filteredSales = filteredSales.filter((s) => s.branchId === branchId);
  }
  filteredSales = filterItemsByDate(filteredSales, dateFilter);

  // Aggregate sales per product
  const productSalesMap: Record<string, { unitsSold: number; revenue: number }> = {};
  filteredSales.forEach((s) => {
    (s.items || []).forEach((item) => {
      if (!productSalesMap[item.productId]) {
        productSalesMap[item.productId] = { unitsSold: 0, revenue: 0 };
      }
      productSalesMap[item.productId].unitsSold += item.quantity || 0;
      productSalesMap[item.productId].revenue += item.subtotal || 0;
    });
  });

  return products.map((p) => {
    const saleData = productSalesMap[p.id] || { unitsSold: 0, revenue: 0 };
    const branchStock = inventory
      .filter((i) => (branchId === 'ALL' || i.branchId === branchId) && i.productId === p.id)
      .reduce((sum, i) => sum + (i.quantity || 0), 0);

    let status: ProductVelocityItem['status'] = 'NON_MOVING';
    if (branchStock === 0) {
      status = 'OUT_OF_STOCK';
    } else if (saleData.unitsSold >= 25) {
      status = 'FAST_MOVING';
    } else if (saleData.unitsSold >= 5) {
      status = 'MODERATE';
    } else if (saleData.unitsSold > 0) {
      status = 'SLOW_MOVING';
    } else {
      status = 'NON_MOVING';
    }

    return {
      productId: p.id,
      productName: p.name,
      sku: p.sku,
      category: p.category,
      unitsSold: saleData.unitsSold,
      salesRevenue: saleData.revenue,
      currentStock: branchStock,
      unitCost: p.purchasePrice,
      unitPrice: p.sellingPrice,
      status
    };
  });
}

/**
 * Calculates stock expiry risks (Expired, Expiring in 30, 60, 90 days)
 */
export function getExpiryRiskSummary(
  inventory: BranchInventory[] = [],
  products: Product[] = [],
  branches: Branch[] = [],
  branchId: string = 'ALL'
): ExpiryRiskItem[] {
  let filtered = inventory.filter((inv) => inv.expiryDate && inv.quantity > 0);
  if (branchId !== 'ALL') {
    filtered = filtered.filter((inv) => inv.branchId === branchId);
  }

  const now = new Date();
  const items: ExpiryRiskItem[] = [];

  filtered.forEach((inv) => {
    const prod = products.find((p) => p.id === inv.productId);
    const branch = branches.find((b) => b.id === inv.branchId);
    const expDate = new Date(inv.expiryDate!);
    const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const cost = (prod?.purchasePrice || 0) * (inv.quantity || 0);

    let status: ExpiryRiskItem['status'] = 'SAFE';
    if (diffDays <= 0) {
      status = 'EXPIRED';
    } else if (diffDays <= 30) {
      status = 'EXPIRING_30_DAYS';
    } else if (diffDays <= 60) {
      status = 'EXPIRING_60_DAYS';
    } else if (diffDays <= 90) {
      status = 'EXPIRING_90_DAYS';
    }

    if (status !== 'SAFE' || diffDays <= 180) {
      items.push({
        productId: inv.productId,
        productName: prod?.name || 'Unknown Seed / Product',
        sku: prod?.sku || '-',
        branchName: branch?.name || 'Local Store',
        batchNumber: inv.batchNumber || 'STANDARD',
        quantity: inv.quantity,
        expiryDate: inv.expiryDate!,
        daysRemaining: diffDays,
        status,
        estimatedCostValue: cost
      });
    }
  });

  return items.sort((a, b) => a.daysRemaining - b.daysRemaining);
}

/**
 * Calculates Supplier Purchases, Payments & Payables Summary
 */
export function getSupplierPayablesSummary(
  purchaseOrders: PurchaseOrder[] = [],
  supplierPayments: SupplierPayment[] = [],
  suppliers: Supplier[] = [],
  branchId: string = 'ALL',
  dateFilter: DateFilterOption = 'ALL'
): SupplierPayablesSummary {
  let filteredOrders = purchaseOrders.filter((po) => po.status !== 'REJECTED' && po.status !== 'CANCELLED');
  let filteredPayments = supplierPayments.filter((sp) => sp.status !== 'CANCELLED');

  if (branchId !== 'ALL') {
    filteredOrders = filteredOrders.filter((po) => po.branchId === branchId);
    filteredPayments = filteredPayments.filter((sp) => !sp.branchId || sp.branchId === branchId);
  }

  filteredOrders = filterItemsByDate(filteredOrders, dateFilter);
  filteredPayments = filterItemsByDate(filteredPayments, dateFilter);

  const totalPurchasesAmount = filteredOrders.reduce((sum, po) => sum + (po.totalAmount || 0), 0);
  const totalPaymentsToSuppliers = filteredPayments.reduce((sum, sp) => sum + (sp.amount || 0), 0);
  const totalOutstandingPayables = Math.max(0, totalPurchasesAmount - totalPaymentsToSuppliers);

  // Group by Supplier
  const supplierMap: Record<
    string,
    { supplierName: string; totalOrders: number; totalAmount: number; totalPaid: number; phone?: string }
  > = {};

  suppliers.forEach((sup) => {
    supplierMap[sup.id] = {
      supplierName: sup.companyName,
      totalOrders: 0,
      totalAmount: 0,
      totalPaid: 0,
      phone: sup.phone
    };
  });

  filteredOrders.forEach((po) => {
    const sId = po.supplierId;
    if (!supplierMap[sId]) {
      supplierMap[sId] = {
        supplierName: po.supplierName || 'Unknown Supplier',
        totalOrders: 0,
        totalAmount: 0,
        totalPaid: 0
      };
    }
    supplierMap[sId].totalOrders += 1;
    supplierMap[sId].totalAmount += po.totalAmount || 0;
  });

  filteredPayments.forEach((sp) => {
    const sId = sp.supplierId;
    if (!supplierMap[sId]) {
      supplierMap[sId] = {
        supplierName: sp.supplierName || 'Unknown Supplier',
        totalOrders: 0,
        totalAmount: 0,
        totalPaid: 0
      };
    }
    supplierMap[sId].totalPaid += sp.amount || 0;
  });

  const supplierBalances = Object.entries(supplierMap).map(([sId, data]) => ({
    supplierId: sId,
    supplierName: data.supplierName,
    totalOrders: data.totalOrders,
    totalAmount: data.totalAmount,
    totalPaid: data.totalPaid,
    balanceOwed: Math.max(0, data.totalAmount - data.totalPaid),
    phone: data.phone
  }));

  return {
    totalPurchaseOrdersCount: filteredOrders.length,
    totalPurchasesAmount,
    totalPaymentsToSuppliers,
    totalOutstandingPayables,
    supplierBalances: supplierBalances.sort((a, b) => b.balanceOwed - a.balanceOwed)
  };
}

/**
 * Calculates Cashbook and Drawer reconciliation summary
 */
export function getCashbookSummary(
  financialTransactions: FinancialTransaction[] = [],
  cashSessions: CashSession[] = [],
  cashReconciliations: CashReconciliation[] = [],
  branchId: string = 'ALL',
  dateFilter: DateFilterOption = 'ALL'
): CashbookSummary {
  let filteredTx = financialTransactions.filter((tx) => tx.status !== 'CANCELLED' && tx.status !== 'REVERSED');
  let filteredSessions = cashSessions;
  let filteredRecon = cashReconciliations;

  if (branchId !== 'ALL') {
    filteredTx = filteredTx.filter((tx) => tx.branchId === branchId);
    filteredSessions = filteredSessions.filter((cs) => cs.branchId === branchId);
    filteredRecon = filteredRecon.filter((cr) => cr.branchId === branchId);
  }

  filteredTx = filterItemsByDate(filteredTx, dateFilter);
  filteredSessions = filterItemsByDate(filteredSessions, dateFilter);
  filteredRecon = filterItemsByDate(filteredRecon, dateFilter);

  const totalMoneyIn = filteredTx.reduce((sum, tx) => sum + (tx.moneyIn || 0), 0);
  const totalMoneyOut = filteredTx.reduce((sum, tx) => sum + (tx.moneyOut || 0), 0);
  const netCashFlow = totalMoneyIn - totalMoneyOut;

  const openSessionsCount = filteredSessions.filter((s) => s.status === 'OPEN').length;
  const reconciledSessionsCount = filteredSessions.filter((s) => s.status === 'RECONCILED').length;
  const totalVariances = filteredRecon.reduce((sum, r) => sum + Math.abs(r.variance || 0), 0);

  return {
    totalMoneyIn,
    totalMoneyOut,
    netCashFlow,
    totalTransactionsCount: filteredTx.length,
    openSessionsCount,
    reconciledSessionsCount,
    totalVariances
  };
}

/**
 * Compares all branches side-by-side with accurate calculations
 * CRITICAL RULE: Internal stock transfers are strictly EXCLUDED from sales revenue
 */
export function getBranchComparisonSummary(
  branches: Branch[] = [],
  sales: Sale[] = [],
  expenses: Expense[] = [],
  returns: SalesReturn[] = [],
  credits: CustomerCredit[] = [],
  inventory: BranchInventory[] = [],
  products: Product[] = [],
  dateFilter: DateFilterOption = 'ALL',
  customStartDate?: string,
  customEndDate?: string
): BranchComparisonItem[] {
  return branches.map((b) => {
    const branchSales = sales.filter((s) => s.branchId === b.id && s.status === 'COMPLETED');
    const branchReturns = returns.filter(
      (r) => r.branchId === b.id && (r.status === 'APPROVED' || r.status === 'COMPLETED')
    );
    const branchExpenses = expenses.filter((e) => e.branchId === b.id && e.status === 'APPROVED');
    const branchCredits = credits.filter((c) => c.branchId === b.id && (c.remainingBalance || 0) > 0);
    const branchInv = inventory.filter((i) => i.branchId === b.id);

    // Apply date filters to transactions
    const filteredSales = filterItemsByDate(branchSales, dateFilter, customStartDate, customEndDate);
    const filteredReturns = filterItemsByDate(branchReturns, dateFilter, customStartDate, customEndDate);
    const filteredExpenses = filterItemsByDate(branchExpenses, dateFilter, customStartDate, customEndDate);

    const grossSales = filteredSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
    const returnsValue = filteredReturns.reduce((sum, r) => sum + (r.totalReturnValue || 0), 0);
    const netSales = Math.max(0, grossSales - returnsValue);

    // Calculate branch COGS
    let cogs = 0;
    filteredSales.forEach((s) => {
      (s.items || []).forEach((item) => {
        const prod = products.find((p) => p.id === item.productId || p.sku === item.sku);
        cogs += (item.quantity || 0) * (prod?.purchasePrice || 0);
      });
    });

    const grossProfit = netSales - cogs;
    const grossMarginPct = netSales > 0 ? (grossProfit / netSales) * 100 : 0;

    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const netProfit = grossProfit - totalExpenses;
    const netMarginPct = netSales > 0 ? (netProfit / netSales) * 100 : 0;

    const outstandingCredit = branchCredits.reduce((sum, c) => sum + (c.remainingBalance || 0), 0);

    let inventoryCostValue = 0;
    let lowStockCount = 0;
    branchInv.forEach((inv) => {
      const prod = products.find((p) => p.id === inv.productId);
      inventoryCostValue += (prod?.purchasePrice || 0) * (inv.quantity || 0);
      const reorder = inv.reorderLevel || prod?.minStockLevel || 10;
      if (inv.quantity <= reorder) {
        lowStockCount += 1;
      }
    });

    const averageSaleValue = filteredSales.length > 0 ? grossSales / filteredSales.length : 0;

    // Performance Status determination
    let performanceStatus: BranchComparisonItem['performanceStatus'] = 'PROFITABLE';
    let statusReason = 'Steady operations and positive margins.';

    if (netProfit < 0 || lowStockCount >= 5 || (netSales > 0 && outstandingCredit / netSales > 0.4)) {
      performanceStatus = 'ATTENTION_NEEDED';
      if (netProfit < 0) {
        statusReason = 'Operating at a net loss; review high expenses vs gross margin.';
      } else if (lowStockCount >= 5) {
        statusReason = `Severe stock shortages (${lowStockCount} items below reorder level).`;
      } else {
        statusReason = 'High overdue customer receivables relative to revenue.';
      }
    } else if (netProfit > 500000 && grossMarginPct >= 20) {
      performanceStatus = 'TOP_PERFORMER';
      statusReason = 'Excellent profitability, strong volume, and solid margins.';
    }

    return {
      branchId: b.id,
      branchName: b.name,
      state: b.state,
      completedSalesCount: filteredSales.length,
      grossSales,
      returnsValue,
      netSales,
      cogs,
      grossProfit,
      grossMarginPct,
      expenses: totalExpenses,
      netProfit,
      netMarginPct,
      outstandingCredit,
      inventoryCostValue,
      lowStockCount,
      averageSaleValue,
      performanceStatus,
      statusReason
    };
  });
}

/**
 * Calculates consolidated branch level summary (backwards-compatible)
 */
export function getBranchSummary(
  branchId: string,
  sales: Sale[] = [],
  expenses: Expense[] = [],
  credits: CustomerCredit[] = [],
  returns: SalesReturn[] = [],
  inventory: BranchInventory[] = [],
  products: Product[] = []
): {
  branchId: string;
  branchName: string;
  grossSales: number;
  netSales: number;
  expenses: number;
  returnsValue: number;
  outstandingCredit: number;
  inventoryValue: number;
} {
  const salesSum = getSalesSummary(sales, returns, branchId);
  const expenseSum = getExpenseSummary(expenses, branchId);
  const creditSum = getCreditSummary(credits, [], returns, branchId);
  const returnSum = getReturnSummary(returns, branchId);
  const stockSum = getStockSummary(inventory, products, [], branchId);

  return {
    branchId,
    branchName: sales.find((s) => s.branchId === branchId)?.branchName || 'Branch Location',
    grossSales: salesSum.grossSales,
    netSales: salesSum.netSales,
    expenses: expenseSum.totalExpensesAmount,
    returnsValue: returnSum.totalReturnValue,
    outstandingCredit: creditSum.totalOutstandingBalance,
    inventoryValue: stockSum.totalInventoryCostValue
  };
}
