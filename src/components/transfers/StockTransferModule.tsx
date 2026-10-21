import React, { useState, useMemo } from 'react';
import {
  ArrowRightLeft,
  Building2,
  Plus,
  CheckCircle2,
  Truck,
  XCircle,
  Clock,
  X,
  Boxes,
  FileText,
  Printer,
  WifiOff,
  AlertTriangle,
  Search,
  Trash2,
  Check,
  TrendingUp,
  PackageSearch,
  ShoppingCart,
  Calendar,
  Layers,
  Sparkles,
  HelpCircle,
  ShieldAlert,
  ChevronRight,
  Filter,
  DollarSign,
  Info,
  RefreshCw,
  Send,
  UserCheck
} from 'lucide-react';
import {
  StockTransfer,
  StockTransferItem,
  Branch,
  Product,
  User,
  StockTransferStatus,
  BranchInventory,
  Sale,
  SalesReturn,
  PurchaseOrder,
  Supplier,
  ReorderRecommendation,
  DemandForecast,
  StockRedistributionSuggestion
} from '../../types';
import { TransferReceiptModal } from './TransferReceiptModal';
import {
  calculateStockInTransit,
  calculateOnOrderStock,
  calculateReorderRecommendations,
  calculateDemandForecasts,
  calculateRedistributionSuggestions
} from '../../services/stockForecastingService';

interface StockTransferModuleProps {
  transfers: StockTransfer[];
  branches: Branch[];
  products: Product[];
  inventory: BranchInventory[];
  sales?: Sale[];
  salesReturns?: SalesReturn[];
  purchaseOrders?: PurchaseOrder[];
  suppliers?: Supplier[];
  currentUser: User;
  onRequestTransfer: (transfer: StockTransfer) => void;
  onApproveTransfer: (transferId: string) => void;
  onPrepareTransfer?: (transferId: string) => void;
  onDispatchTransfer: (
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
  ) => void;
  onReceiveTransfer: (
    transferId: string,
    itemReceives: {
      productId: string;
      receivedQty: number;
      damagedQty?: number;
      missingQty?: number;
      notes?: string;
    }[],
    generalNotes?: string
  ) => void;
  onRejectTransfer: (transferId: string, reason: string) => void;
  onCancelTransfer?: (transferId: string, reason?: string) => void;
  onResolveDiscrepancy?: (
    transferId: string,
    resolution: {
      status: 'RESOLVED_TRANSIT_LOSS' | 'RESOLVED_SUPPLIER_RECOVERY' | 'RESOLVED_RETURNED';
      notes: string;
    }
  ) => void;
  onCreatePurchaseOrder?: (po: PurchaseOrder) => void;
}

export const StockTransferModule: React.FC<StockTransferModuleProps> = ({
  transfers = [],
  branches = [],
  products = [],
  inventory = [],
  sales = [],
  salesReturns = [],
  purchaseOrders = [],
  suppliers = [],
  currentUser,
  onRequestTransfer,
  onApproveTransfer,
  onPrepareTransfer,
  onDispatchTransfer,
  onReceiveTransfer,
  onRejectTransfer,
  onCancelTransfer,
  onResolveDiscrepancy,
  onCreatePurchaseOrder
}) => {
  const isOnline = navigator.onLine;

  // Active Main Sub-Tab
  const [activeTab, setActiveTab] = useState<
    'TRANSFERS' | 'REORDER' | 'FORECAST' | 'REDISTRIBUTION' | 'DISCREPANCIES'
  >('TRANSFERS');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [branchFilter, setBranchFilter] = useState<string>(
    currentUser.role === 'BRANCH_MANAGER' && currentUser.branchId ? currentUser.branchId : 'ALL'
  );
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Request / Create Transfer Modal State
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [sourceBranchId, setSourceBranchId] = useState(
    currentUser.role === 'BRANCH_MANAGER' && currentUser.branchId ? currentUser.branchId : branches[0]?.id || ''
  );
  const [destinationBranchId, setDestinationBranchId] = useState(
    branches.find((b) => b.id !== (currentUser.branchId || branches[0]?.id))?.id || branches[1]?.id || ''
  );
  const [requestItems, setRequestItems] = useState<
    { productId: string; quantity: number; notes?: string }[]
  >([{ productId: products[0]?.id || '', quantity: 10 }]);
  const [requestNotes, setRequestNotes] = useState('');
  const [requestMode, setRequestMode] = useState<'PENDING_APPROVAL' | 'DRAFT'>('PENDING_APPROVAL');

  // Dispatch Modal State
  const [dispatchModalTransfer, setDispatchModalTransfer] = useState<StockTransfer | null>(null);
  const [dispatchItemQtys, setDispatchItemQtys] = useState<Record<string, number>>({});
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [waybillNumber, setWaybillNumber] = useState('');
  const [estimatedArrivalDate, setEstimatedArrivalDate] = useState('');
  const [dispatchNotes, setDispatchNotes] = useState('');

  // Receive & Inspect Modal State (Section 4)
  const [receiveModalTransfer, setReceiveModalTransfer] = useState<StockTransfer | null>(null);
  const [receiveItemInputs, setReceiveItemInputs] = useState<
    Record<string, { receivedQty: number; damagedQty: number; notes: string }>
  >({});
  const [receiveGeneralNotes, setReceiveGeneralNotes] = useState('');

  // Discrepancy Resolution Modal State (Section 4)
  const [disputeTransfer, setDisputeTransfer] = useState<StockTransfer | null>(null);
  const [disputeResolutionStatus, setDisputeResolutionStatus] = useState<
    'RESOLVED_TRANSIT_LOSS' | 'RESOLVED_SUPPLIER_RECOVERY' | 'RESOLVED_RETURNED'
  >('RESOLVED_TRANSIT_LOSS');
  const [disputeResolutionNotes, setDisputeResolutionNotes] = useState('');

  // Reorder Purchase Order Modal State (Section 5)
  const [reorderPOItem, setReorderPOItem] = useState<ReorderRecommendation | null>(null);
  const [poOrderQty, setPoOrderQty] = useState<number>(0);
  const [poSupplierId, setPoSupplierId] = useState<string>('');
  const [poNotes, setPoNotes] = useState<string>('');

  // Waybill Slip View Modal
  const [receiptTransfer, setReceiptTransfer] = useState<StockTransfer | null>(null);

  // Reject Modal
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Permissions
  const isCEO = currentUser?.role === 'CEO';
  const isManager = currentUser?.role === 'BRANCH_MANAGER' || isCEO;
  const isInventoryOfficer = currentUser?.role === 'INVENTORY_OFFICER' || isCEO;
  const canApprove = isCEO || (currentUser?.role === 'BRANCH_MANAGER' && !currentUser.branchId);

  // Helper: source branch available stock
  const getSourceBranchStock = (bId: string, pId: string): number => {
    const inv = inventory.find((i) => i.branchId === bId && i.productId === pId);
    return inv ? inv.quantity : 0;
  };

  // Reorder Recommendations (Section 5)
  const reorderRecommendations = useMemo(() => {
    return calculateReorderRecommendations(
      products,
      inventory,
      branches,
      suppliers,
      transfers,
      purchaseOrders,
      branchFilter
    );
  }, [products, inventory, branches, suppliers, transfers, purchaseOrders, branchFilter]);

  // Demand Forecasts (Section 6)
  const demandForecasts = useMemo(() => {
    return calculateDemandForecasts(
      products,
      inventory,
      sales,
      salesReturns,
      branches,
      branchFilter,
      30
    );
  }, [products, inventory, sales, salesReturns, branches, branchFilter]);

  // Redistribution Suggestions (Section 7)
  const redistributionSuggestions = useMemo(() => {
    return calculateRedistributionSuggestions(demandForecasts, branches);
  }, [demandForecasts, branches]);

  // Filtered Transfers
  const filteredTransfers = useMemo(() => {
    return transfers.filter((t) => {
      // Branch filter (source or dest)
      if (branchFilter !== 'ALL') {
        const matchesBranch = t.sourceBranchId === branchFilter || t.destinationBranchId === branchFilter;
        if (!matchesBranch) return false;
      }

      // Branch Manager permission limit (must see only transfers involving their branch, unless CEO/HQ)
      if (currentUser.role === 'BRANCH_MANAGER' && currentUser.branchId) {
        if (t.sourceBranchId !== currentUser.branchId && t.destinationBranchId !== currentUser.branchId) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'PENDING') {
          if (t.status !== 'PENDING' && t.status !== 'PENDING_APPROVAL' && t.status !== 'REQUESTED') return false;
        } else if (statusFilter === 'IN_TRANSIT') {
          if (t.status !== 'IN_TRANSIT' && t.status !== 'DISPATCHED') return false;
        } else if (t.status !== statusFilter) {
          return false;
        }
      }

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesNo = t.transferNo.toLowerCase().includes(q);
        const matchesSource = t.sourceBranchName.toLowerCase().includes(q);
        const matchesDest = t.destinationBranchName.toLowerCase().includes(q);
        const matchesDriver = t.driverName?.toLowerCase().includes(q) || false;
        const matchesWaybill = t.waybillNumber?.toLowerCase().includes(q) || false;
        const matchesItem = t.items?.some(
          (i) => i.productName.toLowerCase().includes(q) || i.productSku.toLowerCase().includes(q)
        ) || false;

        if (!matchesNo && !matchesSource && !matchesDest && !matchesDriver && !matchesWaybill && !matchesItem) {
          return false;
        }
      }

      return true;
    });
  }, [transfers, branchFilter, statusFilter, searchTerm, currentUser]);

  // Discrepancy transfers (transfers with missing/damaged goods)
  const discrepancyTransfers = useMemo(() => {
    return transfers.filter((t) => {
      const hasShortage = t.hasDiscrepancy || t.status === 'PARTIALLY_RECEIVED';
      const itemsHaveShortage = t.items?.some((i) => (i.missingQuantity || 0) > 0 || (i.damagedQuantity || 0) > 0);
      return hasShortage || itemsHaveShortage;
    });
  }, [transfers]);

  // Summary Metrics (Section 7)
  const pendingApprovalsCount = transfers.filter(
    (t) => t.status === 'PENDING' || t.status === 'PENDING_APPROVAL' || t.status === 'REQUESTED'
  ).length;

  const inTransitCount = transfers.filter(
    (t) => t.status === 'IN_TRANSIT' || t.status === 'DISPATCHED'
  ).length;

  const inTransitUnits = transfers
    .filter((t) => t.status === 'IN_TRANSIT' || t.status === 'DISPATCHED')
    .reduce((sum, t) => {
      const tUnits = t.items && t.items.length > 0
        ? t.items.reduce((s, i) => s + (i.dispatchedQuantity ?? i.requestedQuantity ?? 0), 0)
        : t.quantity || 0;
      return sum + tUnits;
    }, 0);

  const awaitingReceiptCount = transfers.filter(
    (t) => (t.status === 'IN_TRANSIT' || t.status === 'DISPATCHED') &&
      (branchFilter === 'ALL' || t.destinationBranchId === branchFilter)
  ).length;

  const criticalReordersCount = reorderRecommendations.filter((r) => r.urgency === 'CRITICAL' || r.urgency === 'HIGH').length;

  // Handle Create Request
  const handleCreateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (sourceBranchId === destinationBranchId) {
      alert('Source and destination branches must be different!');
      return;
    }

    if (requestItems.length === 0) {
      alert('Please add at least one product item to the transfer request.');
      return;
    }

    // Check available source stock
    const stockWarnings: string[] = [];
    requestItems.forEach((item) => {
      const avail = getSourceBranchStock(sourceBranchId, item.productId);
      const prod = products.find((p) => p.id === item.productId);
      if (item.quantity > avail) {
        stockWarnings.push(
          `Item "${prod?.name || item.productId}" requested quantity (${item.quantity}) exceeds available stock (${avail}).`
        );
      }
    });

    if (stockWarnings.length > 0 && requestMode !== 'DRAFT') {
      if (!window.confirm(`${stockWarnings.join('\n')}\n\nDo you still want to submit this transfer request?`)) {
        return;
      }
    }

    const sourceBranch = branches.find((b) => b.id === sourceBranchId);
    const destBranch = branches.find((b) => b.id === destinationBranchId);

    const transferNo = `TR-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
    const transferId = 'tr-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);

    const formattedItems: StockTransferItem[] = requestItems.map((ri, idx) => {
      const prod = products.find((p) => p.id === ri.productId);
      return {
        id: `ti-${transferId}-${idx}`,
        transferId,
        productId: ri.productId,
        productName: prod?.name || 'Agro Item',
        productSku: prod?.sku || 'SKU-000',
        unit: prod?.unit || 'KG',
        requestedQuantity: ri.quantity,
        approvedQuantity: requestMode === 'DRAFT' ? undefined : ri.quantity,
        notes: ri.notes
      };
    });

    const totalQty = formattedItems.reduce((sum, i) => sum + i.requestedQuantity, 0);

    const newTransfer: StockTransfer = {
      id: transferId,
      transferNo,
      sourceBranchId,
      sourceBranchName: sourceBranch?.name || 'Source Branch',
      destinationBranchId,
      destinationBranchName: destBranch?.name || 'Destination Branch',
      productId: formattedItems[0]?.productId,
      productName: formattedItems.length === 1 ? formattedItems[0]?.productName : `${formattedItems.length} Products`,
      productSku: formattedItems[0]?.productSku,
      quantity: totalQty,
      items: formattedItems,
      requestedByUserId: currentUser.id,
      requestedByUserName: currentUser.name,
      status: requestMode === 'DRAFT' ? 'DRAFT' : 'PENDING_APPROVAL',
      notes: requestNotes,
      requestDate: new Date().toISOString().replace('T', ' ').slice(0, 16),
      syncStatus: isOnline ? 'synced' : 'pending'
    };

    onRequestTransfer(newTransfer);
    setShowRequestModal(false);
    setRequestItems([{ productId: products[0]?.id || '', quantity: 10 }]);
    setRequestNotes('');
  };

  // Open Dispatch Modal
  const openDispatchModal = (t: StockTransfer) => {
    setDispatchModalTransfer(t);
    const initialQtys: Record<string, number> = {};
    const items = t.items && t.items.length > 0 ? t.items : [
      {
        id: 'ti-1',
        productId: t.productId || '',
        productName: t.productName || '',
        productSku: t.productSku || '',
        requestedQuantity: t.quantity || 0,
        approvedQuantity: t.quantity || 0
      }
    ];
    items.forEach((item) => {
      initialQtys[item.productId] = item.approvedQuantity ?? item.requestedQuantity;
    });
    setDispatchItemQtys(initialQtys);
    setDriverName(t.driverName || '');
    setDriverPhone(t.driverPhone || '');
    setVehicleNumber(t.vehicleNumber || '');
    setWaybillNumber(t.waybillNumber || t.transferNo);
    setEstimatedArrivalDate(t.estimatedArrivalDate || '');
    setDispatchNotes('');
  };

  // Submit Dispatch
  const handleConfirmDispatch = () => {
    if (!dispatchModalTransfer) return;
    const itemDispatches = (Object.entries(dispatchItemQtys) as [string, number][]).map(([pId, qty]) => ({
      productId: pId,
      dispatchedQty: Math.max(0, qty)
    }));

    onDispatchTransfer(dispatchModalTransfer.id, itemDispatches, {
      driverName,
      driverPhone,
      vehicleNumber,
      waybillNumber,
      estimatedArrivalDate,
      notes: dispatchNotes
    });
    setDispatchModalTransfer(null);
  };

  // Open Receive Modal (Section 4)
  const openReceiveModal = (t: StockTransfer) => {
    setReceiveModalTransfer(t);
    const initialInputs: Record<string, { receivedQty: number; damagedQty: number; notes: string }> = {};
    const items = t.items && t.items.length > 0 ? t.items : [
      {
        id: 'ti-1',
        productId: t.productId || '',
        productName: t.productName || '',
        productSku: t.productSku || '',
        requestedQuantity: t.quantity || 0,
        dispatchedQuantity: t.quantity || 0
      }
    ];
    items.forEach((item) => {
      const dispatched = item.dispatchedQuantity ?? item.requestedQuantity;
      initialInputs[item.productId] = {
        receivedQty: item.receivedQuantity ?? dispatched,
        damagedQty: item.damagedQuantity ?? 0,
        notes: item.discrepancyReason || ''
      };
    });
    setReceiveItemInputs(initialInputs);
    setReceiveGeneralNotes('');
  };

  // Submit Receive (Section 4)
  const handleConfirmReceive = () => {
    if (!receiveModalTransfer) return;
    const items = receiveModalTransfer.items && receiveModalTransfer.items.length > 0
      ? receiveModalTransfer.items
      : [{ productId: receiveModalTransfer.productId || '', requestedQuantity: receiveModalTransfer.quantity || 0 }];

    const itemReceives = items.map((i) => {
      const input = receiveItemInputs[i.productId] || {
        receivedQty: i.dispatchedQuantity ?? i.requestedQuantity,
        damagedQty: 0,
        notes: ''
      };
      const dQty = i.dispatchedQuantity ?? i.requestedQuantity;
      const rQty = Math.max(0, input.receivedQty);
      const dmgQty = Math.max(0, input.damagedQty);
      const missingQty = Math.max(0, dQty - rQty - dmgQty);

      return {
        productId: i.productId,
        receivedQty: rQty,
        damagedQty: dmgQty,
        missingQty,
        notes: input.notes
      };
    });

    onReceiveTransfer(receiveModalTransfer.id, itemReceives, receiveGeneralNotes);
    setReceiveModalTransfer(null);
  };

  // Open Discrepancy Resolution Modal (Section 4)
  const openDisputeModal = (t: StockTransfer) => {
    setDisputeTransfer(t);
    setDisputeResolutionStatus('RESOLVED_TRANSIT_LOSS');
    setDisputeResolutionNotes(t.discrepancyResolutionNotes || '');
  };

  // Confirm Discrepancy Resolution
  const handleConfirmDisputeResolution = () => {
    if (!disputeTransfer || !onResolveDiscrepancy) return;
    onResolveDiscrepancy(disputeTransfer.id, {
      status: disputeResolutionStatus,
      notes: disputeResolutionNotes || 'Discrepancy formally reviewed and resolved by authorized management.'
    });
    setDisputeTransfer(null);
  };

  // Open 1-Click PO Modal (Section 5)
  const openReorderPOModal = (rec: ReorderRecommendation) => {
    setReorderPOItem(rec);
    setPoOrderQty(rec.suggestedQuantity);
    setPoSupplierId(rec.preferredSupplierId || suppliers[0]?.id || '');
    setPoNotes(`Automated stock replenishment PO generated from Module 17 Reorder Planner for ${rec.branchName}`);
  };

  // Submit PO from Reorder (Section 5)
  const handleConfirmCreatePO = () => {
    if (!reorderPOItem || !onCreatePurchaseOrder) return;
    const selectedSup = suppliers.find((s) => s.id === poSupplierId) || suppliers[0];

    const poNo = `PO-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
    const newPO: PurchaseOrder = {
      id: 'po-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      orderNo: poNo,
      supplierId: selectedSup?.id || 'sup-1',
      supplierName: selectedSup?.companyName || 'Royal Seed Growers Ltd',
      branchId: reorderPOItem.branchId,
      branchName: reorderPOItem.branchName,
      orderDate: new Date().toISOString().split('T')[0],
      expectedDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      status: 'PENDING_APPROVAL',
      paymentTerms: selectedSup?.creditTerms || 'Net 30 Days',
      notes: poNotes,
      items: [
        {
          id: 'poi-' + Date.now(),
          productId: reorderPOItem.productId,
          productName: reorderPOItem.productName,
          productSku: reorderPOItem.sku,
          unit: reorderPOItem.unit,
          unitPrice: reorderPOItem.unitCost,
          orderedQuantity: poOrderQty,
          quantity: poOrderQty,
          receivedQuantity: 0,
          subtotal: poOrderQty * reorderPOItem.unitCost
        }
      ],
      subtotal: poOrderQty * reorderPOItem.unitCost,
      tax: 0,
      discount: 0,
      totalAmount: poOrderQty * reorderPOItem.unitCost,
      createdByUserId: currentUser.id,
      createdByUserName: currentUser.name,
      createdAt: new Date().toISOString(),
      syncStatus: isOnline ? 'synced' : 'pending'
    };

    onCreatePurchaseOrder(newPO);
    setReorderPOItem(null);
    alert(`Purchase Order #${poNo} generated successfully and sent to Purchasing approval!`);
  };

  // 1-Click Action from Redistribution: Pre-fills Transfer Request Modal!
  const handleInitiateRedistribution = (sug: StockRedistributionSuggestion) => {
    setSourceBranchId(sug.sourceBranchId);
    setDestinationBranchId(sug.destBranchId);
    setRequestItems([{ productId: sug.productId, quantity: sug.suggestedTransferQty }]);
    setRequestNotes(`Stock Redistribution recommendation: ${sug.reason}`);
    setRequestMode('PENDING_APPROVAL');
    setActiveTab('TRANSFERS');
    setShowRequestModal(true);
  };

  // Status Badge Helper
  const getStatusBadge = (status: StockTransferStatus) => {
    switch (status) {
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-700 border border-stone-200">
            <Clock className="w-3 h-3 text-stone-500" /> Draft
          </span>
        );
      case 'PENDING':
      case 'PENDING_APPROVAL':
      case 'REQUESTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300">
            <Clock className="w-3 h-3 text-amber-600 animate-pulse" /> Pending Approval
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200">
            <CheckCircle2 className="w-3 h-3 text-purple-600" /> Approved
          </span>
        );
      case 'PREPARING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
            <Boxes className="w-3 h-3 text-indigo-600 animate-bounce" /> Preparing
          </span>
        );
      case 'IN_TRANSIT':
      case 'DISPATCHED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-300">
            <Truck className="w-3 h-3 text-blue-600" /> In Transit
          </span>
        );
      case 'PARTIALLY_RECEIVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-950 border border-amber-400">
            <AlertTriangle className="w-3 h-3 text-amber-700" /> Partial / Shortage
          </span>
        );
      case 'RECEIVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Received
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-300">
            <XCircle className="w-3 h-3 text-rose-600" /> Rejected
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-500 border border-stone-300">
            Cancelled
          </span>
        );
      default:
        return <span className="text-xs text-stone-500">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Module 17 Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-stone-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#7E9D73] uppercase tracking-wider mb-0.5">
            <ArrowRightLeft className="w-4 h-4 text-[#7E9D73]" /> Module 17 • Logistics, Reordering & Forecasting
          </div>
          <h1 className="text-2xl font-black text-stone-900 tracking-tight">
            Inter-Branch Stock Transfers & Replenishment
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Enterprise waybill workflow, multi-status dispatch, partial receipt dispute resolution, automated reordering, and demand forecasting.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {!isOnline && (
            <div className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold">
              <WifiOff className="w-3.5 h-3.5 text-amber-600" /> Offline PWA Mode
            </div>
          )}

          <button
            onClick={() => {
              setRequestMode('PENDING_APPROVAL');
              setShowRequestModal(true);
            }}
            className="px-4 py-2.5 bg-[#1B3022] hover:bg-[#284732] text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>New Transfer Request</span>
          </button>
        </div>
      </div>

      {/* Metric Stat Cards (Section 7 Dashboard) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-stone-500">
            <span>Pending Approvals</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-stone-900">{pendingApprovalsCount}</div>
          <p className="text-[11px] text-stone-400">Awaiting management authorization</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-stone-500">
            <span>Stock In Transit</span>
            <Truck className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-blue-900">{inTransitCount} <span className="text-xs text-stone-500 font-semibold">({inTransitUnits} units)</span></div>
          <p className="text-[11px] text-stone-400">Dispatched & on the road</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-stone-500">
            <span>Awaiting Receipt</span>
            <Boxes className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-purple-900">{awaitingReceiptCount}</div>
          <p className="text-[11px] text-stone-400">At destination depot</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-stone-500">
            <span>Reorder Alerts</span>
            <PackageSearch className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-800">{criticalReordersCount}</div>
          <p className="text-[11px] text-stone-400">Critical / low stock replenishment</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-stone-500">
            <span>Discrepancies & Disputes</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-900">{discrepancyTransfers.length}</div>
          <p className="text-[11px] text-stone-400">Missing or damaged delivery cases</p>
        </div>
      </div>

      {/* Navigation Sub-Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-stone-200 overflow-x-auto pb-1 custom-scrollbar text-xs">
        <button
          onClick={() => setActiveTab('TRANSFERS')}
          className={`px-4 py-2.5 rounded-t-xl font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'TRANSFERS'
              ? 'bg-[#1B3022] text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-400" />
          <span>Inter-Branch Transfers</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 text-white font-mono">
            {transfers.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('REORDER')}
          className={`px-4 py-2.5 rounded-t-xl font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'REORDER'
              ? 'bg-[#1B3022] text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <PackageSearch className="w-3.5 h-3.5 text-amber-400" />
          <span>Reorder & Replenishment</span>
          {reorderRecommendations.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-500 text-white font-mono">
              {reorderRecommendations.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('FORECAST')}
          className={`px-4 py-2.5 rounded-t-xl font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'FORECAST'
              ? 'bg-[#1B3022] text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
          <span>Demand Forecasting</span>
        </button>

        <button
          onClick={() => setActiveTab('REDISTRIBUTION')}
          className={`px-4 py-2.5 rounded-t-xl font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'REDISTRIBUTION'
              ? 'bg-[#1B3022] text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
          <span>Cross-Branch Redistribution</span>
          {redistributionSuggestions.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-500 text-white font-mono">
              {redistributionSuggestions.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('DISCREPANCIES')}
          className={`px-4 py-2.5 rounded-t-xl font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'DISCREPANCIES'
              ? 'bg-[#1B3022] text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span>Discrepancies & Disputes</span>
          {discrepancyTransfers.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500 text-slate-950 font-mono font-black">
              {discrepancyTransfers.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: INTER-BRANCH TRANSFERS (Section 2 & 3) */}
      {activeTab === 'TRANSFERS' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by Waybill #, Branch, Product, Driver..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:border-[#7E9D73]"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap text-xs">
              {/* Branch Filter */}
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-stone-400" />
                <select
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800 focus:outline-none"
                >
                  <option value="ALL">All Branches</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="PENDING">Pending Approval</option>
                <option value="APPROVED">Approved</option>
                <option value="PREPARING">Preparing</option>
                <option value="IN_TRANSIT">In Transit</option>
                <option value="PARTIALLY_RECEIVED">Partially Received</option>
                <option value="RECEIVED">Received</option>
                <option value="REJECTED">Rejected</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Transfers Table */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#1B3022] text-white uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-3.5">Waybill # / Ref</th>
                    <th className="p-3.5">Source Depot</th>
                    <th className="p-3.5">Destination Depot</th>
                    <th className="p-3.5">Items & Quantity</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Carrier / Driver</th>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium text-stone-700">
                  {filteredTransfers.length > 0 ? (
                    filteredTransfers.map((t) => {
                      const isSourceBranch = currentUser.branchId === t.sourceBranchId || isCEO;
                      const isDestBranch = currentUser.branchId === t.destinationBranchId || isCEO;
                      const items = t.items && t.items.length > 0 ? t.items : [
                        { productName: t.productName || 'Agro Item', requestedQuantity: t.quantity || 0, unit: 'KG' }
                      ];
                      const totalQty = items.reduce((sum, i) => sum + (i.requestedQuantity || 0), 0);
                      const totalDispatched = items.reduce((sum, i) => sum + (i.dispatchedQuantity || 0), 0);
                      const totalReceived = items.reduce((sum, i) => sum + (i.receivedQuantity || 0), 0);

                      return (
                        <tr key={t.id} className="hover:bg-stone-50/80 transition-colors">
                          <td className="p-3.5">
                            <span className="font-mono font-black text-stone-900 block">
                              {t.transferNo}
                            </span>
                            {t.waybillNumber && t.waybillNumber !== t.transferNo && (
                              <span className="text-[10px] text-stone-400 font-mono block">
                                WB: {t.waybillNumber}
                              </span>
                            )}
                          </td>

                          <td className="p-3.5">
                            <div className="font-bold text-stone-900 flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5 text-rose-600" />
                              <span>{t.sourceBranchName}</span>
                            </div>
                          </td>

                          <td className="p-3.5">
                            <div className="font-bold text-stone-900 flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{t.destinationBranchName}</span>
                            </div>
                          </td>

                          <td className="p-3.5">
                            <span className="font-extrabold text-stone-900 block">
                              {items.length === 1 ? items[0].productName : `${items.length} Products`}
                            </span>
                            <span className="text-[11px] text-stone-500">
                              Req: {totalQty} | Disp: {totalDispatched || '-'} | Recv: {totalReceived || '-'}
                            </span>
                          </td>

                          <td className="p-3.5">
                            <div className="space-y-1">
                              {getStatusBadge(t.status)}
                              {t.hasDiscrepancy && (
                                <span className="block text-[10px] font-bold text-amber-800">
                                  ⚠️ Shortage Flagged
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="p-3.5">
                            {t.driverName ? (
                              <div>
                                <span className="font-bold text-stone-800 block">{t.driverName}</span>
                                <span className="text-[10px] text-stone-400 font-mono block">
                                  {t.vehicleNumber || 'Fleet Vehicle'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-stone-400 italic">Unassigned</span>
                            )}
                          </td>

                          <td className="p-3.5">
                            <span className="text-stone-600 font-mono text-[11px] block">
                              {t.requestDate.slice(0, 10)}
                            </span>
                            {t.dispatchDate && (
                              <span className="text-[10px] text-blue-600 block">
                                Disp: {t.dispatchDate.slice(5, 10)}
                              </span>
                            )}
                          </td>

                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {/* View Voucher / Print Waybill */}
                              <button
                                onClick={() => setReceiptTransfer(t)}
                                className="p-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors cursor-pointer"
                                title="View & Print Waybill Slip"
                              >
                                <Printer className="w-4 h-4" />
                              </button>

                              {/* Pending Approval Actions */}
                              {(t.status === 'PENDING' || t.status === 'PENDING_APPROVAL' || t.status === 'REQUESTED') && canApprove && (
                                <>
                                  <button
                                    onClick={() => onApproveTransfer(t.id)}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] transition-colors cursor-pointer"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => setRejectId(t.id)}
                                    className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-bold text-[11px] transition-colors cursor-pointer"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}

                              {/* Approved -> Mark Preparing */}
                              {t.status === 'APPROVED' && isSourceBranch && onPrepareTransfer && (
                                <button
                                  onClick={() => onPrepareTransfer(t.id)}
                                  className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg font-bold text-[11px] transition-colors cursor-pointer"
                                >
                                  Prepare
                                </button>
                              )}

                              {/* Approved or Preparing -> Dispatch */}
                              {(t.status === 'APPROVED' || t.status === 'PREPARING') && isSourceBranch && (
                                <button
                                  onClick={() => openDispatchModal(t)}
                                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1"
                                >
                                  <Truck className="w-3 h-3" />
                                  <span>Dispatch</span>
                                </button>
                              )}

                              {/* In Transit -> Receive at destination */}
                              {(t.status === 'IN_TRANSIT' || t.status === 'DISPATCHED') && isDestBranch && (
                                <button
                                  onClick={() => openReceiveModal(t)}
                                  className="px-2.5 py-1 bg-[#1B3022] hover:bg-[#284732] text-white rounded-lg font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                                >
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span>Receive</span>
                                </button>
                              )}

                              {/* Discrepancy Resolve */}
                              {t.hasDiscrepancy && t.discrepancyStatus === 'UNDER_INVESTIGATION' && isManager && (
                                <button
                                  onClick={() => openDisputeModal(t)}
                                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg font-black text-[11px] transition-colors cursor-pointer"
                                >
                                  Investigate
                                </button>
                              )}

                              {/* Draft -> Submit */}
                              {t.status === 'DRAFT' && isSourceBranch && (
                                <button
                                  onClick={() => {
                                    onRequestTransfer({ ...t, status: 'PENDING_APPROVAL' });
                                  }}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] transition-colors cursor-pointer"
                                >
                                  Submit
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-stone-400">
                        No transfer records matching criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: REORDER & REPLENISHMENT PLANNER (Section 5) */}
      {activeTab === 'REORDER' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-base font-extrabold text-stone-900">Stock Reorder & Replenishment Engine</h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Automatically identifies products below reorder thresholds, accounts for stock in transit and open purchase orders, and calculates optimal restock quantities.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-stone-600">Branch:</span>
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800"
              >
                <option value="ALL">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#1B3022] text-white uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-3.5">Product & SKU</th>
                    <th className="p-3.5">Branch</th>
                    <th className="p-3.5 text-right">Current Stock</th>
                    <th className="p-3.5 text-right">Reorder Point</th>
                    <th className="p-3.5 text-right">Target Buffer</th>
                    <th className="p-3.5 text-right">In Transit</th>
                    <th className="p-3.5 text-right">On Order (PO)</th>
                    <th className="p-3.5 text-right">Suggested Qty</th>
                    <th className="p-3.5">Preferred Supplier</th>
                    <th className="p-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium text-stone-700">
                  {reorderRecommendations.length > 0 ? (
                    reorderRecommendations.map((rec) => {
                      const urgencyColor =
                        rec.urgency === 'CRITICAL'
                          ? 'bg-rose-100 text-rose-900 border-rose-300'
                          : rec.urgency === 'HIGH'
                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                          : 'bg-blue-50 text-blue-900 border-blue-200';

                      return (
                        <tr key={`${rec.branchId}-${rec.productId}`} className="hover:bg-stone-50/80 transition-colors">
                          <td className="p-3.5">
                            <span className="font-extrabold text-stone-900 block">{rec.productName}</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] font-mono text-stone-400">{rec.sku}</span>
                              <span className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase border ${urgencyColor}`}>
                                {rec.urgency}
                              </span>
                            </div>
                          </td>

                          <td className="p-3.5 font-bold text-stone-800">{rec.branchName}</td>

                          <td className="p-3.5 text-right font-black">
                            <span className={rec.currentStock === 0 ? 'text-rose-600' : 'text-stone-900'}>
                              {rec.currentStock} {rec.unit}
                            </span>
                          </td>

                          <td className="p-3.5 text-right font-bold text-stone-600">{rec.reorderLevel}</td>

                          <td className="p-3.5 text-right font-bold text-stone-600">{rec.targetStockLevel}</td>

                          <td className="p-3.5 text-right font-bold text-blue-700">
                            {rec.inTransitStock > 0 ? `+${rec.inTransitStock}` : '-'}
                          </td>

                          <td className="p-3.5 text-right font-bold text-purple-700">
                            {rec.onOrderStock > 0 ? `+${rec.onOrderStock}` : '-'}
                          </td>

                          <td className="p-3.5 text-right font-black text-emerald-800 text-sm">
                            {rec.suggestedQuantity} {rec.unit}
                          </td>

                          <td className="p-3.5">
                            <span className="font-bold text-stone-800 block">
                              {rec.preferredSupplierName || 'Preferred Supplier'}
                            </span>
                            <span className="text-[10px] text-stone-400">
                              Est: ₦{rec.estimatedTotalCost.toLocaleString()}
                            </span>
                          </td>

                          <td className="p-3.5 text-right">
                            <button
                              onClick={() => openReorderPOModal(rec)}
                              className="px-3 py-1.5 bg-[#1B3022] hover:bg-[#284732] text-white rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1 ml-auto"
                            >
                              <ShoppingCart className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Create PO</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-stone-400">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                        <p className="font-bold text-stone-700">All branch stock levels healthy!</p>
                        <p className="text-xs">No products currently require replenishment.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DEMAND FORECASTING (Section 6) */}
      {activeTab === 'FORECAST' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-2">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-base font-extrabold text-stone-900">Stock Demand Forecasting & Run-Rate</h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Calculates average sales velocity per day, remaining inventory run rate, and days until projected stockout.
                </p>
              </div>

              <div className="text-right">
                <span className="text-[11px] font-bold text-stone-500 block">Current Agricultural Season:</span>
                <span className="text-xs font-black text-[#1B3022] bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 inline-block mt-0.5">
                  🌱 {demandForecasts[0]?.seasonalFactor || 'High Planting Season'}
                </span>
              </div>
            </div>

            {/* Plain English Explainability Note */}
            <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 text-xs text-stone-600 flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-stone-800">Explainable Calculation Model:</span> Velocity is computed as{' '}
                <span className="font-mono font-bold text-stone-900">Net Units Sold ÷ 30 Days</span> (excluding internal transfers and accounting for returns). Days of Stock Remaining ={' '}
                <span className="font-mono font-bold text-stone-900">Current Stock ÷ Daily Run Rate</span>. Estimates are statistical run-rate projections and not guaranteed predictions.
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#1B3022] text-white uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-3.5">Product</th>
                    <th className="p-3.5">Branch</th>
                    <th className="p-3.5 text-right">In Stock</th>
                    <th className="p-3.5 text-right">30-Day Units Sold</th>
                    <th className="p-3.5 text-right">Daily Run Rate</th>
                    <th className="p-3.5 text-right">Weekly Velocity</th>
                    <th className="p-3.5 text-right">Days Remaining</th>
                    <th className="p-3.5">Risk Level</th>
                    <th className="p-3.5 text-right">30-Day Restock Buffer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium text-stone-700">
                  {demandForecasts.map((f) => {
                    const isCritical = f.stockoutRisk === 'CRITICAL';
                    const isModerate = f.stockoutRisk === 'MODERATE';
                    const isHealthy = f.stockoutRisk === 'HEALTHY';
                    const isOverstocked = f.stockoutRisk === 'OVERSTOCKED';
                    const isInsufficient = f.stockoutRisk === 'INSUFFICIENT_DATA';

                    return (
                      <tr key={`${f.branchId}-${f.productId}`} className="hover:bg-stone-50/80 transition-colors">
                        <td className="p-3.5">
                          <span className="font-extrabold text-stone-900 block">{f.productName}</span>
                          <span className="text-[10px] font-mono text-stone-400">{f.sku}</span>
                        </td>

                        <td className="p-3.5 font-bold text-stone-800">{f.branchName}</td>

                        <td className="p-3.5 text-right font-black">
                          {f.currentStock} {f.unit}
                        </td>

                        <td className="p-3.5 text-right font-bold text-stone-900">
                          {f.totalUnitsSold} {f.unit}
                        </td>

                        <td className="p-3.5 text-right font-mono font-bold text-blue-900">
                          {f.dailyRunRate} / day
                        </td>

                        <td className="p-3.5 text-right font-mono font-bold text-purple-900">
                          {f.weeklyRunRate} / wk
                        </td>

                        <td className="p-3.5 text-right font-black">
                          {isInsufficient ? (
                            <span className="text-stone-400">N/A</span>
                          ) : (
                            <span className={isCritical ? 'text-rose-600' : isModerate ? 'text-amber-600' : 'text-emerald-700'}>
                              {f.daysOfStockRemaining > 300 ? '>300 days' : `${f.daysOfStockRemaining} days`}
                            </span>
                          )}
                        </td>

                        <td className="p-3.5">
                          {isCritical && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-900 border border-rose-300">
                              🚨 Critical (&lt;7 days)
                            </span>
                          )}
                          {isModerate && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                              ⚠️ Moderate (&lt;14 days)
                            </span>
                          )}
                          {isHealthy && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-300">
                              ✓ Healthy
                            </span>
                          )}
                          {isOverstocked && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-900 border border-blue-300">
                              Surplus / Slow
                            </span>
                          )}
                          {isInsufficient && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-stone-100 text-stone-600 border border-stone-200">
                              Insufficient Data
                            </span>
                          )}
                        </td>

                        <td className="p-3.5 text-right font-extrabold text-stone-900">
                          {f.suggested30DayRestock > 0 ? `${f.suggested30DayRestock} ${f.unit}` : 'Fully Stocked'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: REDISTRIBUTION SUGGESTIONS (Section 7) */}
      {activeTab === 'REDISTRIBUTION' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-1">
            <h2 className="text-base font-extrabold text-stone-900">Cross-Branch Stock Redistribution Engine</h2>
            <p className="text-xs text-stone-500">
              Identifies opportunities where one branch faces stockouts while another branch holds surplus inventory, avoiding new purchase expenditures.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {redistributionSuggestions.length > 0 ? (
              redistributionSuggestions.map((sug) => (
                <div
                  key={sug.id}
                  className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3 hover:border-emerald-500/50 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                      Recommended Redistribution
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                      Save New Capital
                    </span>
                  </div>

                  <h3 className="text-base font-black text-stone-900">{sug.productName}</h3>

                  <div className="grid grid-cols-2 gap-2 bg-stone-50 p-3 rounded-xl border border-stone-200 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-rose-700 uppercase block">Source (Surplus Depot)</span>
                      <span className="font-extrabold text-stone-900 block">{sug.sourceBranchName}</span>
                      <span className="text-[11px] text-stone-500">
                        In Stock: {sug.sourceStock} {sug.unit}
                      </span>
                    </div>

                    <div className="border-l border-stone-200 pl-2">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase block">Destination (Shortage Depot)</span>
                      <span className="font-extrabold text-stone-900 block">{sug.destBranchName}</span>
                      <span className="text-[11px] text-stone-500">
                        In Stock: {sug.destStock} {sug.unit} ({sug.destDaysRemaining} days)
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-stone-600 bg-blue-50/50 p-2.5 rounded-lg border border-blue-100">
                    💡 {sug.reason}
                  </p>

                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <span className="text-[11px] font-bold text-stone-500 block">Suggested Transfer:</span>
                      <span className="text-base font-black text-emerald-800">
                        {sug.suggestedTransferQty} {sug.unit}
                      </span>
                    </div>

                    <button
                      onClick={() => handleInitiateRedistribution(sug)}
                      className="px-4 py-2 bg-[#1B3022] hover:bg-[#284732] text-white rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <span>Initiate Transfer</span>
                      <ChevronRight className="w-4 h-4 text-emerald-400" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 bg-white p-8 rounded-2xl border border-stone-200 text-center text-stone-500 space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <h4 className="font-bold text-stone-800">Inventory Balanced Across All Branches</h4>
                <p className="text-xs">No cross-branch surpluses or severe deficits detected.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: DISCREPANCIES & DISPUTE CENTER (Section 4) */}
      {activeTab === 'DISCREPANCIES' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-1">
            <h2 className="text-base font-extrabold text-stone-900">Transfer Discrepancy & Dispute Center</h2>
            <p className="text-xs text-stone-500">
              Audit log of transit shortages, damaged cargo, and missing stock investigations. Missing goods are withheld from inventory until officially resolved.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#1B3022] text-white uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-3.5">Waybill #</th>
                    <th className="p-3.5">Route</th>
                    <th className="p-3.5">Carrier / Driver</th>
                    <th className="p-3.5">Discrepancy Details</th>
                    <th className="p-3.5">Investigation Status</th>
                    <th className="p-3.5">Resolution Notes</th>
                    <th className="p-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium text-stone-700">
                  {discrepancyTransfers.length > 0 ? (
                    discrepancyTransfers.map((t) => {
                      const items = t.items || [];
                      const totalMissing = items.reduce((sum, i) => sum + (i.missingQuantity || 0), 0);
                      const totalDamaged = items.reduce((sum, i) => sum + (i.damagedQuantity || 0), 0);

                      return (
                        <tr key={t.id} className="hover:bg-stone-50/80 transition-colors">
                          <td className="p-3.5 font-mono font-black text-stone-900">{t.transferNo}</td>
                          <td className="p-3.5">
                            <span className="font-bold text-stone-900">{t.sourceBranchName}</span> →{' '}
                            <span className="font-bold text-stone-900">{t.destinationBranchName}</span>
                          </td>
                          <td className="p-3.5">
                            <span className="font-bold text-stone-800 block">{t.driverName || 'Designated Driver'}</span>
                            <span className="text-[10px] font-mono text-stone-400">{t.vehicleNumber || 'Standard'}</span>
                          </td>
                          <td className="p-3.5">
                            <span className="text-rose-700 font-black block">
                              {totalMissing > 0 && `${totalMissing} units missing `}
                              {totalDamaged > 0 && `${totalDamaged} units damaged`}
                            </span>
                            <span className="text-[10px] text-stone-500 italic block">
                              {items.map((i) => i.discrepancyReason).filter(Boolean).join('; ') || 'Shortage reported at receiving'}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                              t.discrepancyStatus === 'UNDER_INVESTIGATION'
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            }`}>
                              {(t.discrepancyStatus || 'UNDER_INVESTIGATION').replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="p-3.5 text-stone-600 text-xs">
                            {t.discrepancyResolutionNotes || (
                              <span className="text-stone-400 italic">Pending formal resolution</span>
                            )}
                          </td>
                          <td className="p-3.5 text-right">
                            {t.discrepancyStatus === 'UNDER_INVESTIGATION' && isManager ? (
                              <button
                                onClick={() => openDisputeModal(t)}
                                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                              >
                                Resolve Dispute
                              </button>
                            ) : (
                              <button
                                onClick={() => setReceiptTransfer(t)}
                                className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                              >
                                View Slip
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-stone-400">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                        <p className="font-bold text-stone-700">No transit discrepancies on record!</p>
                        <p className="text-xs">All past deliveries received in full condition.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / REQUEST TRANSFER MODAL */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-stone-200 space-y-4 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-[#7E9D73]" />
                <h3 className="font-black text-lg text-stone-900">Create Inter-Branch Stock Transfer</h3>
              </div>
              <button
                onClick={() => setShowRequestModal(false)}
                className="p-1.5 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="space-y-4 overflow-y-auto pr-1 flex-1 custom-scrollbar">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Source Depot (Sending Stock)</label>
                  <select
                    value={sourceBranchId}
                    onChange={(e) => setSourceBranchId(e.target.value)}
                    disabled={currentUser.role === 'BRANCH_MANAGER' && Boolean(currentUser.branchId)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Destination Depot (Receiving)</label>
                  <select
                    value={destinationBranchId}
                    onChange={(e) => setDestinationBranchId(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900"
                  >
                    {branches
                      .filter((b) => b.id !== sourceBranchId)
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-stone-800 uppercase tracking-wider">
                    Transferred Products ({requestItems.length})
                  </label>
                  <button
                    type="button"
                    onClick={() => setRequestItems([...requestItems, { productId: products[0]?.id || '', quantity: 10 }])}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Another Product
                  </button>
                </div>

                <div className="space-y-2">
                  {requestItems.map((item, idx) => {
                    const avail = getSourceBranchStock(sourceBranchId, item.productId);
                    const isExceeding = item.quantity > avail;

                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center gap-3 ${
                          isExceeding ? 'bg-amber-50/70 border-amber-300' : 'bg-stone-50 border-stone-200'
                        }`}
                      >
                        <div className="flex-1 w-full sm:w-auto">
                          <select
                            value={item.productId}
                            onChange={(e) => {
                              const updated = [...requestItems];
                              updated[idx].productId = e.target.value;
                              setRequestItems(updated);
                            }}
                            className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-bold text-stone-900"
                          >
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.sku})
                              </option>
                            ))}
                          </select>
                          <span className={`text-[10px] font-bold block mt-0.5 ${isExceeding ? 'text-rose-700' : 'text-stone-500'}`}>
                            Source In Stock: {avail} {products.find((p) => p.id === item.productId)?.unit}
                            {isExceeding && ' ⚠️ Exceeds Available!'}
                          </span>
                        </div>

                        <div className="w-24">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => {
                              const updated = [...requestItems];
                              updated[idx].quantity = Math.max(1, parseInt(e.target.value) || 0);
                              setRequestItems(updated);
                            }}
                            className="w-full px-2 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-bold text-stone-900 text-right"
                          />
                        </div>

                        {requestItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setRequestItems(requestItems.filter((_, i) => i !== idx))}
                            className="p-1.5 text-stone-400 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Logistics / Transfer Remarks</label>
                <textarea
                  rows={2}
                  value={requestNotes}
                  onChange={(e) => setRequestNotes(e.target.value)}
                  placeholder="Notes, target delivery schedule, transport instructions..."
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-800"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-stone-600">Save Mode:</label>
                  <select
                    value={requestMode}
                    onChange={(e) => setRequestMode(e.target.value as any)}
                    className="px-2.5 py-1 bg-stone-100 border border-stone-200 rounded-lg text-xs font-bold text-stone-800"
                  >
                    <option value="PENDING_APPROVAL">Submit for Approval</option>
                    <option value="DRAFT">Save as Draft</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowRequestModal(false)}
                    className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#1B3022] hover:bg-[#284732] text-white font-bold text-xs rounded-xl shadow-xs"
                  >
                    {requestMode === 'DRAFT' ? 'Save Draft' : 'Submit Transfer'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DISPATCH MODAL */}
      {dispatchModalTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-600" />
                <h3 className="font-black text-lg text-stone-900">
                  Confirm Stock Dispatch: #{dispatchModalTransfer.transferNo}
                </h3>
              </div>
              <button
                onClick={() => setDispatchModalTransfer(null)}
                className="p-1.5 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-100 text-xs text-blue-900">
              Dispatched items will be removed from{' '}
              <span className="font-bold">{dispatchModalTransfer.sourceBranchName}</span> inventory and placed in
              transit status to <span className="font-bold">{dispatchModalTransfer.destinationBranchName}</span>.
            </div>

            <div className="space-y-3 text-xs">
              <h4 className="font-black text-stone-800 uppercase tracking-wider">Quantities Dispatched</h4>
              {dispatchModalTransfer.items?.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-2.5 bg-stone-50 rounded-xl">
                  <div>
                    <span className="font-bold text-stone-900 block">{item.productName}</span>
                    <span className="text-[10px] text-stone-400">Req: {item.requestedQuantity}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-stone-600">Dispatched:</span>
                    <input
                      type="number"
                      min="0"
                      value={dispatchItemQtys[item.productId] ?? item.requestedQuantity}
                      onChange={(e) =>
                        setDispatchItemQtys({
                          ...dispatchItemQtys,
                          [item.productId]: Math.max(0, parseInt(e.target.value) || 0)
                        })
                      }
                      className="w-20 px-2 py-1 bg-white border border-stone-300 rounded-lg text-right font-bold"
                    />
                  </div>
                </div>
              ))}

              <h4 className="font-black text-stone-800 uppercase tracking-wider pt-2">Carrier & Vehicle Logistics</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-stone-600 block mb-0.5">Driver / Carrier Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Ibrahim Musa"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-stone-600 block mb-0.5">Driver Phone</label>
                  <input
                    type="text"
                    placeholder="e.g. 0803 123 4567"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-stone-600 block mb-0.5">Vehicle Plate No</label>
                  <input
                    type="text"
                    placeholder="e.g. KAN-429-XA"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-stone-600 block mb-0.5">Waybill Number</label>
                  <input
                    type="text"
                    value={waybillNumber}
                    onChange={(e) => setWaybillNumber(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setDispatchModalTransfer(null)}
                className="px-4 py-2 bg-stone-100 text-stone-700 rounded-xl font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDispatch}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-xs"
              >
                Confirm Dispatch & Release Stock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECEIVE & INSPECT MODAL (Section 4) */}
      {receiveModalTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-lg text-stone-900">
                  Inspect & Confirm Delivery: #{receiveModalTransfer.transferNo}
                </h3>
              </div>
              <button
                onClick={() => setReceiveModalTransfer(null)}
                className="p-1.5 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs text-amber-900">
              <span className="font-black">Notice:</span> Only the quantity entered as "Received" will be added to{' '}
              <span className="font-bold">{receiveModalTransfer.destinationBranchName}</span> stock. Any missing or damaged quantity is logged for investigation.
            </div>

            <div className="space-y-3">
              <div className="border border-stone-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-100 uppercase text-[10px] font-bold text-stone-700">
                    <tr>
                      <th className="p-2.5">Product</th>
                      <th className="p-2.5 text-right">Dispatched</th>
                      <th className="p-2.5 text-right">Received (Intact)</th>
                      <th className="p-2.5 text-right">Damaged</th>
                      <th className="p-2.5 text-right">Shortage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-xs">
                    {receiveModalTransfer.items?.map((item) => {
                      const input = receiveItemInputs[item.productId] || {
                        receivedQty: item.dispatchedQuantity ?? item.requestedQuantity,
                        damagedQty: 0,
                        notes: ''
                      };
                      const dQty = item.dispatchedQuantity ?? item.requestedQuantity;
                      const missing = Math.max(0, dQty - input.receivedQty - input.damagedQty);

                      return (
                        <tr key={item.id} className="hover:bg-stone-50">
                          <td className="p-2.5">
                            <span className="font-bold text-stone-900 block">{item.productName}</span>
                            <span className="text-[10px] font-mono text-stone-400">{item.productSku}</span>
                          </td>
                          <td className="p-2.5 text-right font-black text-blue-900">{dQty}</td>
                          <td className="p-2.5 text-right">
                            <input
                              type="number"
                              min="0"
                              max={dQty}
                              value={input.receivedQty}
                              onChange={(e) =>
                                setReceiveItemInputs({
                                  ...receiveItemInputs,
                                  [item.productId]: {
                                    ...input,
                                    receivedQty: Math.max(0, parseInt(e.target.value) || 0)
                                  }
                                })
                              }
                              className="w-16 px-1.5 py-1 bg-white border border-stone-300 rounded text-right font-bold text-emerald-800"
                            />
                          </td>
                          <td className="p-2.5 text-right">
                            <input
                              type="number"
                              min="0"
                              value={input.damagedQty}
                              onChange={(e) =>
                                setReceiveItemInputs({
                                  ...receiveItemInputs,
                                  [item.productId]: {
                                    ...input,
                                    damagedQty: Math.max(0, parseInt(e.target.value) || 0)
                                  }
                                })
                              }
                              className="w-16 px-1.5 py-1 bg-white border border-stone-300 rounded text-right font-bold text-purple-800"
                            />
                          </td>
                          <td className="p-2.5 text-right font-black text-rose-700">{missing > 0 ? missing : '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Receipt & Inspection Remarks</label>
                <textarea
                  rows={2}
                  value={receiveGeneralNotes}
                  onChange={(e) => setReceiveGeneralNotes(e.target.value)}
                  placeholder="Notes regarding seals, bag condition, transit damages..."
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setReceiveModalTransfer(null)}
                className="px-4 py-2 bg-stone-100 text-stone-700 rounded-xl font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReceive}
                className="px-5 py-2 bg-[#1B3022] hover:bg-[#284732] text-white rounded-xl font-bold text-xs shadow-xs"
              >
                Confirm Receipt & Update Stock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DISCREPANCY INVESTIGATION & RESOLUTION MODAL (Section 4) */}
      {disputeTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <h3 className="font-black text-lg text-stone-900">
                  Resolve Discrepancy: #{disputeTransfer.transferNo}
                </h3>
              </div>
              <button
                onClick={() => setDisputeTransfer(null)}
                className="p-1.5 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 space-y-1">
                <div className="font-bold text-stone-800">
                  Carrier: {disputeTransfer.driverName || 'Designated Carrier'} ({disputeTransfer.vehicleNumber || 'Fleet'})
                </div>
                <div className="text-stone-500">
                  Route: {disputeTransfer.sourceBranchName} → {disputeTransfer.destinationBranchName}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Resolution Classification</label>
                <select
                  value={disputeResolutionStatus}
                  onChange={(e) => setDisputeResolutionStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900"
                >
                  <option value="RESOLVED_TRANSIT_LOSS">Write Off as Transit Loss (Loss Account)</option>
                  <option value="RESOLVED_SUPPLIER_RECOVERY">Claim Logistics / Courier Insurance Recovery</option>
                  <option value="RESOLVED_RETURNED">Returned to Source Depot (Re-credited)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Investigation Report & Notes</label>
                <textarea
                  rows={3}
                  value={disputeResolutionNotes}
                  onChange={(e) => setDisputeResolutionNotes(e.target.value)}
                  placeholder="Record findings, driver statements, courier claim reference numbers..."
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setDisputeTransfer(null)}
                className="px-4 py-2 bg-stone-100 text-stone-700 rounded-xl font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDisputeResolution}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shadow-xs"
              >
                Save Resolution
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1-CLICK PURCHASE ORDER MODAL (Section 5) */}
      {reorderPOItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-lg text-stone-900">
                  Generate Replenishment Purchase Order
                </h3>
              </div>
              <button
                onClick={() => setReorderPOItem(null)}
                className="p-1.5 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                <span className="font-bold text-stone-500 uppercase block text-[10px]">Restocking Product</span>
                <span className="text-sm font-black text-stone-900 block">{reorderPOItem.productName}</span>
                <span className="text-stone-500">Destination: {reorderPOItem.branchName}</span>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Preferred Supplier</label>
                <select
                  value={poSupplierId}
                  onChange={(e) => setPoSupplierId(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.companyName} ({s.supplierCode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Order Quantity ({reorderPOItem.unit})</label>
                  <input
                    type="number"
                    min="1"
                    value={poOrderQty}
                    onChange={(e) => setPoOrderQty(Math.max(1, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-right"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Estimated Cost</label>
                  <div className="px-3 py-2 bg-stone-100 border border-stone-200 rounded-xl text-xs font-black text-emerald-800 text-right">
                    ₦{(poOrderQty * reorderPOItem.unitCost).toLocaleString()}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">PO Notes</label>
                <textarea
                  rows={2}
                  value={poNotes}
                  onChange={(e) => setPoNotes(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setReorderPOItem(null)}
                className="px-4 py-2 bg-stone-100 text-stone-700 rounded-xl font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCreatePO}
                className="px-5 py-2 bg-[#1B3022] hover:bg-[#284732] text-white rounded-xl font-bold text-xs shadow-xs"
              >
                Create Purchase Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <h3 className="font-black text-base text-stone-900">Reject Transfer Request</h3>
            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">Reason for Rejection *</label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Specify shortage, allocation priority, or policy reason..."
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setRejectId(null);
                  setRejectReason('');
                }}
                className="px-3 py-1.5 bg-stone-100 text-stone-700 rounded-xl font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!rejectReason.trim()}
                onClick={() => {
                  onRejectTransfer(rejectId, rejectReason.trim());
                  setRejectId(null);
                  setRejectReason('');
                }}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white rounded-xl font-bold text-xs"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINTABLE WAYBILL SLIP MODAL */}
      {receiptTransfer && (
        <TransferReceiptModal transfer={receiptTransfer} onClose={() => setReceiptTransfer(null)} />
      )}
    </div>
  );
};
