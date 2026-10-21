import React, { useState, useMemo } from 'react';
import {
  RotateCcw,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  DollarSign,
  Printer,
  Download,
  Users,
  Building2,
  ChevronRight,
  ShieldCheck,
  ShoppingBag,
  Info,
  ArrowRight
} from 'lucide-react';
import {
  User,
  SalesReturn,
  SalesReturnItem,
  Sale,
  Product,
  BranchInventory,
  Customer,
  Branch,
  CustomerCredit,
  ReturnReason,
  ReturnType,
  ItemCondition,
  ReturnStatus,
  DateFilterOption
} from '../../types';
import { ReturnReceiptModal } from './ReturnReceiptModal';

interface SalesReturnModuleProps {
  currentUser: User;
  salesReturns: SalesReturn[];
  sales: Sale[];
  products: Product[];
  inventory: BranchInventory[];
  customers: Customer[];
  branches: Branch[];
  credits: CustomerCredit[];
  onCreateReturn: (returnData: Omit<SalesReturn, 'id' | 'returnNo' | 'createdAt' | 'updatedAt'>) => void;
  onApproveReturn: (returnId: string) => void;
  onRejectReturn: (returnId: string, reason: string) => void;
}

export const SalesReturnModule: React.FC<SalesReturnModuleProps> = ({
  currentUser,
  salesReturns = [],
  sales = [],
  products = [],
  inventory = [],
  customers = [],
  branches = [],
  credits = [],
  onCreateReturn,
  onApproveReturn,
  onRejectReturn
}) => {
  const isManagerOrAdmin = currentUser.role === 'CEO' || currentUser.role === 'BRANCH_MANAGER';

  const [activeTab, setActiveTab] = useState<'RECORDS' | 'CREATE' | 'PENDING' | 'REPORTS'>('RECORDS');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilterOption>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [reasonFilter, setReasonFilter] = useState<string>('ALL');

  // Selected Return for Voucher Modal
  const [viewingReturn, setViewingReturn] = useState<SalesReturn | null>(null);

  // Reject Modal State
  const [rejectingReturn, setRejectingReturn] = useState<SalesReturn | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Form State for Creating Sales Return
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [returnReason, setReturnReason] = useState<ReturnReason>('DAMAGED_PRODUCT');
  const [returnType, setReturnType] = useState<ReturnType>('REFUND');
  const [notes, setNotes] = useState('');

  // Selected Items for Return: productId -> { quantity, condition, unitPrice, replacementProductId }
  const [selectedReturnItems, setSelectedReturnItems] = useState<{
    [productId: string]: {
      quantity: number;
      condition: ItemCondition;
      replacementProductId?: string;
    };
  }>({});

  // Utility: Calculate previously returned quantities for an invoice
  const getPreviouslyReturnedQty = (saleId: string, productId: string) => {
    return salesReturns
      .filter((r) => r.saleId === saleId && (r.status === 'APPROVED' || r.status === 'COMPLETED'))
      .reduce((total, r) => {
        const item = r.items.find((i) => i.productId === productId);
        return total + (item ? item.quantity : 0);
      }, 0);
  };

  // Handle Search & Selecting Sale Invoice
  const matchingSales = useMemo(() => {
    if (!invoiceSearchQuery.trim()) return [];
    const query = invoiceSearchQuery.toLowerCase();
    return sales.filter(
      (s) =>
        s.status === 'COMPLETED' &&
        (s.receiptNo.toLowerCase().includes(query) ||
          s.customerName.toLowerCase().includes(query) ||
          (s.customerPhone && s.customerPhone.includes(query)))
    );
  }, [sales, invoiceSearchQuery]);

  const handleSelectSale = (sale: Sale) => {
    setSelectedSale(sale);
    setSelectedReturnItems({});
    // Default return type based on payment method
    if (sale.paymentMethod === 'CREDIT' || (sale.balanceDue || 0) > 0) {
      setReturnType('REDUCE_CREDIT');
    } else {
      setReturnType('REFUND');
    }
  };

  const handleItemReturnChange = (
    productId: string,
    quantity: number,
    condition: ItemCondition,
    replacementProductId?: string
  ) => {
    setSelectedReturnItems((prev) => {
      if (quantity <= 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return {
        ...prev,
        [productId]: {
          quantity,
          condition,
          replacementProductId
        }
      };
    });
  };

  // Calculate Form Totals
  const formReturnItems = useMemo(() => {
    if (!selectedSale) return [];
    const list: SalesReturnItem[] = [];

    Object.entries(selectedReturnItems).forEach(([pId, cfg]) => {
      const config = cfg as {
        quantity: number;
        condition: ItemCondition;
        replacementProductId?: string;
      };
      const saleItem = selectedSale.items.find((i) => i.productId === pId);
      if (saleItem && config.quantity > 0) {
        const replacementProd = config.replacementProductId
          ? products.find((p) => p.id === config.replacementProductId)
          : undefined;

        list.push({
          id: 'reti-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
          productId: pId,
          productName: saleItem.productName,
          quantity: config.quantity,
          condition: config.condition,
          unitPrice: saleItem.unitPrice,
          subtotal: saleItem.unitPrice * config.quantity,
          replacementProductId: config.replacementProductId,
          replacementProductName: replacementProd ? replacementProd.name : undefined
        });
      }
    });

    return list;
  }, [selectedSale, selectedReturnItems, products]);

  const totalReturnValue = formReturnItems.reduce((sum, i) => sum + i.subtotal, 0);

  const handleSubmitReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSale || formReturnItems.length === 0) return;

    // Check staff vs manager approval rule
    const isAutoApprove = isManagerOrAdmin;
    const initialStatus: ReturnStatus = isAutoApprove ? 'APPROVED' : 'PENDING_APPROVAL';

    const refundAmt = returnType === 'REFUND' ? totalReturnValue : 0;

    onCreateReturn({
      saleId: selectedSale.id,
      receiptNo: selectedSale.receiptNo,
      customerId: selectedSale.customerId,
      customerName: selectedSale.customerName,
      customerPhone: selectedSale.customerPhone,
      returnDate: new Date().toISOString().split('T')[0],
      returnReason,
      returnType,
      items: formReturnItems,
      totalReturnValue,
      refundAmount: refundAmt,
      status: initialStatus,
      submittedByUserId: currentUser.id,
      submittedByUserName: currentUser.name,
      approvedByUserId: isAutoApprove ? currentUser.id : undefined,
      approvedByUserName: isAutoApprove ? currentUser.name : undefined,
      branchId: selectedSale.branchId,
      branchName: selectedSale.branchName,
      notes
    });

    // Reset Form
    setSelectedSale(null);
    setSelectedReturnItems({});
    setNotes('');
    setInvoiceSearchQuery('');
    setActiveTab(isAutoApprove ? 'RECORDS' : 'PENDING');
  };

  // Filtering Returns List
  const filteredReturns = useMemo(() => {
    return salesReturns.filter((r) => {
      // Tab filter
      if (activeTab === 'PENDING' && r.status !== 'SUBMITTED' && r.status !== 'PENDING_APPROVAL') {
        return false;
      }

      // Status filter
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;

      // Reason filter
      if (reasonFilter !== 'ALL' && r.returnReason !== reasonFilter) return false;

      // Search term filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesNo = r.returnNo.toLowerCase().includes(query);
        const matchesInvoice = r.receiptNo.toLowerCase().includes(query);
        const matchesCust = r.customerName.toLowerCase().includes(query);
        const matchesProd = r.items.some((i) => i.productName.toLowerCase().includes(query));
        if (!matchesNo && !matchesInvoice && !matchesCust && !matchesProd) return false;
      }

      // Date filter
      if (dateFilter !== 'ALL') {
        const today = new Date().toISOString().split('T')[0];
        if (dateFilter === 'TODAY' && r.returnDate !== today) return false;
        if (dateFilter === 'THIS_WEEK') {
          const d = new Date(r.returnDate);
          const now = new Date();
          const diffDays = Math.abs((now.getTime() - d.getTime()) / (1000 * 3600 * 24));
          if (diffDays > 7) return false;
        }
        if (dateFilter === 'THIS_MONTH') {
          const d = new Date(r.returnDate);
          const now = new Date();
          if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return false;
        }
      }

      return true;
    });
  }, [salesReturns, activeTab, statusFilter, reasonFilter, searchTerm, dateFilter]);

  const pendingReturnsCount = salesReturns.filter(
    (r) => r.status === 'SUBMITTED' || r.status === 'PENDING_APPROVAL'
  ).length;

  // Summary Metrics
  const totalReturnsCount = salesReturns.length;
  const totalReturnValueAll = salesReturns
    .filter((r) => r.status === 'APPROVED' || r.status === 'COMPLETED')
    .reduce((sum, r) => sum + r.totalReturnValue, 0);

  const totalRefundsPaid = salesReturns
    .filter((r) => (r.status === 'APPROVED' || r.status === 'COMPLETED') && r.returnType === 'REFUND')
    .reduce((sum, r) => sum + r.refundAmount, 0);

  const totalStoreCreditIssued = salesReturns
    .filter((r) => (r.status === 'APPROVED' || r.status === 'COMPLETED') && r.returnType === 'STORE_CREDIT')
    .reduce((sum, r) => sum + r.totalReturnValue, 0);

  const totalCreditReduced = salesReturns
    .filter((r) => (r.status === 'APPROVED' || r.status === 'COMPLETED') && r.returnType === 'REDUCE_CREDIT')
    .reduce((sum, r) => sum + r.totalReturnValue, 0);

  const totalDamagedItems = salesReturns
    .filter((r) => r.status === 'APPROVED' || r.status === 'COMPLETED')
    .reduce((sum, r) => {
      return (
        sum +
        r.items.reduce((itemSum, item) => {
          return item.condition !== 'GOOD' ? itemSum + item.quantity : itemSum;
        }, 0)
      );
    }, 0);

  const handleExportCSV = () => {
    const headers = [
      'Return No',
      'Invoice No',
      'Customer',
      'Branch',
      'Return Date',
      'Reason',
      'Type',
      'Total Value (NGN)',
      'Refund Amount (NGN)',
      'Status',
      'Submitted By',
      'Approved By'
    ];

    const rows = filteredReturns.map((r) => [
      r.returnNo,
      r.receiptNo,
      `"${r.customerName}"`,
      `"${r.branchName}"`,
      r.returnDate,
      r.returnReason,
      r.returnType,
      r.totalReturnValue,
      r.refundAmount,
      r.status,
      `"${r.submittedByUserName}"`,
      `"${r.approvedByUserName || 'N/A'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Sales_Returns_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <RotateCcw className="w-6 h-6 text-emerald-600" />
            <h1 className="text-lg font-bold text-slate-900">Sales Return Management</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Process product returns, manage replacements, issue refunds/store credits, and track damaged inventory.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('CREATE')}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-900/20 flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4 text-amber-300" /> Process New Return
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('RECORDS')}
            className={`px-4 py-2.5 font-bold text-xs border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'RECORDS'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" /> All Return Records
            <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 text-[10px] font-extrabold">
              {salesReturns.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('PENDING')}
            className={`px-4 py-2.5 font-bold text-xs border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'PENDING'
                ? 'border-amber-500 text-amber-800 bg-amber-50/50 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-4 h-4 text-amber-500" /> Pending Approvals
            {pendingReturnsCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-extrabold animate-pulse">
                {pendingReturnsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('CREATE')}
            className={`px-4 py-2.5 font-bold text-xs border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'CREATE'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Plus className="w-4 h-4" /> Create Sales Return
          </button>

          <button
            onClick={() => setActiveTab('REPORTS')}
            className={`px-4 py-2.5 font-bold text-xs border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'REPORTS'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" /> Reports & Analytics
          </button>
        </div>

        {activeTab === 'RECORDS' && (
          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors mb-1"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        )}
      </div>

      {/* TAB 1: ALL RETURN RECORDS & PENDING */}
      {(activeTab === 'RECORDS' || activeTab === 'PENDING') && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold text-slate-500 uppercase">Total Return Value</p>
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <RotateCcw className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xl font-extrabold text-slate-900 mt-2">₦{totalReturnValueAll.toLocaleString()}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{totalReturnsCount} total returns processed</p>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold text-slate-500 uppercase">Cash/Bank Refunds</p>
                <div className="p-2 bg-rose-100 text-rose-800 rounded-xl">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xl font-extrabold text-rose-700 mt-2">₦{totalRefundsPaid.toLocaleString()}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Paid back directly to customers</p>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold text-slate-500 uppercase">Credit Reduced</p>
                <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xl font-extrabold text-amber-800 mt-2">₦{totalCreditReduced.toLocaleString()}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Subtracted from customer debts</p>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold text-slate-500 uppercase">Damaged Goods</p>
                <div className="p-2 bg-slate-100 text-slate-800 rounded-xl">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                </div>
              </div>
              <p className="text-xl font-extrabold text-slate-900 mt-2">{totalDamagedItems} Bags/Units</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Quarantined from main stock</p>
            </div>
          </div>

          {/* Search & Filters Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search by Return #, Invoice #, Customer, or Product..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold text-slate-600">Date:</span>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as DateFilterOption)}
                  className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Time</option>
                  <option value="TODAY">Today</option>
                  <option value="THIS_WEEK">This Week</option>
                  <option value="THIS_MONTH">This Month</option>
                </select>
              </div>

              {activeTab === 'RECORDS' && (
                <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                  <span className="font-semibold text-slate-600">Status:</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="SUBMITTED">Submitted</option>
                    <option value="PENDING_APPROVAL">Pending Approval</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>
              )}

              <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                <span className="font-semibold text-slate-600">Reason:</span>
                <select
                  value={reasonFilter}
                  onChange={(e) => setReasonFilter(e.target.value)}
                  className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Reasons</option>
                  <option value="WRONG_PRODUCT">Wrong Product</option>
                  <option value="DAMAGED_PRODUCT">Damaged Product</option>
                  <option value="EXPIRED_PRODUCT">Expired Product</option>
                  <option value="DEFECTIVE_PRODUCT">Defective Product</option>
                  <option value="WRONG_QUANTITY">Wrong Quantity</option>
                  <option value="CUSTOMER_REQUEST">Customer Request</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Returns Data Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] border-b border-slate-100">
                  <tr>
                    <th className="p-4">Return # & Date</th>
                    <th className="p-4">Invoice #</th>
                    <th className="p-4">Customer & Branch</th>
                    <th className="p-4">Returned Product(s)</th>
                    <th className="p-4">Reason & Type</th>
                    <th className="p-4 text-right">Value / Refund</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-center">Sync</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReturns.map((ret) => {
                    const isPending = ret.status === 'SUBMITTED' || ret.status === 'PENDING_APPROVAL';
                    return (
                      <tr key={ret.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-4">
                          <p className="font-extrabold text-slate-900">{ret.returnNo}</p>
                          <p className="text-[10px] text-slate-500">{ret.returnDate}</p>
                        </td>
                        <td className="p-4 font-bold text-emerald-700">
                          #{ret.receiptNo}
                        </td>
                        <td className="p-4">
                          <p className="font-bold text-slate-900">{ret.customerName}</p>
                          <p className="text-[10px] text-slate-500">📍 {ret.branchName}</p>
                        </td>
                        <td className="p-4">
                          <div className="space-y-1 max-w-xs">
                            {ret.items.map((it, idx) => (
                              <p key={idx} className="font-medium text-slate-800 text-[11px] truncate">
                                <span className="font-extrabold text-emerald-700">{it.quantity}x</span> {it.productName}
                                <span className={`ml-1 text-[9px] px-1 rounded uppercase font-bold ${
                                  it.condition === 'GOOD' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {it.condition}
                                </span>
                              </p>
                            ))}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold text-[10px] block w-fit mb-1">
                            {ret.returnReason.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] text-slate-500 font-semibold">
                            Type: {ret.returnType}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <p className="font-extrabold text-slate-900">₦{ret.totalReturnValue.toLocaleString()}</p>
                          {ret.returnType === 'REFUND' && (
                            <p className="text-[10px] font-bold text-rose-600">Refund: ₦{ret.refundAmount.toLocaleString()}</p>
                          )}
                          {ret.returnType === 'REDUCE_CREDIT' && (
                            <p className="text-[10px] font-bold text-amber-700">Credit Reduced</p>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 ${
                            ret.status === 'APPROVED' || ret.status === 'COMPLETED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : ret.status === 'REJECTED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {isPending && <Clock className="w-3 h-3 text-amber-600 animate-pulse" />}
                            {ret.status}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
                            ret.syncStatus === 'synced'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                          }`}>
                            {ret.syncStatus === 'synced' ? 'Synced' : 'Pending'}
                          </span>
                        </td>
                        <td className="p-4 text-right space-y-1">
                          <div className="flex items-center justify-end gap-1.5">
                            {isPending && isManagerOrAdmin && (
                              <>
                                <button
                                  onClick={() => onApproveReturn(ret.id)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-[10px] shadow-xs flex items-center gap-1"
                                >
                                  <CheckCircle2 className="w-3 h-3" /> Approve
                                </button>
                                <button
                                  onClick={() => {
                                    setRejectingReturn(ret);
                                    setRejectionReason('');
                                  }}
                                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-[10px] shadow-xs flex items-center gap-1"
                                >
                                  <XCircle className="w-3 h-3" /> Reject
                                </button>
                              </>
                            )}

                            <button
                              onClick={() => setViewingReturn(ret)}
                              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-[10px] flex items-center gap-1"
                            >
                              <FileText className="w-3 h-3" /> Voucher
                            </button>
                          </div>
                          {ret.approvedByUserName && (
                            <p className="text-[9px] text-slate-400 text-right">Appr: {ret.approvedByUserName}</p>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {filteredReturns.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-slate-400">
                        <RotateCcw className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-bold text-slate-700">No Sales Return records found</p>
                        <p className="text-xs text-slate-400 mt-1">Try clearing filters or search query.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CREATE SALES RETURN FORM */}
      {activeTab === 'CREATE' && (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in zoom-in-95">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-600" /> Issue New Sales Return
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              Search for an existing completed invoice to return items, update inventory, and adjust financial records.
            </p>

            {/* Step 1: Invoice Search */}
            {!selectedSale ? (
              <div className="space-y-4">
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                  Step 1: Search & Select Invoice Number or Customer
                </label>
                <div className="relative">
                  <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    placeholder="Type Invoice Receipt # (e.g. RA-2026-0891) or Customer Name..."
                    value={invoiceSearchQuery}
                    onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Search Results */}
                {matchingSales.length > 0 && (
                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-80 overflow-y-auto bg-slate-50">
                    {matchingSales.map((sale) => (
                      <div
                        key={sale.id}
                        onClick={() => handleSelectSale(sale)}
                        className="p-3.5 hover:bg-emerald-50/70 transition-colors cursor-pointer flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-extrabold text-slate-900 text-sm">#{sale.receiptNo}</p>
                          <p className="text-slate-600 font-medium">{sale.customerName} • 📍 {sale.branchName}</p>
                          <p className="text-[10px] text-slate-400">{sale.date} • Method: {sale.paymentMethod}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-extrabold text-emerald-700 text-sm">₦{sale.totalAmount.toLocaleString()}</p>
                          <p className="text-[10px] text-slate-500">{sale.items.length} product(s) purchased</p>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 mt-1">
                            Select Invoice <ChevronRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {invoiceSearchQuery && matchingSales.length === 0 && (
                  <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    No matching completed sale invoice found for "{invoiceSearchQuery}".
                  </div>
                )}
              </div>
            ) : (
              /* Selected Invoice Form View */
              <form onSubmit={handleSubmitReturn} className="space-y-6">
                
                {/* Sale Header Box */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-900">Invoice #{selectedSale.receiptNo}</span>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                        COMPLETED SALE
                      </span>
                    </div>
                    <p className="text-slate-600 font-medium mt-0.5">
                      Customer: <strong className="text-slate-900">{selectedSale.customerName}</strong> ({selectedSale.customerPhone || 'N/A'})
                    </p>
                    <p className="text-slate-500 text-[10px]">
                      Branch: {selectedSale.branchName} • Purchased Date: {selectedSale.date} • Payment Method: {selectedSale.paymentMethod}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Original Total</p>
                      <p className="font-black text-sm text-slate-900">₦{selectedSale.totalAmount.toLocaleString()}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedSale(null)}
                      className="px-3 py-1.5 border border-slate-300 hover:bg-slate-200 rounded-lg text-slate-700 font-bold text-xs"
                    >
                      Change Invoice
                    </button>
                  </div>
                </div>

                {/* Step 2: Select Items to Return */}
                <div className="space-y-3">
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                    Step 2: Select Products & Returning Quantities
                  </label>

                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
                    <div className="bg-slate-100 p-3 font-bold text-slate-600 grid grid-cols-12 gap-2 text-[10px] uppercase">
                      <div className="col-span-4">Purchased Product</div>
                      <div className="col-span-2 text-center">Orig. Qty / Returned</div>
                      <div className="col-span-2 text-center">Return Qty</div>
                      <div className="col-span-2 text-center">Item Condition</div>
                      <div className="col-span-2 text-right">Subtotal (₦)</div>
                    </div>

                    {selectedSale.items.map((item) => {
                      const prevReturned = getPreviouslyReturnedQty(selectedSale.id, item.productId);
                      const maxReturnable = Math.max(0, item.quantity - prevReturned);
                      const currentSelection = selectedReturnItems[item.productId] || {
                        quantity: 0,
                        condition: 'GOOD'
                      };

                      return (
                        <div key={item.id} className="p-3 grid grid-cols-12 gap-2 items-center bg-white">
                          <div className="col-span-4">
                            <p className="font-bold text-slate-900">{item.productName}</p>
                            <p className="text-[10px] text-slate-500">Unit Price: ₦{item.unitPrice.toLocaleString()}</p>
                          </div>

                          <div className="col-span-2 text-center font-medium text-slate-600">
                            <p className="font-bold text-slate-800">{item.quantity} sold</p>
                            {prevReturned > 0 && (
                              <p className="text-[10px] text-amber-700 font-bold">({prevReturned} ret.)</p>
                            )}
                          </div>

                          <div className="col-span-2">
                            {maxReturnable > 0 ? (
                              <input
                                type="number"
                                min="0"
                                max={maxReturnable}
                                value={currentSelection.quantity || ''}
                                onChange={(e) =>
                                  handleItemReturnChange(
                                    item.productId,
                                    Math.min(maxReturnable, Math.max(0, Number(e.target.value))),
                                    currentSelection.condition,
                                    currentSelection.replacementProductId
                                  )
                                }
                                placeholder="0"
                                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-center font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              />
                            ) : (
                              <span className="text-[10px] font-bold text-rose-600 block text-center">
                                Max Returned
                              </span>
                            )}
                          </div>

                          <div className="col-span-2">
                            <select
                              value={currentSelection.condition}
                              disabled={currentSelection.quantity <= 0}
                              onChange={(e) =>
                                handleItemReturnChange(
                                  item.productId,
                                  currentSelection.quantity,
                                  e.target.value as ItemCondition,
                                  currentSelection.replacementProductId
                                )
                              }
                              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
                            >
                              <option value="GOOD">Good Condition (Return to Stock)</option>
                              <option value="DAMAGED">Damaged (Move to Damaged Inv)</option>
                              <option value="EXPIRED">Expired (Move to Expired)</option>
                              <option value="DESTROYED">Destroyed / Written Off</option>
                            </select>
                          </div>

                          <div className="col-span-2 text-right font-extrabold text-slate-900">
                            ₦{(item.unitPrice * (currentSelection.quantity || 0)).toLocaleString()}
                          </div>

                          {/* Replacement selector if returnType is REPLACE */}
                          {returnType === 'REPLACE' && currentSelection.quantity > 0 && (
                            <div className="col-span-12 mt-2 pt-2 border-t border-slate-100 flex items-center gap-2 bg-blue-50/50 p-2 rounded-lg">
                              <span className="text-[10px] font-bold text-blue-900">Exchange Replacement Product:</span>
                              <select
                                value={currentSelection.replacementProductId || ''}
                                onChange={(e) =>
                                  handleItemReturnChange(
                                    item.productId,
                                    currentSelection.quantity,
                                    currentSelection.condition,
                                    e.target.value
                                  )
                                }
                                className="px-2 py-1 bg-white border border-blue-200 rounded text-xs font-medium focus:outline-none flex-1"
                              >
                                <option value="">Select replacement product...</option>
                                {products.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name} (₦{p.unitPrice.toLocaleString()})
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Step 3 & 4: Reason & Settlement Method */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                      Step 3: Return Reason *
                    </label>
                    <select
                      value={returnReason}
                      onChange={(e) => setReturnReason(e.target.value as ReturnReason)}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="WRONG_PRODUCT">Wrong Product Delivered</option>
                      <option value="DAMAGED_PRODUCT">Damaged Product / Bag Tearing</option>
                      <option value="EXPIRED_PRODUCT">Expired Product</option>
                      <option value="DEFECTIVE_PRODUCT">Defective Quality / Caked Fertilizer</option>
                      <option value="WRONG_QUANTITY">Wrong Quantity Invoiced</option>
                      <option value="CUSTOMER_REQUEST">Customer Changed Mind / Over-ordered</option>
                      <option value="OTHER">Other / Miscellaneous</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                      Step 4: Return Action / Settlement *
                    </label>
                    <select
                      value={returnType}
                      onChange={(e) => setReturnType(e.target.value as ReturnType)}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="REFUND">Refund Customer (Cash/Bank Transfer)</option>
                      <option value="REPLACE">Replace / Exchange Product</option>
                      <option value="STORE_CREDIT">Issue Store Credit (For Future Purchases)</option>
                      <option value="REDUCE_CREDIT">Reduce Customer Outstanding Debt</option>
                    </select>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Manager Remarks / Inspection Notes
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter details on condition, batch codes, or inspection findings..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Total & Submission Bar */}
                <div className="p-4 bg-emerald-950 text-white rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-emerald-300">Total Return Valuation</p>
                    <p className="text-2xl font-black text-amber-300">₦{totalReturnValue.toLocaleString()}</p>
                    <p className="text-[11px] text-emerald-200">
                      Action: <strong className="text-white">{returnType}</strong> • Items Selected: {formReturnItems.length}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveTab('RECORDS')}
                      className="px-4 py-2 border border-emerald-700 hover:bg-emerald-900 rounded-xl font-bold text-xs text-emerald-100"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={formReturnItems.length === 0}
                      className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-emerald-950 font-black text-xs rounded-xl shadow-lg transition-all"
                    >
                      {isManagerOrAdmin ? 'Submit & Approve Return' : 'Submit Return for Approval'}
                    </button>
                  </div>
                </div>

              </form>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: REPORTS & ANALYTICS */}
      {activeTab === 'REPORTS' && (
        <div className="space-y-6 animate-in fade-in zoom-in-95">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
              <p className="text-xs font-bold text-slate-500 uppercase">Sales Return Volume</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">{salesReturns.length} Requests</p>
              <p className="text-xs text-emerald-700 font-bold mt-1">
                ₦{totalReturnValueAll.toLocaleString()} Gross Value
              </p>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
              <p className="text-xs font-bold text-slate-500 uppercase">Cash & Bank Refunds Paid</p>
              <p className="text-2xl font-extrabold text-rose-700 mt-1">₦{totalRefundsPaid.toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-1">From approved refund requests</p>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
              <p className="text-xs font-bold text-slate-500 uppercase">Quarantined Damaged Inventory</p>
              <p className="text-2xl font-extrabold text-amber-700 mt-1">{totalDamagedItems} Units</p>
              <p className="text-xs text-slate-500 mt-1">Non-sellable condition</p>
            </div>
          </div>

          {/* Reason Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Info className="w-4 h-4 text-emerald-600" /> Return Reason Analysis
              </h3>

              <div className="space-y-3 text-xs">
                {[
                  'WRONG_PRODUCT',
                  'DAMAGED_PRODUCT',
                  'EXPIRED_PRODUCT',
                  'DEFECTIVE_PRODUCT',
                  'WRONG_QUANTITY',
                  'CUSTOMER_REQUEST',
                  'OTHER'
                ].map((reason) => {
                  const count = salesReturns.filter((r) => r.returnReason === reason).length;
                  const pct = salesReturns.length > 0 ? Math.round((count / salesReturns.length) * 100) : 0;

                  return (
                    <div key={reason} className="space-y-1">
                      <div className="flex justify-between font-bold text-slate-700">
                        <span>{reason.replace('_', ' ')}</span>
                        <span>{count} ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-600 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Damaged Goods Report */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" /> Damaged & Expired Products Log
              </h3>

              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 font-bold text-slate-500 uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">Product</th>
                      <th className="p-2.5 text-center">Condition</th>
                      <th className="p-2.5 text-center">Qty</th>
                      <th className="p-2.5 text-right">Value (₦)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {salesReturns.flatMap((r) =>
                      r.items
                        .filter((i) => i.condition !== 'GOOD')
                        .map((i, idx) => (
                          <tr key={`${r.id}-${idx}`}>
                            <td className="p-2.5 font-bold text-slate-900">{i.productName}</td>
                            <td className="p-2.5 text-center font-bold text-rose-700">{i.condition}</td>
                            <td className="p-2.5 text-center font-extrabold">{i.quantity}</td>
                            <td className="p-2.5 text-right font-bold">₦{i.subtotal.toLocaleString()}</td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectingReturn && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Reject Return Request #{rejectingReturn.returnNo}</h3>
            <p className="text-xs text-slate-500 mb-4">Please specify reason for rejecting this return request.</p>

            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Returned after policy timeframe or missing proof of damage..."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 mb-4"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRejectingReturn(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onRejectReturn(rejectingReturn.id, rejectionReason || 'Rejected by Manager');
                  setRejectingReturn(null);
                }}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-xs"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Receipt Voucher Modal */}
      {viewingReturn && (
        <ReturnReceiptModal
          salesReturn={viewingReturn}
          branch={branches.find((b) => b.id === viewingReturn.branchId)}
          onClose={() => setViewingReturn(null)}
        />
      )}
    </div>
  );
};
