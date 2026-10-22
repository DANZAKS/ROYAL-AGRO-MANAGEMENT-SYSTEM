import React from 'react';
import { X, Printer, Download, CheckCircle2, Sprout, Building2 } from 'lucide-react';
import { Sale, Branch, CompanySettings } from '../../types';
import { renderCode128Svg } from '../../services/barcodeService';

interface ReceiptModalProps {
  sale: Sale | null;
  branch?: Branch;
  companySettings?: CompanySettings;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  sale,
  branch,
  companySettings,
  onClose
}) => {
  if (!sale) return null;

  const companyName = companySettings?.companyName || 'ROYAL AGRO SEEDS & AGRO';
  const tagline = companySettings?.tagline || 'Central Agro Management System';
  const currencySymbol = companySettings?.currencySymbol || '₦';
  const branchName = branch ? branch.name : sale.branchName;
  const branchAddress = branch?.address || companySettings?.headOfficeAddress || 'Royal Agro Commercial Depot';
  const branchPhone = branch?.phone || companySettings?.phone || '+234 803 000 0000';
  const footerNote = companySettings?.receiptFooter || 'Thank you for choosing Royal Agro Certified Seeds & Inputs!';
  const showBarcode = companySettings?.enableBarcodeReceipt !== false;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const textContent = `================================================
${companyName.toUpperCase()}
${tagline}
Official Sales Transaction Receipt
================================================
Receipt No     : ${sale.receiptNo}
Date & Time    : ${sale.date}
Branch         : ${branchName}
Branch Address : ${branchAddress}
Contact Phone  : ${branchPhone}
Cashier Staff  : ${sale.staffName}
Payment Method : ${sale.paymentMethod}
Customer Name  : ${sale.customerName || 'N/A'} ${sale.customerPhone ? `(${sale.customerPhone})` : ''}
${companySettings?.taxIdentificationNumber ? `Tax TIN No     : ${companySettings.taxIdentificationNumber}\n` : ''}------------------------------------------------
PURCHASED ITEMS:
------------------------------------------------
${sale.items
  .map(
    (item, i) =>
      `${i + 1}. ${item.productName} (SKU: ${item.sku})
   Qty: ${item.quantity} ${item.unit} | Unit Price: ${currencySymbol}${item.unitPrice.toLocaleString()} | Subtotal: ${currencySymbol}${item.subtotal.toLocaleString()}`
  )
  .join('\n')}
------------------------------------------------
FINANCIAL BREAKDOWN:
------------------------------------------------
Subtotal            : ${currencySymbol}${sale.subtotal.toLocaleString()}
Discount Applied    : -${currencySymbol}${sale.discount.toLocaleString()}
TOTAL INVOICE VALUE : ${currencySymbol}${sale.totalAmount.toLocaleString()}
Amount Paid Now     : ${currencySymbol}${(sale.amountPaid ?? sale.totalAmount).toLocaleString()}
${
  (sale.balanceDue ?? 0) > 0
    ? `Balance Due (Credit): ${currencySymbol}${(sale.balanceDue ?? 0).toLocaleString()}\nCredit Due Date     : ${sale.creditDueDate || 'N/A'}\n`
    : ''
}================================================
${companySettings?.receiptHeader ? `${companySettings.receiptHeader}\n` : ''}${footerNote}
Goods received in good condition are non-refundable after 48 hours.
================================================`;

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Receipt_${sale.receiptNo}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
              onClick={handleDownload}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Download className="w-4 h-4" /> Download
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
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
              <Sprout className="w-6 h-6 text-amber-500" /> {companyName}
            </div>
            <p className="font-sans text-[11px] font-bold text-slate-800 uppercase tracking-widest">
              {tagline}
            </p>
            {companySettings?.registrationNumber && (
              <p className="font-sans text-[10px] text-slate-500 font-medium">
                RC: {companySettings.registrationNumber} {companySettings.taxIdentificationNumber && `• TIN: ${companySettings.taxIdentificationNumber}`}
              </p>
            )}
            {(sale.paymentMethod === 'CREDIT' || (sale.balanceDue ?? 0) > 0) && (
              <div className="my-2 py-1 px-3 bg-amber-100 border-2 border-amber-500 rounded-lg text-amber-900 font-extrabold text-sm uppercase tracking-wider inline-block">
                *** CREDIT SALE ***
              </div>
            )}
            <p className="font-sans text-xs text-slate-600 font-semibold mt-1">
              📍 {branchName}
            </p>
            <p className="font-sans text-[11px] text-slate-500">
              {branchAddress} • Tel: {branchPhone}
            </p>
            {companySettings?.receiptHeader && (
              <p className="font-sans text-[10px] text-slate-600 italic mt-1 pt-1 border-t border-slate-100">
                {companySettings.receiptHeader}
              </p>
            )}
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
                    <td className="py-1.5 text-right font-sans">{currencySymbol}{item.unitPrice.toLocaleString()}</td>
                    <td className="py-1.5 text-right font-extrabold font-sans">{currencySymbol}{item.subtotal.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Breakdown */}
          <div className="space-y-1 text-right text-[11px] font-sans pt-1">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span>{currencySymbol}{sale.subtotal.toLocaleString()}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-rose-600 font-semibold">
                <span>Discount Applied:</span>
                <span>-{currencySymbol}{sale.discount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-2 border-t border-slate-300">
              <span>Total Invoice Amount:</span>
              <span className="text-slate-900">{currencySymbol}{sale.totalAmount.toLocaleString()}</span>
            </div>

            <div className="flex justify-between text-emerald-800 font-bold pt-1">
              <span>Amount Paid Now:</span>
              <span>{currencySymbol}{(sale.amountPaid ?? sale.totalAmount).toLocaleString()}</span>
            </div>

            {(sale.balanceDue ?? 0) > 0 && (
              <div className="flex justify-between text-rose-700 font-extrabold pt-1">
                <span>Balance Due / Outstanding Credit:</span>
                <span className="bg-rose-100 px-1.5 py-0.5 rounded text-rose-900">{currencySymbol}{(sale.balanceDue ?? 0).toLocaleString()}</span>
              </div>
            )}

            {sale.creditDueDate && (sale.balanceDue ?? 0) > 0 && (
              <div className="flex justify-between text-amber-800 font-bold text-[10px] pt-0.5">
                <span>Credit Payment Due Date:</span>
                <span>{sale.creditDueDate}</span>
              </div>
            )}
          </div>

          {/* Barcode & Stamp */}
          <div className="text-center pt-4 border-t border-dashed border-slate-300 space-y-2">
            {showBarcode && (
              <div
                className="py-1 flex items-center justify-center overflow-hidden"
                dangerouslySetInnerHTML={{
                  __html: renderCode128Svg(sale.receiptNo, {
                    height: 36,
                    barWidth: 1.3,
                    showText: true,
                    fontSize: 10
                  })
                }}
              />
            )}
            <p className="font-sans text-[10px] text-slate-600 font-semibold">
              {footerNote}
            </p>
            <p className="font-sans text-[9px] text-slate-400 italic">
              Goods received in good condition are non-refundable after 48 hours.
            </p>
          </div>
        </div>

        {/* Footer Action Buttons */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between print:hidden">
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" /> Download Receipt
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
