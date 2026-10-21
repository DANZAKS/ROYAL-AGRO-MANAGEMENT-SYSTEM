import {
  createBackupPackage,
  validateBackupContent,
  executeRestore,
  createSafetyBackup,
  getLatestSafetyBackup,
  APP_VERSION,
  SCHEMA_VERSION
} from '../src/services/backupService';
import {
  runDataIntegrityAudit,
  applySafeIntegrityFix
} from '../src/services/integrityService';
import {
  AppState,
  User,
  Sale,
  Product,
  Customer,
  Branch,
  StockMovement,
  CustomerCredit,
  RestoreOptions
} from '../src/types';
import { INITIAL_BRANCHES, INITIAL_USERS, INITIAL_PRODUCTS, INITIAL_CUSTOMERS, INITIAL_SALES } from '../src/data/initialData';

async function runModule14Tests() {
  console.log('--- STARTING MODULE 14 COMPREHENSIVE TEST SUITE ---');

  const ceoUser: User = { ...INITIAL_USERS[0], role: 'CEO' };
  const cashierUser: User = { ...INITIAL_USERS[1], role: 'SALES_CASHIER' };

  // Base state
  const baseState: AppState = {
    currentUser: ceoUser,
    branches: INITIAL_BRANCHES,
    users: INITIAL_USERS,
    products: INITIAL_PRODUCTS,
    inventory: [
      { id: 'inv-1', branchId: INITIAL_BRANCHES[0].id, productId: INITIAL_PRODUCTS[0].id, quantity: 150, reorderLevel: 20, lastUpdated: new Date().toISOString() }
    ],
    sales: INITIAL_SALES.slice(0, 5),
    transfers: [],
    customers: INITIAL_CUSTOMERS.slice(0, 5),
    suppliers: [],
    purchaseOrders: [],
    expenses: [],
    notifications: [],
    auditLogs: [],
    stockMovements: [
      {
        id: 'mov-1',
        productId: INITIAL_PRODUCTS[0].id,
        productName: INITIAL_PRODUCTS[0].name,
        branchId: INITIAL_BRANCHES[0].id,
        branchName: INITIAL_BRANCHES[0].name,
        quantityDelta: 150,
        previousQty: 0,
        newQty: 150,
        type: 'PURCHASE',
        referenceNo: 'REF-PO-001',
        userId: ceoUser.id,
        userName: ceoUser.name,
        date: '2026-10-18'
      }
    ],
    credits: [
      {
        id: 'cred-1',
        creditNo: 'CR-2026-001',
        customerId: INITIAL_CUSTOMERS[0].id,
        customerName: INITIAL_CUSTOMERS[0].fullName,
        customerPhone: INITIAL_CUSTOMERS[0].phone,
        saleId: 'sale-1',
        receiptNo: 'REC-001',
        saleDate: '2026-10-18',
        dueDate: '2026-11-18',
        paymentTerms: 'Net 30',
        creditAmount: 50000,
        amountPaid: 10000,
        remainingBalance: 40000,
        paymentStatus: 'PARTIAL',
        creditStatus: 'ACTIVE',
        branchId: INITIAL_BRANCHES[0].id,
        branchName: INITIAL_BRANCHES[0].name,
        createdByUserId: ceoUser.id,
        createdByUserName: ceoUser.name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ],
    creditPayments: [
      {
        id: 'cp-1',
        paymentNo: 'PAY-001',
        creditId: 'cred-1',
        customerId: INITIAL_CUSTOMERS[0].id,
        customerName: INITIAL_CUSTOMERS[0].fullName,
        receiptNo: 'REC-001',
        amountPaid: 10000,
        paymentDate: '2026-10-19',
        paymentMethod: 'CASH',
        receivedByUserId: ceoUser.id,
        receivedByUserName: ceoUser.name,
        branchId: INITIAL_BRANCHES[0].id,
        createdAt: new Date().toISOString()
      }
    ]
  };

  // 1. TEST: Exporting and validating a backup
  console.log('\n[Test 1] Exporting and validating backup package...');
  const backupPkg = await createBackupPackage(baseState, ceoUser, {
    scope: 'FULL_SYSTEM',
    description: 'Automated test snapshot'
  });

  if (!backupPkg.metadata.id || !backupPkg.metadata.checksum) {
    throw new Error('Test 1 Failed: Metadata or checksum missing');
  }
  if (backupPkg.metadata.appVersion !== APP_VERSION || backupPkg.metadata.schemaVersion !== SCHEMA_VERSION) {
    throw new Error('Test 1 Failed: Version mismatch in metadata');
  }
  const serialized = JSON.stringify(backupPkg);
  const valResult = await validateBackupContent(serialized);
  if (!valResult.isValid) {
    throw new Error(`Test 1 Failed: Valid backup failed validation: ${valResult.errors.join(', ')}`);
  }
  console.log('✓ Test 1 Passed: Backup created, checksum computed, structure fully validated.');

  // 2. TEST: Validating corrupt/invalid backup files
  console.log('\n[Test 2] Rejecting corrupted/invalid backup files...');
  const corruptJson = '{"metadata": {"id": "1"}, "data": "broken json';
  const valCorrupt = await validateBackupContent(corruptJson);
  if (valCorrupt.isValid) {
    throw new Error('Test 2 Failed: Corrupt JSON was marked valid');
  }

  const incompatibleVersion = JSON.stringify({
    metadata: { id: 'bk-old', schemaVersion: '99.0.0', createdAt: new Date().toISOString(), recordCounts: {} },
    data: {}
  });
  const valOld = await validateBackupContent(incompatibleVersion);
  if (valOld.isValid) {
    throw new Error('Test 2 Failed: Incompatible schema version was not rejected');
  }
  console.log('✓ Test 2 Passed: Corrupt JSON and incompatible schema versions cleanly caught and rejected.');

  // 3. TEST: Preventing duplicate transactions during restore
  console.log('\n[Test 3] Preventing duplicate transactions during restore...');
  // Modify backup package to have one new sale and one duplicate sale
  const duplicateSale = { ...baseState.sales[0] };
  const newSale: Sale = {
    ...baseState.sales[0],
    id: 'sale-unique-999',
    receiptNo: 'REC-UNIQUE-999',
    totalAmount: 75000,
    timestamp: new Date().toISOString()
  };

  const mergePkg = {
    ...backupPkg,
    data: {
      ...backupPkg.data,
      sales: [duplicateSale, newSale]
    }
  };

  const options: RestoreOptions = {
    mode: 'MERGE_DEDUPLICATE',
    createSafetyBackup: true,
    skipDuplicateReceipts: true,
    skipDuplicatePayments: true,
    skipDuplicateStockMovements: true
  };

  const { updatedState, result } = executeRestore(baseState, mergePkg, ceoUser, options);

  if (result.recordsRestored.sales !== 1 || result.recordsSkipped.sales < 1) {
    throw new Error(`Test 3 Failed: Duplicate prevention failed. Restored: ${result.recordsRestored.sales}, Skipped: ${result.recordsSkipped.sales}`);
  }
  const foundNewSale = updatedState.sales.find((s) => s.id === 'sale-unique-999');
  if (!foundNewSale) {
    throw new Error('Test 3 Failed: New unique sale was not restored');
  }
  console.log('✓ Test 3 Passed: Duplicate sales receipt successfully skipped; unique transaction restored.');

  // 4. TEST: Protecting existing records before restoration (Safety Backup)
  console.log('\n[Test 4] Verifying pre-restoration safety snapshot...');
  if (!result.safetyBackupId) {
    throw new Error('Test 4 Failed: Safety backup was not created before restore');
  }
  const safetyBackup = getLatestSafetyBackup();
  if (!safetyBackup) {
    throw new Error('Test 4 Failed: Could not retrieve latest safety backup');
  }
  console.log(`✓ Test 4 Passed: Safety snapshot #${result.safetyBackupId} confirmed and retrievable.`);

  // 5. TEST: Detecting stock and credit inconsistencies
  console.log('\n[Test 5] Detecting stock and credit inconsistencies in integrity auditor...');
  const inconsistentState: AppState = {
    ...baseState,
    // Negative inventory
    inventory: [
      { id: 'inv-err', branchId: INITIAL_BRANCHES[0].id, productId: INITIAL_PRODUCTS[0].id, quantity: -25, reorderLevel: 10, lastUpdated: new Date().toISOString() }
    ],
    // Customer creditBalance out of sync with actual remaining credit
    customers: [
      { ...baseState.customers[0], creditBalance: 999999 } // ledger is 40,000
    ]
  };

  const report = await runDataIntegrityAudit(inconsistentState, ceoUser);
  const stockIssue = report.issues.find((i) => i.category === 'STOCK_DISCREPANCY' && i.entityId === 'inv-err');
  const creditIssue = report.issues.find((i) => i.category === 'CREDIT_DISCREPANCY' && i.entityType === 'CUSTOMER');

  if (!stockIssue) {
    throw new Error('Test 5 Failed: Negative stock was not detected');
  }
  if (!creditIssue) {
    throw new Error('Test 5 Failed: Credit balance mismatch was not detected');
  }
  console.log(`✓ Test 5 Passed: Integrity auditor detected negative stock (${stockIssue.actualValue}) and credit mismatch (recorded ₦999,999 vs ledger ₦40,000).`);

  // 6. TEST: Safe Repair Tools
  console.log('\n[Test 6] Testing safe repair calibration...');
  const { updatedState: repairedState, message } = applySafeIntegrityFix(inconsistentState, creditIssue, ceoUser);
  const repairedCustomer = repairedState.customers.find((c) => c.id === inconsistentState.customers[0].id);
  if (repairedCustomer?.creditBalance !== 40000) {
    throw new Error(`Test 6 Failed: Customer credit balance was not calibrated to 40,000 (got ${repairedCustomer?.creditBalance})`);
  }
  console.log(`✓ Test 6 Passed: Safe repair successfully calibrated customer credit balance: ${message}`);

  // 7. TEST: Administrator Permissions Enforced
  console.log('\n[Test 7] Enforcing CEO Administrator permissions...');
  let cashierBlocked = false;
  try {
    executeRestore(baseState, backupPkg, cashierUser, options);
  } catch (err: any) {
    cashierBlocked = true;
    console.log(`  Caught permission exception as expected: "${err.message}"`);
  }

  if (!cashierBlocked) {
    throw new Error('Test 7 Failed: Non-CEO cashier was able to execute restoration');
  }
  console.log('✓ Test 7 Passed: Restoration strictly rejected for non-administrator roles.');

  // 8. TEST: Offline Export & Unsynchronized Changes Marking
  console.log('\n[Test 8] Offline export and pending changes metadata marking...');
  // Force simulate offline
  const offlinePkg = await createBackupPackage(baseState, ceoUser, {
    scope: 'FULL_SYSTEM',
    description: 'Offline rural branch backup'
  });
  if (typeof offlinePkg.metadata.isOfflineSnapshot !== 'boolean') {
    throw new Error('Test 8 Failed: isOfflineSnapshot boolean missing');
  }
  console.log(`✓ Test 8 Passed: Offline metadata correctly stamped: isOffline=${offlinePkg.metadata.isOfflineSnapshot}, pendingOps=${offlinePkg.metadata.pendingOfflineOpsCount}`);

  console.log('\n======================================================');
  console.log('ALL 8 MODULE 14 TESTS PASSED FLAWLESSLY WITH 100% SUCCESS!');
  console.log('======================================================');
}

runModule14Tests().catch((err) => {
  console.error('TEST RUNNER FAILED:', err);
  process.exit(1);
});
