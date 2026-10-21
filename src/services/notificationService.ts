import {
  NotificationItem,
  NotificationCategory,
  NotificationPriority,
  NotificationStatus,
  NotificationSettings,
  AppState,
  BranchInventory,
  Product,
  CustomerCredit,
  GoodsReceiptItem,
  StockTransfer,
  PurchaseOrder,
  CashReconciliation
} from '../types';
import { putToStore, STORES } from '../offline/indexedDB';
import { queueOperation } from '../offline/offlineQueue';
import { triggerSync } from '../offline/syncManager';

// Web Audio API Sound Chime Generator
let audioCtx: AudioContext | null = null;

export function playNotificationChime(priority: NotificationPriority = 'HIGH'): void {
  try {
    if (typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (priority === 'CRITICAL') {
      // Urgent double high beep
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, now); // A5
      osc.frequency.setValueAtTime(1046.5, now + 0.12); // C6
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (priority === 'HIGH') {
      // Pleasant double chime
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.1); // A5
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else {
      // Subtle single tone
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    }
  } catch (err) {
    // Non-blocking fallback
    console.debug('Audio chime could not be played:', err);
  }
}

// Browser Web Notification Permission & Dispatcher
export async function requestPushNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return 'default';
  }
}

export function showBrowserNotification(
  title: string,
  options?: { body?: string; tag?: string; icon?: string }
): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    new Notification(title, {
      body: options?.body,
      tag: options?.tag,
      icon: options?.icon || '/favicon.ico'
    });
  } catch (err) {
    console.debug('Browser notification failed:', err);
  }
}

// Generates deduplication fingerprint
export function getNotificationKey(item: Partial<NotificationItem>): string {
  return `${item.category}:${item.referenceType || 'SYS'}:${item.referenceId || 'NONE'}:${item.eventType || 'DEFAULT'}:${item.branchId || 'ALL'}`;
}

/**
 * Evaluates current application records and returns updated notifications list.
 * Identifies:
 * 1. Low stock & Out of stock (branch specific)
 * 2. Expiry dates (90, 60, 30, 7 days, or expired)
 * 3. Customer credit limit reached & overdue debts
 * 4. Pending transfer requests & approvals
 * 5. Purchase orders requiring approval or delivery
 * 6. Cash reconciliations with cash shortage / excess
 */
export function evaluateSystemAlerts(
  state: AppState,
  settings: NotificationSettings,
  existingNotifications: NotificationItem[] = []
): { updatedNotifications: NotificationItem[]; newlyAddedCount: number } {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const newAlerts: NotificationItem[] = [];
  const existingMap = new Map<string, NotificationItem>();

  // Map existing active alerts
  for (const n of existingNotifications) {
    existingMap.set(getNotificationKey(n), n);
  }

  const isCategoryEnabled = (cat: NotificationCategory) => {
    return settings.enabledCategories[cat] !== false;
  };

  const isBranchMuted = (branchId?: string | null) => {
    if (!branchId) return false;
    return settings.mutedBranches?.includes(branchId);
  };

  // 1. INVENTORY: Low Stock & Out of Stock Alerts
  if (isCategoryEnabled('INVENTORY_LOW_STOCK')) {
    const productsMap = new Map<string, Product>();
    (state.products || []).forEach((p) => productsMap.set(p.id, p));

    const branchesMap = new Map<string, string>();
    (state.branches || []).forEach((b) => branchesMap.set(b.id, b.name));

    (state.inventory || []).forEach((inv) => {
      if (isBranchMuted(inv.branchId)) return;
      const product = productsMap.get(inv.productId);
      if (!product || product.status === 'INACTIVE') return;

      const branchName = branchesMap.get(inv.branchId) || 'Branch';
      const effectiveReorder = inv.reorderLevel ?? product.minStockLevel ?? 20;

      // Case A: Out of stock
      if (inv.quantity === 0) {
        const key = `INVENTORY_LOW_STOCK:PRODUCT:${product.id}:OUT_OF_STOCK:${inv.branchId}`;
        const existing = existingMap.get(key);

        if (!existing || existing.status === 'RESOLVED') {
          newAlerts.push({
            id: 'notif-out-' + product.id + '-' + inv.branchId,
            branchId: inv.branchId,
            branchName,
            category: 'INVENTORY_LOW_STOCK',
            eventType: 'OUT_OF_STOCK',
            title: `Out of Stock: ${product.name}`,
            message: `${branchName} is completely out of stock for ${product.name} (0 ${product.unit} remaining). Immediate replenishment or branch transfer required.`,
            referenceType: 'PRODUCT',
            referenceId: product.id,
            priority: 'CRITICAL',
            createdAt: now.toISOString(),
            status: 'UNREAD',
            actionTab: 'TRANSFERS',
            actionLabel: 'Request Stock Transfer',
            actionPayload: { productId: product.id, destinationBranchId: inv.branchId },
            isRead: false,
            read: false,
            timestamp: now.toISOString(),
            syncStatus: 'pending'
          });
        }
      }
      // Case B: Below or at reorder level
      else if (inv.quantity <= effectiveReorder) {
        const key = `INVENTORY_LOW_STOCK:PRODUCT:${product.id}:LOW_STOCK:${inv.branchId}`;
        const existing = existingMap.get(key);

        if (!existing || existing.status === 'RESOLVED') {
          newAlerts.push({
            id: 'notif-low-' + product.id + '-' + inv.branchId,
            branchId: inv.branchId,
            branchName,
            category: 'INVENTORY_LOW_STOCK',
            eventType: 'LOW_STOCK',
            title: `Low Stock Alert: ${product.name}`,
            message: `${branchName} inventory is at ${inv.quantity} ${product.unit} (reorder threshold: ${effectiveReorder}). Order or transfer more stock soon.`,
            referenceType: 'PRODUCT',
            referenceId: product.id,
            priority: inv.quantity <= Math.ceil(effectiveReorder / 2) ? 'HIGH' : 'MEDIUM',
            createdAt: now.toISOString(),
            status: 'UNREAD',
            actionTab: 'INVENTORY',
            actionLabel: 'Inspect Branch Stock',
            actionPayload: { productId: product.id, branchId: inv.branchId },
            isRead: false,
            read: false,
            timestamp: now.toISOString(),
            syncStatus: 'pending'
          });
        }
      }
    });
  }

  // 2. EXPIRY TRACKING: Batches approaching expiry & expired stock
  if (isCategoryEnabled('EXPIRY_ALERT')) {
    const productsMap = new Map<string, Product>();
    (state.products || []).forEach((p) => productsMap.set(p.id, p));

    const branchesMap = new Map<string, string>();
    (state.branches || []).forEach((b) => branchesMap.set(b.id, b.name));

    // Inspect Goods Receipts items with batch number & expiry date
    (state.goodsReceipts || []).forEach((grn) => {
      if (isBranchMuted(grn.branchId)) return;
      const branchName = grn.branchName || branchesMap.get(grn.branchId) || 'Branch';

      (grn.items || []).forEach((item) => {
        if (!item.expiryDate) return;
        const expiryTime = new Date(item.expiryDate).getTime();
        const diffMs = expiryTime - now.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        const batchTag = item.batchNumber || 'Batch';

        let priority: NotificationPriority | null = null;
        let eventType = '';
        let title = '';
        let msg = '';

        if (diffDays <= 0) {
          // Expired
          priority = 'CRITICAL';
          eventType = 'EXPIRED_STOCK';
          title = `Expired Stock: ${item.productName} (${batchTag})`;
          msg = `Stock from batch ${batchTag} at ${branchName} expired on ${item.expiryDate}. Non-sellable! Quarantine and write off immediately.`;
        } else if (diffDays <= 7) {
          priority = 'CRITICAL';
          eventType = 'EXPIRING_7_DAYS';
          title = `Urgent Expiry (7 Days): ${item.productName} (${batchTag})`;
          msg = `Batch ${batchTag} at ${branchName} expires in ${diffDays} day(s) on ${item.expiryDate}. Immediate discount sale or dispatch needed.`;
        } else if (diffDays <= 30) {
          priority = 'HIGH';
          eventType = 'EXPIRING_30_DAYS';
          title = `Expiry Alert (30 Days): ${item.productName} (${batchTag})`;
          msg = `Batch ${batchTag} at ${branchName} expires in ${diffDays} days (${item.expiryDate}). Prioritize batch for upcoming farm orders.`;
        } else if (diffDays <= 60) {
          priority = 'MEDIUM';
          eventType = 'EXPIRING_60_DAYS';
          title = `Expiry Horizon (60 Days): ${item.productName} (${batchTag})`;
          msg = `Batch ${batchTag} at ${branchName} expires on ${item.expiryDate} (${diffDays} days remaining).`;
        }

        if (priority && eventType) {
          const key = `EXPIRY_ALERT:PRODUCT:${item.productId}:${eventType}:${grn.branchId}`;
          const existing = existingMap.get(key);

          if (!existing || existing.status === 'RESOLVED') {
            newAlerts.push({
              id: 'notif-exp-' + item.productId + '-' + (item.batchNumber || 'grn') + '-' + grn.branchId,
              branchId: grn.branchId,
              branchName,
              category: 'EXPIRY_ALERT',
              eventType,
              title,
              message: msg,
              referenceType: 'PRODUCT',
              referenceId: item.productId,
              priority,
              createdAt: now.toISOString(),
              status: 'UNREAD',
              actionTab: 'INVENTORY',
              actionLabel: 'Inspect Expiry Batches',
              actionPayload: { productId: item.productId, batchNumber: item.batchNumber },
              isRead: false,
              read: false,
              timestamp: now.toISOString(),
              syncStatus: 'pending'
            });
          }
        }
      });
    });
  }

  // 3. CUSTOMER CREDIT & OVERDUE DEBTS
  if (isCategoryEnabled('CUSTOMER_CREDIT')) {
    (state.customers || []).forEach((c) => {
      const creditLimit = c.creditLimit || 500000;
      const creditBalance = c.creditBalance || 0;

      // Credit limit exceeded
      if (creditBalance >= creditLimit && creditBalance > 0) {
        const key = `CUSTOMER_CREDIT:CUSTOMER:${c.id}:CREDIT_LIMIT_REACHED:${c.registeredBranchId}`;
        const existing = existingMap.get(key);

        if (!existing || existing.status === 'RESOLVED') {
          newAlerts.push({
            id: 'notif-credlim-' + c.id,
            branchId: c.registeredBranchId,
            category: 'CUSTOMER_CREDIT',
            eventType: 'CREDIT_LIMIT_REACHED',
            title: `Credit Limit Reached: ${c.fullName}`,
            message: `Customer ${c.fullName} has reached the credit limit of ₦${creditLimit.toLocaleString()} (Current debt: ₦${creditBalance.toLocaleString()}). Further credit sales require manager authorization.`,
            referenceType: 'CUSTOMER',
            referenceId: c.id,
            priority: 'HIGH',
            createdAt: now.toISOString(),
            status: 'UNREAD',
            actionTab: 'CREDIT_MANAGEMENT',
            actionLabel: 'Review Customer Credit',
            actionPayload: { customerId: c.id },
            isRead: false,
            read: false,
            timestamp: now.toISOString(),
            syncStatus: 'pending'
          });
        }
      }
    });

    // Overdue Credit Ledger Items
    (state.credits || []).forEach((cr) => {
      if (cr.remainingBalance > 0 && cr.dueDate && cr.dueDate < todayStr) {
        const key = `CUSTOMER_CREDIT:CREDIT:${cr.id}:OVERDUE_DEBT:${cr.branchId}`;
        const existing = existingMap.get(key);

        if (!existing || existing.status === 'RESOLVED') {
          newAlerts.push({
            id: 'notif-overdue-' + cr.id,
            branchId: cr.branchId,
            branchName: cr.branchName,
            category: 'CUSTOMER_CREDIT',
            eventType: 'OVERDUE_DEBT',
            title: `Overdue Farmer Debt: ${cr.customerName}`,
            message: `Outstanding credit of ₦${cr.remainingBalance.toLocaleString()} (Invoice #${cr.receiptNo || cr.creditNo}) was due on ${cr.dueDate}. Contact farmer for recovery.`,
            referenceType: 'CUSTOMER',
            referenceId: cr.customerId,
            priority: 'HIGH',
            createdAt: now.toISOString(),
            status: 'UNREAD',
            actionTab: 'CREDIT_MANAGEMENT',
            actionLabel: 'Open Farmer Ledger',
            actionPayload: { creditId: cr.id, customerId: cr.customerId },
            isRead: false,
            read: false,
            timestamp: now.toISOString(),
            syncStatus: 'pending'
          });
        }
      }
    });
  }

  // 4. BRANCH TRANSFERS: Pending Approvals, In-Transit & Discrepancies
  if (isCategoryEnabled('BRANCH_TRANSFERS')) {
    (state.transfers || []).forEach((t) => {
      // Pending Approvals
      if (t.status === 'PENDING' || t.status === 'PENDING_APPROVAL' || t.status === 'REQUESTED') {
        const key = `BRANCH_TRANSFERS:TRANSFER:${t.id}:TRANSFER_REQUESTED:${t.sourceBranchId}`;
        const existing = existingMap.get(key);

        if (!existing || existing.status === 'RESOLVED') {
          newAlerts.push({
            id: 'notif-tr-req-' + t.id,
            branchId: t.sourceBranchId,
            branchName: t.sourceBranchName,
            category: 'BRANCH_TRANSFERS',
            eventType: 'TRANSFER_REQUESTED',
            title: `Transfer Approval Required: #${t.transferNo}`,
            message: `Stock transfer request #${t.transferNo} from ${t.sourceBranchName} to ${t.destinationBranchName} requires review and authorization.`,
            referenceType: 'TRANSFER',
            referenceId: t.id,
            priority: 'HIGH',
            createdAt: now.toISOString(),
            status: 'UNREAD',
            actionTab: 'TRANSFERS',
            actionLabel: `Review Transfer #${t.transferNo}`,
            actionPayload: { transferId: t.id },
            isRead: false,
            read: false,
            timestamp: now.toISOString(),
            syncStatus: 'pending'
          });
        }
      }

      // In Transit / Awaiting Receipt
      if (t.status === 'IN_TRANSIT' || t.status === 'DISPATCHED') {
        const key = `BRANCH_TRANSFERS:TRANSFER:${t.id}:TRANSFER_IN_TRANSIT:${t.destinationBranchId}`;
        const existing = existingMap.get(key);

        if (!existing || existing.status === 'RESOLVED') {
          newAlerts.push({
            id: 'notif-tr-transit-' + t.id,
            branchId: t.destinationBranchId,
            branchName: t.destinationBranchName,
            category: 'BRANCH_TRANSFERS',
            eventType: 'TRANSFER_DISPATCHED',
            title: `Shipment In Transit: #${t.transferNo}`,
            message: `Waybill #${t.transferNo} from ${t.sourceBranchName} is on route${t.driverName ? ` via ${t.driverName}` : ''}. Prepare depot reception.`,
            referenceType: 'TRANSFER',
            referenceId: t.id,
            priority: 'MEDIUM',
            createdAt: now.toISOString(),
            status: 'UNREAD',
            actionTab: 'TRANSFERS',
            actionLabel: `Inspect Delivery #${t.transferNo}`,
            actionPayload: { transferId: t.id },
            isRead: false,
            read: false,
            timestamp: now.toISOString(),
            syncStatus: 'pending'
          });
        }
      }

      // Discrepancy under investigation
      if (t.hasDiscrepancy && t.discrepancyStatus === 'UNDER_INVESTIGATION') {
        const key = `BRANCH_TRANSFERS:TRANSFER:${t.id}:TRANSFER_DISCREPANCY:${t.destinationBranchId}`;
        const existing = existingMap.get(key);

        if (!existing || existing.status === 'RESOLVED') {
          newAlerts.push({
            id: 'notif-tr-dispute-' + t.id,
            branchId: t.destinationBranchId,
            branchName: t.destinationBranchName,
            category: 'BRANCH_TRANSFERS',
            eventType: 'TRANSFER_DISCREPANCY_ALERT',
            title: `🚨 Shortage Discrepancy on Waybill #${t.transferNo}`,
            message: `Shortage or damaged goods reported on delivery #${t.transferNo} at ${t.destinationBranchName}. Investigation required.`,
            referenceType: 'TRANSFER',
            referenceId: t.id,
            priority: 'CRITICAL',
            createdAt: now.toISOString(),
            status: 'UNREAD',
            actionTab: 'TRANSFERS',
            actionLabel: `Investigate Discrepancy #${t.transferNo}`,
            actionPayload: { transferId: t.id },
            isRead: false,
            read: false,
            timestamp: now.toISOString(),
            syncStatus: 'pending'
          });
        }
      }
    });
  }

  // 5. PURCHASE ORDERS: Approvals & Delivery Status
  if (isCategoryEnabled('PURCHASE_SUPPLIER')) {
    const poList = state.purchaseOrders || state.purchases || [];
    poList.forEach((po) => {
      if (po.status === 'PENDING_APPROVAL') {
        const key = `PURCHASE_SUPPLIER:PURCHASE_ORDER:${po.id}:PO_APPROVAL_PENDING:${po.branchId}`;
        const existing = existingMap.get(key);

        if (!existing || existing.status === 'RESOLVED') {
          newAlerts.push({
            id: 'notif-po-appr-' + po.id,
            branchId: po.branchId,
            branchName: po.branchName,
            category: 'PURCHASE_SUPPLIER',
            eventType: 'PO_APPROVAL_PENDING',
            title: `Purchase Order Authorization: #${po.orderNo}`,
            message: `Purchase order #${po.orderNo} for ${po.supplierName} (₦${po.totalAmount.toLocaleString()}) awaits executive approval.`,
            referenceType: 'PURCHASE_ORDER',
            referenceId: po.id,
            priority: 'MEDIUM',
            createdAt: now.toISOString(),
            status: 'UNREAD',
            actionTab: 'SUPPLIERS',
            actionLabel: 'Review PO',
            actionPayload: { purchaseOrderId: po.id },
            isRead: false,
            read: false,
            timestamp: now.toISOString(),
            syncStatus: 'pending'
          });
        }
      }
    });
  }

  // 6. CASH RECONCILIATIONS: Discrepancies & Variances
  if (isCategoryEnabled('EXPENSE_RECONCILIATION')) {
    (state.cashReconciliations || []).forEach((recon) => {
      const variance = Math.abs(recon.variance || 0);
      if (variance >= settings.cashDiscrepancyThreshold) {
        const key = `EXPENSE_RECONCILIATION:CASH_RECONCILIATION:${recon.id}:CASH_DISCREPANCY:${recon.branchId}`;
        const existing = existingMap.get(key);

        if (!existing || existing.status === 'RESOLVED') {
          const isShortage = (recon.variance || 0) < 0;
          newAlerts.push({
            id: 'notif-recon-' + recon.id,
            branchId: recon.branchId,
            category: 'EXPENSE_RECONCILIATION',
            eventType: 'CASH_DISCREPANCY',
            title: `Cash ${isShortage ? 'Shortage' : 'Excess'} Detected (₦${variance.toLocaleString()})`,
            message: `Drawer reconciliation for ${recon.date} at branch #${recon.branchId} flagged a variance of ₦${variance.toLocaleString()}. Immediate management audit required.`,
            referenceType: 'CASH_RECONCILIATION',
            referenceId: recon.id,
            priority: 'HIGH',
            createdAt: now.toISOString(),
            status: 'UNREAD',
            actionTab: 'FINANCE',
            actionLabel: 'Investigate Cash Session',
            actionPayload: { reconciliationId: recon.id },
            isRead: false,
            read: false,
            timestamp: now.toISOString(),
            syncStatus: 'pending'
          });
        }
      }
    });
  }

  // Auto-resolve stock alerts if stock has been restored
  const stockInventoryMap = new Map<string, number>();
  (state.inventory || []).forEach((inv) => {
    stockInventoryMap.set(`${inv.productId}:${inv.branchId}`, inv.quantity);
  });

  const resolvedNotifications = existingNotifications.map((notif) => {
    if (notif.category === 'INVENTORY_LOW_STOCK' && notif.referenceId && notif.branchId && notif.status === 'UNREAD') {
      const currentQty = stockInventoryMap.get(`${notif.referenceId}:${notif.branchId}`);
      if (currentQty !== undefined) {
        const prod = (state.products || []).find((p) => p.id === notif.referenceId);
        const reorderLevel = prod?.minStockLevel || 20;
        if (currentQty > reorderLevel) {
          // Stock has recovered, automatically resolve alert!
          return {
            ...notif,
            status: 'RESOLVED' as NotificationStatus,
            resolvedAt: now.toISOString(),
            resolvedByUserName: 'System Auto-Resolver (Stock Restored)'
          };
        }
      }
    }
    return notif;
  });

  // Combine and sort
  const combined = [...newAlerts, ...resolvedNotifications];

  // Play audio chime if new high/critical alert arrived
  if (newAlerts.length > 0 && settings.soundEnabled) {
    const highestPriority = newAlerts.some((a) => a.priority === 'CRITICAL')
      ? 'CRITICAL'
      : newAlerts.some((a) => a.priority === 'HIGH')
      ? 'HIGH'
      : 'MEDIUM';
    playNotificationChime(highestPriority);

    // Browser push notification if enabled
    if (settings.browserPushEnabled) {
      const first = newAlerts[0];
      showBrowserNotification(first.title, { body: first.message });
    }
  }

  return {
    updatedNotifications: combined,
    newlyAddedCount: newAlerts.length
  };
}

/**
 * Creates an ad-hoc notification (e.g. for significant sales, returns, security actions)
 * Persists locally to state, stores in IndexedDB, and queues for offline synchronization.
 */
export async function createAdHocNotification(
  notification: Omit<NotificationItem, 'id' | 'createdAt' | 'status' | 'isRead' | 'read' | 'timestamp'>,
  settings: NotificationSettings
): Promise<NotificationItem> {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const now = new Date().toISOString();

  const fullItem: NotificationItem = {
    ...notification,
    id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    createdAt: now,
    timestamp: now,
    status: 'UNREAD',
    isRead: false,
    read: false,
    syncStatus: isOnline ? 'synced' : 'pending'
  };

  // Persist to IndexedDB
  try {
    await putToStore(STORES.NOTIFICATIONS, fullItem);
  } catch (err) {
    console.error('Failed to store notification in IndexedDB:', err);
  }

  // Queue for offline sync
  try {
    await queueOperation({
      operationType: 'CREATE',
      entityType: 'NOTIFICATION',
      entityId: fullItem.id,
      payload: fullItem,
      branchId: fullItem.branchId || undefined
    });
  } catch (err) {
    console.error('Failed to queue notification operation:', err);
  }

  // Play sound if enabled
  if (settings.soundEnabled && (fullItem.priority === 'CRITICAL' || fullItem.priority === 'HIGH')) {
    playNotificationChime(fullItem.priority);
  }

  // Browser notification
  if (settings.browserPushEnabled) {
    showBrowserNotification(fullItem.title, { body: fullItem.message });
  }

  // Trigger sync if online
  if (isOnline) {
    triggerSync().catch(() => {});
  }

  return fullItem;
}
