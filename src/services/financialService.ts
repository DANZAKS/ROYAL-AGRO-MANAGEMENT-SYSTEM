import {
  AppState,
  FinancialTransaction,
  FinancialTransactionType,
  PaymentMethod,
  SupplierPaymentMethod,
  CashSession,
  CashReconciliation,
  Sale,
  Expense,
  SupplierPayment,
  CreditPayment,
  SalesReturn
} from '../types';

export function getPaymentCategory(method?: PaymentMethod | SupplierPaymentMethod | string): 'CASH' | 'BANK' | 'POS' | 'CHEQUE' | 'OTHER' {
  if (!method) return 'CASH';
  const m = String(method).toUpperCase();
  if (m === 'CASH') return 'CASH';
  if (m === 'BANK_TRANSFER' || m === 'BANK_DRAFT' || m === 'TRANSFER') return 'BANK';
  if (m === 'POS') return 'POS';
  if (m === 'CHEQUE') return 'CHEQUE';
  return 'OTHER';
}

/**
 * Derives the complete, unified financial ledger from all source transactions in the application.
 * Calculates dynamically from existing transactions to ensure zero duplication and strict idempotency.
 */
export function deriveFinancialTransactions(state: AppState): FinancialTransaction[] {
  const transactions: FinancialTransaction[] = [];
  const processedIds = new Set<string>();

  // 1. Sales (Cash / Paid portion of sales)
  const sales = state.sales || [];
  for (const sale of sales) {
    if (sale.status === 'CANCELLED') continue;

    // Calculate actual money paid vs credit portion
    const isFullCredit = sale.paymentMethod === 'CREDIT' && (sale.amountPaid === undefined || sale.amountPaid === 0);
    const paidAmount = isFullCredit ? 0 : (sale.amountPaid !== undefined ? sale.amountPaid : sale.totalAmount);

    if (paidAmount > 0) {
      const finId = `fin-sale-${sale.id}`;
      if (!processedIds.has(finId)) {
        processedIds.add(finId);
        transactions.push({
          id: finId,
          financialTransactionId: finId,
          branchId: sale.branchId,
          branchName: sale.branchName,
          transactionType: 'SALE',
          referenceId: sale.id,
          referenceNumber: sale.receiptNo || `SALE-${sale.id}`,
          description: `Sale Revenue: ${sale.customerName || 'Walk-in Customer'} (${sale.items?.length || 1} items)`,
          moneyIn: paidAmount,
          moneyOut: 0,
          paymentMethod: sale.paymentMethod === 'CREDIT' ? 'CASH' : sale.paymentMethod,
          paymentCategory: getPaymentCategory(sale.paymentMethod),
          createdByUserId: sale.staffUserId || 'usr-1',
          createdByUserName: sale.staffName || 'Sales Officer',
          transactionDate: sale.date || (sale.timestamp ? sale.timestamp.split('T')[0] : new Date().toISOString().split('T')[0]),
          timestamp: sale.timestamp || new Date().toISOString(),
          createdAt: sale.timestamp || new Date().toISOString(),
          status: 'COMPLETED',
          notes: sale.paymentReference ? `Ref: ${sale.paymentReference}` : undefined
        });
      }
    }
  }

  // 2. Customer Credit Payments
  const creditPayments = state.creditPayments || [];
  for (const cp of creditPayments) {
    const finId = `fin-cpay-${cp.id}`;
    if (!processedIds.has(finId)) {
      processedIds.add(finId);

      // Lookup branch name from credits if available
      let bName = 'Branch';
      if (cp.branchId) {
        const foundB = (state.branches || []).find(b => b.id === cp.branchId);
        if (foundB) bName = foundB.name;
      }

      transactions.push({
        id: finId,
        financialTransactionId: finId,
        branchId: cp.branchId || 'br-1',
        branchName: bName,
        transactionType: 'CUSTOMER_CREDIT_PAYMENT',
        referenceId: cp.id,
        referenceNumber: cp.paymentNo || cp.receiptNo || `CPAY-${cp.id}`,
        description: `Customer Credit Repayment: ${cp.customerName}`,
        moneyIn: cp.amountPaid,
        moneyOut: 0,
        paymentMethod: cp.paymentMethod,
        paymentCategory: getPaymentCategory(cp.paymentMethod),
        createdByUserId: cp.receivedByUserId || 'usr-1',
        createdByUserName: cp.receivedByUserName || 'Cashier',
        transactionDate: cp.paymentDate || (cp.createdAt ? cp.createdAt.split(' ')[0] : new Date().toISOString().split('T')[0]),
        timestamp: cp.createdAt ? (cp.createdAt.includes('T') ? cp.createdAt : `${cp.createdAt}:00Z`) : new Date().toISOString(),
        createdAt: cp.createdAt || new Date().toISOString(),
        status: 'COMPLETED',
        notes: cp.notes || cp.referenceNumber
      });
    }
  }

  // 3. Operating Expenses
  const expenses = state.expenses || [];
  for (const exp of expenses) {
    if (exp.status === 'CANCELLED') continue;

    const finId = `fin-exp-${exp.id}`;
    if (!processedIds.has(finId)) {
      processedIds.add(finId);
      const catLabel = exp.category ? exp.category.replace(/_/g, ' ') : 'General Expense';
      transactions.push({
        id: finId,
        financialTransactionId: finId,
        branchId: exp.branchId,
        branchName: exp.branchName,
        transactionType: 'EXPENSE',
        referenceId: exp.id,
        referenceNumber: exp.receiptRef || `EXP-${exp.id}`,
        description: `${catLabel}: ${exp.description || exp.vendorName || ''}`,
        moneyIn: 0,
        moneyOut: exp.amount,
        paymentMethod: 'CASH', // default or custom
        paymentCategory: 'CASH',
        createdByUserId: exp.recordedByUserId || 'usr-1',
        createdByUserName: exp.recordedByUserName || 'Staff',
        transactionDate: exp.date || (exp.createdAt ? exp.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]),
        timestamp: exp.createdAt || `${exp.date}T12:00:00Z`,
        createdAt: exp.createdAt || `${exp.date}T12:00:00Z`,
        status: 'COMPLETED',
        notes: exp.vendorName ? `Vendor: ${exp.vendorName}` : undefined
      });
    }
  }

  // 4. Supplier Payments
  const supplierPayments = state.supplierPayments || [];
  for (const sp of supplierPayments) {
    if (sp.status === 'CANCELLED') continue;

    const finId = `fin-sp-${sp.id}`;
    if (!processedIds.has(finId)) {
      processedIds.add(finId);
      transactions.push({
        id: finId,
        financialTransactionId: finId,
        branchId: sp.branchId || 'br-1',
        branchName: sp.branchName || 'Head Office',
        transactionType: 'SUPPLIER_PAYMENT',
        referenceId: sp.id,
        referenceNumber: sp.paymentNo || sp.reference || `SP-${sp.id}`,
        description: `Supplier Settlement: ${sp.supplierName} (${sp.purchaseOrderNumber || 'General Invoice'})`,
        moneyIn: 0,
        moneyOut: sp.amount,
        paymentMethod: sp.paymentMethod,
        paymentCategory: getPaymentCategory(sp.paymentMethod),
        createdByUserId: sp.recordedByUserId || sp.paidByUserId || 'usr-1',
        createdByUserName: sp.recordedByUserName || sp.paidByUserName || 'Executive',
        transactionDate: sp.paymentDate || (sp.createdAt ? sp.createdAt.split(' ')[0] : new Date().toISOString().split('T')[0]),
        timestamp: sp.createdAt ? (sp.createdAt.includes('T') ? sp.createdAt : `${sp.createdAt}:00Z`) : new Date().toISOString(),
        createdAt: sp.createdAt || new Date().toISOString(),
        status: 'COMPLETED',
        notes: sp.bankName ? `Bank: ${sp.bankName}` : sp.notes
      });
    }
  }

  // 5. Sales Returns Cash Refunds
  const salesReturns = state.salesReturns || [];
  for (const ret of salesReturns) {
    if (ret.status !== 'REJECTED' && ret.returnType === 'REFUND' && ret.refundAmount > 0) {
      const finId = `fin-ret-${ret.id}`;
      if (!processedIds.has(finId)) {
        processedIds.add(finId);
        transactions.push({
          id: finId,
          financialTransactionId: finId,
          branchId: ret.branchId,
          branchName: ret.branchName,
          transactionType: 'REFUND',
          referenceId: ret.id,
          referenceNumber: ret.returnNo || `RET-${ret.id}`,
          description: `Customer Cash Refund: ${ret.customerName} (Orig: ${ret.receiptNo})`,
          moneyIn: 0,
          moneyOut: ret.refundAmount,
          paymentMethod: 'CASH',
          paymentCategory: 'CASH',
          createdByUserId: ret.submittedByUserId || 'usr-1',
          createdByUserName: ret.submittedByUserName || 'Staff',
          transactionDate: ret.returnDate || (ret.createdAt ? ret.createdAt.split(' ')[0] : new Date().toISOString().split('T')[0]),
          timestamp: ret.createdAt || new Date().toISOString(),
          createdAt: ret.createdAt || new Date().toISOString(),
          status: 'COMPLETED',
          notes: ret.notes
        });
      }
    }
  }

  // 6. Direct / Other Financial Transactions stored in state (Other Income, Cash Reversals, Opening Balances)
  const manualFin = state.financialTransactions || [];
  for (const mf of manualFin) {
    if (!processedIds.has(mf.id)) {
      processedIds.add(mf.id);
      transactions.push({
        ...mf,
        paymentCategory: mf.paymentCategory || getPaymentCategory(mf.paymentMethod)
      });
    }
  }

  // Sort descending by timestamp / transactionDate
  return transactions.sort((a, b) => {
    const timeA = new Date(a.timestamp || a.transactionDate).getTime();
    const timeB = new Date(b.timestamp || b.transactionDate).getTime();
    return timeB - timeA;
  });
}

export interface FinancialFilterOptions {
  branchId?: string | null;
  startDate?: string;
  endDate?: string;
  preset?: 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'THIS_QUARTER' | 'THIS_YEAR' | 'ALL' | 'CUSTOM';
  transactionType?: string;
  paymentCategory?: string;
  searchTerm?: string;
}

export function filterFinancialTransactions(
  transactions: FinancialTransaction[],
  filters: FinancialFilterOptions
): FinancialTransaction[] {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  let start = filters.startDate;
  let end = filters.endDate;

  if (filters.preset && filters.preset !== 'CUSTOM' && filters.preset !== 'ALL') {
    if (filters.preset === 'TODAY') {
      start = todayStr;
      end = todayStr;
    } else if (filters.preset === 'YESTERDAY') {
      const y = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const yStr = y.toISOString().split('T')[0];
      start = yStr;
      end = yStr;
    } else if (filters.preset === 'THIS_WEEK') {
      const d = new Date(now);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
      const monday = new Date(d.setDate(diff));
      start = monday.toISOString().split('T')[0];
      end = todayStr;
    } else if (filters.preset === 'THIS_MONTH') {
      start = `${todayStr.slice(0, 7)}-01`;
      end = todayStr;
    } else if (filters.preset === 'THIS_YEAR') {
      start = `${todayStr.slice(0, 4)}-01-01`;
      end = todayStr;
    }
  }

  return transactions.filter((tx) => {
    // Branch filter
    if (filters.branchId && tx.branchId !== filters.branchId) {
      return false;
    }

    // Date range filter
    if (start && tx.transactionDate < start) return false;
    if (end && tx.transactionDate > end) return false;

    // Type filter
    if (filters.transactionType && filters.transactionType !== 'ALL') {
      if (tx.transactionType !== filters.transactionType) return false;
    }

    // Payment Category filter
    if (filters.paymentCategory && filters.paymentCategory !== 'ALL') {
      if (tx.paymentCategory !== filters.paymentCategory) return false;
    }

    // Search term
    if (filters.searchTerm && filters.searchTerm.trim() !== '') {
      const term = filters.searchTerm.toLowerCase();
      const matchRef = tx.referenceNumber?.toLowerCase().includes(term);
      const matchDesc = tx.description?.toLowerCase().includes(term);
      const matchUser = tx.createdByUserName?.toLowerCase().includes(term);
      const matchBranch = tx.branchName?.toLowerCase().includes(term);
      const matchNotes = tx.notes?.toLowerCase().includes(term);
      if (!matchRef && !matchDesc && !matchUser && !matchBranch && !matchNotes) {
        return false;
      }
    }

    return true;
  });
}

export interface FinancialSummaryMetrics {
  salesRevenue: number;
  costOfGoodsSold: number;
  grossProfit: number;
  grossProfitMargin: number;
  totalExpenses: number;
  netOperatingResult: number;
  netProfitMargin: number;
  totalMoneyIn: number;
  cashReceived: number;
  bankReceived: number;
  posReceived: number;
  chequeReceived: number;
  totalMoneyOut: number;
  cashOut: number;
  bankOut: number;
  netCashFlow: number;
  netPhysicalCash: number;
  customerReceivables: number;
  overdueReceivables: number;
  supplierPayables: number;
  inventoryValuation: number;
  creditSalesVolume: number;
  cashSalesVolume: number;
  paymentMethodBreakdown: {
    CASH: number;
    BANK_TRANSFER: number;
    POS: number;
    CHEQUE: number;
    OTHER: number;
  };
  transactionsCount: number;
}

export function calculateFinancialMetrics(
  state: AppState,
  branchId: string | null,
  filters?: { startDate?: string; endDate?: string }
): FinancialSummaryMetrics {
  const allFinTx = deriveFinancialTransactions(state);
  const filteredTx = filterFinancialTransactions(allFinTx, {
    branchId: branchId || undefined,
    startDate: filters?.startDate,
    endDate: filters?.endDate
  });

  const products = state.products || [];
  const productPriceMap = new Map<string, { purchasePrice: number; sellingPrice: number }>();
  products.forEach(p => productPriceMap.set(p.id, { purchasePrice: p.purchasePrice, sellingPrice: p.sellingPrice }));

  // Filter sales for revenue & COGS calculation
  const relevantSales = (state.sales || []).filter(s => {
    if (s.status === 'CANCELLED') return false;
    if (branchId && s.branchId !== branchId) return false;
    if (filters?.startDate && s.date < filters.startDate) return false;
    if (filters?.endDate && s.date > filters.endDate) return false;
    return true;
  });

  let salesRevenue = 0;
  let costOfGoodsSold = 0;
  let creditSalesVolume = 0;
  let cashSalesVolume = 0;

  for (const s of relevantSales) {
    salesRevenue += (s.totalAmount || 0);

    if (s.paymentMethod === 'CREDIT' || (s.balanceDue && s.balanceDue > 0)) {
      creditSalesVolume += (s.balanceDue || (s.totalAmount - (s.amountPaid || 0)));
      cashSalesVolume += (s.amountPaid || 0);
    } else {
      cashSalesVolume += (s.totalAmount || 0);
    }

    if (s.items && Array.isArray(s.items)) {
      for (const item of s.items) {
        const prod = productPriceMap.get(item.productId);
        const unitCost = prod ? prod.purchasePrice : (item.unitPrice * 0.75); // fallback estimate
        costOfGoodsSold += (item.quantity * unitCost);
      }
    }
  }

  // Adjust for sales returns (subtract returned COGS and revenue)
  const relevantReturns = (state.salesReturns || []).filter(r => {
    if (r.status === 'REJECTED') return false;
    if (branchId && r.branchId !== branchId) return false;
    if (filters?.startDate && r.returnDate < filters.startDate) return false;
    if (filters?.endDate && r.returnDate > filters.endDate) return false;
    return true;
  });

  for (const r of relevantReturns) {
    salesRevenue -= (r.totalReturnValue || 0);
    if (r.items && Array.isArray(r.items)) {
      for (const item of r.items) {
        if (item.condition === 'GOOD') {
          const prod = productPriceMap.get(item.productId);
          const unitCost = prod ? prod.purchasePrice : (item.unitPrice * 0.75);
          costOfGoodsSold -= (item.quantity * unitCost);
        }
      }
    }
  }

  // Ensure COGS does not go below 0
  costOfGoodsSold = Math.max(0, costOfGoodsSold);

  const grossProfit = salesRevenue - costOfGoodsSold;
  const grossProfitMargin = salesRevenue > 0 ? (grossProfit / salesRevenue) * 100 : 0;

  // Filter approved expenses
  const relevantExpenses = (state.expenses || []).filter(e => {
    if (e.status === 'CANCELLED') return false;
    if (branchId && e.branchId !== branchId) return false;
    if (filters?.startDate && e.date < filters.startDate) return false;
    if (filters?.endDate && e.date > filters.endDate) return false;
    return true;
  });

  const totalExpenses = relevantExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const netOperatingResult = grossProfit - totalExpenses;
  const netProfitMargin = salesRevenue > 0 ? (netOperatingResult / salesRevenue) * 100 : 0;

  // Money In / Out Calculations from derived financial ledger
  let totalMoneyIn = 0;
  let cashReceived = 0;
  let bankReceived = 0;
  let posReceived = 0;
  let chequeReceived = 0;

  let totalMoneyOut = 0;
  let cashOut = 0;
  let bankOut = 0;

  const paymentMethodBreakdown = {
    CASH: 0,
    BANK_TRANSFER: 0,
    POS: 0,
    CHEQUE: 0,
    OTHER: 0
  };

  for (const tx of filteredTx) {
    if (tx.moneyIn > 0) {
      totalMoneyIn += tx.moneyIn;
      if (tx.paymentCategory === 'CASH') {
        cashReceived += tx.moneyIn;
        paymentMethodBreakdown.CASH += tx.moneyIn;
      } else if (tx.paymentCategory === 'BANK') {
        bankReceived += tx.moneyIn;
        paymentMethodBreakdown.BANK_TRANSFER += tx.moneyIn;
      } else if (tx.paymentCategory === 'POS') {
        posReceived += tx.moneyIn;
        paymentMethodBreakdown.POS += tx.moneyIn;
      } else if (tx.paymentCategory === 'CHEQUE') {
        chequeReceived += tx.moneyIn;
        paymentMethodBreakdown.CHEQUE += tx.moneyIn;
      } else {
        paymentMethodBreakdown.OTHER += tx.moneyIn;
      }
    }

    if (tx.moneyOut > 0) {
      totalMoneyOut += tx.moneyOut;
      if (tx.paymentCategory === 'CASH') {
        cashOut += tx.moneyOut;
      } else if (tx.paymentCategory === 'BANK' || tx.paymentCategory === 'CHEQUE') {
        bankOut += tx.moneyOut;
      }
    }
  }

  const netCashFlow = totalMoneyIn - totalMoneyOut;
  const netPhysicalCash = cashReceived - cashOut;

  // Customer Receivables (unpaid credit)
  let customerReceivables = 0;
  let overdueReceivables = 0;
  const credits = state.credits || [];
  for (const c of credits) {
    if (!branchId || c.branchId === branchId) {
      if (c.paymentStatus !== 'PAID') {
        customerReceivables += (c.remainingBalance || 0);
        if (c.creditStatus === 'OVERDUE') {
          overdueReceivables += (c.remainingBalance || 0);
        }
      }
    }
  }

  // Supplier Payables
  let totalSupplierCost = 0;
  const purchaseOrders = state.purchaseOrders || state.purchases || [];
  for (const po of purchaseOrders) {
    if (po.status !== 'CANCELLED' && po.status !== 'DRAFT') {
      if (!branchId || po.branchId === branchId) {
        totalSupplierCost += (po.totalAmount || 0);
      }
    }
  }

  let totalSupplierPayments = 0;
  const supplierPayments = state.supplierPayments || [];
  for (const sp of supplierPayments) {
    if (sp.status !== 'CANCELLED') {
      if (!branchId || sp.branchId === branchId) {
        totalSupplierPayments += (sp.amount || 0);
      }
    }
  }
  const supplierPayables = Math.max(0, totalSupplierCost - totalSupplierPayments);

  // Inventory Asset Valuation
  let inventoryValuation = 0;
  const inventoryList = state.inventory || [];
  for (const inv of inventoryList) {
    if (!branchId || inv.branchId === branchId) {
      const prod = productPriceMap.get(inv.productId);
      const unitCost = prod ? prod.purchasePrice : 0;
      inventoryValuation += (inv.quantity * unitCost);
    }
  }

  return {
    salesRevenue,
    costOfGoodsSold,
    grossProfit,
    grossProfitMargin,
    totalExpenses,
    netOperatingResult,
    netProfitMargin,
    totalMoneyIn,
    cashReceived,
    bankReceived,
    posReceived,
    chequeReceived,
    totalMoneyOut,
    cashOut,
    bankOut,
    netCashFlow,
    netPhysicalCash,
    customerReceivables,
    overdueReceivables,
    supplierPayables,
    inventoryValuation,
    creditSalesVolume,
    cashSalesVolume,
    paymentMethodBreakdown,
    transactionsCount: filteredTx.length
  };
}

export interface DailyCashSummary {
  branchId: string;
  branchName: string;
  date: string;
  openingCash: number;
  cashSales: number;
  cashCreditPayments: number;
  otherCashIncome: number;
  totalCashIn: number;
  cashExpenses: number;
  cashSupplierPayments: number;
  cashRefunds: number;
  otherCashOut: number;
  totalCashOut: number;
  expectedClosingCash: number;
  actualClosingCash?: number;
  variance?: number;
  sessionStatus: 'OPEN' | 'CLOSED' | 'RECONCILED';
  activeSession?: CashSession;
}

export function calculateDailyCashSummary(
  state: AppState,
  branchId: string,
  targetDate: string
): DailyCashSummary {
  const branch = (state.branches || []).find(b => b.id === branchId);
  const branchName = branch ? branch.name : 'Branch';

  // Find existing session for date
  const sessions = state.cashSessions || [];
  const session = sessions.find(s => s.branchId === branchId && s.date === targetDate);
  const openingCash = session ? session.openingCash : 200000; // default standard float

  // All financial transactions for this branch and date
  const allFinTx = deriveFinancialTransactions(state);
  const dayTx = allFinTx.filter(tx => tx.branchId === branchId && tx.transactionDate === targetDate);

  let cashSales = 0;
  let cashCreditPayments = 0;
  let otherCashIncome = 0;

  let cashExpenses = 0;
  let cashSupplierPayments = 0;
  let cashRefunds = 0;
  let otherCashOut = 0;

  for (const tx of dayTx) {
    if (tx.paymentCategory === 'CASH') {
      if (tx.moneyIn > 0) {
        if (tx.transactionType === 'SALE') {
          cashSales += tx.moneyIn;
        } else if (tx.transactionType === 'CUSTOMER_CREDIT_PAYMENT' || tx.transactionType === 'CUSTOMER_PAYMENT') {
          cashCreditPayments += tx.moneyIn;
        } else {
          otherCashIncome += tx.moneyIn;
        }
      }

      if (tx.moneyOut > 0) {
        if (tx.transactionType === 'EXPENSE') {
          cashExpenses += tx.moneyOut;
        } else if (tx.transactionType === 'SUPPLIER_PAYMENT') {
          cashSupplierPayments += tx.moneyOut;
        } else if (tx.transactionType === 'REFUND') {
          cashRefunds += tx.moneyOut;
        } else {
          otherCashOut += tx.moneyOut;
        }
      }
    }
  }

  const totalCashIn = cashSales + cashCreditPayments + otherCashIncome;
  const totalCashOut = cashExpenses + cashSupplierPayments + cashRefunds + otherCashOut;
  const expectedClosingCash = openingCash + totalCashIn - totalCashOut;

  const actualClosingCash = session?.actualClosingCash;
  const variance = actualClosingCash !== undefined ? actualClosingCash - expectedClosingCash : undefined;

  return {
    branchId,
    branchName,
    date: targetDate,
    openingCash,
    cashSales,
    cashCreditPayments,
    otherCashIncome,
    totalCashIn,
    cashExpenses,
    cashSupplierPayments,
    cashRefunds,
    otherCashOut,
    totalCashOut,
    expectedClosingCash,
    actualClosingCash,
    variance,
    sessionStatus: session?.status || 'OPEN',
    activeSession: session
  };
}

/**
 * Calculates a running balance for a list of transactions chronologically.
 */
export function calculateChronologicalLedger(
  transactions: FinancialTransaction[],
  openingBalance = 0
): Array<FinancialTransaction & { runningBalance: number }> {
  // Sort ascending by time for running balance
  const ascending = [...transactions].sort((a, b) => {
    const timeA = new Date(a.timestamp || a.transactionDate).getTime();
    const timeB = new Date(b.timestamp || b.transactionDate).getTime();
    return timeA - timeB;
  });

  let balance = openingBalance;
  const ledgerWithBalance = ascending.map((tx) => {
    balance = balance + (tx.moneyIn || 0) - (tx.moneyOut || 0);
    return {
      ...tx,
      runningBalance: balance
    };
  });

  // Return descending for display
  return ledgerWithBalance.reverse();
}

/**
 * Export financial ledger data to CSV format
 */
export function exportToCSV(filename: string, rows: Array<Record<string, any>>): void {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const header = keys.join(',');
  const csvContent = [
    header,
    ...rows.map(row => keys.map(k => {
      let cell = row[k] === undefined || row[k] === null ? '' : String(row[k]);
      if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
        cell = `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    }).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
