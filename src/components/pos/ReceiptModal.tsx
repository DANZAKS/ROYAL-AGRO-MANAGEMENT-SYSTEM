import React from 'react';
import { X, Printer, Download, CheckCircle2, Sprout, Building2 } from 'lucide-react';
import { Sale, Branch } from '../../types';

interface ReceiptModalProps {
  sale: Sale | null;
  branch?: Branch;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ sale, branch, onClose }) => {
  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 my-8">
        {/* Header Action Bar (Hidden when printing) */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-sm">Sale Completed • Official Receipt</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-4 h-4" /> Print
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Thermal/Standard Receipt Body */}
        <div id="printable-receipt" className="p-6 sm:p-8 bg-white text-slate-900 font-mono text-xs space-y-4">
          {/* Company Brand Logo & Header */}
          <div className="text-center border-b border-dashed border-slate-300 pb-4">
            <div className="flex items-center justify-center gap-2 text-emerald-800 font-extrabold text-lg tracking-tight mb-1">
              <Sprout className="w-6 h-6 text-amber-500" /> ROYAL AGRO SEEDS & AGRO
            </div>
            <p className="font-sans text-[11px] font-bold text-slate-800 uppercase tracking-widest">
              Central Agro Management System
            </p>
            <p className="font-sans text-xs text-slate-600 font-semibold mt-1">
              📍 {branch ? branch.name : sale.branchName}
            </p>
            <p className="font-sans text-[11px] text-slate-500">
              {branch?.address || 'Royal Agro Commercial Depot'} • Tel: {branch?.phone || '+234 803 000 0000'}
            </p>
          </div>

          {/* Transaction Metadata */}
          <div className="grid grid-cols-2 gap-2 text-[11px] py-1 border-b border-dashed border-slate-300">
            <div>
              <span className="text-slate-500">Receipt No:</span>
              <p className="font-bold text-slate-900">{sale.receiptNo}</p>
            </div>
            <div className="text-right">
              <span className="text-slate-500">Date & Time:</span>
              <p className="font-bold text-slate-900">{sale.date}</p>
            </div>
            <div>
              <span className="text-slate-500">Cashier Staff:</span>
              <p className="font-semibold text-slate-800">{sale.staffName}</p>
            </div>
            <div className="text-right">
              <span className="text-slate-500">Payment Method:</span>
              <p className="font-bold text-emerald-700">{sale.paymentMethod}</p>
            </div>
            {sale.customerName && (
              <div className="col-span-2 pt-1">
                <span className="text-slate-500">Customer:</span>
                <p className="font-bold text-slate-900">{sale.customerName} {sale.customerPhone && `(${sale.customerPhone})`}</p>
              </div>
            )}
          </div>

          {/* Items Purchased Table */}
          <div className="py-2 border-b border-dashed border-slate-300">
            <table className="w-full text-left">
              <thead>
                <tr className="text-slate-500 text-[10px] uppercase border-b border-slate-200">
                  <th className="pb-1">Item Description</th>
                  <th className="pb-1 text-center">Qty</th>
                  <th className="pb-1 text-right">Price</th>
                  <th className="pb-1 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sale.items.map((item, idx) => (
                  <tr key={idx} className="text-[11px]">
                    <td className="py-1.5 pr-2">
                      <p className="font-bold text-slate-900">{item.productName}</p>
                      <p className="text-[9px] text-slate-500 font-sans">SKU: {item.sku} ({item.unit})</p>
                    </td>
                    <td className="py-1.5 text-center font-bold">{item.quantity}</td>
                    <td className="py-1.5 text-right font-sans">₦{item.unitPrice.toLocaleString()}</td>
                    <td className="py-1.5 text-right font-extrabold font-sans">₦{item.subtotal.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Breakdown */}
          <div className="space-y-1 text-right text-[11px] font-sans pt-1">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span>₦{sale.subtotal.toLocaleString()}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-rose-600 font-semibold">
                <span>Discount Applied:</span>
                <span>-₦{sale.discount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-2 border-t border-slate-300">
              <span>Total Amount Paid:</span>
              <span className="text-emerald-700">₦{sale.totalAmount.toLocaleString()}</span>
            </div>
          </div>

          {/* Barcode & Stamp */}
          <div className="text-center pt-4 border-t border-dashed border-slate-300 space-y-2">
            <div className="bg-slate-100 p-2 rounded-lg font-mono tracking-widest text-[10px] text-slate-700 inline-block font-bold">
              ||| | ||||| || ||| |||| || |||| | ||
            </div>
            <p className="font-sans text-[10px] text-slate-500 font-semibold">
              Thank you for choosing Royal Agro Certified Seeds & Inputs!
            </p>
            <p className="font-sans text-[9px] text-slate-400 italic">
              Goods received in good condition are non-refundable after 48 hours.
            </p>
          </div>
        </div>

        {/* Footer Close Button */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-right print:hidden">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
