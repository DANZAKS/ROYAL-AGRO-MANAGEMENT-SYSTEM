import React, { useState } from 'react';
import {
  FileText,
  Save,
  CheckCircle2,
  AlertCircle,
  Eye,
  Hash,
  Printer,
  QrCode,
  Barcode,
  Building2,
  Phone,
  MapPin,
  Sparkles
} from 'lucide-react';
import { CompanySettings, BusinessRulesSettings, User } from '../../types';

interface ReceiptNumberingTabProps {
  companySettings: CompanySettings;
  businessRules: BusinessRulesSettings;
  currentUser: User;
  onSaveCompanySettings: (updated: CompanySettings, changeNote: string) => void;
  onSaveBusinessRules: (updated: BusinessRulesSettings, changeNote: string) => void;
}

export const ReceiptNumberingTab: React.FC<ReceiptNumberingTabProps> = ({
  companySettings,
  businessRules,
  currentUser,
  onSaveCompanySettings,
  onSaveBusinessRules
}) => {
  const [headerText, setHeaderText] = useState(companySettings.receiptHeader);
  const [footerText, setFooterText] = useState(companySettings.receiptFooter);
  const [enableBarcode, setEnableBarcode] = useState(companySettings.enableBarcodeReceipt !== false);
  const [enableQr, setEnableQr] = useState(companySettings.enableQrReceipt !== false);

  const [recPrefix, setRecPrefix] = useState(businessRules.receiptNumberPrefix || 'REC-');
  const [invPrefix, setInvPrefix] = useState(businessRules.invoiceNumberPrefix || 'INV-');
  const [trfPrefix, setTrfPrefix] = useState(businessRules.transferNumberPrefix || 'TRF-');
  const [poPrefix, setPoPrefix] = useState(businessRules.purchaseOrderPrefix || 'PO-');
  const [grnPrefix, setGrnPrefix] = useState(businessRules.goodsReceiptPrefix || 'GRN-');
  const [crdPrefix, setCrdPrefix] = useState(businessRules.creditReferencePrefix || 'CRD-');
  const [retPrefix, setRetPrefix] = useState(businessRules.returnReferencePrefix || 'RET-');
  const [opnPrefix, setOpnPrefix] = useState(businessRules.openingStockPrefix || 'OPN-');

  const [previewMode, setPreviewMode] = useState<'THERMAL' | 'A4'>('THERMAL');
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCEO = currentUser.role === 'CEO';

  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCEO) {
      setError('Only CEO / Super Administrator can modify receipt templates and numbering formats.');
      return;
    }

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    onSaveCompanySettings(
      {
        ...companySettings,
        receiptHeader: headerText.trim(),
        receiptFooter: footerText.trim(),
        enableBarcodeReceipt: enableBarcode,
        enableQrReceipt: enableQr,
        updatedAt: now,
        updatedByUserId: currentUser.id,
        updatedByUserName: currentUser.name
      },
      'Updated official receipt header, footer notes, and barcode layout.'
    );

    onSaveBusinessRules(
      {
        ...businessRules,
        receiptNumberPrefix: recPrefix.trim().toUpperCase(),
        invoiceNumberPrefix: invPrefix.trim().toUpperCase(),
        transferNumberPrefix: trfPrefix.trim().toUpperCase(),
        purchaseOrderPrefix: poPrefix.trim().toUpperCase(),
        goodsReceiptPrefix: grnPrefix.trim().toUpperCase(),
        creditReferencePrefix: crdPrefix.trim().toUpperCase(),
        returnReferencePrefix: retPrefix.trim().toUpperCase(),
        openingStockPrefix: opnPrefix.trim().toUpperCase(),
        updatedAt: now,
        updatedByUserId: currentUser.id,
        updatedByUserName: currentUser.name
      },
      'Updated transaction numbering prefixes and document reference formats.'
    );

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 4000);
  };

  const sampleReceiptNo = `${recPrefix}2026-00842`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Settings Form Column */}
      <form onSubmit={handleSaveAll} className="lg:col-span-7 space-y-6">
        {/* Banner */}
        {isSaved && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-semibold text-sm">Receipt & Numbering Formats Saved!</p>
              <p className="text-xs text-emerald-700">
                Live printouts, POS receipts, and invoices will use these headers and sequence formats.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-800 animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Transaction Reference Prefixes */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-stone-100 bg-stone-50/70 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <Hash className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-base">Transaction & Document Prefixes</h3>
              <p className="text-xs text-stone-500">Configure standard reference prefix tags across ERP documents</p>
            </div>
          </div>

          <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-stone-700 mb-1 uppercase tracking-wider">
                Sales Receipt
              </label>
              <input
                type="text"
                disabled={!isCEO}
                value={recPrefix}
                onChange={(e) => setRecPrefix(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-stone-900 font-mono font-bold text-xs focus:ring-2 focus:ring-emerald-500 disabled:bg-stone-100"
                placeholder="REC-"
              />
              <span className="text-[10px] text-stone-400 font-mono mt-0.5 block">{recPrefix}00123</span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-stone-700 mb-1 uppercase tracking-wider">
                Commercial Invoice
              </label>
              <input
                type="text"
                disabled={!isCEO}
                value={invPrefix}
                onChange={(e) => setInvPrefix(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-stone-900 font-mono font-bold text-xs focus:ring-2 focus:ring-emerald-500 disabled:bg-stone-100"
                placeholder="INV-"
              />
              <span className="text-[10px] text-stone-400 font-mono mt-0.5 block">{invPrefix}00456</span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-stone-700 mb-1 uppercase tracking-wider">
                Stock Transfer
              </label>
              <input
                type="text"
                disabled={!isCEO}
                value={trfPrefix}
                onChange={(e) => setTrfPrefix(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-stone-900 font-mono font-bold text-xs focus:ring-2 focus:ring-emerald-500 disabled:bg-stone-100"
                placeholder="TRF-"
              />
              <span className="text-[10px] text-stone-400 font-mono mt-0.5 block">{trfPrefix}00789</span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-stone-700 mb-1 uppercase tracking-wider">
                Purchase Order
              </label>
              <input
                type="text"
                disabled={!isCEO}
                value={poPrefix}
                onChange={(e) => setPoPrefix(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-stone-900 font-mono font-bold text-xs focus:ring-2 focus:ring-emerald-500 disabled:bg-stone-100"
                placeholder="PO-"
              />
              <span className="text-[10px] text-stone-400 font-mono mt-0.5 block">{poPrefix}00101</span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-stone-700 mb-1 uppercase tracking-wider">
                Goods Receipt (GRN)
              </label>
              <input
                type="text"
                disabled={!isCEO}
                value={grnPrefix}
                onChange={(e) => setGrnPrefix(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-stone-900 font-mono font-bold text-xs focus:ring-2 focus:ring-emerald-500 disabled:bg-stone-100"
                placeholder="GRN-"
              />
              <span className="text-[10px] text-stone-400 font-mono mt-0.5 block">{grnPrefix}00302</span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-stone-700 mb-1 uppercase tracking-wider">
                Credit Ref
              </label>
              <input
                type="text"
                disabled={!isCEO}
                value={crdPrefix}
                onChange={(e) => setCrdPrefix(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-stone-900 font-mono font-bold text-xs focus:ring-2 focus:ring-emerald-500 disabled:bg-stone-100"
                placeholder="CRD-"
              />
              <span className="text-[10px] text-stone-400 font-mono mt-0.5 block">{crdPrefix}00503</span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-stone-700 mb-1 uppercase tracking-wider">
                Sales Return
              </label>
              <input
                type="text"
                disabled={!isCEO}
                value={retPrefix}
                onChange={(e) => setRetPrefix(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-stone-900 font-mono font-bold text-xs focus:ring-2 focus:ring-emerald-500 disabled:bg-stone-100"
                placeholder="RET-"
              />
              <span className="text-[10px] text-stone-400 font-mono mt-0.5 block">{retPrefix}00604</span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-stone-700 mb-1 uppercase tracking-wider">
                Opening Stock
              </label>
              <input
                type="text"
                disabled={!isCEO}
                value={opnPrefix}
                onChange={(e) => setOpnPrefix(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-stone-900 font-mono font-bold text-xs focus:ring-2 focus:ring-emerald-500 disabled:bg-stone-100"
                placeholder="OPN-"
              />
              <span className="text-[10px] text-stone-400 font-mono mt-0.5 block">{opnPrefix}00805</span>
            </div>
          </div>
        </div>

        {/* Receipt Header & Footer Copy */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-stone-100 bg-stone-50/70 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-base">Receipt Header & Policy Footer</h3>
              <p className="text-xs text-stone-500">Official text, refund policies, and seed guarantee disclaimers</p>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1 uppercase tracking-wider">
                Receipt Header Text (Appears at top of thermal receipt)
              </label>
              <textarea
                rows={3}
                disabled={!isCEO}
                value={headerText}
                onChange={(e) => setHeaderText(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 text-stone-900 font-mono text-xs focus:ring-2 focus:ring-emerald-500 disabled:bg-stone-100"
                placeholder="ROYAL AGRO ALLIED SERVICES LTD&#10;Official Sales Receipt"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1 uppercase tracking-wider">
                Receipt Footer Text (Warranty, Return Policy & Disclaimers)
              </label>
              <textarea
                rows={3}
                disabled={!isCEO}
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 text-stone-900 font-mono text-xs focus:ring-2 focus:ring-emerald-500 disabled:bg-stone-100"
                placeholder="Thank you for choosing Royal Agro Certified Seeds & Inputs!&#10;Goods in good condition cannot be returned after 48 hours."
              />
            </div>

            <div className="pt-2 border-t border-stone-100 flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!isCEO}
                  checked={enableBarcode}
                  onChange={(e) => setEnableBarcode(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                  <Barcode className="w-4 h-4 text-stone-500" /> Print Code-128 Barcode on Receipt
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!isCEO}
                  checked={enableQr}
                  onChange={(e) => setEnableQr(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-stone-500" /> Print Digital Verification QR
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Submit */}
        {isCEO && (
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
            >
              <Save className="w-4 h-4" /> Save Receipt & Numbering Settings
            </button>
          </div>
        )}
      </form>

      {/* Live Preview Column */}
      <div className="lg:col-span-5 space-y-4">
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-emerald-700" />
            <h4 className="font-bold text-stone-900 text-xs uppercase tracking-wider">Live Receipt Preview</h4>
          </div>

          <div className="flex items-center bg-stone-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setPreviewMode('THERMAL')}
              className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${
                previewMode === 'THERMAL' ? 'bg-white shadow-xs text-stone-900' : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              80mm Thermal POS
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode('A4')}
              className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${
                previewMode === 'A4' ? 'bg-white shadow-xs text-stone-900' : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              A4 Standard Invoice
            </button>
          </div>
        </div>

        {/* Thermal Receipt Simulator */}
        {previewMode === 'THERMAL' ? (
          <div className="bg-stone-50 p-6 rounded-2xl border border-stone-300 flex justify-center">
            <div className="w-80 bg-white shadow-lg border border-stone-200 p-5 rounded-md font-mono text-xs text-stone-800 space-y-3">
              {/* Header */}
              <div className="text-center border-b border-dashed border-stone-300 pb-3">
                <div className="flex justify-center mb-1">
                  <Building2 className="w-6 h-6 text-emerald-800" />
                </div>
                <p className="font-bold text-sm whitespace-pre-line leading-tight text-stone-900">
                  {headerText || companySettings.companyName}
                </p>
                <p className="text-[10px] text-stone-500 mt-1">
                  {companySettings.headOfficeAddress} • {companySettings.phone}
                </p>
              </div>

              {/* Meta */}
              <div className="space-y-0.5 text-[11px] border-b border-dashed border-stone-300 pb-2">
                <div className="flex justify-between">
                  <span className="text-stone-500">Receipt No:</span>
                  <span className="font-bold text-stone-900">{sampleReceiptNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Date/Time:</span>
                  <span>{new Date().toISOString().replace('T', ' ').slice(0, 16)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Branch:</span>
                  <span>Kano Central Hub</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Cashier:</span>
                  <span>Amina Yusuf</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Customer:</span>
                  <span>Alh. Ibrahim Kano</span>
                </div>
              </div>

              {/* Items */}
              <div className="space-y-1.5 border-b border-dashed border-stone-300 pb-3 text-[11px]">
                <div className="flex justify-between font-bold text-stone-700 text-[10px]">
                  <span>ITEM / QTY</span>
                  <span>AMOUNT</span>
                </div>
                <div className="flex justify-between">
                  <div>
                    <p className="font-bold text-stone-900">Hybrid Maize SC719</p>
                    <p className="text-[10px] text-stone-500">2 Bags @ ₦38,500</p>
                  </div>
                  <span className="font-bold">₦77,000</span>
                </div>
                <div className="flex justify-between">
                  <div>
                    <p className="font-bold text-stone-900">NPK 20-10-10 Granular</p>
                    <p className="text-[10px] text-stone-500">1 Bag @ ₦33,000</p>
                  </div>
                  <span className="font-bold">₦33,000</span>
                </div>
              </div>

              {/* Totals */}
              <div className="space-y-1 text-xs border-b border-dashed border-stone-300 pb-3">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₦110,000.00</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Discount:</span>
                  <span>-₦2,500.00</span>
                </div>
                {companySettings.taxEnabled && (
                  <div className="flex justify-between text-stone-600">
                    <span>VAT (7.5%):</span>
                    <span>₦8,062.50</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm text-stone-900 pt-1 border-t border-stone-200">
                  <span>TOTAL PAID:</span>
                  <span>₦107,500.00</span>
                </div>
                <div className="flex justify-between text-[11px] text-emerald-700">
                  <span>Method:</span>
                  <span>CASH / VERIFIED</span>
                </div>
              </div>

              {/* Barcode & QR Simulator */}
              <div className="flex flex-col items-center justify-center gap-2 py-1">
                {enableBarcode && (
                  <div className="text-center">
                    <div className="h-9 w-48 bg-stone-900 flex items-center justify-center text-white text-[9px] tracking-widest rounded-xs">
                      ||| | |||| | |||||| || | ||
                    </div>
                    <span className="text-[9px] text-stone-500 font-mono">{sampleReceiptNo}</span>
                  </div>
                )}
                {enableQr && (
                  <div className="p-2 border border-stone-300 rounded-md bg-stone-50 text-center">
                    <QrCode className="w-10 h-10 text-stone-800 mx-auto" />
                    <span className="text-[9px] text-stone-500 block mt-0.5">Scan to Verify Authenticity</span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="text-center pt-2 text-[10px] text-stone-500 whitespace-pre-line leading-relaxed">
                {footerText || companySettings.receiptFooter}
              </div>
            </div>
          </div>
        ) : (
          /* A4 Invoice Preview */
          <div className="bg-white p-6 rounded-xl border border-stone-300 shadow-md text-xs text-stone-800 space-y-4 font-sans">
            <div className="flex justify-between items-start border-b border-stone-200 pb-4">
              <div>
                <h2 className="font-black text-stone-900 text-lg">{companySettings.companyName}</h2>
                <p className="text-stone-500 text-[11px]">{companySettings.tagline}</p>
                <p className="text-stone-500 text-[11px]">{companySettings.headOfficeAddress}</p>
                <p className="text-stone-500 text-[11px] font-mono">TIN: {companySettings.taxIdentificationNumber}</p>
              </div>
              <div className="text-right">
                <span className="text-lg font-black text-emerald-800 block">COMMERCIAL INVOICE</span>
                <span className="font-mono font-bold text-stone-900">{sampleReceiptNo}</span>
                <p className="text-stone-500 text-[11px]">Date: 21/10/2026</p>
              </div>
            </div>

            <div className="p-3 bg-stone-50 rounded-lg text-stone-700 text-xs">
              <p className="font-bold text-stone-900">Billed To:</p>
              <p>Alhaji Ibrahim Danbatta • Danbatta Cooperative Hub, Kano</p>
            </div>

            <table className="w-full text-left text-xs">
              <thead className="border-b border-stone-300 font-bold text-stone-700">
                <tr>
                  <th className="py-2">Item</th>
                  <th className="py-2 text-center">Qty</th>
                  <th className="py-2 text-right">Unit Price</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                <tr>
                  <td className="py-2">Hybrid Maize SC719 Certified Foundation Seed</td>
                  <td className="py-2 text-center">2 Bags</td>
                  <td className="py-2 text-right">₦38,500.00</td>
                  <td className="py-2 text-right font-bold">₦77,000.00</td>
                </tr>
              </tbody>
            </table>

            <div className="border-t border-stone-200 pt-3 flex justify-between items-center font-bold">
              <span>Invoice Total:</span>
              <span className="text-base text-emerald-800">₦77,000.00</span>
            </div>

            <div className="text-[10px] text-stone-500 border-t border-stone-100 pt-3 whitespace-pre-line text-center">
              {footerText}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
