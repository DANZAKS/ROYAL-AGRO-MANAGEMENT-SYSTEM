import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { loadAppState, saveAppState, DEFAULT_NOTIFICATION_SETTINGS } from './lib/storage';
import { syncFullAppStateToIndexedDB } from './offline/offlineStorage';
import { queueOperation, getPendingCount } from './offline/offlineQueue';
import { triggerSync } from './offline/syncManager';
import { putToStore, deleteFromStore, STORES } from './offline/indexedDB';
import { evaluateSystemAlerts, createAdHocNotification } from './services/notificationService';
import {
  AppState,
  User,
  Sale,
  Product,
  BranchInventory,
  StockTransfer,
  Branch,
  Customer,
  Supplier,
  PurchaseOrder,
  GoodsReceipt,
  SupplierPayment,
  Expense,
  StockMovementType,
  StockMovement,
  AuditLog,
  PaymentMethod,
  PaymentStatus,
  CreditStatus,
  CustomerCredit,
  CreditPayment,
  SalesReturn,
  StockAdjustment,
  StockTransferStatus,
  NotificationItem,
  NotificationSettings,
  AttendanceRecord,
  CommissionRecord,
  CommissionRule
} from './types';

// Layout Components
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';

// Dashboard Components
import { CEODashboard } from './components/dashboard/CEODashboard';
import { BranchDashboard } from './components/dashboard/BranchDashboard';

// Module Components
import { POSModule } from './components/pos/POSModule';
import { ReceiptModal } from './components/pos/ReceiptModal';
import { ProductCatalog } from './components/products/ProductCatalog';
import { InventoryManager } from './components/inventory/InventoryManager';
import { StockTransferModule } from './components/transfers/StockTransferModule';
import { BranchManagement } from './components/branches/BranchManagement';
import { CustomerManager } from './components/customers/CustomerManager';
import { CreditManager } from './components/credit/CreditManager';
import { SalesReturnModule } from './components/returns/SalesReturnModule';
import { SupplierManager } from './components/suppliers/SupplierManager';
import { FinancialManagement } from './components/finance/FinancialManagement';
import { ExpenseTracker } from './components/expenses/ExpenseTracker';
import { ReportsAnalytics } from './components/reports/ReportsAnalytics';
import { UserManagement } from './components/users/UserManagement';
import { StaffAttendancePerformanceModule } from './components/staff/StaffAttendancePerformanceModule';
import { AuditLogViewer } from './components/audit/AuditLogViewer';
import { SyncCenter } from './components/sync/SyncCenter';
import { BackupRecoveryModule } from './components/backup/BackupRecoveryModule';

// Overlay Modals
import { NotificationCenter } from './components/notifications/NotificationCenter';
import { LoginModal } from './components/auth/LoginModal';
import { ProfileModal } from './components/auth/ProfileModal';

export default function App() {
  const [appState, setAppState] = useState<AppState>(() => loadAppState());
  const [activeTab, setActiveTab] = useState<string>('CEO_DASHBOARD');
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(
    appState.currentUser?.branchId || null
  );
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('THIS_MONTH');

  // Modals & Overlays
  const [activeReceiptSale, setActiveReceiptSale] = useState<Sale | null>(null);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [pendingWarningCount, setPendingWarningCount] = useState<number>(0);
  const [isLogoutWarningOpen, setIsLogoutWarningOpen] = useState<boolean>(false);

  const handleInitiateLogout = async () => {
    const count = await getPendingCount();
    if (count > 0) {
      setPendingWarningCount(count);
      setIsLogoutWarningOpen(true);
    } else {
      setIsLoginModalOpen(true);
    }
  };

  const handleConfirmLogout = () => {
    setIsLogoutWarningOpen(false);
    setIsLoginModalOpen(true);
  };

  // Auto-persist app state to local storage and IndexedDB on changes
  useEffect(() => {
    saveAppState(appState);
  }, [appState]);

  // Initial IndexedDB sync on app startup & automatic sync engine registration
  useEffect(() => {
    syncFullAppStateToIndexedDB(appState).catch((err) => {
      console.error('Initial IndexedDB seed error:', err);
    });

    // Run central sync engine immediately if online
    if (navigator.onLine) {
      triggerSync().catch(err => console.error('Auto startup sync error:', err));
    }

    // Auto sync on network reconnection
    const handleOnline = () => {
      triggerSync().catch(err => console.error('Auto online reconnect sync error:', err));
    };

    window.addEventListener('online', handleOnline);

    // Periodic auto background sync every 30 seconds
    const syncInterval = setInterval(() => {
      if (navigator.onLine) {
        triggerSync().catch(() => {});
      }
    }, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      clearInterval(syncInterval);
    };
  }, []);

  // Listen for background entity sync completions
  useEffect(() => {
    const handleEntitySynced = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      if (detail.entityType === 'SALE') {
        setAppState((prev) => ({
          ...prev,
          sales: (prev.sales || []).map((s) => (s.id === detail.entityId ? { ...s, syncStatus: 'synced' } : s))
        }));
      } else if (detail.entityType === 'STOCK_MOVEMENT') {
        setAppState((prev) => ({
          ...prev,
          stockMovements: (prev.stockMovements || []).map((m) => (m.id === detail.entityId ? { ...m, syncStatus: 'synced' } : m)),
          movements: (prev.movements || []).map((m) => (m.id === detail.entityId ? { ...m, syncStatus: 'synced' } : m))
        }));
      } else if (detail.entityType === 'CUSTOMER') {
        setAppState((prev) => ({
          ...prev,
          customers: (prev.customers || []).map((c) => (c.id === detail.entityId ? { ...c, syncStatus: 'synced' } : c))
        }));
      } else if (detail.entityType === 'CREDIT') {
        setAppState((prev) => ({
          ...prev,
          credits: (prev.credits || []).map((c) => (c.id === detail.entityId ? { ...c, syncStatus: 'synced' } : c))
        }));
      } else if (detail.entityType === 'CREDIT_PAYMENT') {
        setAppState((prev) => ({
          ...prev,
          creditPayments: (prev.creditPayments || []).map((p) => (p.id === detail.entityId ? { ...p, syncStatus: 'synced' } : p))
        }));
      } else if (detail.entityType === 'RETURN') {
        setAppState((prev) => ({
          ...prev,
          salesReturns: (prev.salesReturns || []).map((r) => (r.id === detail.entityId ? { ...r, syncStatus: 'synced' } : r))
        }));
      } else if (detail.entityType === 'EXPENSE') {
        setAppState((prev) => ({
          ...prev,
          expenses: (prev.expenses || []).map((e) => (e.id === detail.entityId ? { ...e, syncStatus: 'synced' } : e))
        }));
      } else if (detail.entityType === 'NOTIFICATION') {
        setAppState((prev) => ({
          ...prev,
          notifications: (prev.notifications || []).map((n) => (n.id === detail.entityId ? { ...n, syncStatus: 'synced' } : n))
        }));
      }
    };

    window.addEventListener('royal_agro_entity_synced', handleEntitySynced);
    return () => window.removeEventListener('royal_agro_entity_synced', handleEntitySynced);
  }, []);

  // Module 13: Central Alert Evaluation Engine & Recalculation
  useEffect(() => {
    const settings = appState.notificationSettings || DEFAULT_NOTIFICATION_SETTINGS;
    const { updatedNotifications, newlyAddedCount } = evaluateSystemAlerts(
      appState,
      settings,
      appState.notifications || []
    );

    if (newlyAddedCount > 0 || updatedNotifications.length !== (appState.notifications || []).length) {
      setAppState((prev) => ({
        ...prev,
        notifications: updatedNotifications
      }));
    }
  }, [
    appState.inventory,
    appState.credits,
    appState.transfers,
    appState.purchaseOrders,
    appState.cashReconciliations,
    appState.goodsReceipts
  ]);

  // Handle active branch filtering
  const activeBranch = selectedBranchId
    ? appState.branches.find((b) => b.id === selectedBranchId) || null
    : null;

  // Audit Log Helper
  const logAudit = (action: string, details: string) => {
    const newLog: AuditLog = {
      id: 'audit-' + Date.now(),
      userId: appState.currentUser?.id || 'guest',
      userName: appState.currentUser?.name || 'Guest User',
      branchId: appState.currentUser?.branchId || undefined,
      branchName: appState.currentUser?.branchName || undefined,
      action,
      details,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      ipAddress: '192.168.1.10'
    };
    setAppState((prev) => ({
      ...prev,
      auditLogs: [newLog, ...(prev.auditLogs || [])]
    }));
  };

  // 1. POS Sale Completion
  const handleCompleteSale = (sale: Sale) => {
    setAppState((prev) => {
      // Deduct inventory stock for each item sold in the sale's branch
      const updatedInventory = (prev.inventory || []).map((inv) => {
        if (inv.branchId === sale.branchId) {
          const item = sale.items.find((i) => i.productId === inv.productId);
          if (item) {
            return {
              ...inv,
              quantity: Math.max(0, inv.quantity - item.quantity),
              lastUpdated: new Date().toISOString().split('T')[0]
            };
          }
        }
        return inv;
      });

      // Create stock movement entries for audit
      const newMovements = sale.items.map((i) => {
        const currentQty =
          (prev.inventory || []).find((inv) => inv.branchId === sale.branchId && inv.productId === i.productId)
            ?.quantity || 0;
        return {
          id: 'mov-' + Math.random().toString(36).substr(2, 9),
          productId: i.productId,
          productName: i.productName,
          branchId: sale.branchId,
          branchName: sale.branchName,
          type: 'SALE' as StockMovementType,
          quantityDelta: -i.quantity,
          previousQty: currentQty,
          newQty: Math.max(0, currentQty - i.quantity),
          date: new Date().toISOString().replace('T', ' ').slice(0, 16),
          userId: prev.currentUser?.id || 'system',
          userName: prev.currentUser?.name || 'System',
          notes: `Receipt #${sale.receiptNo}`
        };
      });

      // Update customer lifetime purchases and credit balance if registered
      const updatedCustomers = (prev.customers || []).map((c) => {
        if (c.id === sale.customerId || c.fullName === sale.customerName) {
          return {
            ...c,
            totalPurchases: c.totalPurchases + 1,
            totalSpent: c.totalSpent + sale.totalAmount,
            creditBalance: (c.creditBalance || 0) + (sale.balanceDue || 0)
          };
        }
        return c;
      });

      // Auto-create CustomerCredit entry if sale has credit balance
      let newCreditsList = prev.credits || [];
      if ((sale.balanceDue || 0) > 0 || sale.paymentMethod === 'CREDIT') {
        const creditAmt = sale.totalAmount;
        const paidAmt = sale.amountPaid || 0;
        const remBal = sale.balanceDue || (creditAmt - paidAmt);
        const newCredit: CustomerCredit = {
          id: 'crd-' + Date.now(),
          creditNo: 'CR-' + Math.floor(10000 + Math.random() * 90000),
          customerId: sale.customerId || 'cust-walkin',
          customerName: sale.customerName,
          customerPhone: sale.customerPhone || '',
          saleId: sale.id,
          receiptNo: sale.receiptNo,
          saleDate: sale.date,
          dueDate: sale.creditDueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          paymentTerms: 'Net 30',
          creditAmount: creditAmt,
          amountPaid: paidAmt,
          remainingBalance: remBal,
          paymentStatus: remBal === 0 ? 'PAID' : (paidAmt > 0 ? 'PARTIAL' : 'UNPAID'),
          creditStatus: remBal === 0 ? 'GOOD' : 'ACTIVE',
          remarks: `Credit sale issued at POS (${sale.branchName})`,
          branchId: sale.branchId,
          branchName: sale.branchName,
          createdByUserId: sale.staffUserId,
          createdByUserName: sale.staffName,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        newCreditsList = [newCredit, ...newCreditsList];
      }

      const nextMovements = [...newMovements, ...(prev.stockMovements || prev.movements || [])];

      // Save to IndexedDB & queue pending operations
      putToStore(STORES.SALES, sale).catch((err) => console.error('IndexedDB Put Sale error:', err));
      newMovements.forEach((mov) => {
        putToStore(STORES.STOCK_MOVEMENTS, mov).catch((err) => console.error('IndexedDB Put Stock Movement error:', err));
        queueOperation({
          operationType: 'CREATE',
          entityType: 'STOCK_MOVEMENT',
          entityId: mov.id,
          payload: mov,
          branchId: mov.branchId
        }).catch((err) => console.error('Queue Stock Movement error:', err));
      });

      queueOperation({
        operationType: 'CREATE',
        entityType: 'SALE',
        entityId: sale.id,
        payload: sale,
        branchId: sale.branchId
      }).catch((err) => console.error('Queue Sale error:', err));

      if (navigator.onLine) {
        triggerSync().catch((err) => console.error('Sync trigger error:', err));
      }

      return {
        ...prev,
        sales: [sale, ...(prev.sales || [])],
        inventory: updatedInventory,
        stockMovements: nextMovements,
        movements: nextMovements,
        customers: updatedCustomers,
        credits: newCreditsList
      };
    });

    logAudit('SALE_COMPLETED', `Completed sale #${sale.receiptNo} of ₦${sale.totalAmount.toLocaleString()}`);
    setActiveReceiptSale(sale);

    // Module 13: Significant sale alert trigger
    const threshold = appState.notificationSettings?.significantSaleThreshold || 500000;
    if (sale.totalAmount >= threshold) {
      createAdHocNotification(
        {
          branchId: sale.branchId,
          branchName: sale.branchName,
          category: 'SALES_RETURNS',
          eventType: 'SIGNIFICANT_SALE',
          title: `Significant Sale: ₦${sale.totalAmount.toLocaleString()}`,
          message: `Major transaction #${sale.receiptNo} of ₦${sale.totalAmount.toLocaleString()} completed at ${sale.branchName} by ${sale.staffName} for customer ${sale.customerName}.`,
          referenceType: 'SALE',
          referenceId: sale.id,
          priority: 'MEDIUM',
          actionTab: 'POS',
          actionLabel: 'View Receipt',
          actionPayload: { receiptNo: sale.receiptNo }
        },
        appState.notificationSettings || DEFAULT_NOTIFICATION_SETTINGS
      ).then((notif) => {
        setAppState((p) => ({ ...p, notifications: [notif, ...(p.notifications || [])] }));
      }).catch((err) => console.error('Significant sale notification error:', err));
    }
  };

  // 2. Product Management
  const handleAddProduct = (product: Product) => {
    setAppState((prev) => {
      // Initialize zero stock entries for all branches
      const initialStock: BranchInventory[] = (prev.branches || []).map((b) => ({
        id: `inv-${b.id}-${product.id}`,
        branchId: b.id,
        productId: product.id,
        quantity: 50, // default seed allocation
        reorderLevel: product.minStockLevel,
        lastUpdated: new Date().toISOString().split('T')[0]
      }));

      return {
        ...prev,
        products: [product, ...(prev.products || [])],
        inventory: [...(prev.inventory || []), ...initialStock]
      };
    });
    logAudit('PRODUCT_ADDED', `Added new product ${product.name} (SKU: ${product.sku})`);
  };

  const handleUpdateProduct = (product: Product) => {
    setAppState((prev) => ({
      ...prev,
      products: (prev.products || []).map((p) => (p.id === product.id ? product : p))
    }));
    logAudit('PRODUCT_UPDATED', `Updated product ${product.name}`);
  };

  const handleToggleProductStatus = (productId: string) => {
    setAppState((prev) => ({
      ...prev,
      products: (prev.products || []).map((p) =>
        p.id === productId ? { ...p, status: p.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' } : p
      )
    }));
  };

  // 3. Direct Stock Adjustments / Damaged Stock Logging & Physical Audits
  const handleUpdateStock = (
    productId: string,
    branchId: string,
    delta: number,
    type: StockMovementType,
    notes?: string
  ) => {
    const isOnline = navigator.onLine;
    const nowIso = new Date().toISOString();

    setAppState((prev) => {
      let prevQty = 0;
      let newQty = 0;
      let updatedBranchInv: BranchInventory | undefined;

      const updatedInventory = prev.inventory.map((inv) => {
        if (inv.productId === productId && inv.branchId === branchId) {
          prevQty = inv.quantity;
          newQty = Math.max(0, inv.quantity + delta);
          updatedBranchInv = {
            ...inv,
            quantity: newQty,
            lastUpdated: nowIso.split('T')[0]
          };
          return updatedBranchInv;
        }
        return inv;
      });

      const prod = prev.products.find((p) => p.id === productId);
      const branch = prev.branches.find((b) => b.id === branchId);

      const movementId = 'mov-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
      const movement: StockMovement = {
        id: movementId,
        productId,
        productName: prod?.name || 'Agro Product',
        branchId,
        branchName: branch?.name || 'Branch',
        type,
        quantityDelta: delta,
        previousQty: prevQty,
        newQty,
        date: nowIso.replace('T', ' ').slice(0, 16),
        userId: prev.currentUser?.id || 'system',
        userName: prev.currentUser?.name || 'System',
        notes,
        syncStatus: isOnline ? 'synced' : 'pending'
      };

      if (updatedBranchInv) {
        putToStore(STORES.INVENTORY, updatedBranchInv).catch((err) => console.error('IndexedDB Put Inventory error:', err));
        queueOperation({
          operationType: 'UPDATE',
          entityType: 'INVENTORY',
          entityId: updatedBranchInv.id,
          payload: updatedBranchInv,
          branchId
        }).catch((err) => console.error('Queue Inventory error:', err));
      }

      putToStore(STORES.STOCK_MOVEMENTS, movement).catch((err) => console.error('IndexedDB Put Movement error:', err));
      queueOperation({
        operationType: 'CREATE',
        entityType: 'STOCK_MOVEMENT',
        entityId: movement.id,
        payload: movement,
        branchId
      }).catch((err) => console.error('Queue Movement error:', err));

      if (isOnline) {
        triggerSync().catch((err) => console.error('Sync trigger error:', err));
      }

      const nextMovements = [movement, ...(prev.stockMovements || [])];
      return {
        ...prev,
        inventory: updatedInventory,
        stockMovements: nextMovements
      };
    });

    logAudit('STOCK_ADJUSTED', `Adjusted stock for ${productId} at branch ${branchId} by ${delta}`);
  };

  const handleRecordStockAdjustment = (adjustment: StockAdjustment) => {
    const isOnline = navigator.onLine;
    const nowIso = new Date().toISOString();

    const delta = adjustment.type === 'ADJUSTMENT_IN' ? Math.abs(adjustment.quantity) : -Math.abs(adjustment.quantity);

    setAppState((prev) => {
      let prevQty = 0;
      let newQty = 0;
      let updatedBranchInv: BranchInventory | undefined;

      const updatedInventory = prev.inventory.map((inv) => {
        if (inv.productId === adjustment.productId && inv.branchId === adjustment.branchId) {
          prevQty = inv.quantity;
          newQty = Math.max(0, inv.quantity + delta);
          updatedBranchInv = {
            ...inv,
            quantity: newQty,
            lastUpdated: nowIso.split('T')[0]
          };
          return updatedBranchInv;
        }
        return inv;
      });

      const movementId = 'mov-adj-' + adjustment.id;
      const movement: StockMovement = {
        id: movementId,
        productId: adjustment.productId,
        productName: adjustment.productName,
        branchId: adjustment.branchId,
        branchName: adjustment.branchName,
        type: adjustment.type,
        quantityDelta: delta,
        previousQty: prevQty,
        newQty,
        date: nowIso.replace('T', ' ').slice(0, 16),
        userId: adjustment.createdByUserId,
        userName: adjustment.createdByUserName,
        notes: `Stock Audit (${adjustment.reason}): ${adjustment.notes || ''}`,
        syncStatus: isOnline ? 'synced' : 'pending'
      };

      if (updatedBranchInv) {
        putToStore(STORES.INVENTORY, updatedBranchInv).catch((err) => console.error('IndexedDB Put Inventory error:', err));
        queueOperation({
          operationType: 'UPDATE',
          entityType: 'INVENTORY',
          entityId: updatedBranchInv.id,
          payload: updatedBranchInv,
          branchId: adjustment.branchId
        }).catch((err) => console.error('Queue Inventory error:', err));
      }

      putToStore(STORES.STOCK_MOVEMENTS, movement).catch((err) => console.error('IndexedDB Put Movement error:', err));
      queueOperation({
        operationType: 'CREATE',
        entityType: 'STOCK_MOVEMENT',
        entityId: movement.id,
        payload: movement,
        branchId: adjustment.branchId
      }).catch((err) => console.error('Queue Movement error:', err));

      if (isOnline) {
        triggerSync().catch((err) => console.error('Sync trigger error:', err));
      }

      const nextMovements = [movement, ...(prev.stockMovements || [])];
      const nextAdjustments = [adjustment, ...(prev.stockAdjustments || [])];

      return {
        ...prev,
        inventory: updatedInventory,
        stockMovements: nextMovements,
        stockAdjustments: nextAdjustments
      };
    });

    logAudit('STOCK_AUDIT_ADJUSTMENT', `Recorded physical stock audit adjustment #${adjustment.adjustmentNo} (${adjustment.reason}) for ${adjustment.productName}`);
  };

  // 4. Inter-Branch Stock Transfers Workflow
  const handleRequestTransfer = (transfer: StockTransfer) => {
    const isOnline = navigator.onLine;

    const finalTransfer: StockTransfer = {
      ...transfer,
      syncStatus: isOnline ? 'synced' : 'pending'
    };

    putToStore(STORES.TRANSFERS, finalTransfer).catch((err) => console.error('IndexedDB Put Transfer error:', err));
    queueOperation({
      operationType: 'CREATE',
      entityType: 'TRANSFER',
      entityId: finalTransfer.id,
      payload: finalTransfer,
      branchId: finalTransfer.sourceBranchId
    }).catch((err) => console.error('Queue Transfer error:', err));

    if (isOnline) {
      triggerSync().catch((err) => console.error('Sync trigger error:', err));
    }

    setAppState((prev) => ({
      ...prev,
      transfers: [finalTransfer, ...(prev.transfers || [])]
    }));

    logAudit('TRANSFER_REQUESTED', `Requested inter-branch transfer #${finalTransfer.transferNo} (${finalTransfer.sourceBranchName} ➔ ${finalTransfer.destinationBranchName})`);
  };

  const handleApproveTransfer = (transferId: string) => {
    const isOnline = navigator.onLine;
    const nowIso = new Date().toISOString();

    setAppState((prev) => {
      const target = (prev.transfers || []).find((t) => t.id === transferId);
      if (!target) return prev;

      const approvedTransfer: StockTransfer = {
        ...target,
        status: 'APPROVED',
        approvedByUserId: prev.currentUser?.id,
        approvedByUserName: prev.currentUser?.name,
        approvedAt: nowIso,
        syncStatus: isOnline ? 'synced' : 'pending'
      };

      putToStore(STORES.TRANSFERS, approvedTransfer).catch((err) => console.error('IndexedDB Put Transfer error:', err));
      queueOperation({
        operationType: 'UPDATE',
        entityType: 'TRANSFER',
        entityId: approvedTransfer.id,
        payload: approvedTransfer,
        branchId: approvedTransfer.sourceBranchId
      }).catch((err) => console.error('Queue Transfer update error:', err));

      if (isOnline) {
        triggerSync().catch((err) => console.error('Sync trigger error:', err));
      }

      return {
        ...prev,
        transfers: (prev.transfers || []).map((t) => (t.id === transferId ? approvedTransfer : t))
      };
    });

    logAudit('TRANSFER_APPROVED', `Approved transfer #${transferId}`);

    const targetTransfer = (appState.transfers || []).find((t) => t.id === transferId);
    if (targetTransfer) {
      createAdHocNotification(
        {
          branchId: targetTransfer.destinationBranchId,
          branchName: targetTransfer.destinationBranchName,
          category: 'BRANCH_TRANSFERS',
          eventType: 'TRANSFER_APPROVED',
          title: `Transfer #${targetTransfer.transferNo} Approved`,
          message: `Transfer #${targetTransfer.transferNo} from ${targetTransfer.sourceBranchName} to ${targetTransfer.destinationBranchName} was approved. Ready for warehouse dispatch.`,
          referenceType: 'TRANSFER',
          referenceId: targetTransfer.id,
          priority: 'MEDIUM',
          actionTab: 'TRANSFERS',
          actionLabel: `View Transfer #${targetTransfer.transferNo}`,
          actionPayload: { transferId: targetTransfer.id }
        },
        appState.notificationSettings || DEFAULT_NOTIFICATION_SETTINGS
      ).then((notif) => {
        setAppState((p) => ({ ...p, notifications: [notif, ...(p.notifications || [])] }));
      }).catch((err) => console.error('Transfer approve notification error:', err));
    }
  };

  const handleCancelTransfer = (transferId: string, reason?: string) => {
    const isOnline = navigator.onLine;

    setAppState((prev) => {
      const target = (prev.transfers || []).find((t) => t.id === transferId);
      if (!target) return prev;

      if (target.status === 'DISPATCHED' || target.status === 'RECEIVED' || target.status === 'PARTIALLY_RECEIVED') {
        alert('Cannot cancel a transfer that has already been dispatched or received.');
        return prev;
      }

      const cancelledTransfer: StockTransfer = {
        ...target,
        status: 'CANCELLED',
        notes: reason ? `${target.notes || ''} | Cancelled: ${reason}` : target.notes,
        syncStatus: isOnline ? 'synced' : 'pending'
      };

      putToStore(STORES.TRANSFERS, cancelledTransfer).catch((err) => console.error('IndexedDB Put Transfer error:', err));
      queueOperation({
        operationType: 'UPDATE',
        entityType: 'TRANSFER',
        entityId: cancelledTransfer.id,
        payload: cancelledTransfer,
        branchId: cancelledTransfer.sourceBranchId
      }).catch((err) => console.error('Queue Transfer update error:', err));

      if (isOnline) {
        triggerSync().catch((err) => console.error('Sync trigger error:', err));
      }

      return {
        ...prev,
        transfers: (prev.transfers || []).map((t) => (t.id === transferId ? cancelledTransfer : t))
      };
    });

    logAudit('TRANSFER_CANCELLED', `Cancelled transfer #${transferId}`);
  };

  const handlePrepareTransfer = (transferId: string) => {
    const isOnline = navigator.onLine;
    const nowIso = new Date().toISOString();

    setAppState((prev) => {
      const target = (prev.transfers || []).find((t) => t.id === transferId);
      if (!target) return prev;

      const preparedTransfer: StockTransfer = {
        ...target,
        status: 'PREPARING',
        preparedByUserId: prev.currentUser?.id,
        preparedByUserName: prev.currentUser?.name,
        preparedAt: nowIso,
        syncStatus: isOnline ? 'synced' : 'pending'
      };

      putToStore(STORES.TRANSFERS, preparedTransfer).catch((err) => console.error('IndexedDB Put Transfer error:', err));
      queueOperation({
        operationType: 'UPDATE',
        entityType: 'TRANSFER',
        entityId: preparedTransfer.id,
        payload: preparedTransfer,
        branchId: preparedTransfer.sourceBranchId
      }).catch((err) => console.error('Queue Transfer update error:', err));

      if (isOnline) {
        triggerSync().catch((err) => console.error('Sync trigger error:', err));
      }

      return {
        ...prev,
        transfers: (prev.transfers || []).map((t) => (t.id === transferId ? preparedTransfer : t))
      };
    });

    logAudit('TRANSFER_PREPARING', `Transfer #${transferId} marked as preparing`);
  };

  const handleDispatchTransfer = (
    transferId: string,
    itemDispatches?: { productId: string; dispatchedQty: number }[],
    transportDetails?: {
      driverName?: string;
      driverPhone?: string;
      vehicleNumber?: string;
      waybillNumber?: string;
      estimatedArrivalDate?: string;
      notes?: string;
    }
  ) => {
    const isOnline = navigator.onLine;
    const nowIso = new Date().toISOString();
    const dispatchDateStr = nowIso.replace('T', ' ').slice(0, 16);

    setAppState((prev) => {
      const transfer = (prev.transfers || []).find((t) => t.id === transferId);
      if (!transfer) return prev;

      // Update transfer items with dispatched quantities
      const itemsToDispatch = transfer.items && transfer.items.length > 0
        ? transfer.items.map((i) => {
            const override = itemDispatches?.find((d) => d.productId === i.productId);
            return {
              ...i,
              dispatchedQuantity: override ? override.dispatchedQty : (i.dispatchedQuantity ?? i.requestedQuantity)
            };
          })
        : [
            {
              id: 'ti-' + transfer.id + '-0',
              productId: transfer.productId || '',
              productName: transfer.productName || '',
              productSku: transfer.productSku || '',
              requestedQuantity: transfer.quantity || 0,
              dispatchedQuantity: itemDispatches?.[0]?.dispatchedQty ?? transfer.quantity ?? 0
            }
          ];

      // Deduct stock from source branch and create TRANSFER_OUT movements
      const newMovements: StockMovement[] = [];
      let updatedInventory = [...prev.inventory];

      itemsToDispatch.forEach((item) => {
        const dQty = item.dispatchedQuantity || 0;
        let prevQty = 0;
        let newQty = 0;

        updatedInventory = updatedInventory.map((inv) => {
          if (inv.branchId === transfer.sourceBranchId && inv.productId === item.productId) {
            prevQty = inv.quantity;
            newQty = Math.max(0, inv.quantity - dQty);
            const updatedInv = {
              ...inv,
              quantity: newQty,
              lastUpdated: nowIso.split('T')[0]
            };
            putToStore(STORES.INVENTORY, updatedInv).catch((err) => console.error('IndexedDB Put Inventory error:', err));
            queueOperation({
              operationType: 'UPDATE',
              entityType: 'INVENTORY',
              entityId: updatedInv.id,
              payload: updatedInv,
              branchId: transfer.sourceBranchId
            }).catch((err) => console.error('Queue Inventory error:', err));
            return updatedInv;
          }
          return inv;
        });

        const movId = `mov-tr-out-${transfer.id}-${item.productId}`;
        const movement: StockMovement = {
          id: movId,
          productId: item.productId,
          productName: item.productName,
          branchId: transfer.sourceBranchId,
          branchName: transfer.sourceBranchName,
          type: 'TRANSFER_OUT',
          quantityDelta: -dQty,
          previousQty: prevQty,
          newQty,
          referenceNo: transfer.transferNo,
          date: dispatchDateStr,
          userId: prev.currentUser?.id || 'system',
          userName: prev.currentUser?.name || 'System',
          notes: `Dispatched Waybill #${transfer.transferNo} to ${transfer.destinationBranchName}${transportDetails?.driverName ? ` via Driver: ${transportDetails.driverName}` : ''}`,
          syncStatus: isOnline ? 'synced' : 'pending'
        };

        putToStore(STORES.STOCK_MOVEMENTS, movement).catch((err) => console.error('IndexedDB Put Movement error:', err));
        queueOperation({
          operationType: 'CREATE',
          entityType: 'STOCK_MOVEMENT',
          entityId: movement.id,
          payload: movement,
          branchId: transfer.sourceBranchId
        }).catch((err) => console.error('Queue Movement error:', err));

        newMovements.push(movement);
      });

      const dispatchedTransfer: StockTransfer = {
        ...transfer,
        status: 'IN_TRANSIT',
        items: itemsToDispatch,
        dispatchedByUserId: prev.currentUser?.id,
        dispatchedByUserName: prev.currentUser?.name,
        dispatchedAt: nowIso,
        dispatchDate: dispatchDateStr,
        driverName: transportDetails?.driverName || transfer.driverName,
        driverPhone: transportDetails?.driverPhone || transfer.driverPhone,
        vehicleNumber: transportDetails?.vehicleNumber || transfer.vehicleNumber,
        waybillNumber: transportDetails?.waybillNumber || transfer.waybillNumber || transfer.transferNo,
        estimatedArrivalDate: transportDetails?.estimatedArrivalDate || transfer.estimatedArrivalDate,
        notes: transportDetails?.notes ? (transfer.notes ? `${transfer.notes} | ${transportDetails.notes}` : transportDetails.notes) : transfer.notes,
        syncStatus: isOnline ? 'synced' : 'pending'
      };

      putToStore(STORES.TRANSFERS, dispatchedTransfer).catch((err) => console.error('IndexedDB Put Transfer error:', err));
      queueOperation({
        operationType: 'UPDATE',
        entityType: 'TRANSFER',
        entityId: dispatchedTransfer.id,
        payload: dispatchedTransfer,
        branchId: dispatchedTransfer.sourceBranchId
      }).catch((err) => console.error('Queue Transfer update error:', err));

      if (isOnline) {
        triggerSync().catch((err) => console.error('Sync trigger error:', err));
      }

      return {
        ...prev,
        transfers: (prev.transfers || []).map((t) => (t.id === transferId ? dispatchedTransfer : t)),
        inventory: updatedInventory,
        stockMovements: [...newMovements, ...(prev.stockMovements || [])]
      };
    });

    logAudit('TRANSFER_DISPATCHED', `Dispatched stock for transfer waybill #${transferId}`);

    const targetTransfer = (appState.transfers || []).find((t) => t.id === transferId);
    if (targetTransfer) {
      createAdHocNotification(
        {
          branchId: targetTransfer.destinationBranchId,
          branchName: targetTransfer.destinationBranchName,
          category: 'BRANCH_TRANSFERS',
          eventType: 'TRANSFER_DISPATCHED',
          title: `Stock Dispatched: Waybill #${targetTransfer.transferNo}`,
          message: `${targetTransfer.sourceBranchName} has dispatched stock waybill #${targetTransfer.transferNo} to ${targetTransfer.destinationBranchName}. In-transit status active.`,
          referenceType: 'TRANSFER',
          referenceId: targetTransfer.id,
          priority: 'HIGH',
          actionTab: 'TRANSFERS',
          actionLabel: `Receive Waybill #${targetTransfer.transferNo}`,
          actionPayload: { transferId: targetTransfer.id }
        },
        appState.notificationSettings || DEFAULT_NOTIFICATION_SETTINGS
      ).then((notif) => {
        setAppState((p) => ({ ...p, notifications: [notif, ...(p.notifications || [])] }));
      }).catch((err) => console.error('Transfer dispatch notification error:', err));
    }
  };

  const handleReceiveTransfer = (
    transferId: string,
    itemReceives: {
      productId: string;
      receivedQty: number;
      damagedQty?: number;
      missingQty?: number;
      notes?: string;
    }[],
    generalNotes?: string
  ) => {
    const isOnline = navigator.onLine;
    const nowIso = new Date().toISOString();
    const receiveDateStr = nowIso.replace('T', ' ').slice(0, 16);

    let discrepancySummary = '';

    setAppState((prev) => {
      const transfer = (prev.transfers || []).find((t) => t.id === transferId);
      if (!transfer) return prev;

      let isPartial = false;
      let hasDiscrepancy = false;
      let totalMissingAll = 0;
      let totalDamagedAll = 0;

      // Update transfer items with received, damaged and missing quantities
      const itemsToReceive = (transfer.items || [
        {
          id: 'ti-' + transfer.id + '-0',
          productId: transfer.productId || '',
          productName: transfer.productName || '',
          productSku: transfer.productSku || '',
          requestedQuantity: transfer.quantity || 0,
          dispatchedQuantity: transfer.quantity || 0
        }
      ]).map((i) => {
        const match = itemReceives.find((r) => r.productId === i.productId);
        const dQty = i.dispatchedQuantity ?? i.requestedQuantity;
        const rQty = match ? match.receivedQty : (i.receivedQuantity ?? dQty);
        const damagedQty = match?.damagedQty || 0;
        const missingQty = match?.missingQty !== undefined
          ? match.missingQty
          : Math.max(0, dQty - rQty - damagedQty);

        if (rQty < dQty || missingQty > 0 || damagedQty > 0) {
          isPartial = true;
          hasDiscrepancy = true;
          totalMissingAll += missingQty;
          totalDamagedAll += damagedQty;
        }

        return {
          ...i,
          receivedQuantity: rQty,
          damagedQuantity: damagedQty,
          missingQuantity: missingQty,
          discrepancyReason: match?.notes || i.discrepancyReason,
          notes: match?.notes ? (i.notes ? `${i.notes} | ${match.notes}` : match.notes) : i.notes
        };
      });

      if (hasDiscrepancy) {
        discrepancySummary = `${totalMissingAll} missing, ${totalDamagedAll} damaged`;
      }

      // Add stock to destination branch and create TRANSFER_IN movements
      // CRITICAL: ONLY RECEIVED QUANTITY IS ADDED TO INVENTORY. Missing/Damaged items are NOT added!
      const newMovements: StockMovement[] = [];
      let updatedInventory = [...prev.inventory];

      itemsToReceive.forEach((item) => {
        const rQty = item.receivedQuantity || 0;
        let prevQty = 0;
        let newQty = 0;

        let invFound = false;
        updatedInventory = updatedInventory.map((inv) => {
          if (inv.branchId === transfer.destinationBranchId && inv.productId === item.productId) {
            invFound = true;
            prevQty = inv.quantity;
            newQty = inv.quantity + rQty;
            const updatedInv = {
              ...inv,
              quantity: newQty,
              lastUpdated: nowIso.split('T')[0]
            };
            putToStore(STORES.INVENTORY, updatedInv).catch((err) => console.error('IndexedDB Put Inventory error:', err));
            queueOperation({
              operationType: 'UPDATE',
              entityType: 'INVENTORY',
              entityId: updatedInv.id,
              payload: updatedInv,
              branchId: transfer.destinationBranchId
            }).catch((err) => console.error('Queue Inventory error:', err));
            return updatedInv;
          }
          return inv;
        });

        // If product doesn't exist in destination inventory store yet, create branch inventory record
        if (!invFound) {
          const newInv: BranchInventory = {
            id: `inv-${transfer.destinationBranchId}-${item.productId}`,
            branchId: transfer.destinationBranchId,
            productId: item.productId,
            quantity: rQty,
            reorderLevel: 10,
            lastUpdated: nowIso.split('T')[0]
          };
          updatedInventory.push(newInv);
          putToStore(STORES.INVENTORY, newInv).catch((err) => console.error('IndexedDB Put Inventory error:', err));
          queueOperation({
            operationType: 'CREATE',
            entityType: 'INVENTORY',
            entityId: newInv.id,
            payload: newInv,
            branchId: transfer.destinationBranchId
          }).catch((err) => console.error('Queue Inventory error:', err));
          prevQty = 0;
          newQty = rQty;
        }

        const movId = `mov-tr-in-${transfer.id}-${item.productId}`;
        const movement: StockMovement = {
          id: movId,
          productId: item.productId,
          productName: item.productName,
          branchId: transfer.destinationBranchId,
          branchName: transfer.destinationBranchName,
          type: 'TRANSFER_IN',
          quantityDelta: rQty,
          previousQty: prevQty,
          newQty,
          referenceNo: transfer.transferNo,
          date: receiveDateStr,
          userId: prev.currentUser?.id || 'system',
          userName: prev.currentUser?.name || 'System',
          notes: `Received Waybill #${transfer.transferNo} from ${transfer.sourceBranchName} (Qty: ${rQty}${item.missingQuantity ? `, ${item.missingQuantity} missing` : ''}${item.damagedQuantity ? `, ${item.damagedQuantity} damaged` : ''})`,
          syncStatus: isOnline ? 'synced' : 'pending'
        };

        putToStore(STORES.STOCK_MOVEMENTS, movement).catch((err) => console.error('IndexedDB Put Movement error:', err));
        queueOperation({
          operationType: 'CREATE',
          entityType: 'STOCK_MOVEMENT',
          entityId: movement.id,
          payload: movement,
          branchId: transfer.destinationBranchId
        }).catch((err) => console.error('Queue Movement error:', err));

        newMovements.push(movement);
      });

      const finalStatus: StockTransferStatus = isPartial ? 'PARTIALLY_RECEIVED' : 'RECEIVED';

      const receivedTransfer: StockTransfer = {
        ...transfer,
        status: finalStatus,
        items: itemsToReceive,
        receivedByUserId: prev.currentUser?.id,
        receivedByUserName: prev.currentUser?.name,
        receivedAt: nowIso,
        receiveDate: receiveDateStr,
        hasDiscrepancy,
        discrepancyStatus: hasDiscrepancy ? 'UNDER_INVESTIGATION' : 'NONE',
        notes: generalNotes ? (transfer.notes ? `${transfer.notes} | Delivery Receipt: ${generalNotes}` : generalNotes) : transfer.notes,
        syncStatus: isOnline ? 'synced' : 'pending'
      };

      putToStore(STORES.TRANSFERS, receivedTransfer).catch((err) => console.error('IndexedDB Put Transfer error:', err));
      queueOperation({
        operationType: 'UPDATE',
        entityType: 'TRANSFER',
        entityId: receivedTransfer.id,
        payload: receivedTransfer,
        branchId: receivedTransfer.destinationBranchId
      }).catch((err) => console.error('Queue Transfer update error:', err));

      if (isOnline) {
        triggerSync().catch((err) => console.error('Sync trigger error:', err));
      }

      return {
        ...prev,
        transfers: (prev.transfers || []).map((t) => (t.id === transferId ? receivedTransfer : t)),
        inventory: updatedInventory,
        stockMovements: [...newMovements, ...(prev.stockMovements || [])]
      };
    });

    logAudit(
      discrepancySummary ? 'TRANSFER_RECEIVED_WITH_DISCREPANCY' : 'TRANSFER_RECEIVED',
      `Confirmed stock receipt for transfer waybill #${transferId}${discrepancySummary ? ` (${discrepancySummary})` : ''}`
    );

    const targetTransfer = (appState.transfers || []).find((t) => t.id === transferId);
    if (targetTransfer) {
      const isShort = Boolean(discrepancySummary);
      createAdHocNotification(
        {
          branchId: targetTransfer.sourceBranchId,
          branchName: targetTransfer.sourceBranchName,
          category: 'BRANCH_TRANSFERS',
          eventType: isShort ? 'TRANSFER_DISCREPANCY_ALERT' : 'TRANSFER_RECEIVED',
          title: isShort ? `⚠️ Transfer #${targetTransfer.transferNo} Discrepancy (${discrepancySummary})` : `Transfer #${targetTransfer.transferNo} Received`,
          message: isShort
            ? `${targetTransfer.destinationBranchName} received waybill #${targetTransfer.transferNo} with discrepancies: ${discrepancySummary}. Investigation opened.`
            : `${targetTransfer.destinationBranchName} has received stock waybill #${targetTransfer.transferNo}. Inventory updated.`,
          referenceType: 'TRANSFER',
          referenceId: targetTransfer.id,
          priority: isShort ? 'CRITICAL' : 'LOW',
          actionTab: 'TRANSFERS',
          actionLabel: `View Transfer #${targetTransfer.transferNo}`,
          actionPayload: { transferId: targetTransfer.id }
        },
        appState.notificationSettings || DEFAULT_NOTIFICATION_SETTINGS
      ).then((notif) => {
        setAppState((p) => ({ ...p, notifications: [notif, ...(p.notifications || [])] }));
      }).catch((err) => console.error('Transfer receive notification error:', err));
    }
  };

  const handleResolveDiscrepancy = (
    transferId: string,
    resolution: {
      status: 'RESOLVED_TRANSIT_LOSS' | 'RESOLVED_SUPPLIER_RECOVERY' | 'RESOLVED_RETURNED';
      notes: string;
    }
  ) => {
    const isOnline = navigator.onLine;
    const nowIso = new Date().toISOString();

    setAppState((prev) => {
      const target = (prev.transfers || []).find((t) => t.id === transferId);
      if (!target) return prev;

      const resolvedTransfer: StockTransfer = {
        ...target,
        discrepancyStatus: resolution.status,
        discrepancyResolutionNotes: resolution.notes,
        discrepancyResolvedByUserId: prev.currentUser?.id,
        discrepancyResolvedByUserName: prev.currentUser?.name,
        discrepancyResolvedAt: nowIso,
        syncStatus: isOnline ? 'synced' : 'pending'
      };

      putToStore(STORES.TRANSFERS, resolvedTransfer).catch((err) => console.error('IndexedDB Put Transfer error:', err));
      queueOperation({
        operationType: 'UPDATE',
        entityType: 'TRANSFER',
        entityId: resolvedTransfer.id,
        payload: resolvedTransfer,
        branchId: resolvedTransfer.sourceBranchId
      }).catch((err) => console.error('Queue Transfer update error:', err));

      if (isOnline) {
        triggerSync().catch((err) => console.error('Sync trigger error:', err));
      }

      return {
        ...prev,
        transfers: (prev.transfers || []).map((t) => (t.id === transferId ? resolvedTransfer : t))
      };
    });

    logAudit('TRANSFER_DISCREPANCY_RESOLVED', `Resolved discrepancy on transfer #${transferId}: ${resolution.status} - ${resolution.notes}`);
  };

  const handleRejectTransfer = (transferId: string, reason: string) => {
    const isOnline = navigator.onLine;

    setAppState((prev) => {
      const target = (prev.transfers || []).find((t) => t.id === transferId);
      if (!target) return prev;

      const rejectedTransfer: StockTransfer = {
        ...target,
        status: 'REJECTED',
        rejectionReason: reason,
        notes: target.notes ? `${target.notes} | Rejection Reason: ${reason}` : `Rejection Reason: ${reason}`,
        syncStatus: isOnline ? 'synced' : 'pending'
      };

      putToStore(STORES.TRANSFERS, rejectedTransfer).catch((err) => console.error('IndexedDB Put Transfer error:', err));
      queueOperation({
        operationType: 'UPDATE',
        entityType: 'TRANSFER',
        entityId: rejectedTransfer.id,
        payload: rejectedTransfer,
        branchId: rejectedTransfer.sourceBranchId
      }).catch((err) => console.error('Queue Transfer update error:', err));

      if (isOnline) {
        triggerSync().catch((err) => console.error('Sync trigger error:', err));
      }

      return {
        ...prev,
        transfers: (prev.transfers || []).map((t) => (t.id === transferId ? rejectedTransfer : t))
      };
    });

    logAudit('TRANSFER_REJECTED', `Rejected transfer #${transferId}: ${reason}`);

    const targetTransfer = (appState.transfers || []).find((t) => t.id === transferId);
    if (targetTransfer) {
      createAdHocNotification(
        {
          branchId: targetTransfer.sourceBranchId,
          branchName: targetTransfer.sourceBranchName,
          category: 'BRANCH_TRANSFERS',
          eventType: 'TRANSFER_REJECTED',
          title: `Transfer Rejected: #${targetTransfer.transferNo}`,
          message: `Stock transfer #${targetTransfer.transferNo} was rejected by management: ${reason}`,
          referenceType: 'TRANSFER',
          referenceId: targetTransfer.id,
          priority: 'HIGH',
          actionTab: 'TRANSFERS',
          actionLabel: `View Transfer #${targetTransfer.transferNo}`,
          actionPayload: { transferId: targetTransfer.id }
        },
        appState.notificationSettings || DEFAULT_NOTIFICATION_SETTINGS
      ).then((notif) => {
        setAppState((p) => ({ ...p, notifications: [notif, ...(p.notifications || [])] }));
      }).catch((err) => console.error('Transfer reject notification error:', err));
    }
  };

  // 5. Branch Management
  const handleAddBranch = (branch: Branch) => {
    setAppState((prev) => ({
      ...prev,
      branches: [...(prev.branches || []), branch]
    }));
    logAudit('BRANCH_CREATED', `Registered new branch ${branch.name}`);
  };

  const handleUpdateBranch = (branch: Branch) => {
    setAppState((prev) => ({
      ...prev,
      branches: (prev.branches || []).map((b) => (b.id === branch.id ? branch : b))
    }));
    logAudit('BRANCH_UPDATED', `Updated branch details for ${branch.name}`);
  };

  const handleToggleBranchStatus = (branchId: string) => {
    setAppState((prev) => ({
      ...prev,
      branches: (prev.branches || []).map((b) =>
        b.id === branchId ? { ...b, status: b.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' } : b
      )
    }));
  };

  // 6. Customers & Credit Offline Handlers
  const handleAddCustomer = (customer: Customer) => {
    const isOnline = navigator.onLine;
    const finalCustomer: Customer = {
      ...customer,
      syncStatus: isOnline ? 'synced' : 'pending'
    };

    setAppState((prev) => ({
      ...prev,
      customers: [finalCustomer, ...(prev.customers || [])]
    }));

    putToStore(STORES.CUSTOMERS, finalCustomer).catch((err) => console.error('IndexedDB Put Customer error:', err));
    queueOperation({
      operationType: 'CREATE',
      entityType: 'CUSTOMER',
      entityId: finalCustomer.id,
      payload: finalCustomer,
      branchId: finalCustomer.registeredBranchId
    }).catch((err) => console.error('Queue Customer error:', err));

    if (isOnline) {
      triggerSync().catch((err) => console.error('Sync trigger error:', err));
    }

    logAudit('CUSTOMER_REGISTERED', `Registered new customer ${finalCustomer.fullName} (${finalCustomer.phone})`);
  };

  const handleUpdateCustomer = (customer: Customer) => {
    const isOnline = navigator.onLine;
    const updatedCustomer: Customer = {
      ...customer,
      syncStatus: isOnline ? 'synced' : 'pending'
    };

    setAppState((prev) => ({
      ...prev,
      customers: (prev.customers || []).map((c) => (c.id === customer.id ? updatedCustomer : c))
    }));

    putToStore(STORES.CUSTOMERS, updatedCustomer).catch((err) => console.error('IndexedDB Update Customer error:', err));
    queueOperation({
      operationType: 'UPDATE',
      entityType: 'CUSTOMER',
      entityId: updatedCustomer.id,
      payload: updatedCustomer,
      branchId: updatedCustomer.registeredBranchId
    }).catch((err) => console.error('Queue Customer Update error:', err));

    if (isOnline) {
      triggerSync().catch((err) => console.error('Sync trigger error:', err));
    }

    logAudit('CUSTOMER_UPDATED', `Updated details for customer ${updatedCustomer.fullName}`);
  };

  const handleRecordDebtRepayment = (
    customerId: string,
    saleId: string | null,
    repaymentAmount: number,
    paymentMethod: PaymentMethod,
    reference?: string
  ) => {
    setAppState((prev) => {
      let targetCust: Customer | undefined;
      const updatedCustomers = (prev.customers || []).map((c) => {
        if (c.id === customerId) {
          targetCust = {
            ...c,
            creditBalance: Math.max(0, (c.creditBalance || 0) - repaymentAmount)
          };
          return targetCust;
        }
        return c;
      });

      if (targetCust) {
        putToStore(STORES.CUSTOMERS, targetCust).catch((err) => console.error('IndexedDB update customer debt error:', err));
      }

      const updatedSales = (prev.sales || []).map((s) => {
        if (saleId && s.id === saleId) {
          const currentPaid = s.amountPaid ?? s.totalAmount;
          const newPaid = currentPaid + repaymentAmount;
          const newBal = Math.max(0, s.totalAmount - newPaid);
          const updatedSale = {
            ...s,
            amountPaid: newPaid,
            balanceDue: newBal,
            paymentStatus: (newBal === 0 ? 'PAID' : 'PARTIAL') as PaymentStatus,
            paymentReference: reference || s.paymentReference
          };
          putToStore(STORES.SALES, updatedSale).catch((err) => console.error('IndexedDB update sale payment error:', err));
          return updatedSale;
        }
        return s;
      });

      return {
        ...prev,
        customers: updatedCustomers,
        sales: updatedSales
      };
    });

    logAudit(
      'CREDIT_REPAYMENT',
      `Recorded repayment of ₦${repaymentAmount.toLocaleString()} via ${paymentMethod}${reference ? ` (Ref: ${reference})` : ''}`
    );
  };

  const handleCreateCredit = (creditData: Omit<CustomerCredit, 'id' | 'creditNo' | 'createdAt' | 'updatedAt'>) => {
    const isOnline = navigator.onLine;
    const uniqueId = `crd-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newCredit: CustomerCredit = {
      ...creditData,
      id: uniqueId,
      creditNo: 'CR-' + Math.floor(10000 + Math.random() * 90000),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncStatus: isOnline ? 'synced' : 'pending'
    };

    setAppState((prev) => {
      let updatedCust: Customer | undefined;
      const updatedCustomers = (prev.customers || []).map((c) => {
        if (c.id === creditData.customerId) {
          updatedCust = {
            ...c,
            creditBalance: (c.creditBalance || 0) + creditData.remainingBalance
          };
          return updatedCust;
        }
        return c;
      });

      if (updatedCust) {
        putToStore(STORES.CUSTOMERS, updatedCust).catch((err) => console.error('IndexedDB put customer credit balance error:', err));
        queueOperation({
          operationType: 'UPDATE',
          entityType: 'CUSTOMER',
          entityId: updatedCust.id,
          payload: updatedCust,
          branchId: updatedCust.registeredBranchId
        }).catch((err) => console.error('Queue Customer update error:', err));
      }

      putToStore(STORES.CREDITS, newCredit).catch((err) => console.error('IndexedDB Put Credit error:', err));
      queueOperation({
        operationType: 'CREATE',
        entityType: 'CREDIT',
        entityId: newCredit.id,
        payload: newCredit,
        branchId: newCredit.branchId
      }).catch((err) => console.error('Queue Credit error:', err));

      if (isOnline) {
        triggerSync().catch((err) => console.error('Sync trigger error:', err));
      }

      return {
        ...prev,
        credits: [newCredit, ...(prev.credits || [])],
        customers: updatedCustomers
      };
    });

    logAudit('CREATED_CREDIT', `Issued credit sale of ₦${creditData.creditAmount.toLocaleString()} to ${creditData.customerName}`);
  };

  const handleRecordCreditPayment = (
    creditId: string,
    amountPaid: number,
    paymentMethod: PaymentMethod,
    referenceNumber?: string,
    notes?: string
  ) => {
    const isOnline = navigator.onLine;
    let targetCredit: CustomerCredit | undefined;
    const payId = `pay-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    setAppState((prev) => {
      const existingCredits = prev.credits || [];
      targetCredit = existingCredits.find((c) => c.id === creditId);
      if (!targetCredit) return prev;

      const newAmountPaid = targetCredit.amountPaid + amountPaid;
      const newRemainingBalance = Math.max(0, targetCredit.creditAmount - newAmountPaid);
      const newPaymentStatus: PaymentStatus = newRemainingBalance === 0 ? 'PAID' : 'PARTIAL';
      const newCreditStatus: CreditStatus = newRemainingBalance === 0 ? 'GOOD' : targetCredit.creditStatus;

      const updatedCredit: CustomerCredit = {
        ...targetCredit,
        amountPaid: newAmountPaid,
        remainingBalance: newRemainingBalance,
        paymentStatus: newPaymentStatus,
        creditStatus: newCreditStatus,
        updatedAt: new Date().toISOString(),
        syncStatus: isOnline ? 'synced' : 'pending'
      };

      const updatedCredits = existingCredits.map((c) => (c.id === creditId ? updatedCredit : c));

      const newPayment: CreditPayment = {
        id: payId,
        paymentNo: 'PM-' + Math.floor(10000 + Math.random() * 90000),
        creditId,
        customerId: targetCredit.customerId,
        customerName: targetCredit.customerName,
        receiptNo: targetCredit.receiptNo,
        amountPaid,
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod,
        referenceNumber: referenceNumber || 'N/A',
        notes: notes || 'Credit repayment',
        receivedByUserId: prev.currentUser?.id || 'usr-1',
        receivedByUserName: prev.currentUser?.name || 'Staff',
        branchId: targetCredit.branchId,
        createdAt: new Date().toISOString(),
        syncStatus: isOnline ? 'synced' : 'pending'
      };

      let updatedCust: Customer | undefined;
      const updatedCustomers = (prev.customers || []).map((cust) => {
        if (cust.id === targetCredit?.customerId) {
          updatedCust = {
            ...cust,
            creditBalance: Math.max(0, (cust.creditBalance || 0) - amountPaid)
          };
          return updatedCust;
        }
        return cust;
      });

      // Persist Payment, Updated Credit, and Updated Customer into IndexedDB
      putToStore(STORES.CREDIT_PAYMENTS, newPayment).catch((err) => console.error('IndexedDB Put Payment error:', err));
      queueOperation({
        operationType: 'CREATE',
        entityType: 'CREDIT_PAYMENT',
        entityId: newPayment.id,
        payload: newPayment,
        branchId: newPayment.branchId
      }).catch((err) => console.error('Queue Credit Payment error:', err));

      putToStore(STORES.CREDITS, updatedCredit).catch((err) => console.error('IndexedDB Put Credit error:', err));
      queueOperation({
        operationType: 'UPDATE',
        entityType: 'CREDIT',
        entityId: updatedCredit.id,
        payload: updatedCredit,
        branchId: updatedCredit.branchId
      }).catch((err) => console.error('Queue Credit update error:', err));

      if (updatedCust) {
        putToStore(STORES.CUSTOMERS, updatedCust).catch((err) => console.error('IndexedDB update customer balance error:', err));
        queueOperation({
          operationType: 'UPDATE',
          entityType: 'CUSTOMER',
          entityId: updatedCust.id,
          payload: updatedCust,
          branchId: updatedCust.registeredBranchId
        }).catch((err) => console.error('Queue Customer update error:', err));
      }

      if (isOnline) {
        triggerSync().catch((err) => console.error('Sync trigger error:', err));
      }

      return {
        ...prev,
        credits: updatedCredits,
        creditPayments: [newPayment, ...(prev.creditPayments || [])],
        customers: updatedCustomers
      };
    });

    logAudit('RECORDED_CREDIT_REPAYMENT', `Recorded repayment of ₦${amountPaid.toLocaleString()} for credit invoice #${targetCredit?.receiptNo || creditId}`);

    const credit = (appState.credits || []).find((c) => c.id === creditId);
    if (credit) {
      createAdHocNotification(
        {
          branchId: credit.branchId,
          branchName: credit.branchName,
          category: 'CUSTOMER_CREDIT',
          eventType: 'CREDIT_REPAYMENT',
          title: `Debt Repayment: ₦${amountPaid.toLocaleString()}`,
          message: `${credit.customerName} made repayment of ₦${amountPaid.toLocaleString()} for Invoice #${credit.receiptNo || credit.creditNo} at ${credit.branchName}. Remaining balance: ₦${Math.max(0, credit.remainingBalance - amountPaid).toLocaleString()}.`,
          referenceType: 'CUSTOMER',
          referenceId: credit.customerId,
          priority: 'LOW',
          actionTab: 'CREDIT_MANAGEMENT',
          actionLabel: 'View Farmer Account',
          actionPayload: { creditId: credit.id, customerId: credit.customerId }
        },
        appState.notificationSettings || DEFAULT_NOTIFICATION_SETTINGS
      ).then((notif) => {
        setAppState((p) => ({ ...p, notifications: [notif, ...(p.notifications || [])] }));
      }).catch((err) => console.error('Credit repayment notification error:', err));
    }
  };

  const handleEditCredit = (creditId: string, updatedDueDate: string, remarks?: string) => {
    setAppState((prev) => ({
      ...prev,
      credits: (prev.credits || []).map((c) =>
        c.id === creditId ? { ...c, dueDate: updatedDueDate, remarks: remarks !== undefined ? remarks : c.remarks } : c
      )
    }));
    logAudit('UPDATED_CREDIT_TERMS', `Updated credit due date to ${updatedDueDate} for credit #${creditId}`);
  };

  const handleDeleteCredit = (creditId: string) => {
    setAppState((prev) => ({
      ...prev,
      credits: (prev.credits || []).filter((c) => c.id !== creditId)
    }));
    logAudit('DELETED_CREDIT_RECORD', `Deleted credit record #${creditId}`);
  };

  // 6.5 Sales Return Management
  const applyReturnEffectsToState = (ret: SalesReturn, prevState: AppState): AppState => {
    const isOnline = navigator.onLine;

    // 1. Inventory Stock Restoration
    const updatedInventory = [...(prevState.inventory || [])].map((inv) => {
      if (inv.branchId === ret.branchId) {
        const retItem = ret.items.find((i) => i.productId === inv.productId);
        // Only return sellable GOOD condition items back to available inventory
        if (retItem && retItem.condition === 'GOOD') {
          const updatedInv = {
            ...inv,
            quantity: inv.quantity + retItem.quantity,
            lastUpdated: new Date().toISOString().split('T')[0]
          };
          putToStore(STORES.INVENTORY, updatedInv).catch((err) => console.error('IndexedDB Put Inventory error:', err));
          return updatedInv;
        }
      }
      return inv;
    });

    // Stock Movements
    const newMovements: StockMovement[] = ret.items.map((it) => {
      const inv = (prevState.inventory || []).find(
        (i) => i.branchId === ret.branchId && i.productId === it.productId
      );
      const prevQty = inv ? inv.quantity : 0;
      const addedQty = it.condition === 'GOOD' ? it.quantity : 0;
      const mov: StockMovement = {
        id: 'mov-ret-' + Date.now() + '-' + Math.floor(Math.random() * 10000),
        productId: it.productId,
        productName: it.productName,
        branchId: ret.branchId,
        branchName: ret.branchName,
        quantityDelta: addedQty,
        previousQty: prevQty,
        newQty: prevQty + addedQty,
        type: 'RETURN' as StockMovementType,
        referenceNo: ret.returnNo,
        userId: ret.submittedByUserId,
        userName: ret.submittedByUserName,
        date: new Date().toISOString().split('T')[0],
        notes: `Sales Return #${ret.returnNo} (${it.condition})`,
        syncStatus: isOnline ? 'synced' : 'pending'
      };

      putToStore(STORES.STOCK_MOVEMENTS, mov).catch((err) => console.error('IndexedDB Put StockMovement error:', err));
      queueOperation({
        operationType: 'CREATE',
        entityType: 'STOCK_MOVEMENT',
        entityId: mov.id,
        payload: mov,
        branchId: mov.branchId
      }).catch((err) => console.error('Queue StockMovement error:', err));

      return mov;
    });

    // 2. Customer & Credit Record Adjustments
    const updatedCredits = (prevState.credits || []).map((cred) => {
      if (
        (cred.saleId === ret.saleId || cred.receiptNo === ret.receiptNo) &&
        (ret.returnType === 'REDUCE_CREDIT' || cred.remainingBalance > 0)
      ) {
        const newRem = Math.max(0, cred.remainingBalance - ret.totalReturnValue);
        const updatedCred: CustomerCredit = {
          ...cred,
          remainingBalance: newRem,
          paymentStatus: (newRem === 0 ? 'PAID' : 'PARTIAL') as PaymentStatus,
          updatedAt: new Date().toISOString(),
          syncStatus: isOnline ? 'synced' : 'pending'
        };

        putToStore(STORES.CREDITS, updatedCred).catch((err) => console.error('IndexedDB Put Credit error:', err));
        queueOperation({
          operationType: 'UPDATE',
          entityType: 'CREDIT',
          entityId: updatedCred.id,
          payload: updatedCred,
          branchId: updatedCred.branchId
        }).catch((err) => console.error('Queue Credit update error:', err));

        return updatedCred;
      }
      return cred;
    });

    const updatedCustomers = (prevState.customers || []).map((cust) => {
      if (cust.id === ret.customerId || cust.fullName === ret.customerName) {
        let storeCredit = cust.storeCreditBalance || 0;
        let creditBal = cust.creditBalance || 0;

        if (ret.returnType === 'STORE_CREDIT') {
          storeCredit += ret.totalReturnValue;
        } else if (ret.returnType === 'REDUCE_CREDIT') {
          creditBal = Math.max(0, creditBal - ret.totalReturnValue);
        }

        const updatedCust: Customer = {
          ...cust,
          storeCreditBalance: storeCredit,
          creditBalance: creditBal,
          totalReturns: (cust.totalReturns || 0) + 1,
          totalRefunds: (cust.totalRefunds || 0) + ret.refundAmount,
          syncStatus: isOnline ? 'synced' : 'pending'
        };

        putToStore(STORES.CUSTOMERS, updatedCust).catch((err) => console.error('IndexedDB Put Customer error:', err));
        queueOperation({
          operationType: 'UPDATE',
          entityType: 'CUSTOMER',
          entityId: updatedCust.id,
          payload: updatedCust,
          branchId: updatedCust.registeredBranchId
        }).catch((err) => console.error('Queue Customer update error:', err));

        return updatedCust;
      }
      return cust;
    });

    const currentMovements = prevState.stockMovements || [];

    return {
      ...prevState,
      inventory: updatedInventory,
      stockMovements: [...newMovements, ...currentMovements],
      credits: updatedCredits,
      customers: updatedCustomers
    };
  };

  const handleCreateReturn = (
    returnData: Omit<SalesReturn, 'id' | 'returnNo' | 'createdAt' | 'updatedAt'>
  ) => {
    const isOnline = navigator.onLine;
    const returnId = 'ret-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    const returnNo = 'RET-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
    const nowIso = new Date().toISOString();

    const newReturn: SalesReturn = {
      ...returnData,
      id: returnId,
      returnNo,
      createdAt: nowIso,
      updatedAt: nowIso,
      syncStatus: isOnline ? 'synced' : 'pending'
    };

    // Persist return to IndexedDB & queue pending operation
    putToStore(STORES.RETURNS, newReturn).catch((err) => console.error('IndexedDB Put Return error:', err));
    queueOperation({
      operationType: 'CREATE',
      entityType: 'RETURN',
      entityId: newReturn.id,
      payload: newReturn,
      branchId: newReturn.branchId
    }).catch((err) => console.error('Queue Return error:', err));

    if (isOnline) {
      triggerSync().catch((err) => console.error('Sync trigger error:', err));
    }

    setAppState((prev) => {
      let nextState: AppState = {
        ...prev,
        salesReturns: [newReturn, ...(prev.salesReturns || [])]
      };

      // If approved immediately (e.g. created by Manager/Admin), apply effects
      if (newReturn.status === 'APPROVED' || newReturn.status === 'COMPLETED') {
        nextState = applyReturnEffectsToState(newReturn, nextState);
      }

      return nextState;
    });

    logAudit('CREATED_SALES_RETURN', `Processed sales return #${newReturn.returnNo} for invoice #${newReturn.receiptNo} (Value: ₦${newReturn.totalReturnValue.toLocaleString()})`);
  };

  const handleApproveReturn = (returnId: string) => {
    const isOnline = navigator.onLine;
    const nowIso = new Date().toISOString();

    setAppState((prev) => {
      const existingReturns = prev.salesReturns || [];
      const target = existingReturns.find((r) => r.id === returnId);
      if (!target) return prev;

      const approvedReturn: SalesReturn = {
        ...target,
        status: 'APPROVED',
        approvedByUserId: prev.currentUser?.id,
        approvedByUserName: prev.currentUser?.name,
        updatedAt: nowIso,
        syncStatus: isOnline ? 'synced' : 'pending'
      };

      putToStore(STORES.RETURNS, approvedReturn).catch((err) => console.error('IndexedDB Put Return error:', err));
      queueOperation({
        operationType: 'UPDATE',
        entityType: 'RETURN',
        entityId: approvedReturn.id,
        payload: approvedReturn,
        branchId: approvedReturn.branchId
      }).catch((err) => console.error('Queue Return update error:', err));

      if (isOnline) {
        triggerSync().catch((err) => console.error('Sync trigger error:', err));
      }

      const updatedReturns = existingReturns.map((r) => (r.id === returnId ? approvedReturn : r));

      let nextState: AppState = {
        ...prev,
        salesReturns: updatedReturns
      };

      nextState = applyReturnEffectsToState(approvedReturn, nextState);
      return nextState;
    });

    logAudit('APPROVED_SALES_RETURN', `Approved sales return request #${returnId}`);
  };

  const handleRejectReturn = (returnId: string, reason: string) => {
    const isOnline = navigator.onLine;
    const nowIso = new Date().toISOString();

    setAppState((prev) => {
      const existingReturns = prev.salesReturns || [];
      const target = existingReturns.find((r) => r.id === returnId);
      if (!target) return prev;

      const rejectedReturn: SalesReturn = {
        ...target,
        status: 'REJECTED',
        notes: target.notes ? `${target.notes} | Rejection Reason: ${reason}` : `Rejection Reason: ${reason}`,
        updatedAt: nowIso,
        syncStatus: isOnline ? 'synced' : 'pending'
      };

      putToStore(STORES.RETURNS, rejectedReturn).catch((err) => console.error('IndexedDB Put Return error:', err));
      queueOperation({
        operationType: 'UPDATE',
        entityType: 'RETURN',
        entityId: rejectedReturn.id,
        payload: rejectedReturn,
        branchId: rejectedReturn.branchId
      }).catch((err) => console.error('Queue Return update error:', err));

      if (isOnline) {
        triggerSync().catch((err) => console.error('Sync trigger error:', err));
      }

      return {
        ...prev,
        salesReturns: existingReturns.map((r) => (r.id === returnId ? rejectedReturn : r))
      };
    });

    logAudit('REJECTED_SALES_RETURN', `Rejected sales return #${returnId}: ${reason}`);
  };

  // 7. Suppliers, Purchase Orders, Goods Receiving (GRN) & Supplier Payables
  const handleSaveSupplier = (supplier: Supplier) => {
    const isOnline = navigator.onLine;
    const finalSupplier: Supplier = {
      ...supplier,
      syncStatus: isOnline ? 'synced' : 'pending'
    };

    putToStore(STORES.SUPPLIERS, finalSupplier).catch((err) =>
      console.error('IndexedDB Put Supplier error:', err)
    );
    queueOperation({
      operationType: 'CREATE',
      entityType: 'SUPPLIER',
      entityId: finalSupplier.id,
      payload: finalSupplier
    }).catch((err) => console.error('Queue Supplier error:', err));

    if (isOnline) {
      triggerSync().catch((err) => console.error('Sync trigger error:', err));
    }

    setAppState((prev) => {
      const exists = (prev.suppliers || []).some((s) => s.id === finalSupplier.id);
      return {
        ...prev,
        suppliers: exists
          ? (prev.suppliers || []).map((s) => (s.id === finalSupplier.id ? finalSupplier : s))
          : [finalSupplier, ...(prev.suppliers || [])]
      };
    });

    logAudit(
      'SUPPLIER_SAVED',
      `Registered/Updated agricultural input supplier ${finalSupplier.companyName}`
    );
  };

  const handleDeleteSupplier = (supplierId: string) => {
    setAppState((prev) => ({
      ...prev,
      suppliers: (prev.suppliers || []).filter((s) => s.id !== supplierId)
    }));
    logAudit('SUPPLIER_DELETED', `Deleted supplier record #${supplierId}`);
  };

  const handleCreatePurchaseOrder = (po: PurchaseOrder) => {
    const isOnline = navigator.onLine;
    const finalPO: PurchaseOrder = {
      ...po,
      syncStatus: isOnline ? 'synced' : 'pending'
    };

    putToStore(STORES.PURCHASE_ORDERS, finalPO).catch((err) =>
      console.error('IndexedDB Put PurchaseOrder error:', err)
    );
    queueOperation({
      operationType: 'CREATE',
      entityType: 'PURCHASE_ORDER',
      entityId: finalPO.id,
      payload: finalPO,
      branchId: finalPO.branchId
    }).catch((err) => console.error('Queue PurchaseOrder error:', err));

    if (isOnline) {
      triggerSync().catch((err) => console.error('Sync trigger error:', err));
    }

    setAppState((prev) => {
      const updated = [finalPO, ...(prev.purchaseOrders || prev.purchases || [])];
      return {
        ...prev,
        purchaseOrders: updated,
        purchases: updated
      };
    });

    logAudit(
      'PURCHASE_ORDER_CREATED',
      `Issued purchase order #${finalPO.orderNo} for ${finalPO.supplierName} (${finalPO.branchName})`
    );
  };

  const handleUpdatePurchaseOrder = (po: PurchaseOrder) => {
    const isOnline = navigator.onLine;
    const finalPO: PurchaseOrder = {
      ...po,
      syncStatus: isOnline ? 'synced' : 'pending'
    };

    putToStore(STORES.PURCHASE_ORDERS, finalPO).catch((err) =>
      console.error('IndexedDB Put PurchaseOrder error:', err)
    );
    queueOperation({
      operationType: 'UPDATE',
      entityType: 'PURCHASE_ORDER',
      entityId: finalPO.id,
      payload: finalPO,
      branchId: finalPO.branchId
    }).catch((err) => console.error('Queue PurchaseOrder update error:', err));

    if (isOnline) {
      triggerSync().catch((err) => console.error('Sync trigger error:', err));
    }

    setAppState((prev) => {
      const list = prev.purchaseOrders || prev.purchases || [];
      const updated = list.map((p) => (p.id === po.id ? finalPO : p));
      return {
        ...prev,
        purchaseOrders: updated,
        purchases: updated
      };
    });

    logAudit('PURCHASE_ORDER_UPDATED', `Updated purchase order #${finalPO.orderNo}`);
  };

  const handleApprovePurchaseOrder = (poId: string, remarks?: string) => {
    const isOnline = navigator.onLine;
    const nowIso = new Date().toISOString();

    setAppState((prev) => {
      const list = prev.purchaseOrders || prev.purchases || [];
      const target = list.find((p) => p.id === poId);
      if (!target) return prev;

      const approvedPO: PurchaseOrder = {
        ...target,
        status: 'APPROVED',
        approvedByUserId: prev.currentUser?.id,
        approvedByUserName: prev.currentUser?.name,
        approvedAt: nowIso.replace('T', ' ').slice(0, 16),
        notes: remarks ? (target.notes ? `${target.notes} | Approval: ${remarks}` : `Approval: ${remarks}`) : target.notes,
        syncStatus: isOnline ? 'synced' : 'pending'
      };

      putToStore(STORES.PURCHASE_ORDERS, approvedPO).catch((err) =>
        console.error('IndexedDB Put PO error:', err)
      );
      queueOperation({
        operationType: 'UPDATE',
        entityType: 'PURCHASE_ORDER',
        entityId: approvedPO.id,
        payload: approvedPO,
        branchId: approvedPO.branchId
      }).catch((err) => console.error('Queue PO update error:', err));

      if (isOnline) {
        triggerSync().catch((err) => console.error('Sync trigger error:', err));
      }

      const updatedList = list.map((p) => (p.id === poId ? approvedPO : p));
      return {
        ...prev,
        purchaseOrders: updatedList,
        purchases: updatedList
      };
    });

    logAudit('PURCHASE_ORDER_APPROVED', `Executive authorized purchase order #${poId}`);
  };

  const handleRejectPurchaseOrder = (poId: string, reason: string) => {
    const isOnline = navigator.onLine;

    setAppState((prev) => {
      const list = prev.purchaseOrders || prev.purchases || [];
      const target = list.find((p) => p.id === poId);
      if (!target) return prev;

      const rejectedPO: PurchaseOrder = {
        ...target,
        status: 'REJECTED',
        rejectionReason: reason,
        notes: target.notes ? `${target.notes} | Rejection: ${reason}` : `Rejection: ${reason}`,
        syncStatus: isOnline ? 'synced' : 'pending'
      };

      putToStore(STORES.PURCHASE_ORDERS, rejectedPO).catch((err) =>
        console.error('IndexedDB Put PO error:', err)
      );
      queueOperation({
        operationType: 'UPDATE',
        entityType: 'PURCHASE_ORDER',
        entityId: rejectedPO.id,
        payload: rejectedPO,
        branchId: rejectedPO.branchId
      }).catch((err) => console.error('Queue PO update error:', err));

      if (isOnline) {
        triggerSync().catch((err) => console.error('Sync trigger error:', err));
      }

      const updatedList = list.map((p) => (p.id === poId ? rejectedPO : p));
      return {
        ...prev,
        purchaseOrders: updatedList,
        purchases: updatedList
      };
    });

    logAudit('PURCHASE_ORDER_REJECTED', `Rejected purchase order #${poId}: ${reason}`);
  };

  const handleCancelPurchaseOrder = (poId: string, reason?: string) => {
    const isOnline = navigator.onLine;

    setAppState((prev) => {
      const list = prev.purchaseOrders || prev.purchases || [];
      const target = list.find((p) => p.id === poId);
      if (!target) return prev;

      const cancelledPO: PurchaseOrder = {
        ...target,
        status: 'CANCELLED',
        notes: reason ? `${target.notes || ''} | Cancelled: ${reason}` : target.notes,
        syncStatus: isOnline ? 'synced' : 'pending'
      };

      putToStore(STORES.PURCHASE_ORDERS, cancelledPO).catch((err) =>
        console.error('IndexedDB Put PO error:', err)
      );
      queueOperation({
        operationType: 'UPDATE',
        entityType: 'PURCHASE_ORDER',
        entityId: cancelledPO.id,
        payload: cancelledPO,
        branchId: cancelledPO.branchId
      }).catch((err) => console.error('Queue PO update error:', err));

      if (isOnline) {
        triggerSync().catch((err) => console.error('Sync trigger error:', err));
      }

      const updatedList = list.map((p) => (p.id === poId ? cancelledPO : p));
      return {
        ...prev,
        purchaseOrders: updatedList,
        purchases: updatedList
      };
    });

    logAudit('PURCHASE_ORDER_CANCELLED', `Cancelled purchase order #${poId}`);
  };

  const handleReceiveGoodsReceipt = (grn: GoodsReceipt) => {
    const isOnline = navigator.onLine;
    const nowIso = new Date().toISOString();

    const finalGRN: GoodsReceipt = {
      ...grn,
      syncStatus: isOnline ? 'synced' : 'pending'
    };

    putToStore(STORES.GOODS_RECEIPTS, finalGRN).catch((err) =>
      console.error('IndexedDB Put GRN error:', err)
    );
    queueOperation({
      operationType: 'CREATE',
      entityType: 'GOODS_RECEIPT',
      entityId: finalGRN.id,
      payload: finalGRN,
      branchId: finalGRN.branchId
    }).catch((err) => console.error('Queue GRN error:', err));

    setAppState((prev) => {
      // 1. Update Branch Inventory and generate StockMovements
      let updatedInventory = [...prev.inventory];
      const newMovements: StockMovement[] = [];

      finalGRN.items.forEach((item) => {
        if (item.acceptedQuantity > 0) {
          let prevQty = 0;
          let newQty = item.acceptedQuantity;
          let invFound = false;

          updatedInventory = updatedInventory.map((inv) => {
            if (inv.branchId === finalGRN.branchId && inv.productId === item.productId) {
              invFound = true;
              prevQty = inv.quantity;
              newQty = inv.quantity + item.acceptedQuantity;
              const updatedInv = {
                ...inv,
                quantity: newQty,
                lastUpdated: nowIso.split('T')[0]
              };
              putToStore(STORES.INVENTORY, updatedInv).catch((err) =>
                console.error('IndexedDB Put Inventory error:', err)
              );
              queueOperation({
                operationType: 'UPDATE',
                entityType: 'INVENTORY',
                entityId: updatedInv.id,
                payload: updatedInv,
                branchId: finalGRN.branchId
              }).catch((err) => console.error('Queue Inventory error:', err));
              return updatedInv;
            }
            return inv;
          });

          if (!invFound) {
            const newInv: BranchInventory = {
              id: `inv-${finalGRN.branchId}-${item.productId}`,
              branchId: finalGRN.branchId,
              productId: item.productId,
              quantity: item.acceptedQuantity,
              reorderLevel: 10,
              lastUpdated: nowIso.split('T')[0]
            };
            updatedInventory.push(newInv);
            putToStore(STORES.INVENTORY, newInv).catch((err) =>
              console.error('IndexedDB Put Inventory error:', err)
            );
            queueOperation({
              operationType: 'CREATE',
              entityType: 'INVENTORY',
              entityId: newInv.id,
              payload: newInv,
              branchId: finalGRN.branchId
            }).catch((err) => console.error('Queue Inventory error:', err));
            prevQty = 0;
            newQty = item.acceptedQuantity;
          }

          const movId = `mov-pur-${finalGRN.id}-${item.productId}`;
          const movement: StockMovement = {
            id: movId,
            productId: item.productId,
            productName: item.productName,
            branchId: finalGRN.branchId,
            branchName: finalGRN.branchName,
            type: 'PURCHASE',
            quantityDelta: item.acceptedQuantity,
            previousQty: prevQty,
            newQty,
            referenceNo: finalGRN.grnNumber,
            date: finalGRN.receivedDate,
            userId: finalGRN.receivedByUserId || prev.currentUser?.id || 'system',
            userName: finalGRN.receivedByUserName || prev.currentUser?.name || 'System',
            notes: `Received GRN #${finalGRN.grnNumber} from ${finalGRN.supplierName} (PO #${finalGRN.purchaseOrderNo})${item.batchNumber ? ` [Batch: ${item.batchNumber}]` : ''}`,
            syncStatus: isOnline ? 'synced' : 'pending'
          };

          putToStore(STORES.STOCK_MOVEMENTS, movement).catch((err) =>
            console.error('IndexedDB Put Movement error:', err)
          );
          queueOperation({
            operationType: 'CREATE',
            entityType: 'STOCK_MOVEMENT',
            entityId: movement.id,
            payload: movement,
            branchId: finalGRN.branchId
          }).catch((err) => console.error('Queue Movement error:', err));

          newMovements.push(movement);
        }
      });

      // 2. Update Associated Purchase Order
      const allPOsList = prev.purchaseOrders || prev.purchases || [];
      const updatedPOs = allPOsList.map((po) => {
        if (po.id === finalGRN.purchaseOrderId) {
          let allFullyReceived = true;
          const updatedItems = po.items.map((poItem) => {
            const grnItem = finalGRN.items.find((gi) => gi.productId === poItem.productId);
            const addedQty = grnItem ? grnItem.receivedQuantity : 0;
            const newReceivedTotal = (poItem.receivedQuantity || 0) + addedQty;
            const ordered = poItem.orderedQuantity || poItem.quantity;
            if (newReceivedTotal < ordered) {
              allFullyReceived = false;
            }
            return {
              ...poItem,
              receivedQuantity: newReceivedTotal
            };
          });

          const newStatus = allFullyReceived ? 'RECEIVED' : 'PARTIALLY_RECEIVED';
          const updatedPO: PurchaseOrder = {
            ...po,
            items: updatedItems,
            status: newStatus,
            receivedDate: finalGRN.receivedDate,
            receivedByUserId: finalGRN.receivedByUserId,
            receivedByUserName: finalGRN.receivedByUserName,
            syncStatus: isOnline ? 'synced' : 'pending'
          };

          putToStore(STORES.PURCHASE_ORDERS, updatedPO).catch((err) =>
            console.error('IndexedDB Put PO error:', err)
          );
          queueOperation({
            operationType: 'UPDATE',
            entityType: 'PURCHASE_ORDER',
            entityId: updatedPO.id,
            payload: updatedPO,
            branchId: updatedPO.branchId
          }).catch((err) => console.error('Queue PO update error:', err));

          return updatedPO;
        }
        return po;
      });

      if (isOnline) {
        triggerSync().catch((err) => console.error('Sync trigger error:', err));
      }

      return {
        ...prev,
        goodsReceipts: [finalGRN, ...(prev.goodsReceipts || [])],
        inventory: updatedInventory,
        stockMovements: [...newMovements, ...(prev.stockMovements || [])],
        purchaseOrders: updatedPOs,
        purchases: updatedPOs
      };
    });

    logAudit(
      'GOODS_RECEIPT_POSTED',
      `Logged Goods Received Note #${finalGRN.grnNumber} from ${finalGRN.supplierName} (${finalGRN.branchName})`
    );
  };

  const handleRecordSupplierPayment = (payment: SupplierPayment) => {
    const isOnline = navigator.onLine;
    const finalPayment: SupplierPayment = {
      ...payment,
      syncStatus: isOnline ? 'synced' : 'pending'
    };

    putToStore(STORES.SUPPLIER_PAYMENTS, finalPayment).catch((err) =>
      console.error('IndexedDB Put SupplierPayment error:', err)
    );
    queueOperation({
      operationType: 'CREATE',
      entityType: 'SUPPLIER_PAYMENT',
      entityId: finalPayment.id,
      payload: finalPayment,
      branchId: finalPayment.branchId
    }).catch((err) => console.error('Queue SupplierPayment error:', err));

    if (isOnline) {
      triggerSync().catch((err) => console.error('Sync trigger error:', err));
    }

    setAppState((prev) => ({
      ...prev,
      supplierPayments: [finalPayment, ...(prev.supplierPayments || [])]
    }));

    logAudit(
      'SUPPLIER_PAYMENT_RECORDED',
      `Issued payment voucher #${finalPayment.paymentNo} of ₦${finalPayment.amount.toLocaleString()} to ${finalPayment.supplierName}`
    );
  };

  // 8. Expenses
  const handleRecordExpense = (expenseData: Expense) => {
    const isOnline = navigator.onLine;
    const nowIso = new Date().toISOString();
    const expenseId = expenseData.id || ('exp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7));

    const newExpense: Expense = {
      ...expenseData,
      id: expenseId,
      createdAt: expenseData.createdAt || nowIso,
      updatedAt: nowIso,
      syncStatus: isOnline ? 'synced' : 'pending'
    };

    putToStore(STORES.EXPENSES, newExpense).catch((err) => console.error('IndexedDB Put Expense error:', err));
    queueOperation({
      operationType: 'CREATE',
      entityType: 'EXPENSE',
      entityId: newExpense.id,
      payload: newExpense,
      branchId: newExpense.branchId
    }).catch((err) => console.error('Queue Expense error:', err));

    if (isOnline) {
      triggerSync().catch((err) => console.error('Sync trigger error:', err));
    }

    setAppState((prev) => ({
      ...prev,
      expenses: [newExpense, ...(prev.expenses || []).filter((e) => e.id !== newExpense.id)]
    }));

    logAudit('EXPENSE_RECORDED', `Recorded ₦${newExpense.amount.toLocaleString()} expense for ${newExpense.branchName}`);
  };

  const handleEditExpense = (expenseData: Expense) => {
    const isOnline = navigator.onLine;
    const nowIso = new Date().toISOString();

    const updatedExpense: Expense = {
      ...expenseData,
      updatedAt: nowIso,
      syncStatus: isOnline ? 'synced' : 'pending'
    };

    putToStore(STORES.EXPENSES, updatedExpense).catch((err) => console.error('IndexedDB Put Expense error:', err));
    queueOperation({
      operationType: 'UPDATE',
      entityType: 'EXPENSE',
      entityId: updatedExpense.id,
      payload: updatedExpense,
      branchId: updatedExpense.branchId
    }).catch((err) => console.error('Queue Expense update error:', err));

    if (isOnline) {
      triggerSync().catch((err) => console.error('Sync trigger error:', err));
    }

    setAppState((prev) => ({
      ...prev,
      expenses: (prev.expenses || []).map((e) => (e.id === updatedExpense.id ? updatedExpense : e))
    }));

    logAudit('EXPENSE_UPDATED', `Updated expense voucher #${updatedExpense.id}`);
  };

  const handleCancelExpense = (expenseId: string, reason?: string) => {
    const isOnline = navigator.onLine;
    const nowIso = new Date().toISOString();

    setAppState((prev) => {
      const existing = prev.expenses || [];
      const target = existing.find((e) => e.id === expenseId);
      if (!target) return prev;

      const cancelledExpense: Expense = {
        ...target,
        status: 'CANCELLED',
        description: reason ? `${target.description} | Cancelled: ${reason}` : target.description,
        updatedAt: nowIso,
        syncStatus: isOnline ? 'synced' : 'pending'
      };

      putToStore(STORES.EXPENSES, cancelledExpense).catch((err) => console.error('IndexedDB Put Expense error:', err));
      queueOperation({
        operationType: 'UPDATE',
        entityType: 'EXPENSE',
        entityId: cancelledExpense.id,
        payload: cancelledExpense,
        branchId: cancelledExpense.branchId
      }).catch((err) => console.error('Queue Expense update error:', err));

      if (isOnline) {
        triggerSync().catch((err) => console.error('Sync trigger error:', err));
      }

      return {
        ...prev,
        expenses: existing.map((e) => (e.id === expenseId ? cancelledExpense : e))
      };
    });

    logAudit('EXPENSE_CANCELLED', `Cancelled expense voucher #${expenseId}`);
  };

  // 9. Staff Accounts Management
  const handleAddUser = (user: User) => {
    setAppState((prev) => ({
      ...prev,
      users: [...(prev.users || []), user]
    }));
    logAudit('USER_CREATED', `Created staff account @${user.username} (${user.role})`);

    createAdHocNotification(
      {
        branchId: user.branchId || undefined,
        branchName: user.branchName,
        category: 'SECURITY_USERS',
        eventType: 'USER_CREATED',
        title: `New Staff Registered: ${user.name}`,
        message: `Staff account @${user.username || user.name} (${user.role}) was created for ${user.branchName || 'Central Hub'}.`,
        referenceType: 'USER',
        referenceId: user.id,
        priority: 'MEDIUM',
        actionTab: 'USERS',
        actionLabel: 'View Staff Accounts'
      },
      appState.notificationSettings || DEFAULT_NOTIFICATION_SETTINGS
    ).then((notif) => {
      setAppState((p) => ({ ...p, notifications: [notif, ...(p.notifications || [])] }));
    }).catch((err) => console.error('User creation notification error:', err));
  };

  const handleUpdateUser = (user: User) => {
    setAppState((prev) => ({
      ...prev,
      users: (prev.users || []).map((u) => (u.id === user.id ? user : u)),
      currentUser: prev.currentUser?.id === user.id ? user : prev.currentUser
    }));
  };

  const handleToggleUserStatus = (userId: string) => {
    setAppState((prev) => ({
      ...prev,
      users: (prev.users || []).map((u) =>
        u.id === userId ? { ...u, status: u.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' } : u
      )
    }));
  };

  const handleResetPassword = (userId: string) => {
    alert('Password reset link sent to staff registered contact details.');
  };

  // Module 18: Staff Attendance, Performance & Commissions Handlers
  const handleUpdateAttendance = (
    updatedRecords: AttendanceRecord[],
    auditAction?: string,
    auditDetails?: string
  ) => {
    setAppState((prev) => ({
      ...prev,
      attendance: updatedRecords
    }));
    if (auditAction && auditDetails) {
      logAudit(auditAction, auditDetails);
    }
  };

  const handleUpdateCommissions = (
    updatedCommissions: CommissionRecord[],
    auditAction?: string,
    auditDetails?: string
  ) => {
    setAppState((prev) => ({
      ...prev,
      commissions: updatedCommissions
    }));
    if (auditAction && auditDetails) {
      logAudit(auditAction, auditDetails);
    }
  };

  const handleUpdateCommissionRules = (
    updatedRules: CommissionRule[],
    auditAction?: string,
    auditDetails?: string
  ) => {
    setAppState((prev) => ({
      ...prev,
      commissionRules: updatedRules
    }));
    if (auditAction && auditDetails) {
      logAudit(auditAction, auditDetails);
    }
  };

  const handleRecordCommissionPayment = (
    commission: CommissionRecord,
    paymentDetails: { paymentReference: string; paymentMethod: 'BANK_TRANSFER' | 'CASH' | 'CHEQUE'; notes?: string }
  ) => {
    const today = new Date().toISOString().slice(0, 10);
    const nowIso = new Date().toISOString();

    setAppState((prev) => {
      const existingFinancial = prev.financialTransactions || [];
      const newTx = {
        id: `fin-com-${Date.now()}`,
        branchId: commission.branchId || 'br-1',
        branchName: commission.branchName,
        transactionType: 'OTHER_EXPENSE' as const,
        referenceNumber: paymentDetails.paymentReference,
        description: `Staff Sales Commission Disbursement to ${commission.userName} for period ${commission.periodMonth}`,
        moneyIn: 0,
        moneyOut: commission.netCommissionAmount,
        paymentMethod: paymentDetails.paymentMethod as any,
        paymentCategory: paymentDetails.paymentMethod === 'BANK_TRANSFER' ? ('BANK' as const) : ('CASH' as const),
        createdByUserId: prev.currentUser?.id || 'usr-1',
        createdByUserName: prev.currentUser?.name || 'Authorized Officer',
        transactionDate: today,
        timestamp: nowIso,
        createdAt: nowIso.replace('T', ' ').slice(0, 16),
        status: 'COMPLETED' as const,
        notes: paymentDetails.notes || `Disbursed for voucher ${commission.commissionNo}`
      };

      return {
        ...prev,
        financialTransactions: [newTx, ...existingFinancial]
      };
    });

    logAudit(
      'COMMISSION_PAYMENT_DISBURSED',
      `Commission ₦${commission.netCommissionAmount.toLocaleString()} paid to ${commission.userName} via ${paymentDetails.paymentMethod}. Ref: ${paymentDetails.paymentReference}`
    );
  };

  // Switch actor / Login
  const handleLogin = (user: User) => {
    setAppState((prev) => ({
      ...prev,
      currentUser: user
    }));

    // Auto update selected branch view
    if (user.role === 'CEO') {
      setSelectedBranchId(null);
      setActiveTab('CEO_DASHBOARD');
    } else {
      setSelectedBranchId(user.branchId || null);
      setActiveTab('BRANCH_DASHBOARD');
    }

    logAudit('USER_LOGIN', `User @${user.username} logged into system session`);
  };

  // Module 13: Enhanced Notification Center Handlers
  const handleMarkNotificationRead = (id: string) => {
    const nowIso = new Date().toISOString();
    setAppState((prev) => {
      const updated = (prev.notifications || []).map((n) =>
        n.id === id ? { ...n, isRead: true, read: true, status: 'READ' as const, readAt: nowIso } : n
      );
      const target = updated.find((n) => n.id === id);
      if (target) {
        putToStore(STORES.NOTIFICATIONS, target).catch(() => {});
      }
      return { ...prev, notifications: updated };
    });
  };

  const handleMarkNotificationUnread = (id: string) => {
    setAppState((prev) => {
      const updated = (prev.notifications || []).map((n) =>
        n.id === id ? { ...n, isRead: false, read: false, status: 'UNREAD' as const, readAt: null } : n
      );
      const target = updated.find((n) => n.id === id);
      if (target) {
        putToStore(STORES.NOTIFICATIONS, target).catch(() => {});
      }
      return { ...prev, notifications: updated };
    });
  };

  const handleMarkAllNotificationsRead = () => {
    const nowIso = new Date().toISOString();
    setAppState((prev) => {
      const updated = (prev.notifications || []).map((n) => ({
        ...n,
        isRead: true,
        read: true,
        status: (n.status === 'RESOLVED' ? 'RESOLVED' : 'READ') as any,
        readAt: n.readAt || nowIso
      }));
      updated.forEach((n) => putToStore(STORES.NOTIFICATIONS, n).catch(() => {}));
      return { ...prev, notifications: updated };
    });
  };

  const handleResolveNotification = (id: string) => {
    const nowIso = new Date().toISOString();
    setAppState((prev) => {
      const updated = (prev.notifications || []).map((n) =>
        n.id === id
          ? {
              ...n,
              isRead: true,
              read: true,
              status: 'RESOLVED' as const,
              resolvedAt: nowIso,
              resolvedByUserName: prev.currentUser?.name || 'Administrator'
            }
          : n
      );
      const target = updated.find((n) => n.id === id);
      if (target) {
        putToStore(STORES.NOTIFICATIONS, target).catch(() => {});
      }
      return { ...prev, notifications: updated };
    });
    logAudit('NOTIFICATION_RESOLVED', `Marked alert #${id} as resolved`);
  };

  const handleDismissNotification = (id: string) => {
    setAppState((prev) => {
      const updated = (prev.notifications || []).filter((n) => n.id !== id);
      deleteFromStore(STORES.NOTIFICATIONS, id).catch(() => {});
      return { ...prev, notifications: updated };
    });
  };

  const handleClearAllNotifications = () => {
    setAppState((prev) => {
      const activeUnread = (prev.notifications || []).filter((n) => !n.isRead && n.status !== 'RESOLVED');
      return { ...prev, notifications: activeUnread };
    });
  };

  const handleUpdateNotificationSettings = (newSettings: NotificationSettings) => {
    setAppState((prev) => ({
      ...prev,
      notificationSettings: newSettings
    }));
    logAudit('SETTINGS_UPDATED', 'Updated enterprise notification preferences & trigger thresholds');
  };

  const handleNotificationNavigate = (tab: string, payload?: any) => {
    setActiveTab(tab);
    if (payload?.branchId) {
      setSelectedBranchId(payload.branchId);
    } else if (payload?.destinationBranchId) {
      setSelectedBranchId(payload.destinationBranchId);
    }
  };

  const unreadNotificationCount = (appState.notifications || []).filter(
    (n) => !n.isRead && n.status !== 'READ' && n.status !== 'RESOLVED'
  ).length;

  return (
    <div className="min-h-screen bg-slate-100/90 text-slate-800 flex flex-col font-sans antialiased">
      {/* Top System Navigation Header */}
      <Header
        branches={appState.branches}
        allUsers={appState.users}
        activeBranch={activeBranch}
        selectedBranchId={selectedBranchId}
        onSelectBranch={(id) => setSelectedBranchId(id === 'ALL' ? null : id)}
        selectedDateFilter={selectedDateFilter}
        onSelectDateFilter={(filter) => setSelectedDateFilter(filter)}
        currentUser={appState.currentUser}
        onSwitchUser={handleLogin}
        unreadNotificationCount={unreadNotificationCount}
        onOpenNotifications={() => setIsNotificationOpen(true)}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />

      {/* Main Body Shell with Collapsible/Responsive Sidebar */}
      <div className="flex-1 flex pt-16 overflow-hidden relative">
        <Sidebar
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            setIsMobileMenuOpen(false);
          }}
          currentUser={appState.currentUser}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          onLogout={handleInitiateLogout}
        />

        {/* Dynamic Route View Canvas */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 custom-scrollbar min-w-0">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* CEO Executive Dashboard */}
            {activeTab === 'CEO_DASHBOARD' && (
              <CEODashboard
                branches={appState.branches}
                sales={appState.sales}
                products={appState.products}
                inventory={appState.inventory}
                customers={appState.customers}
                expenses={appState.expenses}
                transfers={appState.transfers}
                auditLogs={appState.auditLogs}
                notifications={appState.notifications}
                dateFilter={selectedDateFilter as any}
                salesReturns={appState.salesReturns || []}
                credits={appState.credits || []}
                creditPayments={appState.creditPayments || []}
                purchaseOrders={appState.purchaseOrders || []}
                supplierPayments={appState.supplierPayments || []}
                stockMovements={appState.stockMovements || []}
                suppliers={appState.suppliers || []}
                currentUser={appState.currentUser}
                onNavigate={handleNotificationNavigate}
                onApproveTransfer={handleApproveTransfer}
                onSelectBranch={(branchId) => {
                  setSelectedBranchId(branchId);
                  setActiveTab('BRANCH_DASHBOARD');
                }}
                onOpenNotificationCenter={() => setIsNotificationOpen(true)}
                onResolveNotification={handleResolveNotification}
              />
            )}

            {/* Branch Level Dashboard */}
            {activeTab === 'BRANCH_DASHBOARD' && (
              <BranchDashboard
                branch={activeBranch}
                activeBranch={activeBranch}
                currentUser={appState.currentUser}
                sales={appState.sales}
                expenses={appState.expenses}
                inventory={appState.inventory}
                products={appState.products}
                transfers={appState.transfers}
                notifications={appState.notifications}
                onNavigate={handleNotificationNavigate}
                onOpenNotificationCenter={() => setIsNotificationOpen(true)}
                onResolveNotification={handleResolveNotification}
              />
            )}

            {/* Point of Sale (POS) Module */}
            {activeTab === 'POS' && (
              <POSModule
                products={appState.products}
                inventory={appState.inventory}
                customers={appState.customers}
                branches={appState.branches}
                currentUser={appState.currentUser}
                onCompleteSale={handleCompleteSale}
                onAddCustomer={handleAddCustomer}
              />
            )}

            {/* Seed & Product Catalog */}
            {activeTab === 'PRODUCTS' && (
              <ProductCatalog
                products={appState.products}
                inventory={appState.inventory}
                branches={appState.branches}
                currentUser={appState.currentUser}
                onAddProduct={handleAddProduct}
                onUpdateProduct={handleUpdateProduct}
                onToggleStatus={handleToggleProductStatus}
              />
            )}

            {/* Branch Stock Control */}
            {activeTab === 'INVENTORY' && (
              <InventoryManager
                inventory={appState.inventory}
                products={appState.products}
                branches={appState.branches}
                movements={appState.stockMovements || appState.movements || []}
                stockAdjustments={appState.stockAdjustments || []}
                activeBranch={activeBranch}
                currentUser={appState.currentUser}
                onUpdateStock={handleUpdateStock}
                onRecordStockAdjustment={handleRecordStockAdjustment}
              />
            )}

            {/* Inter-Branch Stock Transfer & Replenishment Workflow (Module 17) */}
            {activeTab === 'TRANSFERS' && (
              <StockTransferModule
                transfers={appState.transfers || []}
                branches={appState.branches || []}
                products={appState.products || []}
                inventory={appState.inventory || []}
                sales={appState.sales || []}
                salesReturns={appState.salesReturns || []}
                purchaseOrders={appState.purchaseOrders || appState.purchases || []}
                suppliers={appState.suppliers || []}
                currentUser={appState.currentUser}
                onRequestTransfer={handleRequestTransfer}
                onApproveTransfer={handleApproveTransfer}
                onPrepareTransfer={handlePrepareTransfer}
                onDispatchTransfer={handleDispatchTransfer}
                onReceiveTransfer={handleReceiveTransfer}
                onRejectTransfer={handleRejectTransfer}
                onCancelTransfer={handleCancelTransfer}
                onResolveDiscrepancy={handleResolveDiscrepancy}
                onCreatePurchaseOrder={handleCreatePurchaseOrder}
              />
            )}

            {/* Multi-Branch Management */}
            {activeTab === 'BRANCHES' && (
              <BranchManagement
                branches={appState.branches}
                users={appState.users}
                sales={appState.sales}
                expenses={appState.expenses}
                onAddBranch={handleAddBranch}
                onUpdateBranch={handleUpdateBranch}
                onToggleBranchStatus={handleToggleBranchStatus}
              />
            )}

            {/* Customer Directory */}
            {activeTab === 'CUSTOMERS' && (
              <CustomerManager
                customers={appState.customers}
                sales={appState.sales}
                salesReturns={appState.salesReturns || []}
                branches={appState.branches}
                onAddCustomer={handleAddCustomer}
                onUpdateCustomer={() => {}}
                onRecordDebtRepayment={handleRecordDebtRepayment}
              />
            )}

            {/* Customer Credit & Receivables Module */}
            {activeTab === 'CREDIT_MANAGEMENT' && (
              <CreditManager
                currentUser={appState.currentUser}
                credits={appState.credits || []}
                creditPayments={appState.creditPayments || []}
                customers={appState.customers || []}
                branches={appState.branches || []}
                sales={appState.sales || []}
                onCreateCredit={handleCreateCredit}
                onRecordPayment={handleRecordCreditPayment}
                onEditCredit={handleEditCredit}
                onDeleteCredit={handleDeleteCredit}
              />
            )}

            {/* Sales Return Management Module */}
            {activeTab === 'RETURNS' && (
              <SalesReturnModule
                currentUser={appState.currentUser}
                salesReturns={appState.salesReturns || []}
                sales={appState.sales || []}
                products={appState.products || []}
                inventory={appState.inventory || []}
                customers={appState.customers || []}
                branches={appState.branches || []}
                credits={appState.credits || []}
                onCreateReturn={handleCreateReturn}
                onApproveReturn={handleApproveReturn}
                onRejectReturn={handleRejectReturn}
              />
            )}

            {/* Suppliers & Stock Purchasing */}
            {activeTab === 'SUPPLIERS' && (
              <SupplierManager
                suppliers={appState.suppliers || []}
                purchaseOrders={appState.purchaseOrders || appState.purchases || []}
                goodsReceipts={appState.goodsReceipts || []}
                supplierPayments={appState.supplierPayments || []}
                branches={appState.branches || []}
                products={appState.products || []}
                currentUser={appState.currentUser}
                onSaveSupplier={handleSaveSupplier}
                onDeleteSupplier={handleDeleteSupplier}
                onCreatePurchaseOrder={handleCreatePurchaseOrder}
                onUpdatePurchaseOrder={handleUpdatePurchaseOrder}
                onApprovePurchaseOrder={handleApprovePurchaseOrder}
                onRejectPurchaseOrder={handleRejectPurchaseOrder}
                onCancelPurchaseOrder={handleCancelPurchaseOrder}
                onReceiveGoodsReceipt={handleReceiveGoodsReceipt}
                onRecordSupplierPayment={handleRecordSupplierPayment}
              />
            )}

            {/* Financial Management, Cashbook & Reconciliations */}
            {activeTab === 'FINANCE' && (
              <FinancialManagement
                state={appState}
                currentUser={appState.currentUser}
                onUpdateState={(updater) => setAppState((prev) => updater(prev))}
              />
            )}

            {/* Branch Expense Logger */}
            {activeTab === 'EXPENSES' && (
              <ExpenseTracker
                expenses={appState.expenses}
                branches={appState.branches}
                currentUser={appState.currentUser}
                onRecordExpense={handleRecordExpense}
              />
            )}

            {/* Executive Analytics & Reports */}
            {activeTab === 'REPORTS' && (
              <ReportsAnalytics
                sales={appState.sales || []}
                expenses={appState.expenses || []}
                branches={appState.branches || []}
                products={appState.products || []}
                inventory={appState.inventory || []}
                customers={appState.customers || []}
                salesReturns={appState.salesReturns || []}
                credits={appState.credits || []}
                creditPayments={appState.creditPayments || []}
                stockMovements={appState.stockMovements || []}
                stockAdjustments={appState.stockAdjustments || []}
                purchaseOrders={appState.purchaseOrders || []}
                supplierPayments={appState.supplierPayments || []}
                suppliers={appState.suppliers || []}
                financialTransactions={appState.financialTransactions || []}
                cashSessions={appState.cashSessions || []}
                cashReconciliations={appState.cashReconciliations || []}
                currentUser={appState.currentUser}
              />
            )}

            {/* Staff User & RBAC Management */}
            {activeTab === 'USERS' && (
              <UserManagement
                users={appState.users}
                branches={appState.branches}
                currentUser={appState.currentUser}
                onAddUser={handleAddUser}
                onUpdateUser={handleUpdateUser}
                onToggleUserStatus={handleToggleUserStatus}
                onResetPassword={handleResetPassword}
              />
            )}

            {/* Module 18: Staff Attendance, Performance & Commissions */}
            {activeTab === 'STAFF_PERFORMANCE' && (
              <StaffAttendancePerformanceModule
                appState={appState}
                currentUser={appState.currentUser}
                onUpdateAttendance={handleUpdateAttendance}
                onUpdateCommissions={handleUpdateCommissions}
                onUpdateCommissionRules={handleUpdateCommissionRules}
                onRecordCommissionPayment={handleRecordCommissionPayment}
              />
            )}

            {/* System Compliance & Audit Trail */}
            {activeTab === 'AUDIT_LOGS' && (
              <AuditLogViewer logs={appState.auditLogs} />
            )}

            {/* Module 6: Central Synchronization Center */}
            {activeTab === 'SYNC_CENTER' && (
              <SyncCenter />
            )}

            {/* Module 14: Backup, Restore, Data Integrity & Disaster Recovery */}
            {activeTab === 'BACKUP_RECOVERY' && (
              <BackupRecoveryModule
                appState={appState}
                currentUser={appState.currentUser}
                branches={appState.branches}
                onUpdateState={(updater) => setAppState((prev) => updater(prev))}
                onLogAudit={logAudit}
              />
            )}
          </div>
        </main>
      </div>

      {/* Receipt Modal for Printable Receipts */}
      <ReceiptModal sale={activeReceiptSale} onClose={() => setActiveReceiptSale(null)} />

      {/* Module 13: Enterprise Notification Center Slide-Over */}
      <NotificationCenter
        notifications={appState.notifications}
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        onMarkAsRead={handleMarkNotificationRead}
        onMarkAsUnread={handleMarkNotificationUnread}
        onMarkAllAsRead={handleMarkAllNotificationsRead}
        onResolveNotification={handleResolveNotification}
        onDismissNotification={handleDismissNotification}
        onClearAll={handleClearAllNotifications}
        onNavigate={handleNotificationNavigate}
        branches={appState.branches}
        settings={appState.notificationSettings || DEFAULT_NOTIFICATION_SETTINGS}
        onUpdateSettings={handleUpdateNotificationSettings}
      />

      {/* Auth & Switch Role Modal */}
      <LoginModal
        users={appState.users}
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLogin={handleLogin}
      />

      {/* Profile Modal */}
      <ProfileModal
        currentUser={appState.currentUser}
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onUpdateUser={handleUpdateUser}
      />

      {/* Pending Unsynced Data Warning Modal */}
      {isLogoutWarningOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 bg-amber-600 text-white flex items-center gap-2.5">
              <AlertTriangle className="w-6 h-6 shrink-0 text-white" />
              <div>
                <h3 className="font-extrabold text-sm text-white">Unsynchronized Data Warning</h3>
                <p className="text-[11px] text-amber-100">IndexedDB offline record protection</p>
              </div>
            </div>

            <div className="p-5 space-y-3 text-xs text-stone-700">
              <p className="font-bold text-stone-900 text-sm">
                There are <span className="text-amber-700 font-extrabold">{pendingWarningCount} unsynchronized transaction(s)</span> stored locally on this device.
              </p>
              <p>
                Signing out or clearing local data before syncing may permanently remove these transactions.
              </p>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 font-semibold text-[11px]">
                💡 Recommendation: Please synchronize with the cloud before clearing local data or switching sessions.
              </div>
            </div>

            <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-3">
              <button
                onClick={() => setIsLogoutWarningOpen(false)}
                className="px-4 py-2 bg-[#1B3022] text-white font-extrabold rounded-xl text-xs hover:bg-[#2D4536] cursor-pointer"
              >
                Cancel & Return
              </button>
              <button
                onClick={handleConfirmLogout}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl text-xs cursor-pointer"
              >
                Proceed Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
