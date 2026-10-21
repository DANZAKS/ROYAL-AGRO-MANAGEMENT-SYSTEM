import React, { useState, useEffect } from 'react';
import {
  X,
  PackageCheck,
  Building2,
  Truck,
  FileText,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Boxes,
  ShieldCheck
} from 'lucide-react';
import {
  PurchaseOrder,
  GoodsReceipt,
  GoodsReceiptItem,
  Supplier,
  Branch,
  Product,
  User
} from '../../types';

interface GoodsReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReceive: (grn: GoodsReceipt) => void;
  purchaseOrders: PurchaseOrder[];
  branches: Branch[];
  products: Product[];
  currentUser: User;
  selectedPO?: PurchaseOrder | null;
}

interface ItemInspectionRow {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  unit: string;
  orderedQuantity: number;
  previouslyReceived: number;
  remainingToReceive: number;
  unitPrice: number;
  receivedQuantity: number;
  acceptedQuantity: number;
  damagedQuantity: number;
  batchNumber: string;
  manufacturingDate: string;
  expiryDate: string;
  condition: string;
  damageReason: string;
  notes: string;
}

export const GoodsReceiptModal: React.FC<GoodsReceiptModalProps> = ({
  isOpen,
  onClose,
  onReceive,
  purchaseOrders = [],
  branches = [],
  products = [],
  currentUser,
  selectedPO
}) => {
  const [selectedPOId, setSelectedPOId] = useState<string>('');
  const [deliveryNoteNumber, setDeliveryNoteNumber] = useState<string>('');
  const [vehicleNumber, setVehicleNumber] = useState<string>('');
  const [driverName, setDriverName] = useState<string>('');
  const [driverPhone, setDriverPhone] = useState<string>('');
  const [receivedDate, setReceivedDate] = useState<string>('');
  const [generalNotes, setGeneralNotes] = useState<string>('');
  const [items, setItems] = useState<ItemInspectionRow[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Eligible POs (Approved or Partially Received)
  const eligiblePOs = purchaseOrders.filter(
    (po) => po.status === 'APPROVED' || po.status === 'PARTIALLY_RECEIVED'
  );

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setReceivedDate(today);
    setDeliveryNoteNumber(`DN-${Math.floor(10000 + Math.random() * 90000)}`);
    setVehicleNumber('');
    setDriverName('');
    setDriverPhone('');
    setGeneralNotes('');
    setErrorMessage('');

    const targetPO = selectedPO || (eligiblePOs.length > 0 ? eligiblePOs[0] : null);

    if (targetPO) {
      setSelectedPOId(targetPO.id);
      populateItemsFromPO(targetPO);
    } else {
      setSelectedPOId('');
      setItems([]);
    }
  }, [selectedPO, isOpen]);

  const populateItemsFromPO = (po: PurchaseOrder) => {
    const defaultBatch = 'BATCH-' + new Date().getFullYear() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
    const defaultMfg = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const defaultExp = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const inspectionRows: ItemInspectionRow[] = po.items.map((it) => {
      const ordered = it.orderedQuantity || it.quantity;
      const prev = it.receivedQuantity || 0;
      const remaining = Math.max(0, ordered - prev);

      return {
        id: it.id || 'grn-it-' + it.productId,
        productId: it.productId,
        productName: it.productName,
        productSku: it.productSku,
        unit: it.unit || 'units',
        orderedQuantity: ordered,
        previouslyReceived: prev,
        remainingToReceive: remaining,
        unitPrice: it.unitPrice,
        receivedQuantity: remaining, // default to receiving full remaining
        acceptedQuantity: remaining,
        damagedQuantity: 0,
        batchNumber: defaultBatch,
        manufacturingDate: defaultMfg,
        expiryDate: defaultExp,
        condition: 'GOOD',
        damageReason: '',
        notes: ''
      };
    });

    setItems(inspectionRows);
  };

  const handlePOSelect = (poId: string) => {
    setSelectedPOId(poId);
    const po = purchaseOrders.find((p) => p.id === poId);
    if (po) {
      populateItemsFromPO(po);
    } else {
      setItems([]);
    }
  };

  if (!isOpen) return null;

  const handleReceivedQtyChange = (itemId: string, qty: number) => {
    const validQty = Math.max(0, qty || 0);
    setItems((prev) =>
      prev.map((row) => {
        if (row.id === itemId) {
          const accepted = Math.max(0, validQty - row.damagedQuantity);
          return {
            ...row,
            receivedQuantity: validQty,
            acceptedQuantity: accepted
          };
        }
        return row;
      })
    );
  };

  const handleDamagedQtyChange = (itemId: string, dmgQty: number) => {
    const validDmg = Math.max(0, dmgQty || 0);
    setItems((prev) =>
      prev.map((row) => {
        if (row.id === itemId) {
          const accepted = Math.max(0, row.receivedQuantity - validDmg);
          return {
            ...row,
            damagedQuantity: validDmg,
            acceptedQuantity: accepted,
            condition: validDmg > 0 ? (accepted === 0 ? 'REJECTED' : 'PARTIALLY_DAMAGED') : 'GOOD'
          };
        }
        return row;
      })
    );
  };

  const handleRowFieldChange = (itemId: string, field: keyof ItemInspectionRow, value: string) => {
    setItems((prev) =>
      prev.map((row) => (row.id === itemId ? { ...row, [field]: value } : row))
    );
  };

  const currentPO = purchaseOrders.find((p) => p.id === selectedPOId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!selectedPOId || !currentPO) {
      setErrorMessage('Please select an active Purchase Order to receive against.');
      return;
    }

    const totalAccepted = items.reduce((sum, i) => sum + i.acceptedQuantity, 0);
    const totalReceived = items.reduce((sum, i) => sum + i.receivedQuantity, 0);

    if (totalReceived <= 0) {
      setErrorMessage('Total received quantity must be greater than 0.');
      return;
    }

    const grnNumber = `GRN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const nowIso = new Date().toISOString();

    const grnItems: GoodsReceiptItem[] = items.map((it) => {
      const subtotal = it.acceptedQuantity * it.unitPrice;
      return {
        id: 'grni-' + Date.now() + '-' + it.productId,
        productId: it.productId,
        productName: it.productName,
        productSku: it.productSku,
        unit: it.unit,
        orderedQuantity: it.orderedQuantity,
        receivedQuantity: it.receivedQuantity,
        acceptedQuantity: it.acceptedQuantity,
        damagedQuantity: it.damagedQuantity,
        unitPrice: it.unitPrice,
        subtotal,
        batchNumber: it.batchNumber.trim() || undefined,
        manufacturingDate: it.manufacturingDate || undefined,
        expiryDate: it.expiryDate || undefined,
        condition: it.condition || 'GOOD',
        damageReason: it.damageReason.trim() || undefined,
        notes: it.notes.trim() || undefined
      };
    });

    const totalGRNAmount = grnItems.reduce((sum, i) => sum + i.subtotal, 0);

    const grn: GoodsReceipt = {
      id: 'grn-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
      grnNumber,
      purchaseOrderId: currentPO.id,
      purchaseOrderNo: currentPO.orderNo,
      supplierId: currentPO.supplierId,
      supplierName: currentPO.supplierName,
      branchId: currentPO.branchId,
      branchName: currentPO.branchName,
      items: grnItems,
      deliveryNoteNumber: deliveryNoteNumber.trim() || undefined,
      vehicleNumber: vehicleNumber.trim() || undefined,
      driverName: driverName.trim() || undefined,
      driverPhone: driverPhone.trim() || undefined,
      receivedDate: receivedDate || todayDate(),
      receivedByUserId: currentUser?.id || 'usr-1',
      receivedByUserName: currentUser?.name || 'Inventory Officer',
      totalAmount: totalGRNAmount,
      notes: generalNotes.trim() || undefined,
      status: 'VERIFIED',
      createdAt: nowIso,
      updatedAt: nowIso
    };

    onReceive(grn);
    onClose();
  };

  const todayDate = () => new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl border border-slate-200 overflow-hidden my-6 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Goods Receiving Note (GRN) & Inspection</h2>
              <p className="text-xs text-slate-300">
                Verify physical delivery, inspect batch seals, log expiry dates, and accept into branch stock
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
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-rose-700">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Select PO & Waybill Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Purchase Order <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedPOId}
                onChange={(e) => handlePOSelect(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden font-bold text-slate-900"
              >
                {eligiblePOs.length === 0 ? (
                  <option value="">No Approved POs Available</option>
                ) : (
                  eligiblePOs.map((po) => (
                    <option key={po.id} value={po.id}>
                      #{po.orderNo} — {po.supplierName} ({po.branchName}) [{po.status}]
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Supplier Delivery Waybill / Note #
              </label>
              <input
                type="text"
                value={deliveryNoteNumber}
                onChange={(e) => setDeliveryNoteNumber(e.target.value)}
                placeholder="e.g. WAY-88912"
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Arrival & Receiving Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
            </div>
          </div>

          {/* Logistics & Driver Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <div>
              <label className="block text-2xs font-semibold text-slate-600 mb-1">
                Vehicle / Truck Plate Number
              </label>
              <input
                type="text"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                placeholder="e.g. KAN-942-XA (15T Trailer)"
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-hidden"
              />
            </div>

            <div>
              <label className="block text-2xs font-semibold text-slate-600 mb-1">
                Driver / Courier Name
              </label>
              <input
                type="text"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                placeholder="e.g. Malam Haruna Sani"
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-hidden"
              />
            </div>

            <div>
              <label className="block text-2xs font-semibold text-slate-600 mb-1">
                Driver Phone Contact
              </label>
              <input
                type="text"
                value={driverPhone}
                onChange={(e) => setDriverPhone(e.target.value)}
                placeholder="+234 802 000 0000"
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-hidden"
              />
            </div>
          </div>

          {/* Physical Inspection Line Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Boxes className="w-4 h-4 text-emerald-600" />
                Physical Inspection, Batch Registration & Quantity Audit
              </h3>
              <span className="text-2xs text-slate-500">
                Only <strong className="text-emerald-700">Accepted Qty</strong> will be credited into branch stock
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-xs">
              <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 text-2xs">
                    <th className="py-2.5 px-3">Product Name</th>
                    <th className="py-2.5 px-2 text-center w-20">Ordered</th>
                    <th className="py-2.5 px-2 text-center w-24">Delivered</th>
                    <th className="py-2.5 px-2 text-center w-24">Damaged</th>
                    <th className="py-2.5 px-2 text-center w-24">Accepted</th>
                    <th className="py-2.5 px-2 w-32">Batch No</th>
                    <th className="py-2.5 px-2 w-32">Expiry Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Select an approved Purchase Order above to load items.
                      </td>
                    </tr>
                  ) : (
                    items.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-3 align-top">
                          <p className="font-bold text-slate-900">{row.productName}</p>
                          <span className="text-2xs font-mono text-slate-400">{row.productSku}</span>
                          {row.previouslyReceived > 0 && (
                            <p className="text-2xs text-blue-600 mt-0.5">
                              Prev received: {row.previouslyReceived} {row.unit}
                            </p>
                          )}
                        </td>

                        <td className="py-2.5 px-2 text-center align-top pt-3 font-semibold text-slate-600">
                          {row.orderedQuantity} <span className="text-2xs text-slate-400">{row.unit}</span>
                        </td>

                        <td className="py-2.5 px-2 align-top">
                          <input
                            type="number"
                            min="0"
                            value={row.receivedQuantity}
                            onChange={(e) => handleReceivedQtyChange(row.id, parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1 text-xs font-bold text-center border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-hidden"
                          />
                        </td>

                        <td className="py-2.5 px-2 align-top">
                          <input
                            type="number"
                            min="0"
                            value={row.damagedQuantity}
                            onChange={(e) => handleDamagedQtyChange(row.id, parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1 text-xs font-bold text-center text-rose-700 bg-rose-50 border border-rose-200 rounded-lg focus:ring-2 focus:ring-rose-500 outline-hidden"
                          />
                          {row.damagedQuantity > 0 && (
                            <input
                              type="text"
                              placeholder="Damage reason..."
                              value={row.damageReason}
                              onChange={(e) => handleRowFieldChange(row.id, 'damageReason', e.target.value)}
                              className="w-full mt-1 px-1.5 py-0.5 text-2xs text-rose-800 border border-rose-200 rounded-md outline-hidden bg-white"
                            />
                          )}
                        </td>

                        <td className="py-2.5 px-2 text-center align-top pt-3">
                          <span className="px-2.5 py-1 text-xs font-mono font-bold bg-emerald-100 text-emerald-800 rounded-lg">
                            {row.acceptedQuantity}
                          </span>
                        </td>

                        <td className="py-2.5 px-2 align-top">
                          <input
                            type="text"
                            value={row.batchNumber}
                            onChange={(e) => handleRowFieldChange(row.id, 'batchNumber', e.target.value)}
                            placeholder="BATCH-..."
                            className="w-full px-2 py-1 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-hidden"
                          />
                        </td>

                        <td className="py-2.5 px-2 align-top">
                          <input
                            type="date"
                            value={row.expiryDate}
                            onChange={(e) => handleRowFieldChange(row.id, 'expiryDate', e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-hidden"
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Receiving Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              General Quality Assurance & Receiving Remarks
            </label>
            <textarea
              rows={2}
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              placeholder="e.g. All bags sealed with National Seed Council tamper tags. Moisture level verified..."
              className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-900/20 transition-all flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Confirm Stock Receipt & Update Inventory
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
