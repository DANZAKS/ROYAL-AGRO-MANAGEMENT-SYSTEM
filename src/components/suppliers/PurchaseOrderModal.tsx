import React, { useState, useEffect } from 'react';
import {
  X,
  Truck,
  Plus,
  Trash2,
  Calendar,
  Building2,
  Boxes,
  FileText,
  DollarSign,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Supplier, Branch, Product, PurchaseOrder, PurchaseOrderItem, User } from '../../types';

interface PurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (po: PurchaseOrder) => void;
  suppliers: Supplier[];
  branches: Branch[];
  products: Product[];
  currentUser: User;
  initialData?: PurchaseOrder | null;
  defaultSupplier?: Supplier | null;
}

interface ItemRow {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  unit: string;
  orderedQuantity: number;
  unitPrice: number;
  discount: number;
  subtotal: number;
  notes: string;
}

export const PurchaseOrderModal: React.FC<PurchaseOrderModalProps> = ({
  isOpen,
  onClose,
  onSave,
  suppliers = [],
  branches = [],
  products = [],
  currentUser,
  initialData,
  defaultSupplier
}) => {
  const [supplierId, setSupplierId] = useState<string>('');
  const [branchId, setBranchId] = useState<string>('');
  const [orderDate, setOrderDate] = useState<string>('');
  const [expectedDate, setExpectedDate] = useState<string>('');
  const [paymentTerms, setPaymentTerms] = useState<string>('Net 30 Days');
  const [notes, setNotes] = useState<string>('');
  const [tax, setTax] = useState<number>(0);
  const [orderDiscount, setOrderDiscount] = useState<number>(0);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (initialData) {
      setSupplierId(initialData.supplierId);
      setBranchId(initialData.branchId);
      setOrderDate(initialData.orderDate);
      setExpectedDate(initialData.expectedDate || '');
      setPaymentTerms(initialData.paymentTerms || 'Net 30 Days');
      setNotes(initialData.notes || '');
      setTax(initialData.tax || 0);
      setOrderDiscount(initialData.discount || 0);
      setItems(
        initialData.items.map((it) => ({
          id: it.id || 'row-' + Math.random().toString(36).substr(2, 9),
          productId: it.productId,
          productName: it.productName,
          productSku: it.productSku,
          unit: it.unit || 'Standard Unit',
          orderedQuantity: it.orderedQuantity || it.quantity,
          unitPrice: it.unitPrice,
          discount: it.discount || 0,
          subtotal: it.subtotal,
          notes: it.notes || ''
        }))
      );
    } else {
      const today = new Date().toISOString().split('T')[0];
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const sup = defaultSupplier || suppliers[0];

      setSupplierId(sup?.id || '');
      setBranchId(currentUser?.branchId || branches[0]?.id || '');
      setOrderDate(today);
      setExpectedDate(nextWeek);
      setPaymentTerms(sup?.creditTerms || 'Net 30 Days');
      setNotes('');
      setTax(0);
      setOrderDiscount(0);

      // Seed 1 default row if products available
      if (products.length > 0) {
        const p = products[0];
        setItems([
          {
            id: 'row-' + Date.now(),
            productId: p.id,
            productName: p.name,
            productSku: p.sku,
            unit: p.unit || 'Standard Unit',
            orderedQuantity: 50,
            unitPrice: p.costPrice || 25000,
            discount: 0,
            subtotal: 50 * (p.costPrice || 25000),
            notes: ''
          }
        ]);
      } else {
        setItems([]);
      }
    }
  }, [initialData, defaultSupplier, isOpen]);

  if (!isOpen) return null;

  // Handle supplier change to update default payment terms
  const handleSupplierChange = (newSupId: string) => {
    setSupplierId(newSupId);
    const sup = suppliers.find((s) => s.id === newSupId);
    if (sup?.creditTerms) {
      setPaymentTerms(sup.creditTerms);
    }
  };

  const handleAddItem = () => {
    if (products.length === 0) return;
    const p = products[0];
    const newRow: ItemRow = {
      id: 'row-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      productId: p.id,
      productName: p.name,
      productSku: p.sku,
      unit: p.unit || 'Standard Unit',
      orderedQuantity: 10,
      unitPrice: p.costPrice || 10000,
      discount: 0,
      subtotal: 10 * (p.costPrice || 10000),
      notes: ''
    };
    setItems((prev) => [...prev, newRow]);
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleProductSelect = (rowId: string, prodId: string) => {
    const prod = products.find((p) => p.id === prodId);
    if (!prod) return;

    setItems((prev) =>
      prev.map((row) => {
        if (row.id === rowId) {
          const cost = prod.costPrice || row.unitPrice || 10000;
          const subtotal = Math.max(0, row.orderedQuantity * cost - row.discount);
          return {
            ...row,
            productId: prod.id,
            productName: prod.name,
            productSku: prod.sku,
            unit: prod.unit || 'Standard Unit',
            unitPrice: cost,
            subtotal
          };
        }
        return row;
      })
    );
  };

  const handleQuantityChange = (rowId: string, qty: number) => {
    const validQty = Math.max(1, qty || 0);
    setItems((prev) =>
      prev.map((row) => {
        if (row.id === rowId) {
          const subtotal = Math.max(0, validQty * row.unitPrice - row.discount);
          return {
            ...row,
            orderedQuantity: validQty,
            subtotal
          };
        }
        return row;
      })
    );
  };

  const handleUnitPriceChange = (rowId: string, price: number) => {
    const validPrice = Math.max(0, price || 0);
    setItems((prev) =>
      prev.map((row) => {
        if (row.id === rowId) {
          const subtotal = Math.max(0, row.orderedQuantity * validPrice - row.discount);
          return {
            ...row,
            unitPrice: validPrice,
            subtotal
          };
        }
        return row;
      })
    );
  };

  const handleRowNotesChange = (rowId: string, notesVal: string) => {
    setItems((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, notes: notesVal } : row))
    );
  };

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const totalAmount = Math.max(0, subtotal + tax - orderDiscount);

  const handleSubmit = (targetStatus: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED') => {
    setErrorMessage('');

    if (!supplierId) {
      setErrorMessage('Please select an accredited supplier.');
      return;
    }
    if (!branchId) {
      setErrorMessage('Please select a receiving destination branch.');
      return;
    }
    if (items.length === 0) {
      setErrorMessage('Please add at least one line item to this purchase order.');
      return;
    }

    const sup = suppliers.find((s) => s.id === supplierId);
    const branch = branches.find((b) => b.id === branchId);

    const poNumber =
      initialData?.orderNo ||
      `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const isCEO = currentUser?.role === 'CEO';
    const isManager = currentUser?.role === 'BRANCH_MANAGER';

    // If CEO creates it or user chooses APPROVED and has rights
    let finalStatus = targetStatus;
    if (targetStatus === 'APPROVED' && !isCEO && !isManager) {
      finalStatus = 'PENDING_APPROVAL';
    }

    const poItems: PurchaseOrderItem[] = items.map((it) => ({
      id: it.id,
      productId: it.productId,
      productName: it.productName,
      productSku: it.productSku,
      unit: it.unit,
      orderedQuantity: it.orderedQuantity,
      quantity: it.orderedQuantity,
      receivedQuantity: 0,
      unitPrice: it.unitPrice,
      discount: it.discount,
      subtotal: it.subtotal,
      notes: it.notes
    }));

    const po: PurchaseOrder = {
      id: initialData?.id || 'po-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
      orderNo: poNumber,
      supplierId,
      supplierName: sup?.companyName || 'Supplier',
      branchId,
      branchName: branch?.name || 'Destination Branch',
      items: poItems,
      subtotal,
      discount: orderDiscount,
      tax,
      totalAmount,
      orderDate: orderDate || new Date().toISOString().split('T')[0],
      expectedDate: expectedDate || undefined,
      status: finalStatus,
      createdByUserId: initialData?.createdByUserId || currentUser?.id || 'usr-1',
      createdByUserName: initialData?.createdByUserName || currentUser?.name || 'Authorized Staff',
      approvedByUserId: finalStatus === 'APPROVED' ? currentUser?.id : undefined,
      approvedByUserName: finalStatus === 'APPROVED' ? currentUser?.name : undefined,
      approvedAt: finalStatus === 'APPROVED' ? new Date().toISOString().replace('T', ' ').slice(0, 16) : undefined,
      paymentTerms,
      notes,
      createdAt: initialData?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSave(po);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-slate-200 overflow-hidden my-6 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">
                {initialData ? `Edit Purchase Order #${initialData.orderNo}` : 'Generate Purchase Order (PO)'}
              </h2>
              <p className="text-xs text-slate-300">
                Official requisition for seeds, agrochemicals, and inputs from accredited suppliers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Supplier & Destination Branch Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Supplier <span className="text-rose-500">*</span>
              </label>
              <select
                value={supplierId}
                onChange={(e) => handleSupplierChange(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden font-semibold text-slate-800"
              >
                <option value="">-- Choose Supplier --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.companyName} {s.state ? `(${s.state})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Receiving Branch Depot <span className="text-rose-500">*</span>
              </label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden font-semibold text-slate-800"
              >
                <option value="">-- Choose Receiving Branch --</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.state})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Terms
              </label>
              <select
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden"
              >
                <option value="Net 15 Days">Net 15 Days</option>
                <option value="Net 30 Days">Net 30 Days</option>
                <option value="Net 45 Days">Net 45 Days</option>
                <option value="Net 60 Days">Net 60 Days</option>
                <option value="Immediate / Cash on Delivery">Immediate / Cash on Delivery</option>
                <option value="Advance 50% / Balance on Delivery">Advance 50% / Balance on Delivery</option>
              </select>
            </div>
          </div>

          {/* Dates & Logistics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Order Issue Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Expected Delivery Date
              </label>
              <input
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Boxes className="w-4 h-4 text-emerald-600" />
                Purchase Line Items & Product Quotations
              </h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Product Item
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                    <th className="py-2.5 px-3">Product Name & SKU</th>
                    <th className="py-2.5 px-3 w-28">Order Qty</th>
                    <th className="py-2.5 px-3 w-36">Unit Cost (₦)</th>
                    <th className="py-2.5 px-3 text-right w-36">Line Total (₦)</th>
                    <th className="py-2.5 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400">
                        No items added. Click "+ Add Product Item" to add products to this order.
                      </td>
                    </tr>
                  ) : (
                    items.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/80">
                        <td className="py-2 px-3">
                          <select
                            value={row.productId}
                            onChange={(e) => handleProductSelect(row.id, e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-hidden font-medium"
                          >
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.sku}) — {p.category}
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={row.notes}
                            onChange={(e) => handleRowNotesChange(row.id, e.target.value)}
                            placeholder="Specification or special requirements (optional)..."
                            className="w-full mt-1 px-2 py-0.5 text-2xs text-slate-600 border border-slate-200 rounded-md focus:ring-1 focus:ring-emerald-500 outline-hidden"
                          />
                        </td>
                        <td className="py-2 px-3 align-top">
                          <input
                            type="number"
                            min="1"
                            value={row.orderedQuantity}
                            onChange={(e) => handleQuantityChange(row.id, parseInt(e.target.value) || 0)}
                            className="w-full px-2.5 py-1.5 text-xs font-bold text-center border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-hidden"
                          />
                          <span className="block text-2xs text-center text-slate-400 mt-0.5">{row.unit}</span>
                        </td>
                        <td className="py-2 px-3 align-top">
                          <input
                            type="number"
                            min="0"
                            step="100"
                            value={row.unitPrice}
                            onChange={(e) => handleUnitPriceChange(row.id, parseFloat(e.target.value) || 0)}
                            className="w-full px-2.5 py-1.5 text-xs font-mono font-semibold text-right border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-hidden"
                          />
                        </td>
                        <td className="py-2 px-3 align-top text-right font-mono font-bold text-slate-900 pt-3">
                          ₦{row.subtotal.toLocaleString()}
                        </td>
                        <td className="py-2 px-2 align-top text-center pt-2.5">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(row.id)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors"
                            title="Remove Line Item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals & Notes Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Order Delivery Instructions & Agronomic Terms
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Must deliver with certified seed inspection batch certificate. Delivery between 8am and 3pm..."
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Items Gross Subtotal:</span>
                <span className="font-mono font-semibold text-slate-900">₦{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Freight / Delivery Surcharge:</span>
                <input
                  type="number"
                  min="0"
                  value={tax}
                  onChange={(e) => setTax(parseFloat(e.target.value) || 0)}
                  className="w-28 px-2 py-0.5 text-xs text-right font-mono border border-slate-300 rounded-md outline-hidden"
                />
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Supplier Negotiated Discount:</span>
                <input
                  type="number"
                  min="0"
                  value={orderDiscount}
                  onChange={(e) => setOrderDiscount(parseFloat(e.target.value) || 0)}
                  className="w-28 px-2 py-0.5 text-xs text-right font-mono border border-slate-300 rounded-md outline-hidden text-emerald-600"
                />
              </div>
              <div className="flex items-center justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
                <span>Net Purchase Order Value:</span>
                <span className="font-mono text-base text-emerald-700">₦{totalAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Discard
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSubmit('DRAFT')}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-colors"
            >
              Save as Draft
            </button>
            <button
              type="button"
              onClick={() => handleSubmit('PENDING_APPROVAL')}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
            >
              Submit for Approval
            </button>
            {(currentUser?.role === 'CEO' || currentUser?.role === 'BRANCH_MANAGER') && (
              <button
                type="button"
                onClick={() => handleSubmit('APPROVED')}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-900/20 transition-all flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" /> Approve & Issue PO
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
