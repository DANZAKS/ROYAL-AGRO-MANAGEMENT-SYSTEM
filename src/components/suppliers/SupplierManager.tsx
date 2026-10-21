import React, { useState, useMemo } from 'react';
import {
  Truck,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  PackageCheck,
  Building2,
  X,
  CheckCircle2,
  FileText,
  DollarSign,
  Boxes,
  Clock,
  Filter,
  Eye,
  AlertTriangle,
  ChevronRight,
  Printer,
  TrendingUp,
  XCircle,
  CreditCard,
  Layers,
  ArrowDownRight,
  ShieldCheck,
  Calendar
} from 'lucide-react';
import {
  Supplier,
  PurchaseOrder,
  GoodsReceipt,
  SupplierPayment,
  Branch,
  Product,
  User,
  ProductCategory
} from '../../types';
import { SupplierFormModal } from './SupplierFormModal';
import { SupplierLedgerModal } from './SupplierLedgerModal';
import { PurchaseOrderModal } from './PurchaseOrderModal';
import { PurchaseOrderDetailModal } from './PurchaseOrderDetailModal';
import { GoodsReceiptModal } from './GoodsReceiptModal';
import { GoodsReceiptDetailModal } from './GoodsReceiptDetailModal';
import { SupplierPaymentModal } from './SupplierPaymentModal';

interface SupplierManagerProps {
  suppliers?: Supplier[];
  purchases?: PurchaseOrder[];
  purchaseOrders?: PurchaseOrder[];
  goodsReceipts?: GoodsReceipt[];
  supplierPayments?: SupplierPayment[];
  branches?: Branch[];
  products?: Product[];
  currentUser: User;
  onAddSupplier?: (supplier: Supplier) => void;
  onSaveSupplier?: (supplier: Supplier) => void;
  onDeleteSupplier?: (supplierId: string) => void;
  onReceivePurchaseOrder?: (po: PurchaseOrder) => void;
  onCreatePurchaseOrder?: (po: PurchaseOrder) => void;
  onUpdatePurchaseOrder?: (po: PurchaseOrder) => void;
  onApprovePurchaseOrder?: (poId: string, remarks?: string) => void;
  onRejectPurchaseOrder?: (poId: string, reason: string) => void;
  onCancelPurchaseOrder?: (poId: string, reason?: string) => void;
  onReceiveGoodsReceipt?: (grn: GoodsReceipt) => void;
  onRecordSupplierPayment?: (payment: SupplierPayment) => void;
}

export const SupplierManager: React.FC<SupplierManagerProps> = ({
  suppliers = [],
  purchases = [],
  purchaseOrders = [],
  goodsReceipts = [],
  supplierPayments = [],
  branches = [],
  products = [],
  currentUser,
  onAddSupplier,
  onSaveSupplier,
  onDeleteSupplier,
  onReceivePurchaseOrder,
  onCreatePurchaseOrder,
  onUpdatePurchaseOrder,
  onApprovePurchaseOrder,
  onRejectPurchaseOrder,
  onCancelPurchaseOrder,
  onReceiveGoodsReceipt,
  onRecordSupplierPayment
}) => {
  // Normalize POs
  const allPOs = useMemo(() => {
    return purchaseOrders.length > 0 ? purchaseOrders : purchases;
  }, [purchaseOrders, purchases]);

  // Active Top-Level Navigation
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'SUPPLIERS' | 'PURCHASE_ORDERS' | 'GOODS_RECEIPTS' | 'PAYABLES'>('OVERVIEW');

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const [poStatusFilter, setPoStatusFilter] = useState<string>('ALL');

  // Modals state
  const [isSupplierFormOpen, setIsSupplierFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const [isLedgerOpen, setIsLedgerOpen] = useState(false);
  const [selectedSupplierForLedger, setSelectedSupplierForLedger] = useState<Supplier | null>(null);

  const [isPOModalOpen, setIsPOModalOpen] = useState(false);
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);
  const [defaultPOSupplier, setDefaultPOSupplier] = useState<Supplier | null>(null);

  const [isPODetailOpen, setIsPODetailOpen] = useState(false);
  const [selectedPOForDetail, setSelectedPOForDetail] = useState<PurchaseOrder | null>(null);

  const [isGRNModalOpen, setIsGRNModalOpen] = useState(false);
  const [selectedPOForGRN, setSelectedPOForGRN] = useState<PurchaseOrder | null>(null);

  const [isGRNDetailOpen, setIsGRNDetailOpen] = useState(false);
  const [selectedGRNForDetail, setSelectedGRNForDetail] = useState<GoodsReceipt | null>(null);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedSupplierForPayment, setSelectedSupplierForPayment] = useState<Supplier | null>(null);

  // Overall Financial & Workflow Metrics
  const metrics = useMemo(() => {
    const totalPurchasedValue = allPOs
      .filter((p) => p.status !== 'CANCELLED' && p.status !== 'REJECTED')
      .reduce((sum, p) => sum + p.totalAmount, 0);

    const totalPaidValue = supplierPayments
      .filter((p) => p.status !== 'CANCELLED')
      .reduce((sum, p) => sum + p.amount, 0);

    const outstandingPayables = Math.max(0, totalPurchasedValue - totalPaidValue);

    const pendingApprovalsCount = allPOs.filter(
      (p) => p.status === 'PENDING_APPROVAL' || p.status === 'DRAFT'
    ).length;

    const approvedAwaitingDeliveryCount = allPOs.filter(
      (p) => p.status === 'APPROVED' || p.status === 'PARTIALLY_RECEIVED'
    ).length;

    const totalGRNCount = goodsReceipts.length;

    return {
      totalPurchasedValue,
      totalPaidValue,
      outstandingPayables,
      pendingApprovalsCount,
      approvedAwaitingDeliveryCount,
      totalGRNCount
    };
  }, [allPOs, supplierPayments, goodsReceipts]);

  // Handlers for Save Supplier
  const handleSaveSupplierInternal = (sup: Supplier) => {
    if (onSaveSupplier) {
      onSaveSupplier(sup);
    } else if (onAddSupplier) {
      onAddSupplier(sup);
    }
  };

  // Handlers for PO Creation/Saving
  const handleSavePOInternal = (po: PurchaseOrder) => {
    if (editingPO && onUpdatePurchaseOrder) {
      onUpdatePurchaseOrder(po);
    } else if (onCreatePurchaseOrder) {
      onCreatePurchaseOrder(po);
    } else if (onReceivePurchaseOrder) {
      onReceivePurchaseOrder(po);
    }
  };

  // Handlers for Receiving Goods
  const handleReceiveGRNInternal = (grn: GoodsReceipt) => {
    if (onReceiveGoodsReceipt) {
      onReceiveGoodsReceipt(grn);
    } else if (onReceivePurchaseOrder) {
      // Fallback
      const targetPO = allPOs.find((p) => p.id === grn.purchaseOrderId);
      if (targetPO) {
        onReceivePurchaseOrder({
          ...targetPO,
          status: 'RECEIVED'
        });
      }
    }
  };

  // Filtered Suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      const matchesSearch =
        s.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.phone.includes(searchTerm) ||
        s.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.state?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.supplierCode?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = selectedStatus === 'ALL' || s.status === selectedStatus;
      const matchesCategory =
        selectedCategory === 'ALL' ||
        s.categoriesSupplied?.includes(selectedCategory as ProductCategory);

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [suppliers, searchTerm, selectedStatus, selectedCategory]);

  // Filtered Purchase Orders
  const filteredPOs = useMemo(() => {
    return allPOs.filter((po) => {
      const matchesSearch =
        po.orderNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        po.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        po.branchName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        po.items.some((i) => i.productName.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = poStatusFilter === 'ALL' || po.status === poStatusFilter;
      const matchesBranch = selectedBranch === 'ALL' || po.branchId === selectedBranch;

      return matchesSearch && matchesStatus && matchesBranch;
    });
  }, [allPOs, searchTerm, poStatusFilter, selectedBranch]);

  // Filtered Goods Receipts
  const filteredGRNs = useMemo(() => {
    return goodsReceipts.filter((grn) => {
      const matchesSearch =
        grn.grnNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        grn.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        grn.branchName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (grn.deliveryNoteNumber && grn.deliveryNoteNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (grn.driverName && grn.driverName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        grn.items.some((i) => i.productName.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesBranch = selectedBranch === 'ALL' || grn.branchId === selectedBranch;

      return matchesSearch && matchesBranch;
    });
  }, [goodsReceipts, searchTerm, selectedBranch]);

  // Filtered Payments
  const filteredPayments = useMemo(() => {
    return supplierPayments.filter((p) => {
      const matchesSearch =
        p.paymentNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.reference && p.reference.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.bankName && p.bankName.toLowerCase().includes(searchTerm.toLowerCase()));

      return matchesSearch;
    });
  }, [supplierPayments, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm shadow-emerald-700/20">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Suppliers, Purchase Orders & Receiving</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Seed multiplication councils, agrochemical depots, multi-batch Goods Received Notes & payables ledger
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setSelectedPOForGRN(null);
              setIsGRNModalOpen(true);
            }}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-all"
          >
            <PackageCheck className="w-4 h-4 text-emerald-400" />
            Receive Stock (GRN)
          </button>
          <button
            onClick={() => {
              setEditingPO(null);
              setDefaultPOSupplier(null);
              setIsPOModalOpen(true);
            }}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-900/20 flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4 text-amber-300" />
            New Purchase Order
          </button>
          <button
            onClick={() => {
              setEditingSupplier(null);
              setIsSupplierFormOpen(true);
            }}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-200/80 flex items-center gap-1.5 transition-colors"
          >
            <Building2 className="w-4 h-4 text-slate-600" /> Add Supplier
          </button>
        </div>
      </div>

      {/* 5-Tab Navigation Bar */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200/80 shadow-xs">
        <button
          onClick={() => setActiveTab('OVERVIEW')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'OVERVIEW'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Procurement Overview
        </button>
        <button
          onClick={() => setActiveTab('SUPPLIERS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'SUPPLIERS'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          Suppliers Directory ({suppliers.length})
        </button>
        <button
          onClick={() => setActiveTab('PURCHASE_ORDERS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'PURCHASE_ORDERS'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Purchase Orders ({allPOs.length})
          {metrics.pendingApprovalsCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('GOODS_RECEIPTS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'GOODS_RECEIPTS'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <PackageCheck className="w-3.5 h-3.5" />
          Goods Received (GRN) ({goodsReceipts.length})
        </button>
        <button
          onClick={() => setActiveTab('PAYABLES')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'PAYABLES'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          Supplier Payables & Vouchers ({supplierPayments.length})
        </button>
      </div>

      {/* ================= TAB 1: PROCUREMENT OVERVIEW ================= */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6">
          {/* Executive KPI Banner Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Total Purchase Orders</span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xl font-bold text-slate-900 mt-2 font-mono">
                ₦{metrics.totalPurchasedValue.toLocaleString()}
              </p>
              <p className="text-2xs text-slate-400 mt-1">Across {allPOs.length} authorized POs</p>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Settled Payments</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xl font-bold text-emerald-600 mt-2 font-mono">
                ₦{metrics.totalPaidValue.toLocaleString()}
              </p>
              <p className="text-2xs text-slate-400 mt-1">{supplierPayments.length} payment vouchers posted</p>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-amber-200 shadow-xs bg-amber-50/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-800">Outstanding Payables</span>
                <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xl font-bold text-amber-700 mt-2 font-mono">
                ₦{metrics.outstandingPayables.toLocaleString()}
              </p>
              <p className="text-2xs text-amber-600 mt-1">
                {metrics.outstandingPayables > 0 ? 'Pending payment settlement' : 'Fully Settled'}
              </p>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Deliveries Received (GRN)</span>
                <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                  <PackageCheck className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xl font-bold text-slate-900 mt-2 font-mono">
                {metrics.totalGRNCount} <span className="text-xs font-normal text-slate-500">deliveries</span>
              </p>
              <p className="text-2xs text-slate-400 mt-1">
                {metrics.approvedAwaitingDeliveryCount} POs awaiting arrival
              </p>
            </div>
          </div>

          {/* Actionable Workflow Shortcuts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Orders Awaiting Receiving */}
            <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  Approved Orders Awaiting Delivery / Verification
                </h3>
                <button
                  onClick={() => {
                    setActiveTab('PURCHASE_ORDERS');
                    setPoStatusFilter('APPROVED');
                  }}
                  className="text-xs text-emerald-600 font-bold hover:underline"
                >
                  View All
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {allPOs.filter((p) => p.status === 'APPROVED' || p.status === 'PARTIALLY_RECEIVED').length === 0 ? (
                  <p className="py-8 text-center text-xs text-slate-400">
                    No approved purchase orders awaiting delivery.
                  </p>
                ) : (
                  allPOs
                    .filter((p) => p.status === 'APPROVED' || p.status === 'PARTIALLY_RECEIVED')
                    .slice(0, 4)
                    .map((po) => (
                      <div key={po.id} className="py-3 flex items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-900">#{po.orderNo}</span>
                            <span className="text-2xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {po.status}
                            </span>
                          </div>
                          <p className="text-xs font-medium text-slate-700">{po.supplierName}</p>
                          <p className="text-2xs text-slate-400">
                            Destination: {po.branchName} | Ordered: {po.orderDate}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs font-bold text-slate-900">
                            ₦{po.totalAmount.toLocaleString()}
                          </span>
                          <button
                            onClick={() => {
                              setSelectedPOForGRN(po);
                              setIsGRNModalOpen(true);
                            }}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1 transition-colors"
                          >
                            <PackageCheck className="w-3.5 h-3.5 text-emerald-400" />
                            Receive GRN
                          </button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>

            {/* Right Col: Top Accredited Suppliers */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  Key Supplier Partners
                </h3>
                <button
                  onClick={() => setActiveTab('SUPPLIERS')}
                  className="text-xs text-emerald-600 font-bold hover:underline"
                >
                  Directory
                </button>
              </div>

              <div className="space-y-3">
                {suppliers.slice(0, 4).map((sup) => (
                  <div
                    key={sup.id}
                    onClick={() => {
                      setSelectedSupplierForLedger(sup);
                      setIsLedgerOpen(true);
                    }}
                    className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/60 cursor-pointer transition-all space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 truncate max-w-[180px]">
                        {sup.companyName}
                      </span>
                      <span className="text-2xs font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                        {sup.state || 'Kano'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-2xs text-slate-500">
                      <span>{sup.contactPerson || sup.phone}</span>
                      <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                        Ledger <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: SUPPLIERS DIRECTORY ================= */}
      {activeTab === 'SUPPLIERS' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search suppliers by name, code, contact person, phone, state..."
                className="w-full pl-9 pr-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden font-medium"
              >
                <option value="ALL">All Categories</option>
                <option value="SEEDS">Certified Seeds</option>
                <option value="FERTILIZERS">Fertilizers</option>
                <option value="AGROCHEMICALS">Agrochemicals</option>
                <option value="EQUIPMENT">Equipment</option>
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden font-medium"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
          </div>

          {/* Suppliers Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSuppliers.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
                No suppliers matching your search criteria.
              </div>
            ) : (
              filteredSuppliers.map((supplier) => {
                // Compute supplier financial metrics
                const supPOs = allPOs.filter((p) => p.supplierId === supplier.id && p.status !== 'CANCELLED' && p.status !== 'REJECTED');
                const totalInvoiced = supPOs.reduce((sum, p) => sum + p.totalAmount, 0);
                const supPays = supplierPayments.filter((p) => p.supplierId === supplier.id && p.status !== 'CANCELLED');
                const totalPaid = supPays.reduce((sum, p) => sum + p.amount, 0);
                const balance = Math.max(0, totalInvoiced - totalPaid);

                return (
                  <div
                    key={supplier.id}
                    className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-emerald-300 transition-all"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 leading-snug">
                            {supplier.companyName}
                          </h3>
                          <span className="text-2xs font-mono font-bold text-slate-500">
                            {supplier.supplierCode || 'SUP-ACCREDITED'}
                          </span>
                        </div>
                        <span
                          className={`px-2 py-0.5 text-2xs font-bold rounded-md ${
                            supplier.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {supplier.status}
                        </span>
                      </div>

                      {/* Contact & Depot */}
                      <div className="space-y-1 text-xs text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{supplier.phone}</span>
                        </div>
                        {supplier.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{supplier.email}</span>
                          </div>
                        )}
                        <div className="flex items-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span className="text-2xs text-slate-500 line-clamp-1">
                            {supplier.address || `${supplier.state || 'Kano'}, Nigeria`}
                          </span>
                        </div>
                      </div>

                      {/* Supplied Tags */}
                      <div className="flex flex-wrap gap-1">
                        {(supplier.categoriesSupplied || ['SEEDS']).map((cat) => (
                          <span
                            key={cat}
                            className="px-2 py-0.5 text-2xs font-semibold bg-slate-100 text-slate-700 rounded-md"
                          >
                            {cat.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>

                      {/* Financial Balances */}
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 flex items-center justify-between text-xs">
                        <div>
                          <span className="text-2xs text-slate-400 font-semibold uppercase">Total Ordered</span>
                          <p className="font-mono font-bold text-slate-900">₦{totalInvoiced.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-2xs text-slate-400 font-semibold uppercase">Balance Due</span>
                          <p className={`font-mono font-bold ${balance > 0 ? 'text-amber-700' : 'text-emerald-600'}`}>
                            ₦{balance.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => {
                          setSelectedSupplierForLedger(supplier);
                          setIsLedgerOpen(true);
                        }}
                        className="flex-1 py-1.5 px-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5 text-emerald-400" />
                        Ledger
                      </button>
                      <button
                        onClick={() => {
                          setEditingSupplier(supplier);
                          setIsSupplierFormOpen(true);
                        }}
                        className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          setDefaultPOSupplier(supplier);
                          setEditingPO(null);
                          setIsPOModalOpen(true);
                        }}
                        className="py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-200 transition-colors"
                        title="Create Purchase Order"
                      >
                        + PO
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 3: PURCHASE ORDERS ================= */}
      {activeTab === 'PURCHASE_ORDERS' && (
        <div className="space-y-4">
          {/* PO Filter Bar & Sub-statuses */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search PO by number, supplier name, destination branch, product..."
                className="w-full pl-9 pr-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={poStatusFilter}
                onChange={(e) => setPoStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden font-medium"
              >
                <option value="ALL">All Statuses</option>
                <option value="DRAFT">DRAFT</option>
                <option value="PENDING_APPROVAL">PENDING APPROVAL</option>
                <option value="APPROVED">APPROVED</option>
                <option value="PARTIALLY_RECEIVED">PARTIALLY RECEIVED</option>
                <option value="RECEIVED">FULLY RECEIVED</option>
                <option value="REJECTED">REJECTED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>

              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden font-medium"
              >
                <option value="ALL">All Destination Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Purchase Orders Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                  <th className="py-3 px-4">PO Number</th>
                  <th className="py-3 px-4">Supplier & Branch</th>
                  <th className="py-3 px-4">Order Date</th>
                  <th className="py-3 px-4">Items Summary</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPOs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      No purchase orders found.
                    </td>
                  </tr>
                ) : (
                  filteredPOs.map((po) => {
                    const totalItems = po.items.reduce((s, i) => s + (i.orderedQuantity || i.quantity), 0);
                    const receivedItems = po.items.reduce((s, i) => s + (i.receivedQuantity || 0), 0);

                    return (
                      <tr key={po.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          #{po.orderNo}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-800">{po.supplierName}</p>
                          <span className="text-2xs text-slate-400">{po.branchName}</span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          {po.orderDate}
                          {po.expectedDate && (
                            <span className="block text-2xs text-emerald-700">Exp: {po.expectedDate}</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-medium text-slate-800 truncate max-w-xs">
                            {po.items.map((i) => i.productName).join(', ')}
                          </p>
                          <span className="text-2xs text-slate-500">
                            {receivedItems} / {totalItems} units received
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          ₦{po.totalAmount.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2.5 py-0.5 text-2xs font-bold rounded-md ${
                              po.status === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : po.status === 'RECEIVED'
                                ? 'bg-blue-100 text-blue-800'
                                : po.status === 'PARTIALLY_RECEIVED'
                                ? 'bg-purple-100 text-purple-800'
                                : po.status === 'PENDING_APPROVAL'
                                ? 'bg-amber-100 text-amber-800'
                                : po.status === 'REJECTED'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {po.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedPOForDetail(po);
                                setIsPODetailOpen(true);
                              }}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg transition-colors flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" /> View
                            </button>
                            {(po.status === 'APPROVED' || po.status === 'PARTIALLY_RECEIVED') && (
                              <button
                                onClick={() => {
                                  setSelectedPOForGRN(po);
                                  setIsGRNModalOpen(true);
                                }}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1"
                              >
                                <PackageCheck className="w-3.5 h-3.5" /> Receive
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 4: GOODS RECEIVED (GRN) ================= */}
      {activeTab === 'GOODS_RECEIPTS' && (
        <div className="space-y-4">
          {/* GRN Search & Branch Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search GRNs by number, supplier, driver, vehicle plate, waybill..."
                className="w-full pl-9 pr-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
            </div>

            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden font-medium"
            >
              <option value="ALL">All Receiving Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* GRN Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                  <th className="py-3 px-4">GRN Number</th>
                  <th className="py-3 px-4">PO Reference</th>
                  <th className="py-3 px-4">Supplier & Depot</th>
                  <th className="py-3 px-4">Arrival Date</th>
                  <th className="py-3 px-4">Driver / Waybill</th>
                  <th className="py-3 px-4 text-center">Accepted Items</th>
                  <th className="py-3 px-4 text-right">Value (₦)</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredGRNs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-400">
                      No Goods Received Notes recorded yet. Click "Receive Stock (GRN)" to log arriving deliveries.
                    </td>
                  </tr>
                ) : (
                  filteredGRNs.map((grn) => {
                    const totalAccepted = grn.items.reduce((sum, i) => sum + i.acceptedQuantity, 0);

                    return (
                      <tr key={grn.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          #{grn.grnNumber}
                        </td>
                        <td className="py-3 px-4 font-mono text-emerald-700 font-semibold">
                          #{grn.purchaseOrderNo}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-800">{grn.supplierName}</p>
                          <span className="text-2xs text-slate-400">{grn.branchName}</span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          {grn.receivedDate}
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-xs font-medium text-slate-800">
                            {grn.driverName || 'Carrier'} {grn.vehicleNumber ? `(${grn.vehicleNumber})` : ''}
                          </p>
                          <span className="text-2xs text-slate-400 font-mono">
                            Waybill: {grn.deliveryNoteNumber || 'N/A'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-800">
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md font-mono">
                            {totalAccepted.toLocaleString()} units
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          ₦{grn.totalAmount.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedGRNForDetail(grn);
                              setIsGRNDetailOpen(true);
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg transition-colors flex items-center gap-1 ml-auto"
                          >
                            <Eye className="w-3.5 h-3.5" /> Details
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 5: PAYABLES & VOUCHERS ================= */}
      {activeTab === 'PAYABLES' && (
        <div className="space-y-6">
          {/* Header Action Card */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 text-white p-5 rounded-2xl">
            <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                Supplier Payables & Treasury Disbursements
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Issue official payment vouchers against accredited suppliers and settle outstanding balances
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedSupplierForPayment(null);
                setIsPaymentModalOpen(true);
              }}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 transition-all"
            >
              <DollarSign className="w-4 h-4 text-amber-300" /> Record Supplier Payment Voucher
            </button>
          </div>

          {/* Supplier Balances Summary Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden space-y-3 p-5">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-emerald-600" />
              Supplier Payables Aging & Balance Sheet
            </h4>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                    <th className="py-2.5 px-3">Supplier Name</th>
                    <th className="py-2.5 px-3">Payment Terms</th>
                    <th className="py-2.5 px-3 text-right">Total Invoiced (₦)</th>
                    <th className="py-2.5 px-3 text-right">Total Settled (₦)</th>
                    <th className="py-2.5 px-3 text-right">Outstanding Balance (₦)</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {suppliers.map((s) => {
                    const supPOs = allPOs.filter((p) => p.supplierId === s.id && p.status !== 'CANCELLED' && p.status !== 'REJECTED');
                    const totalInvoiced = supPOs.reduce((sum, p) => sum + p.totalAmount, 0);
                    const supPays = supplierPayments.filter((p) => p.supplierId === s.id && p.status !== 'CANCELLED');
                    const totalPaid = supPays.reduce((sum, p) => sum + p.amount, 0);
                    const balance = Math.max(0, totalInvoiced - totalPaid);

                    return (
                      <tr key={s.id} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-3 font-bold text-slate-900">{s.companyName}</td>
                        <td className="py-2.5 px-3 text-slate-600">{s.creditTerms || 'Net 30 Days'}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-800">
                          ₦{totalInvoiced.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-600">
                          ₦{totalPaid.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          <span className={balance > 0 ? 'text-amber-700' : 'text-emerald-700'}>
                            ₦{balance.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedSupplierForLedger(s);
                                setIsLedgerOpen(true);
                              }}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg text-2xs"
                            >
                              Ledger
                            </button>
                            <button
                              onClick={() => {
                                setSelectedSupplierForPayment(s);
                                setIsPaymentModalOpen(true);
                              }}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-2xs"
                            >
                              Pay
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment Voucher History */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-emerald-600" />
              Settlement Voucher History & Payment Transactions
            </h4>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                    <th className="py-2.5 px-3">Voucher #</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Supplier Beneficiary</th>
                    <th className="py-2.5 px-3">Method & Bank</th>
                    <th className="py-2.5 px-3">Reference</th>
                    <th className="py-2.5 px-3 text-right">Amount (₦)</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No payment vouchers recorded yet.
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{p.paymentNo}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">{p.paymentDate}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-800">{p.supplierName}</td>
                        <td className="py-2.5 px-3">
                          <span className="font-semibold text-slate-800">{p.paymentMethod.replace(/_/g, ' ')}</span>
                          {p.bankName && <p className="text-2xs text-slate-400">{p.bankName}</p>}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-2xs text-slate-600">{p.reference || 'N/A'}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                          ₦{p.amount.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 text-2xs font-bold rounded-md bg-emerald-100 text-emerald-800">
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= ALL MODALS ================= */}

      {/* 1. Supplier Form Modal */}
      <SupplierFormModal
        isOpen={isSupplierFormOpen}
        onClose={() => setIsSupplierFormOpen(false)}
        onSave={handleSaveSupplierInternal}
        initialData={editingSupplier}
      />

      {/* 2. Supplier Ledger Modal */}
      <SupplierLedgerModal
        isOpen={isLedgerOpen}
        onClose={() => setIsLedgerOpen(false)}
        supplier={selectedSupplierForLedger}
        purchaseOrders={allPOs}
        goodsReceipts={goodsReceipts}
        supplierPayments={supplierPayments}
        branches={branches}
        onRecordPaymentClick={(sup) => {
          setIsLedgerOpen(false);
          setSelectedSupplierForPayment(sup);
          setIsPaymentModalOpen(true);
        }}
        onCreatePOClick={(sup) => {
          setIsLedgerOpen(false);
          setDefaultPOSupplier(sup);
          setEditingPO(null);
          setIsPOModalOpen(true);
        }}
      />

      {/* 3. Purchase Order Create/Edit Modal */}
      <PurchaseOrderModal
        isOpen={isPOModalOpen}
        onClose={() => setIsPOModalOpen(false)}
        onSave={handleSavePOInternal}
        suppliers={suppliers}
        branches={branches}
        products={products}
        currentUser={currentUser}
        initialData={editingPO}
        defaultSupplier={defaultPOSupplier}
      />

      {/* 4. Purchase Order Detail & Approval Modal */}
      <PurchaseOrderDetailModal
        isOpen={isPODetailOpen}
        onClose={() => setIsPODetailOpen(false)}
        purchaseOrder={selectedPOForDetail}
        currentUser={currentUser}
        onApprove={(poId, remarks) => {
          if (onApprovePurchaseOrder) {
            onApprovePurchaseOrder(poId, remarks);
          }
        }}
        onReject={(poId, reason) => {
          if (onRejectPurchaseOrder) {
            onRejectPurchaseOrder(poId, reason);
          }
        }}
        onCancel={(poId, reason) => {
          if (onCancelPurchaseOrder) {
            onCancelPurchaseOrder(poId, reason);
          }
        }}
        onReceiveClick={(po) => {
          setSelectedPOForGRN(po);
          setIsGRNModalOpen(true);
        }}
        goodsReceipts={goodsReceipts}
      />

      {/* 5. Goods Receipt Note Modal */}
      <GoodsReceiptModal
        isOpen={isGRNModalOpen}
        onClose={() => setIsGRNModalOpen(false)}
        onReceive={handleReceiveGRNInternal}
        purchaseOrders={allPOs}
        branches={branches}
        products={products}
        currentUser={currentUser}
        selectedPO={selectedPOForGRN}
      />

      {/* 6. Goods Receipt Note Detail & Voucher Modal */}
      <GoodsReceiptDetailModal
        isOpen={isGRNDetailOpen}
        onClose={() => setIsGRNDetailOpen(false)}
        goodsReceipt={selectedGRNForDetail}
      />

      {/* 7. Supplier Payment Modal */}
      <SupplierPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onSavePayment={(payment) => {
          if (onRecordSupplierPayment) {
            onRecordSupplierPayment(payment);
          }
        }}
        suppliers={suppliers}
        purchaseOrders={allPOs}
        branches={branches}
        currentUser={currentUser}
        selectedSupplier={selectedSupplierForPayment}
      />
    </div>
  );
};
