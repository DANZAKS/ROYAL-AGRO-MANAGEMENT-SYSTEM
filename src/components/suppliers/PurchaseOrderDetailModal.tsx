import React, { useState } from 'react';
import {
  X,
  Truck,
  Building2,
  Calendar,
  DollarSign,
  Printer,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Boxes,
  ShieldCheck,
  UserCheck,
  AlertTriangle,
  PackageCheck
} from 'lucide-react';
import { PurchaseOrder, User, Supplier, Branch, GoodsReceipt } from '../../types';

interface PurchaseOrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseOrder: PurchaseOrder | null;
  currentUser: User;
  onApprove: (poId: string, remarks?: string) => void;
  onReject: (poId: string, reason: string) => void;
  onCancel: (poId: string, reason?: string) => void;
  onReceiveClick: (po: PurchaseOrder) => void;
  onEditClick?: (po: PurchaseOrder) => void;
  goodsReceipts?: GoodsReceipt[];
}

export const PurchaseOrderDetailModal: React.FC<PurchaseOrderDetailModalProps> = ({
  isOpen,
  onClose,
  purchaseOrder,
  currentUser,
  onApprove,
  onReject,
  onCancel,
  onReceiveClick,
  onEditClick,
  goodsReceipts = []
}) => {
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [approvalRemarks, setApprovalRemarks] = useState('');
  const [showApproveForm, setShowApproveForm] = useState(false);

  if (!isOpen || !purchaseOrder) return null;

  const isCEO = currentUser?.role === 'CEO';
  const isManager = currentUser?.role === 'BRANCH_MANAGER' || isCEO;

  const canApprove =
    isManager &&
    (purchaseOrder.status === 'PENDING_APPROVAL' || purchaseOrder.status === 'DRAFT');

  const canReceive =
    (purchaseOrder.status === 'APPROVED' || purchaseOrder.status === 'PARTIALLY_RECEIVED');

  const canCancel =
    purchaseOrder.status !== 'RECEIVED' &&
    purchaseOrder.status !== 'CANCELLED' &&
    purchaseOrder.status !== 'REJECTED';

  const relatedGRNs = goodsReceipts.filter((grn) => grn.purchaseOrderId === purchaseOrder.id);

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status: PurchaseOrder['status']) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> APPROVED
          </span>
        );
      case 'RECEIVED':
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-1">
            <PackageCheck className="w-3.5 h-3.5" /> FULLY RECEIVED
          </span>
        );
      case 'PARTIALLY_RECEIVED':
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-purple-100 text-purple-800 border border-purple-300 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> PARTIALLY DELIVERED
          </span>
        );
      case 'PENDING_APPROVAL':
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> PENDING EXECUTIVE APPROVAL
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5" /> REJECTED
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 text-slate-700 border border-slate-300 flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5" /> CANCELLED
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 text-slate-700 border border-slate-300">
            DRAFT REQUISITION
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-slate-200 overflow-hidden my-6 max-h-[92vh] flex flex-col print:max-h-none print:shadow-none print:border-none">
        {/* Header */}
        <div className="flex items-center justify-between p-5 bg-slate-900 text-white shrink-0 print:bg-white print:text-slate-900 print:border-b print:border-slate-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">Purchase Order #{purchaseOrder.orderNo}</h2>
                {getStatusBadge(purchaseOrder.status)}
              </div>
              <p className="text-xs text-slate-300 print:text-slate-600">
                Official Agro-Input Requisition Document & Procurement Voucher
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-4 h-4 text-emerald-400" /> Print PO Voucher
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Top Metadata Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
            <div>
              <span className="text-2xs font-bold uppercase tracking-wider text-slate-400">Supplier Vendor</span>
              <p className="text-sm font-bold text-slate-900 mt-0.5">{purchaseOrder.supplierName}</p>
              <p className="text-2xs text-slate-500 mt-0.5">Terms: {purchaseOrder.paymentTerms || 'Net 30 Days'}</p>
            </div>

            <div>
              <span className="text-2xs font-bold uppercase tracking-wider text-slate-400">Receiving Destination</span>
              <p className="text-sm font-bold text-slate-900 mt-0.5">{purchaseOrder.branchName}</p>
              <p className="text-2xs text-slate-500 mt-0.5">Central Agro-Logistics Depot</p>
            </div>

            <div>
              <span className="text-2xs font-bold uppercase tracking-wider text-slate-400">Key Timestamps</span>
              <p className="text-xs text-slate-700 mt-0.5">
                Issue Date: <strong className="text-slate-900">{purchaseOrder.orderDate}</strong>
              </p>
              {purchaseOrder.expectedDate && (
                <p className="text-xs text-slate-700 mt-0.5">
                  Expected Delivery: <strong className="text-emerald-700">{purchaseOrder.expectedDate}</strong>
                </p>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Boxes className="w-4 h-4 text-emerald-600" />
              Ordered Agricultural Products & Delivery Status
            </h3>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                    <th className="py-2.5 px-3">Product Name & Specifications</th>
                    <th className="py-2.5 px-3 text-center">Ordered Qty</th>
                    <th className="py-2.5 px-3 text-center">Received Qty</th>
                    <th className="py-2.5 px-3 text-right">Unit Cost (₦)</th>
                    <th className="py-2.5 px-3 text-right">Total Subtotal (₦)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {purchaseOrder.items.map((item, idx) => {
                    const ordered = item.orderedQuantity || item.quantity;
                    const received = item.receivedQuantity || 0;
                    const isComplete = received >= ordered;

                    return (
                      <tr key={item.id || idx} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-3">
                          <p className="font-bold text-slate-900">{item.productName}</p>
                          <span className="text-2xs font-mono text-slate-400">{item.productSku}</span>
                          {item.notes && <p className="text-2xs text-slate-500 italic mt-0.5">{item.notes}</p>}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                          {ordered.toLocaleString()} <span className="text-2xs text-slate-400">{item.unit || 'units'}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 font-bold rounded-md text-xs ${
                              isComplete
                                ? 'bg-emerald-100 text-emerald-800'
                                : received > 0
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {received.toLocaleString()} / {ordered.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                          ₦{item.unitPrice.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          ₦{item.subtotal.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 font-bold border-t border-slate-200 text-slate-900">
                    <td colSpan={4} className="py-2.5 px-3 text-right">
                      Subtotal:
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      ₦{(purchaseOrder.subtotal || purchaseOrder.totalAmount).toLocaleString()}
                    </td>
                  </tr>
                  {Boolean(purchaseOrder.tax) && (
                    <tr className="bg-slate-50 text-slate-600 border-t border-slate-100">
                      <td colSpan={4} className="py-1.5 px-3 text-right text-xs">
                        Freight / Delivery Surcharge:
                      </td>
                      <td className="py-1.5 px-3 text-right font-mono text-xs">
                        ₦{(purchaseOrder.tax || 0).toLocaleString()}
                      </td>
                    </tr>
                  )}
                  {Boolean(purchaseOrder.discount) && (
                    <tr className="bg-slate-50 text-emerald-700 border-t border-slate-100">
                      <td colSpan={4} className="py-1.5 px-3 text-right text-xs">
                        Supplier Discount Applied:
                      </td>
                      <td className="py-1.5 px-3 text-right font-mono text-xs">
                        -₦{(purchaseOrder.discount || 0).toLocaleString()}
                      </td>
                    </tr>
                  )}
                  <tr className="bg-emerald-50 text-emerald-950 font-bold border-t-2 border-emerald-200">
                    <td colSpan={4} className="py-3 px-3 text-right text-sm">
                      Total Purchase Order Value:
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-base font-extrabold text-emerald-800">
                      ₦{purchaseOrder.totalAmount.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Related Goods Received Notes (GRNs) */}
          {relatedGRNs.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <PackageCheck className="w-4 h-4 text-emerald-600" />
                Goods Received Notes (GRN) for this Order ({relatedGRNs.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {relatedGRNs.map((grn) => (
                  <div key={grn.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold text-slate-900">
                      <span>GRN: {grn.grnNumber}</span>
                      <span className="font-mono text-slate-600">{grn.receivedDate}</span>
                    </div>
                    <p className="text-2xs text-slate-500">
                      Delivery Note: <strong className="text-slate-700">{grn.deliveryNoteNumber || 'N/A'}</strong> | Driver: {grn.driverName || 'N/A'} ({grn.vehicleNumber || 'N/A'})
                    </p>
                    <p className="text-2xs text-emerald-700 font-semibold">
                      Received by: {grn.receivedByUserName}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Audit Trail & Authorizations */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Procurement Authorization Sign-Off
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <p className="text-slate-500">
                  Created By: <strong className="text-slate-800">{purchaseOrder.createdByUserName || 'Staff'}</strong>
                </p>
                <p className="text-2xs text-slate-400">{purchaseOrder.createdAt || purchaseOrder.orderDate}</p>
              </div>

              <div>
                <p className="text-slate-500">
                  Executive Approval:{' '}
                  {purchaseOrder.approvedByUserName ? (
                    <strong className="text-emerald-700">{purchaseOrder.approvedByUserName}</strong>
                  ) : (
                    <span className="text-amber-600 italic">Pending Executive Sign-off</span>
                  )}
                </p>
                {purchaseOrder.approvedAt && (
                  <p className="text-2xs text-slate-400">{purchaseOrder.approvedAt}</p>
                )}
              </div>
            </div>

            {purchaseOrder.rejectionReason && (
              <div className="mt-2 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs">
                <strong>Rejection Reason:</strong> {purchaseOrder.rejectionReason}
              </div>
            )}

            {purchaseOrder.notes && (
              <p className="text-2xs text-slate-600 italic pt-1 border-t border-slate-200/60">
                Special Instructions: {purchaseOrder.notes}
              </p>
            )}
          </div>

          {/* Interactive Approval / Rejection Input Forms */}
          {showApproveForm && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3 print:hidden">
              <h4 className="text-xs font-bold text-emerald-900">Executive Authorization Sign-off</h4>
              <input
                type="text"
                value={approvalRemarks}
                onChange={(e) => setApprovalRemarks(e.target.value)}
                placeholder="Optional approval remarks or budget code reference..."
                className="w-full px-3 py-2 text-xs bg-white border border-emerald-300 rounded-lg outline-hidden"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onApprove(purchaseOrder.id, approvalRemarks);
                    setShowApproveForm(false);
                    onClose();
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  Confirm Official Approval
                </button>
                <button
                  type="button"
                  onClick={() => setShowApproveForm(false)}
                  className="px-3 py-2 text-xs text-slate-600 hover:bg-emerald-100 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {showRejectForm && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-3 print:hidden">
              <h4 className="text-xs font-bold text-rose-900">State Reason for Rejection</h4>
              <input
                type="text"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Supplier quotation exceeds current budget cap, uncertified batch..."
                className="w-full px-3 py-2 text-xs bg-white border border-rose-300 rounded-lg outline-hidden"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!rejectReason.trim()) return;
                    onReject(purchaseOrder.id, rejectReason);
                    setShowRejectForm(false);
                    onClose();
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  Confirm Rejection
                </button>
                <button
                  type="button"
                  onClick={() => setShowRejectForm(false)}
                  className="px-3 py-2 text-xs text-slate-600 hover:bg-rose-100 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            {canCancel && !showApproveForm && !showRejectForm && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Are you sure you want to cancel Purchase Order #${purchaseOrder.orderNo}?`)) {
                    onCancel(purchaseOrder.id, 'Cancelled by user');
                    onClose();
                  }
                }}
                className="px-3 py-2 text-xs text-slate-500 hover:text-rose-600 hover:bg-rose-50 font-semibold rounded-lg transition-colors"
              >
                Cancel Order
              </button>
            )}

            {canApprove && !showApproveForm && !showRejectForm && (
              <>
                <button
                  type="button"
                  onClick={() => setShowRejectForm(true)}
                  className="px-4 py-2 bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-bold rounded-xl transition-colors"
                >
                  Reject Order
                </button>
                <button
                  type="button"
                  onClick={() => setShowApproveForm(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-900/20 transition-all flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" /> Approve Purchase Order
                </button>
              </>
            )}

            {canReceive && (
              <button
                type="button"
                onClick={() => {
                  onReceiveClick(purchaseOrder);
                  onClose();
                }}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2"
              >
                <PackageCheck className="w-4 h-4 text-emerald-400" />
                Receive Goods & Generate GRN
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
