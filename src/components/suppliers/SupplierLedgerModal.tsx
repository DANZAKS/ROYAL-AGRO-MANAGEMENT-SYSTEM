import React, { useState } from 'react';
import {
  X,
  Building2,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Printer,
  Calendar,
  DollarSign,
  TrendingDown,
  TrendingUp,
  FileText,
  Truck,
  CheckCircle2,
  Clock,
  Download
} from 'lucide-react';
import { Supplier, PurchaseOrder, GoodsReceipt, SupplierPayment, Branch } from '../../types';

interface SupplierLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier | null;
  purchaseOrders: PurchaseOrder[];
  goodsReceipts: GoodsReceipt[];
  supplierPayments: SupplierPayment[];
  branches: Branch[];
  onRecordPaymentClick: (supplier: Supplier) => void;
  onCreatePOClick: (supplier: Supplier) => void;
}

interface LedgerEntry {
  id: string;
  date: string;
  type: 'INVOICE' | 'GRN' | 'PAYMENT';
  referenceNo: string;
  description: string;
  branchName: string;
  debit: number; // Invoiced / Received amounts (increases what Royal Agro owes)
  credit: number; // Payments made (decreases what Royal Agro owes)
  balance: number; // Running balance
  status: string;
}

export const SupplierLedgerModal: React.FC<SupplierLedgerModalProps> = ({
  isOpen,
  onClose,
  supplier,
  purchaseOrders = [],
  goodsReceipts = [],
  supplierPayments = [],
  branches = [],
  onRecordPaymentClick,
  onCreatePOClick
}) => {
  const [filterType, setFilterType] = useState<'ALL' | 'INVOICE' | 'PAYMENT' | 'GRN'>('ALL');
  const [selectedDateRange, setSelectedDateRange] = useState<string>('ALL');

  if (!isOpen || !supplier) return null;

  // Filter supplier-specific transactions
  const supplierPOs = purchaseOrders.filter((po) => po.supplierId === supplier.id);
  const supplierGRNs = goodsReceipts.filter((grn) => grn.supplierId === supplier.id);
  const supplierPays = supplierPayments.filter((sp) => sp.supplierId === supplier.id && sp.status !== 'CANCELLED');

  // Compute total invoices, total paid, and net payable balance
  const totalInvoiced = supplierPOs
    .filter((po) => po.status !== 'CANCELLED' && po.status !== 'REJECTED')
    .reduce((sum, po) => sum + po.totalAmount, 0);

  const totalPaid = supplierPays.reduce((sum, sp) => sum + sp.amount, 0);
  const outstandingBalance = Math.max(0, totalInvoiced - totalPaid);

  // Build sorted ledger records
  const rawLedgerEntries: {
    id: string;
    date: string;
    type: 'INVOICE' | 'GRN' | 'PAYMENT';
    referenceNo: string;
    description: string;
    branchName: string;
    debit: number;
    credit: number;
    status: string;
  }[] = [];

  // 1. PO / Invoices
  supplierPOs.forEach((po) => {
    if (po.status !== 'CANCELLED' && po.status !== 'REJECTED') {
      rawLedgerEntries.push({
        id: 'led-po-' + po.id,
        date: po.orderDate,
        type: 'INVOICE',
        referenceNo: po.orderNo,
        description: `Purchase Order for ${po.items.map((i) => i.productName).join(', ')}`,
        branchName: po.branchName,
        debit: po.totalAmount,
        credit: 0,
        status: po.status
      });
    }
  });

  // 2. Payments
  supplierPays.forEach((pay) => {
    rawLedgerEntries.push({
      id: 'led-pay-' + pay.id,
      date: pay.paymentDate,
      type: 'PAYMENT',
      referenceNo: pay.paymentNo,
      description: `Payment via ${pay.paymentMethod.replace(/_/g, ' ')}${pay.reference ? ` (Ref: ${pay.reference})` : ''}`,
      branchName: pay.branchName || 'Central Treasury',
      debit: 0,
      credit: pay.amount,
      status: pay.status
    });
  });

  // Sort ascending by date to compute running balance
  rawLedgerEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let runningBalance = 0;
  const ledgerWithBalance: LedgerEntry[] = rawLedgerEntries.map((entry) => {
    runningBalance += entry.debit - entry.credit;
    return {
      ...entry,
      balance: runningBalance
    };
  });

  // Filter for display
  const displayLedger = ledgerWithBalance
    .filter((entry) => {
      if (filterType !== 'ALL' && entry.type !== filterType) return false;
      return true;
    })
    .reverse(); // Show newest on top for view

  const handlePrintStatement = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl border border-slate-200 overflow-hidden my-6 max-h-[92vh] flex flex-col print:max-h-none print:shadow-none print:border-none">
        {/* Header */}
        <div className="flex items-center justify-between p-5 bg-slate-900 text-white shrink-0 print:bg-white print:text-slate-900 print:border-b print:border-slate-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">{supplier.companyName}</h2>
                <span className="px-2 py-0.5 text-2xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-md">
                  {supplier.supplierCode || 'CERTIFIED SUPPLIER'}
                </span>
                <span
                  className={`px-2 py-0.5 text-2xs font-bold rounded-md ${
                    supplier.status === 'ACTIVE'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {supplier.status}
                </span>
              </div>
              <p className="text-xs text-slate-300 print:text-slate-600">
                Supplier Profile & General Ledger Statement
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={handlePrintStatement}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-4 h-4 text-emerald-400" /> Print Statement
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Supplier Info Banner */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
            <div>
              <span className="text-2xs font-bold uppercase tracking-wider text-slate-400">Contact Details</span>
              <p className="text-xs font-bold text-slate-900 mt-0.5">{supplier.contactPerson || 'Official Representative'}</p>
              <div className="flex items-center gap-1 text-xs text-slate-600 mt-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" /> {supplier.phone}
              </div>
              {supplier.email && (
                <div className="flex items-center gap-1 text-xs text-slate-600 mt-0.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" /> {supplier.email}
                </div>
              )}
            </div>

            <div>
              <span className="text-2xs font-bold uppercase tracking-wider text-slate-400">Depot & Location</span>
              <div className="flex items-start gap-1 text-xs text-slate-700 mt-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>{supplier.address ? `${supplier.address}, ${supplier.state || 'Nigeria'}` : `${supplier.state || 'Kano'}, Nigeria`}</span>
              </div>
              <p className="text-2xs text-slate-500 mt-1">Terms: <strong className="text-slate-700">{supplier.creditTerms || 'Net 30 Days'}</strong></p>
            </div>

            <div>
              <span className="text-2xs font-bold uppercase tracking-wider text-slate-400">Settlement Bank</span>
              <p className="text-xs font-bold text-slate-800 mt-0.5">{supplier.bankName || 'First Bank of Nigeria'}</p>
              <p className="text-xs font-mono font-semibold text-slate-700">{supplier.bankAccountNumber || 'NUBAN on file'}</p>
              <p className="text-2xs text-slate-500 truncate">{supplier.bankAccountName || supplier.companyName}</p>
            </div>

            <div>
              <span className="text-2xs font-bold uppercase tracking-wider text-slate-400">Categories Supplied</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {(supplier.categoriesSupplied || ['SEEDS']).map((cat) => (
                  <span key={cat} className="px-2 py-0.5 text-2xs font-semibold bg-white border border-slate-200 text-slate-700 rounded-md">
                    {cat.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
              {supplier.taxId && (
                <p className="text-2xs font-mono text-slate-500 mt-1">TIN: {supplier.taxId}</p>
              )}
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Total Invoiced / Ordered</span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xl font-bold text-slate-900 mt-2">₦{totalInvoiced.toLocaleString()}</p>
              <p className="text-2xs text-slate-400 mt-0.5">{supplierPOs.length} Purchase Orders recorded</p>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Total Payments Settled</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xl font-bold text-emerald-600 mt-2">₦{totalPaid.toLocaleString()}</p>
              <p className="text-2xs text-slate-400 mt-0.5">{supplierPays.length} payment vouchers issued</p>
            </div>

            <div className="p-4 bg-white rounded-xl border border-amber-200 shadow-xs bg-amber-50/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-800">Outstanding Payables</span>
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xl font-bold text-amber-700 mt-2">₦{outstandingBalance.toLocaleString()}</p>
              <p className="text-2xs text-amber-600 mt-0.5">
                {outstandingBalance > 0 ? 'Pending payment settlement' : 'Fully Settled / Balanced'}
              </p>
            </div>
          </div>

          {/* Quick Action Bar (Hidden on print) */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900 rounded-xl text-white print:hidden">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-300 font-medium">Quick Supplier Actions:</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onRecordPaymentClick(supplier)}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
              >
                <DollarSign className="w-4 h-4 text-amber-300" /> Record Supplier Payment
              </button>
              <button
                onClick={() => onCreatePOClick(supplier)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5"
              >
                <Truck className="w-4 h-4 text-emerald-400" /> New Purchase Order
              </button>
            </div>
          </div>

          {/* Ledger Table Section */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                Transaction Statement & Running Balance
              </h3>

              {/* Filters */}
              <div className="flex items-center gap-2 print:hidden">
                <div className="flex items-center bg-slate-100 p-1 rounded-xl text-2xs font-semibold">
                  <button
                    onClick={() => setFilterType('ALL')}
                    className={`px-2.5 py-1 rounded-lg transition-colors ${
                      filterType === 'ALL' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    All ({ledgerWithBalance.length})
                  </button>
                  <button
                    onClick={() => setFilterType('INVOICE')}
                    className={`px-2.5 py-1 rounded-lg transition-colors ${
                      filterType === 'INVOICE' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Invoices
                  </button>
                  <button
                    onClick={() => setFilterType('PAYMENT')}
                    className={`px-2.5 py-1 rounded-lg transition-colors ${
                      filterType === 'PAYMENT' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Payments
                  </button>
                </div>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Reference No</th>
                    <th className="py-2.5 px-3">Description & Branch</th>
                    <th className="py-2.5 px-3 text-right">Invoiced (₦)</th>
                    <th className="py-2.5 px-3 text-right">Paid (₦)</th>
                    <th className="py-2.5 px-3 text-right">Balance (₦)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayLedger.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No transactions recorded for this supplier yet.
                      </td>
                    </tr>
                  ) : (
                    displayLedger.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-slate-600">{entry.date}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 text-2xs font-bold rounded-md ${
                              entry.type === 'PAYMENT'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {entry.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{entry.referenceNo}</td>
                        <td className="py-2.5 px-3">
                          <p className="font-medium text-slate-800 truncate max-w-xs">{entry.description}</p>
                          <span className="text-2xs text-slate-400">{entry.branchName}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                          {entry.debit > 0 ? `₦${entry.debit.toLocaleString()}` : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-600">
                          {entry.credit > 0 ? `₦${entry.credit.toLocaleString()}` : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          ₦{entry.balance.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 font-bold border-t border-slate-200 text-slate-900">
                    <td colSpan={4} className="py-3 px-3 text-right">
                      Statement Net Outstanding Balance:
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-blue-700">₦{totalInvoiced.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-700">₦{totalPaid.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right font-mono text-amber-700 text-sm">
                      ₦{outstandingBalance.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0 print:hidden">
          <span>Certified Royal Agro Multi-Branch System</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-colors"
          >
            Close Ledger
          </button>
        </div>
      </div>
    </div>
  );
};
