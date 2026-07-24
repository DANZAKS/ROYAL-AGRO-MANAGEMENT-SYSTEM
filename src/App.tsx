import React, { useState, useEffect } from 'react';
import { loadAppState, saveAppState } from './lib/storage';
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
  Expense,
  StockMovementType,
  AuditLog
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
import { SupplierManager } from './components/suppliers/SupplierManager';
import { ExpenseTracker } from './components/expenses/ExpenseTracker';
import { ReportsAnalytics } from './components/reports/ReportsAnalytics';
import { UserManagement } from './components/users/UserManagement';
import { AuditLogViewer } from './components/audit/AuditLogViewer';

// Overlay Modals
import { NotificationCenter } from './components/notifications/NotificationCenter';
import { LoginModal } from './components/auth/LoginModal';
import { ProfileModal } from './components/auth/ProfileModal';

export default function App() {
  const [appState, setAppState] = useState<AppState>(() => loadAppState());
  const [activeTab, setActiveTab] = useState<string>('CEO_DASHBOARD');
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(
    appState.currentUser.branchId || null
  );
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('THIS_MONTH');

  // Modals & Overlays
  const [activeReceiptSale, setActiveReceiptSale] = useState<Sale | null>(null);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Auto-persist app state to local storage on changes
  useEffect(() => {
    saveAppState(appState);
  }, [appState]);

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

      // Update customer lifetime purchases if registered
      const updatedCustomers = (prev.customers || []).map((c) => {
        if (c.id === sale.customerId || c.fullName === sale.customerName) {
          return {
            ...c,
            totalPurchases: c.totalPurchases + 1,
            totalSpent: c.totalSpent + sale.totalAmount
          };
        }
        return c;
      });

      const nextMovements = [...newMovements, ...(prev.stockMovements || prev.movements || [])];
      return {
        ...prev,
        sales: [sale, ...(prev.sales || [])],
        inventory: updatedInventory,
        stockMovements: nextMovements,
        movements: nextMovements,
        customers: updatedCustomers
      };
    });

    logAudit('SALE_COMPLETED', `Completed sale #${sale.receiptNo} of ₦${sale.totalAmount.toLocaleString()}`);
    setActiveReceiptSale(sale);
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

  // 3. Direct Stock Adjustments / Damaged Stock Logging
  const handleUpdateStock = (
    productId: string,
    branchId: string,
    delta: number,
    type: StockMovementType,
    notes?: string
  ) => {
    setAppState((prev) => {
      let prevQty = 0;
      let newQty = 0;

      const updatedInventory = prev.inventory.map((inv) => {
        if (inv.productId === productId && inv.branchId === branchId) {
          prevQty = inv.quantity;
          newQty = Math.max(0, inv.quantity + delta);
          return {
            ...inv,
            quantity: newQty,
            lastUpdated: new Date().toISOString().split('T')[0]
          };
        }
        return inv;
      });

      const prod = prev.products.find((p) => p.id === productId);
      const branch = prev.branches.find((b) => b.id === branchId);

      const movement = {
        id: 'mov-' + Date.now(),
        productId,
        productName: prod?.name || '',
        branchId,
        branchName: branch?.name || '',
        type,
        quantityDelta: delta,
        previousQty: prevQty,
        newQty,
        date: new Date().toISOString().replace('T', ' ').slice(0, 16),
        userId: prev.currentUser?.id || 'system',
        userName: prev.currentUser?.name || 'System',
        notes
      };

      const nextMovements = [movement, ...(prev.stockMovements || prev.movements || [])];
      return {
        ...prev,
        inventory: updatedInventory,
        stockMovements: nextMovements,
        movements: nextMovements
      };
    });

    logAudit('STOCK_ADJUSTED', `Adjusted stock for ${productId} at ${branchId} by ${delta}`);
  };

  // 4. Inter-Branch Stock Transfers Workflow
  const handleRequestTransfer = (transfer: StockTransfer) => {
    setAppState((prev) => ({
      ...prev,
      transfers: [transfer, ...(prev.transfers || [])]
    }));
    logAudit('TRANSFER_REQUESTED', `Requested transfer #${transfer.transferNo}`);
  };

  const handleApproveTransfer = (transferId: string) => {
    setAppState((prev) => ({
      ...prev,
      transfers: (prev.transfers || []).map((t) => (t.id === transferId ? { ...t, status: 'APPROVED' } : t))
    }));
    logAudit('TRANSFER_APPROVED', `Approved transfer #${transferId}`);
  };

  const handleDispatchTransfer = (transferId: string) => {
    setAppState((prev) => {
      const transfer = (prev.transfers || []).find((t) => t.id === transferId);
      if (!transfer) return prev;

      // Deduct stock from source branch
      const updatedInventory = (prev.inventory || []).map((inv) => {
        if (inv.branchId === transfer.sourceBranchId && inv.productId === transfer.productId) {
          return {
            ...inv,
            quantity: Math.max(0, inv.quantity - transfer.quantity),
            lastUpdated: new Date().toISOString().split('T')[0]
          };
        }
        return inv;
      });

      return {
        ...prev,
        transfers: (prev.transfers || []).map((t) => (t.id === transferId ? { ...t, status: 'DISPATCHED' } : t)),
        inventory: updatedInventory
      };
    });
    logAudit('TRANSFER_DISPATCHED', `Dispatched stock for transfer #${transferId}`);
  };

  const handleReceiveTransfer = (transferId: string) => {
    setAppState((prev) => {
      const transfer = (prev.transfers || []).find((t) => t.id === transferId);
      if (!transfer) return prev;

      // Add stock to destination branch
      const updatedInventory = (prev.inventory || []).map((inv) => {
        if (inv.branchId === transfer.destinationBranchId && inv.productId === transfer.productId) {
          return {
            ...inv,
            quantity: inv.quantity + transfer.quantity,
            lastUpdated: new Date().toISOString().split('T')[0]
          };
        }
        return inv;
      });

      return {
        ...prev,
        transfers: (prev.transfers || []).map((t) => (t.id === transferId ? { ...t, status: 'RECEIVED' } : t)),
        inventory: updatedInventory
      };
    });
    logAudit('TRANSFER_RECEIVED', `Confirmed stock receipt for transfer #${transferId}`);
  };

  const handleRejectTransfer = (transferId: string, reason: string) => {
    setAppState((prev) => ({
      ...prev,
      transfers: (prev.transfers || []).map((t) =>
        t.id === transferId ? { ...t, status: 'REJECTED', notes: `Rejected: ${reason}` } : t
      )
    }));
    logAudit('TRANSFER_REJECTED', `Rejected transfer #${transferId}`);
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

  // 6. Customers
  const handleAddCustomer = (customer: Customer) => {
    setAppState((prev) => ({
      ...prev,
      customers: [customer, ...(prev.customers || [])]
    }));
  };

  // 7. Suppliers & PO
  const handleAddSupplier = (supplier: Supplier) => {
    setAppState((prev) => ({
      ...prev,
      suppliers: [supplier, ...(prev.suppliers || [])]
    }));
  };

  const handleReceivePO = (po: PurchaseOrder) => {
    setAppState((prev) => {
      // Increase inventory stock at receiving branch for each item
      const updatedInventory = (prev.inventory || []).map((inv) => {
        if (inv.branchId === po.branchId) {
          const poItem = po.items.find((i) => i.productId === inv.productId);
          if (poItem) {
            return {
              ...inv,
              quantity: inv.quantity + poItem.quantity,
              lastUpdated: new Date().toISOString().split('T')[0]
            };
          }
        }
        return inv;
      });

      const currentPOs = prev.purchaseOrders || prev.purchases || [];
      const updatedPOs = [po, ...currentPOs];

      return {
        ...prev,
        purchaseOrders: updatedPOs,
        purchases: updatedPOs,
        inventory: updatedInventory
      };
    });
    logAudit('PURCHASE_ORDER_RECEIVED', `Received supplier order #${po.orderNo}`);
  };

  // 8. Expenses
  const handleRecordExpense = (expense: Expense) => {
    setAppState((prev) => ({
      ...prev,
      expenses: [expense, ...(prev.expenses || [])]
    }));
    logAudit('EXPENSE_RECORDED', `Recorded ₦${expense.amount} expense for ${expense.branchName}`);
  };

  // 9. Staff Accounts Management
  const handleAddUser = (user: User) => {
    setAppState((prev) => ({
      ...prev,
      users: [...(prev.users || []), user]
    }));
    logAudit('USER_CREATED', `Created staff account @${user.username} (${user.role})`);
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

  // Notifications read handlers
  const handleMarkNotificationRead = (id: string) => {
    setAppState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    }));
  };

  const handleMarkAllNotificationsRead = () => {
    setAppState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => ({ ...n, isRead: true }))
    }));
  };

  const unreadNotificationCount = (appState.notifications || []).filter((n) => !n.isRead).length;

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
                dateFilter={selectedDateFilter as any}
                onNavigate={(tab) => setActiveTab(tab)}
                onApproveTransfer={handleApproveTransfer}
                onSelectBranch={(branchId) => {
                  setSelectedBranchId(branchId);
                  setActiveTab('BRANCH_DASHBOARD');
                }}
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
                onNavigate={(tab) => setActiveTab(tab)}
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
                activeBranch={activeBranch}
                currentUser={appState.currentUser}
                onUpdateStock={handleUpdateStock}
              />
            )}

            {/* Inter-Branch Stock Transfer Workflow */}
            {activeTab === 'TRANSFERS' && (
              <StockTransferModule
                transfers={appState.transfers}
                branches={appState.branches}
                products={appState.products}
                inventory={appState.inventory}
                currentUser={appState.currentUser}
                onRequestTransfer={handleRequestTransfer}
                onApproveTransfer={handleApproveTransfer}
                onDispatchTransfer={handleDispatchTransfer}
                onReceiveTransfer={handleReceiveTransfer}
                onRejectTransfer={handleRejectTransfer}
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
                branches={appState.branches}
                onAddCustomer={handleAddCustomer}
                onUpdateCustomer={() => {}}
              />
            )}

            {/* Suppliers & Stock Purchasing */}
            {activeTab === 'SUPPLIERS' && (
              <SupplierManager
                suppliers={appState.suppliers || []}
                purchases={appState.purchaseOrders || appState.purchases || []}
                branches={appState.branches || []}
                products={appState.products || []}
                currentUser={appState.currentUser}
                onAddSupplier={handleAddSupplier}
                onReceivePurchaseOrder={handleReceivePO}
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
                sales={appState.sales}
                expenses={appState.expenses}
                branches={appState.branches}
                products={appState.products}
                inventory={appState.inventory}
                customers={appState.customers}
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

            {/* System Compliance & Audit Trail */}
            {activeTab === 'AUDIT_LOGS' && (
              <AuditLogViewer logs={appState.auditLogs} />
            )}
          </div>
        </main>
      </div>

      {/* Receipt Modal for Printable Receipts */}
      <ReceiptModal sale={activeReceiptSale} onClose={() => setActiveReceiptSale(null)} />

      {/* System Alerts Slide-Over */}
      <NotificationCenter
        notifications={appState.notifications}
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        onMarkAsRead={handleMarkNotificationRead}
        onMarkAllAsRead={handleMarkAllNotificationsRead}
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
    </div>
  );
}
