import React from 'react';
import {
  X,
  PackageCheck,
  Building2,
  Calendar,
  Truck,
  Printer,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Boxes,
  FileText
} from 'lucide-react';
import { GoodsReceipt } from '../../types';

interface GoodsReceiptDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  goodsReceipt: GoodsReceipt | null;
}

export const GoodsReceiptDetailModal: React.FC<GoodsReceiptDetailModalProps> = ({
  isOpen,
  onClose,
  goodsReceipt
}) => {
  if (!isOpen || !goodsReceipt) return null;

  const handlePrint = () => {
    window.print();
  };

  const totalAccepted = goodsReceipt.items.reduce((sum, it) => sum + it.acceptedQuantity, 0);
  const totalDamaged = goodsReceipt.items.reduce((sum, it) => sum + (it.damagedQuantity || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-slate-200 overflow-hidden my-6 max-h-[92vh] flex flex-col print:max-h-none print:shadow-none print:border-none">
        {/* Header */}
        <div className="flex items-center justify-between p-5 bg-slate-900 text-white shrink-0 print:bg-white print:text-slate-900 print:border-b print:border-slate-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">Goods Received Note #{goodsReceipt.grnNumber}</h2>
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {goodsReceipt.status || 'VERIFIED'}
                </span>
              </div>
              <p className="text-xs text-slate-300 print:text-slate-600">
                Official Stock Receipt & Physical Inspection Certificate
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-4 h-4 text-emerald-400" /> Print GRN
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
          {/* Metadata Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
            <div>
              <span className="text-2xs font-bold uppercase tracking-wider text-slate-400">Supplier Vendor</span>
              <p className="text-xs font-bold text-slate-900 mt-0.5">{goodsReceipt.supplierName}</p>
              <p className="text-2xs text-slate-500 mt-0.5">PO Ref: #{goodsReceipt.purchaseOrderNo}</p>
            </div>

            <div>
              <span className="text-2xs font-bold uppercase tracking-wider text-slate-400">Receiving Depot</span>
              <p className="text-xs font-bold text-slate-900 mt-0.5">{goodsReceipt.branchName}</p>
              <p className="text-2xs text-slate-500 mt-0.5">Received Date: {goodsReceipt.receivedDate}</p>
            </div>

            <div>
              <span className="text-2xs font-bold uppercase tracking-wider text-slate-400">Logistics & Carrier</span>
              <p className="text-xs font-bold text-slate-900 mt-0.5">
                {goodsReceipt.vehicleNumber || 'Standard Carrier'}
              </p>
              <p className="text-2xs text-slate-500 mt-0.5">
                Driver: {goodsReceipt.driverName || 'N/A'} {goodsReceipt.driverPhone ? `(${goodsReceipt.driverPhone})` : ''}
              </p>
            </div>

            <div>
              <span className="text-2xs font-bold uppercase tracking-wider text-slate-400">Waybill Reference</span>
              <p className="text-xs font-mono font-bold text-slate-900 mt-0.5">
                {goodsReceipt.deliveryNoteNumber || 'N/A'}
              </p>
              <p className="text-2xs text-emerald-700 font-semibold mt-0.5">
                Officer: {goodsReceipt.receivedByUserName}
              </p>
            </div>
          </div>

          {/* Items Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Boxes className="w-4 h-4 text-emerald-600" />
                Received Inventory & Batch Inspection Audit
              </h3>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-emerald-700 font-bold">Total Accepted: {totalAccepted.toLocaleString()}</span>
                {totalDamaged > 0 && (
                  <span className="text-rose-600 font-bold">Damaged/Rejected: {totalDamaged.toLocaleString()}</span>
                )}
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                    <th className="py-2.5 px-3">Product Name & SKU</th>
                    <th className="py-2.5 px-3 text-center">Batch Number</th>
                    <th className="py-2.5 px-3 text-center">Expiry Date</th>
                    <th className="py-2.5 px-3 text-center">Received</th>
                    <th className="py-2.5 px-3 text-center">Accepted</th>
                    <th className="py-2.5 px-3 text-center">Damaged</th>
                    <th className="py-2.5 px-3 text-right">Value (₦)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {goodsReceipt.items.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3">
                        <p className="font-bold text-slate-900">{item.productName}</p>
                        <span className="text-2xs font-mono text-slate-400">{item.productSku}</span>
                        {item.damageReason && (
                          <p className="text-2xs text-rose-600 font-semibold mt-0.5">
                            Damage Reason: {item.damageReason}
                          </p>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-xs font-semibold text-slate-700">
                        {item.batchNumber || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-xs text-slate-600">
                        {item.expiryDate || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-center font-semibold text-slate-700">
                        {item.receivedQuantity.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2.5 py-0.5 font-bold font-mono text-emerald-800 bg-emerald-100 rounded-md">
                          {item.acceptedQuantity.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-semibold text-rose-600">
                        {item.damagedQuantity || 0}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        ₦{item.subtotal.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 font-bold border-t border-slate-200 text-slate-900">
                    <td colSpan={6} className="py-3 px-3 text-right">
                      Total Accepted Goods Value:
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-sm font-extrabold text-emerald-800">
                      ₦{goodsReceipt.totalAmount.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Notes & Verification Stamp */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Physical Goods Receiving Certification
            </h4>
            <p className="text-slate-600">
              I hereby certify that the agricultural inputs listed above have been physically inspected, counted, batch-recorded, and posted into the official branch inventory ledger.
            </p>
            {goodsReceipt.notes && (
              <p className="text-2xs text-slate-500 italic pt-1 border-t border-slate-200/60">
                Notes: {goodsReceipt.notes}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0 print:hidden">
          <span>Official Royal Agro Management Goods Receiving Certificate</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
