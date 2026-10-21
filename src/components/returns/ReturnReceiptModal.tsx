import React from 'react';
import { X, Printer, Download, CheckCircle2, RotateCcw, AlertTriangle, Building2, User, Calendar, FileText } from 'lucide-react';
import { SalesReturn, Branch } from '../../types';

interface ReturnReceiptModalProps {
  salesReturn: SalesReturn;
  branch?: Branch;
  onClose: () => void;
}

export const ReturnReceiptModal: React.FC<ReturnReceiptModalProps> = ({
  salesReturn,
  branch,
  onClose
}) => {
  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const textContent = `================================================
ROYAL AGRO MANAGEMENT SYSTEM
Official Sales Return Voucher Receipt
================================================
Return Voucher No : ${salesReturn.returnNo}
Original Invoice  : #${salesReturn.receiptNo}
Status            : ${salesReturn.status}
Branch            : ${branch ? branch.name : salesReturn.branchName}
Customer Name     : ${salesReturn.customerName} ${salesReturn.customerPhone ? `(${salesReturn.customerPhone})` : ''}
Return Date       : ${salesReturn.returnDate}
Return Reason     : ${salesReturn.returnReason}
Settlement Action : ${salesReturn.returnType}
------------------------------------------------
RETURNED PRODUCTS:
------------------------------------------------
${salesReturn.items
  .map(
    (item, i) =>
      `${i + 1}. ${item.productName} [Condition: ${item.condition}]
   Qty: ${item.quantity} | Unit Price: ₦${item.unitPrice.toLocaleString()} | Subtotal: ₦${item.subtotal.toLocaleString()}${
        item.replacementProductName ? `\n   Replaced with: ${item.replacementProductName}` : ''
      }`
  )
  .join('\n')}
------------------------------------------------
FINANCIAL SUMMARY:
------------------------------------------------
Total Return Value : ₦${salesReturn.totalReturnValue.toLocaleString()}
Refund / Credit    : ₦${salesReturn.refundAmount.toLocaleString()}
Submitted By       : ${salesReturn.submittedByUserName}
Approved By        : ${salesReturn.approvedByUserName || 'Pending Manager Approval'}
================================================
Royal Agro Management System • Official Return Control Document
================================================`;

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Return_Voucher_${salesReturn.returnNo}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case 'WRONG_PRODUCT': return 'Wrong Product Delivered';
      case 'DAMAGED_PRODUCT': return 'Damaged Product';
      case 'EXPIRED_PRODUCT': return 'Expired Product';
      case 'DEFECTIVE_PRODUCT': return 'Defective Product';
      case 'WRONG_QUANTITY': return 'Wrong Quantity Received';
      case 'CUSTOMER_REQUEST': return 'Customer Request';
      default: return 'Other / Miscellaneous';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'REFUND': return 'Cash / Bank Refund';
      case 'REPLACE': return 'Product Replacement';
      case 'STORE_CREDIT': return 'Store Credit Issued';
      case 'REDUCE_CREDIT': return 'Reduced Outstanding Debt';
      default: return type;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden my-8 animate-in fade-in zoom-in-95 print:shadow-none print:border-none print:m-0 print:w-full print:max-w-none">
        
        {/* Modal Action Header (Hidden in Print) */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm">Official Sales Return Voucher</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Download className="w-4 h-4" /> Download Voucher
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4" /> Print Return Receipt
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div className="p-6 md:p-8 space-y-6 text-slate-800 font-sans print:p-0">
          
          {/* Header & Logo */}
          <div className="text-center border-b border-slate-200 pb-5">
            <div className="inline-block bg-emerald-950 text-amber-400 px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest mb-1">
              Royal Agro Management System
            </div>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">SALES RETURN VOUCHER</h1>
            <p className="text-xs text-slate-600 font-medium mt-1">
              📍 {branch ? branch.name : salesReturn.branchName}
            </p>
            {branch?.address && (
              <p className="text-[11px] text-slate-500">{branch.address}</p>
            )}
          </div>

          {/* Status Badge */}
          <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Return Voucher No.</p>
              <p className="font-extrabold text-sm text-slate-900">{salesReturn.returnNo}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold text-slate-400">Original Invoice No.</p>
              <p className="font-extrabold text-sm text-emerald-700">#{salesReturn.receiptNo}</p>
            </div>
            <div className="text-right">
              <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                salesReturn.status === 'APPROVED' || salesReturn.status === 'COMPLETED'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : salesReturn.status === 'REJECTED'
                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}>
                {salesReturn.status}
              </span>
            </div>
          </div>

          {/* Customer & Return Meta */}
          <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
            <div>
              <p className="text-slate-400 text-[10px] uppercase font-bold">Customer Details</p>
              <p className="font-extrabold text-slate-900 text-xs mt-0.5">{salesReturn.customerName}</p>
              {salesReturn.customerPhone && (
                <p className="text-slate-600 text-[11px]">{salesReturn.customerPhone}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-slate-400 text-[10px] uppercase font-bold">Return Date & Time</p>
              <p className="font-bold text-slate-800 mt-0.5">{salesReturn.returnDate}</p>
              <p className="text-[10px] text-slate-500">Log: {salesReturn.createdAt}</p>
            </div>
          </div>

          {/* Summary Meta: Reason & Action */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl">
              <p className="text-[10px] uppercase font-bold text-amber-800">Return Reason</p>
              <p className="font-bold text-amber-950 mt-0.5">{getReasonLabel(salesReturn.returnReason)}</p>
            </div>
            <div className="p-3 bg-blue-50/80 border border-blue-200/80 rounded-xl text-right">
              <p className="text-[10px] uppercase font-bold text-blue-800">Return Action / Settlement</p>
              <p className="font-bold text-blue-950 mt-0.5">{getTypeLabel(salesReturn.returnType)}</p>
            </div>
          </div>

          {/* Items Table */}
          <div>
            <p className="text-xs font-extrabold text-slate-900 uppercase tracking-wider mb-2">Returned Products List</p>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5">Product</th>
                    <th className="p-2.5 text-center">Condition</th>
                    <th className="p-2.5 text-center">Qty</th>
                    <th className="p-2.5 text-right">Unit Price</th>
                    <th className="p-2.5 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {salesReturn.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-2.5 font-bold text-slate-900">
                        {item.productName}
                        {item.replacementProductName && (
                          <div className="text-[10px] text-blue-700 font-normal mt-0.5">
                            🔄 Replaced with: {item.replacementProductName}
                          </div>
                        )}
                      </td>
                      <td className="p-2.5 text-center font-semibold">
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                          item.condition === 'GOOD'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {item.condition}
                        </span>
                      </td>
                      <td className="p-2.5 text-center font-extrabold">{item.quantity}</td>
                      <td className="p-2.5 text-right text-slate-600">₦{item.unitPrice.toLocaleString()}</td>
                      <td className="p-2.5 text-right font-extrabold text-slate-900">₦{item.subtotal.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Totals */}
          <div className="border-t-2 border-slate-800 pt-4 space-y-1 text-xs">
            <div className="flex justify-between font-bold text-slate-700">
              <span>Total Value of Returned Goods:</span>
              <span>₦{salesReturn.totalReturnValue.toLocaleString()}</span>
            </div>

            {salesReturn.returnType === 'REFUND' && (
              <div className="flex justify-between font-black text-emerald-700 text-sm pt-1">
                <span>Refund Amount Paid:</span>
                <span>₦{salesReturn.refundAmount.toLocaleString()}</span>
              </div>
            )}

            {salesReturn.returnType === 'STORE_CREDIT' && (
              <div className="flex justify-between font-black text-blue-700 text-sm pt-1">
                <span>Store Credit Credited:</span>
                <span>₦{salesReturn.totalReturnValue.toLocaleString()}</span>
              </div>
            )}

            {salesReturn.returnType === 'REDUCE_CREDIT' && (
              <div className="flex justify-between font-black text-amber-700 text-sm pt-1">
                <span>Outstanding Debt Reduced:</span>
                <span>₦{salesReturn.totalReturnValue.toLocaleString()}</span>
              </div>
            )}
          </div>

          {salesReturn.notes && (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600">
              <span className="font-bold text-slate-800 block mb-0.5">Manager Notes / Remarks:</span>
              {salesReturn.notes}
            </div>
          )}

          {/* Audit Signatures */}
          <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-[11px] text-slate-600">
            <div>
              <p className="text-slate-400 font-medium">Submitted By:</p>
              <p className="font-bold text-slate-900">{salesReturn.submittedByUserName}</p>
              <div className="mt-8 border-b border-slate-300 w-36"></div>
              <p className="text-[10px] text-slate-400 mt-0.5">Staff Signature</p>
            </div>
            <div className="text-right">
              <p className="text-slate-400 font-medium">Authorized / Approved By:</p>
              <p className="font-bold text-slate-900">{salesReturn.approvedByUserName || 'Pending Manager Approval'}</p>
              <div className="mt-8 border-b border-slate-300 w-36 ml-auto"></div>
              <p className="text-[10px] text-slate-400 mt-0.5">Manager Authorization Signature</p>
            </div>
          </div>

          {/* Footer Notice */}
          <div className="text-center text-[10px] text-slate-400 pt-2 border-t border-slate-100">
            Royal Agro Management System • Official Inventory & Return Control Document
          </div>

        </div>

        {/* Footer Action Bar (Hidden in Print) */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between print:hidden">
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" /> Download Voucher
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold shadow-sm transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
