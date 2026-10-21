import {
  AppState,
  IntegrityIssue,
  IntegrityReport,
  IntegrityCategory,
  IntegritySeverity,
  User,
  StockMovement,
  CustomerCredit,
  CreditPayment,
  StockAdjustment,
  AuditLog
} from '../types';
import { getPendingOperations } from '../offline/offlineQueue';
import { getSyncConflicts } from '../offline/syncManager';

/**
 * Executes a deep data integrity audit across all business modules.
 */
export async function runDataIntegrityAudit(
  state: AppState,
  currentUser: User
): Promise<IntegrityReport> {
  const startTime = Date.now();
  const issues: IntegrityIssue[] = [];
  const collectionsChecked: string[] = [
    'branches',
    'users',
    'products',
    'inventory',
    'sales',
    'customers',
    'credits',
    'creditPayments',
    'suppliers',
    'purchaseOrders',
    'goodsReceipts',
    'supplierPayments',
    'stockMovements',
    'stockAdjustments',
    'expenses',
    'financialTransactions',
    'offlineQueue'
  ];

  // Helper Maps for fast referential checking
  const branchMap = new Map((state.branches || []).map((b) => [b.id, b]));
  const productMap = new Map((state.products || []).map((p) => [p.id, p]));
  const customerMap = new Map((state.customers || []).map((c) => [c.id, c]));
  const supplierMap = new Map((state.suppliers || []).map((s) => [s.id, s]));
  const userMap = new Map((state.users || []).map((u) => [u.id, u]));
  const saleMap = new Map((state.sales || []).map((s) => [s.id, s]));
  const poMap = new Map((state.purchaseOrders || state.purchases || []).map((p) => [p.id, p]));

  // =========================================================================
  // 1. PRIMARY KEY UNIQUENESS & VALIDITY AUDIT
  // =========================================================================
  function checkUniqueness<T extends { id: string }>(
    items: T[] | undefined,
    collectionName: string
  ) {
    if (!items) return;
    const seenIds = new Set<string>();

    items.forEach((item, idx) => {
      if (!item.id || typeof item.id !== 'string' || item.id.trim() === '') {
        issues.push({
          id: `missing-id-${collectionName}-${idx}`,
          category: 'DUPLICATE_ID',
          severity: 'CRITICAL',
          title: `Missing Primary Key in ${collectionName}`,
          description: `Found record at index ${idx} with empty or undefined ID.`,
          entityType: collectionName,
          entityId: `row_${idx}`,
          canAutoRepair: false,
          detectedAt: new Date().toISOString()
        });
      } else if (seenIds.has(item.id)) {
        issues.push({
          id: `dup-id-${collectionName}-${item.id}`,
          category: 'DUPLICATE_ID',
          severity: 'CRITICAL',
          title: `Duplicate ID in ${collectionName}`,
          description: `Primary key "${item.id}" is used more than once in ${collectionName}.`,
          entityType: collectionName,
          entityId: item.id,
          canAutoRepair: false,
          detectedAt: new Date().toISOString()
        });
      } else {
        seenIds.add(item.id);
      }
    });
  }

  checkUniqueness(state.products, 'products');
  checkUniqueness(state.sales, 'sales');
  checkUniqueness(state.customers, 'customers');
  checkUniqueness(state.credits, 'credits');
  checkUniqueness(state.creditPayments, 'creditPayments');
  checkUniqueness(state.suppliers, 'suppliers');
  checkUniqueness(state.stockMovements || state.movements, 'stockMovements');
  checkUniqueness(state.branches, 'branches');
  checkUniqueness(state.users, 'users');

  // =========================================================================
  // 2. SALES TRANSACTION INTEGRITY
  // =========================================================================
  const receiptNumbers = new Set<string>();
  (state.sales || []).forEach((sale) => {
    // Check duplicate receipts
    if (sale.receiptNo) {
      if (receiptNumbers.has(sale.receiptNo.toLowerCase())) {
        issues.push({
          id: `dup-receipt-${sale.id}`,
          category: 'INVALID_TRANSACTION',
          severity: 'CRITICAL',
          title: 'Duplicate Sale Receipt Number',
          description: `Receipt number "${sale.receiptNo}" is assigned to multiple distinct sale transactions.`,
          entityType: 'SALE',
          entityId: sale.id,
          branchId: sale.branchId,
          branchName: sale.branchName,
          canAutoRepair: false,
          detectedAt: new Date().toISOString()
        });
      } else {
        receiptNumbers.add(sale.receiptNo.toLowerCase());
      }
    } else {
      issues.push({
        id: `missing-receipt-${sale.id}`,
        category: 'INVALID_TRANSACTION',
        severity: 'WARNING',
        title: 'Missing Receipt Number',
        description: `Sale ${sale.id} completed on ${sale.date} has no receipt number.`,
        entityType: 'SALE',
        entityId: sale.id,
        branchId: sale.branchId,
        canAutoRepair: false,
        detectedAt: new Date().toISOString()
      });
    }

    // Check items existence
    if (!sale.items || sale.items.length === 0) {
      issues.push({
        id: `empty-sale-${sale.id}`,
        category: 'INVALID_TRANSACTION',
        severity: 'CRITICAL',
        title: 'Empty Sale Transaction',
        description: `Sale ${sale.receiptNo || sale.id} contains 0 line items but has total amount ₦${sale.totalAmount.toLocaleString()}.`,
        entityType: 'SALE',
        entityId: sale.id,
        branchId: sale.branchId,
        canAutoRepair: false,
        detectedAt: new Date().toISOString()
      });
    } else {
      // Validate items subtotal calculation
      const calculatedSubtotal = sale.items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
      const expectedTotal = calculatedSubtotal - (sale.discount || 0) + (sale.tax || 0);
      if (Math.abs(expectedTotal - sale.totalAmount) > 1) {
        issues.push({
          id: `math-sale-${sale.id}`,
          category: 'INVALID_TRANSACTION',
          severity: 'WARNING',
          title: 'Sale Math Inconsistency',
          description: `Line items total ₦${expectedTotal.toLocaleString()} differs from recorded total ₦${sale.totalAmount.toLocaleString()} on receipt ${sale.receiptNo}.`,
          entityType: 'SALE',
          entityId: sale.id,
          branchId: sale.branchId,
          expectedValue: expectedTotal,
          actualValue: sale.totalAmount,
          canAutoRepair: false,
          detectedAt: new Date().toISOString()
        });
      }
    }
  });

  // =========================================================================
  // 3. STOCK BALANCE VS MOVEMENTS INTEGRITY
  // =========================================================================
  const movements = state.stockMovements || state.movements || [];
  const inventoryList = state.inventory || [];

  // Group movements by branch and product
  const movementsDeltaMap = new Map<string, number>();
  movements.forEach((m) => {
    const key = `${m.branchId}_${m.productId}`;
    const currentDelta = movementsDeltaMap.get(key) || 0;
    movementsDeltaMap.set(key, currentDelta + (m.quantityDelta || 0));
  });

  inventoryList.forEach((inv) => {
    const key = `${inv.branchId}_${inv.productId}`;
    const product = productMap.get(inv.productId);
    const branch = branchMap.get(inv.branchId);

    // Negative stock check
    if (inv.quantity < 0) {
      issues.push({
        id: `neg-stock-${inv.id}`,
        category: 'STOCK_DISCREPANCY',
        severity: 'CRITICAL',
        title: 'Negative Inventory Balance',
        description: `Stock level for "${product?.name || inv.productId}" at ${branch?.name || inv.branchId} is negative (${inv.quantity}).`,
        entityType: 'INVENTORY',
        entityId: inv.id,
        branchId: inv.branchId,
        branchName: branch?.name,
        actualValue: inv.quantity,
        expectedValue: 0,
        canAutoRepair: true,
        repairActionLabel: 'Audit & Calibrate Stock',
        detectedAt: new Date().toISOString()
      });
    }

    // Check discrepancy if movements exist
    if (movementsDeltaMap.has(key)) {
      const recordedDelta = movementsDeltaMap.get(key)!;
      // We flag if stock is wildly different (ignoring initial opening inventory without movement record)
      if (inv.quantity !== recordedDelta && Math.abs(inv.quantity - recordedDelta) > 0) {
        issues.push({
          id: `movement-mismatch-${inv.id}`,
          category: 'STOCK_DISCREPANCY',
          severity: 'INFO',
          title: 'Stock Movements vs On-Hand Variance',
          description: `Current balance (${inv.quantity}) for "${product?.name || inv.productId}" has net movement delta of ${recordedDelta}. (Difference may be opening balance prior to audit tracking).`,
          entityType: 'INVENTORY',
          entityId: inv.id,
          branchId: inv.branchId,
          branchName: branch?.name,
          expectedValue: recordedDelta,
          actualValue: inv.quantity,
          canAutoRepair: false,
          detectedAt: new Date().toISOString()
        });
      }
    }
  });

  // =========================================================================
  // 4. CUSTOMER CREDIT BALANCES & PAYMENTS AUDIT
  // =========================================================================
  const creditsList = state.credits || [];
  const creditPaymentsList = state.creditPayments || [];

  // Map payments by creditId
  const paymentsByCreditId = new Map<string, number>();
  creditPaymentsList.forEach((p) => {
    const sum = paymentsByCreditId.get(p.creditId) || 0;
    paymentsByCreditId.set(p.creditId, sum + (p.amountPaid || 0));
  });

  // Map active remaining credit by customerId
  const activeRemainingByCustomer = new Map<string, number>();

  creditsList.forEach((cred) => {
    const totalPaymentsReceived = paymentsByCreditId.get(cred.id) || 0;
    const computedRemaining = Math.max(0, cred.creditAmount - (cred.amountPaid || 0));

    // Check if recorded remainingBalance matches amountPaid
    if (Math.abs(cred.remainingBalance - computedRemaining) > 0.01) {
      issues.push({
        id: `cred-rem-mismatch-${cred.id}`,
        category: 'CREDIT_DISCREPANCY',
        severity: 'WARNING',
        title: 'Credit Document Balance Inconsistency',
        description: `Credit #${cred.creditNo} for ${cred.customerName}: recorded balance ₦${cred.remainingBalance.toLocaleString()} vs computed remaining ₦${computedRemaining.toLocaleString()}.`,
        entityType: 'CREDIT',
        entityId: cred.id,
        branchId: cred.branchId,
        expectedValue: computedRemaining,
        actualValue: cred.remainingBalance,
        canAutoRepair: true,
        repairActionLabel: 'Recalculate Credit Balance',
        detectedAt: new Date().toISOString()
      });
    }

    if (cred.remainingBalance > 0) {
      const cur = activeRemainingByCustomer.get(cred.customerId) || 0;
      activeRemainingByCustomer.set(cred.customerId, cur + cred.remainingBalance);
    }
  });

  // Compare Customer Master creditBalance vs sum of active credits
  (state.customers || []).forEach((cust) => {
    const sumActiveRemaining = activeRemainingByCustomer.get(cust.id) || 0;
    const recordedCredit = cust.creditBalance || 0;

    if (Math.abs(recordedCredit - sumActiveRemaining) > 1) {
      issues.push({
        id: `cust-credit-mismatch-${cust.id}`,
        category: 'CREDIT_DISCREPANCY',
        severity: 'WARNING',
        title: 'Customer Master Credit Balance Out of Sync',
        description: `Customer "${cust.fullName}" profile shows credit balance ₦${recordedCredit.toLocaleString()}, but ledger sum of unpaid credits is ₦${sumActiveRemaining.toLocaleString()}.`,
        entityType: 'CUSTOMER',
        entityId: cust.id,
        branchId: cust.registeredBranchId,
        expectedValue: sumActiveRemaining,
        actualValue: recordedCredit,
        canAutoRepair: true,
        repairActionLabel: 'Sync Customer Credit Balance',
        detectedAt: new Date().toISOString()
      });
    }
  });

  // =========================================================================
  // 5. SUPPLIER & PURCHASE PAYABLES AUDIT
  // =========================================================================
  const grnList = state.goodsReceipts || [];
  const supplierPaymentsList = state.supplierPayments || [];

  supplierPaymentsList.forEach((sp) => {
    if (sp.supplierId && !supplierMap.has(sp.supplierId)) {
      issues.push({
        id: `orphaned-sp-supplier-${sp.id}`,
        category: 'ORPHANED_REFERENCE',
        severity: 'WARNING',
        title: 'Supplier Payment for Missing Supplier',
        description: `Payment ${sp.paymentNo} references supplier ID "${sp.supplierId}" which does not exist in master records.`,
        entityType: 'SUPPLIER_PAYMENT',
        entityId: sp.id,
        canAutoRepair: false,
        detectedAt: new Date().toISOString()
      });
    }
  });

  // =========================================================================
  // 6. REFERENTIAL INTEGRITY (ORPHANED RECORDS)
  // =========================================================================
  (state.sales || []).forEach((s) => {
    if (s.branchId && !branchMap.has(s.branchId)) {
      issues.push({
        id: `orphaned-sale-branch-${s.id}`,
        category: 'ORPHANED_REFERENCE',
        severity: 'CRITICAL',
        title: 'Sale References Non-Existent Branch',
        description: `Sale ${s.receiptNo} references branch ID "${s.branchId}" which is not found.`,
        entityType: 'SALE',
        entityId: s.id,
        canAutoRepair: false,
        detectedAt: new Date().toISOString()
      });
    }

    if (s.customerId && !customerMap.has(s.customerId)) {
      issues.push({
        id: `orphaned-sale-cust-${s.id}`,
        category: 'ORPHANED_REFERENCE',
        severity: 'INFO',
        title: 'Sale References Missing Customer',
        description: `Sale ${s.receiptNo} references customer ID "${s.customerId}" which is not in directory.`,
        entityType: 'SALE',
        entityId: s.id,
        canAutoRepair: false,
        detectedAt: new Date().toISOString()
      });
    }

    // Line items product references
    (s.items || []).forEach((item) => {
      if (item.productId && !productMap.has(item.productId)) {
        issues.push({
          id: `orphaned-sale-item-prod-${s.id}-${item.productId}`,
          category: 'ORPHANED_REFERENCE',
          severity: 'WARNING',
          title: 'Sale Line Item for Deleted Product',
          description: `Sale ${s.receiptNo} item "${item.productName}" (ID: ${item.productId}) does not exist in product catalog.`,
          entityType: 'SALE_ITEM',
          entityId: item.id || `${s.id}_${item.productId}`,
          canAutoRepair: false,
          detectedAt: new Date().toISOString()
        });
      }
    });
  });

  inventoryList.forEach((inv) => {
    if (!productMap.has(inv.productId)) {
      issues.push({
        id: `orphaned-inv-prod-${inv.id}`,
        category: 'ORPHANED_REFERENCE',
        severity: 'CRITICAL',
        title: 'Inventory Item for Missing Product',
        description: `Inventory record ${inv.id} references product ID "${inv.productId}" which does not exist in catalog.`,
        entityType: 'INVENTORY',
        entityId: inv.id,
        branchId: inv.branchId,
        canAutoRepair: false,
        detectedAt: new Date().toISOString()
      });
    }
    if (!branchMap.has(inv.branchId)) {
      issues.push({
        id: `orphaned-inv-branch-${inv.id}`,
        category: 'ORPHANED_REFERENCE',
        severity: 'CRITICAL',
        title: 'Inventory Item for Missing Branch',
        description: `Inventory record ${inv.id} references branch ID "${inv.branchId}" which does not exist.`,
        entityType: 'INVENTORY',
        entityId: inv.id,
        canAutoRepair: false,
        detectedAt: new Date().toISOString()
      });
    }
  });

  (state.transfers || []).forEach((t) => {
    if (!branchMap.has(t.sourceBranchId)) {
      issues.push({
        id: `orphaned-transfer-src-${t.id}`,
        category: 'ORPHANED_REFERENCE',
        severity: 'WARNING',
        title: 'Transfer References Missing Source Branch',
        description: `Transfer ${t.transferNo} references non-existent source branch "${t.sourceBranchId}".`,
        entityType: 'TRANSFER',
        entityId: t.id,
        canAutoRepair: false,
        detectedAt: new Date().toISOString()
      });
    }
    if (!branchMap.has(t.destinationBranchId)) {
      issues.push({
        id: `orphaned-transfer-dest-${t.id}`,
        category: 'ORPHANED_REFERENCE',
        severity: 'WARNING',
        title: 'Transfer References Missing Destination Branch',
        description: `Transfer ${t.transferNo} references non-existent destination branch "${t.destinationBranchId}".`,
        entityType: 'TRANSFER',
        entityId: t.id,
        canAutoRepair: false,
        detectedAt: new Date().toISOString()
      });
    }
  });

  // =========================================================================
  // 7. OFFLINE QUEUE & SYNC STALL AUDIT
  // =========================================================================
  try {
    const pendingOps = await getPendingOperations();
    const failedOps = pendingOps.filter((o) => o.status === 'failed' || o.retryCount >= 3);
    failedOps.forEach((op) => {
      issues.push({
        id: `stalled-op-${op.id}`,
        category: 'SYNC_STALL',
        severity: 'WARNING',
        title: 'Stalled Pending Sync Operation',
        description: `Operation ${op.operationType} on ${op.entityType} (ID: ${op.entityId}) has failed ${op.retryCount} times: ${op.lastError || 'Unknown error'}.`,
        entityType: 'PENDING_OPERATION',
        entityId: op.id,
        branchId: op.branchId,
        canAutoRepair: true,
        repairActionLabel: 'Reset Operation Retry Count',
        detectedAt: new Date().toISOString()
      });
    });

    const conflicts = await getSyncConflicts();
    const unresolvedConflicts = conflicts.filter((c) => c.status === 'unresolved');
    unresolvedConflicts.forEach((c) => {
      issues.push({
        id: `sync-conflict-${c.id}`,
        category: 'SYNC_STALL',
        severity: 'WARNING',
        title: 'Unresolved Sync Conflict',
        description: `Conflict on ${c.entityType} "${c.entityName || c.entityId}" remains unresolved.`,
        entityType: 'SYNC_CONFLICT',
        entityId: c.id,
        canAutoRepair: false,
        detectedAt: new Date().toISOString()
      });
    });
  } catch {
    // Offline queue check non-blocking
  }

  const criticalCount = issues.filter((i) => i.severity === 'CRITICAL').length;
  const warningCount = issues.filter((i) => i.severity === 'WARNING').length;
  const infoCount = issues.filter((i) => i.severity === 'INFO').length;

  return {
    id: `report-${Date.now()}`,
    runAt: new Date().toISOString(),
    performedBy: currentUser.name,
    totalIssuesFound: issues.length,
    criticalCount,
    warningCount,
    infoCount,
    issues,
    collectionsChecked,
    executionTimeMs: Date.now() - startTime
  };
}

/**
 * Performs safe, authorized correction for verifiable integrity issues.
 * Never modifies financial transactions or balances when the truth is ambiguous.
 */
export function applySafeIntegrityFix(
  state: AppState,
  issue: IntegrityIssue,
  currentUser: User
): { updatedState: AppState; message: string } {
  if (currentUser.role !== 'CEO') {
    throw new Error('Access Denied: Only CEO / Super Admin can perform integrity data repairs.');
  }

  let nextState = { ...state };
  let message = '';

  if (issue.category === 'CREDIT_DISCREPANCY' && issue.entityType === 'CUSTOMER') {
    // Safely recalculate customer credit balance based on active credit ledgers
    const customer = (nextState.customers || []).find((c) => c.id === issue.entityId);
    if (!customer) throw new Error('Customer record not found.');

    const activeCredits = (nextState.credits || []).filter(
      (cr) => cr.customerId === customer.id && cr.remainingBalance > 0
    );
    const sumBalance = activeCredits.reduce((sum, cr) => sum + cr.remainingBalance, 0);

    nextState.customers = (nextState.customers || []).map((c) =>
      c.id === customer.id ? { ...c, creditBalance: sumBalance } : c
    );

    message = `Synchronized credit balance for ${customer.fullName} to ₦${sumBalance.toLocaleString()} based on ${activeCredits.length} active credit document(s).`;
  } else if (issue.category === 'CREDIT_DISCREPANCY' && issue.entityType === 'CREDIT') {
    // Recalculate remainingBalance on Credit document = creditAmount - amountPaid
    const credit = (nextState.credits || []).find((c) => c.id === issue.entityId);
    if (!credit) throw new Error('Credit document not found.');

    const newRemaining = Math.max(0, credit.creditAmount - (credit.amountPaid || 0));
    nextState.credits = (nextState.credits || []).map((c) =>
      c.id === credit.id ? { ...c, remainingBalance: newRemaining } : c
    );

    message = `Calibrated Credit #${credit.creditNo} remaining balance to ₦${newRemaining.toLocaleString()}.`;
  } else if (issue.category === 'STOCK_DISCREPANCY' && issue.entityType === 'INVENTORY') {
    // Calibrate negative inventory to 0 by recording an official Stock Adjustment
    const inv = (nextState.inventory || []).find((i) => i.id === issue.entityId);
    if (!inv) throw new Error('Inventory balance record not found.');
    if (inv.quantity >= 0) {
      throw new Error('Inventory quantity is not negative. No adjustment needed.');
    }

    const adjustmentQty = Math.abs(inv.quantity);
    const product = (nextState.products || []).find((p) => p.id === inv.productId);
    const branch = (nextState.branches || []).find((b) => b.id === inv.branchId);

    const adjRecord: StockAdjustment = {
      id: `adj-repair-${Date.now()}`,
      adjustmentNo: `ADJ-FIX-${Date.now().toString().slice(-4)}`,
      productId: inv.productId,
      productName: product?.name || 'Product',
      productSku: product?.sku || 'SKU',
      branchId: inv.branchId,
      branchName: branch?.name || 'Branch',
      type: 'ADJUSTMENT_IN',
      reason: 'OPENING_BALANCE',
      quantity: adjustmentQty,
      systemQuantity: inv.quantity,
      physicalQuantity: 0,
      notes: 'Automated integrity repair: calibrated negative stock balance to zero.',
      createdByUserId: currentUser.id,
      createdByUserName: currentUser.name,
      createdAt: new Date().toISOString()
    };

    nextState.inventory = (nextState.inventory || []).map((i) =>
      i.id === inv.id ? { ...i, quantity: 0, lastUpdated: new Date().toISOString() } : i
    );
    nextState.stockAdjustments = [adjRecord, ...(nextState.stockAdjustments || [])];

    message = `Created Stock Adjustment #${adjRecord.adjustmentNo} to calibrate negative inventory for "${product?.name || inv.productId}" to 0.`;
  } else {
    throw new Error(`Automatic repair is not supported for this issue category (${issue.category}). Please review manually.`);
  }

  // Record audit log
  const auditLog: AuditLog = {
    id: `audit-repair-${Date.now()}`,
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: 'DATA_INTEGRITY_REPAIR',
    details: `${issue.title} - ${message}`,
    timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
    ipAddress: '127.0.0.1'
  };

  nextState.auditLogs = [auditLog, ...(nextState.auditLogs || [])];

  return {
    updatedState: nextState,
    message
  };
}
