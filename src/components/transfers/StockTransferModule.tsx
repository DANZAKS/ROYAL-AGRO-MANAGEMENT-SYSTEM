import React, { useState } from 'react';
import {
  ArrowRightLeft,
  Building2,
  Plus,
  CheckCircle2,
  Truck,
  XCircle,
  Clock,
  X,
  Boxes,
  FileText
} from 'lucide-react';
import {
  StockTransfer,
  Branch,
  Product,
  User,
  StockTransferStatus,
  BranchInventory
} from '../../types';

interface StockTransferModuleProps {
  transfers: StockTransfer[];
  branches: Branch[];
  products: Product[];
  inventory: BranchInventory[];
  currentUser: User;
  onRequestTransfer: (transfer: StockTransfer) => void;
  onApproveTransfer: (transferId: string) => void;
  onDispatchTransfer: (transferId: string) => void;
  onReceiveTransfer: (transferId: string) => void;
  onRejectTransfer: (transferId: string, reason: string) => void;
}

export const StockTransferModule: React.FC<StockTransferModuleProps> = ({
  transfers = [],
  branches = [],
  products = [],
  inventory = [],
  currentUser,
  onRequestTransfer,
  onApproveTransfer,
  onDispatchTransfer,
  onReceiveTransfer,
  onRejectTransfer
}) => {
  const [showModal, setShowModal] = useState(false);
  const [sourceBranchId, setSourceBranchId] = useState(branches[0]?.id || '');
  const [destinationBranchId, setDestinationBranchId] = useState(branches[1]?.id || '');
  const [productId, setProductId] = useState(products[0]?.id || '');
  const [quantity, setQuantity] = useState<number>(20);
  const [notes, setNotes] = useState('');

  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const isCEO = currentUser?.role === 'CEO';

  const handleCreateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (sourceBranchId === destinationBranchId) {
      alert('Source and destination branches must be different!');
      return;
    }

    const prod = products.find((p) => p.id === productId);
    const sourceBranch = branches.find((b) => b.id === sourceBranchId);
    const destBranch = branches.find((b) => b.id === destinationBranchId);

    const transferNo = `TR-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

    const newTransfer: StockTransfer = {
      id: 'tr-' + Date.now(),
      transferNo,
      sourceBranchId,
      sourceBranchName: sourceBranch?.name || '',
      destinationBranchId,
      destinationBranchName: destBranch?.name || '',
      productId,
      productName: prod?.name || '',
      productSku: prod?.sku || '',
      quantity,
      requestedByUserId: currentUser.id,
      requestedByUserName: currentUser.name,
      status: 'PENDING',
      notes,
      requestDate: new Date().toISOString().replace('T', ' ').slice(0, 16)
    };

    onRequestTransfer(newTransfer);
    setShowModal(false);
  };

  const getStatusBadge = (status: StockTransferStatus) => {
    switch (status) {
      case 'PENDING':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">PENDING APPROVAL</span>;
      case 'APPROVED':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">APPROVED - READY FOR DISPATCH</span>;
      case 'DISPATCHED':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">DISPATCHED IN TRANSIT</span>;
      case 'RECEIVED':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">RECEIVED & ADDED TO STOCK</span>;
      case 'REJECTED':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">REJECTED</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-6 h-6 text-emerald-600" />
            <h1 className="text-lg font-bold text-slate-900">Inter-Branch Stock Transfer Management</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Request, approve, dispatch, and confirm stock transfers across company branches with automated stock updates.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-900/30 flex items-center gap-2 transition-all shrink-0"
        >
          <Plus className="w-4 h-4 text-amber-300" /> Request Stock Transfer
        </button>
      </div>

      {/* Transfers List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px]">
              <tr>
                <th className="p-4">Transfer No</th>
                <th className="p-4">Product</th>
                <th className="p-4">Source Branch</th>
                <th className="p-4">Destination Branch</th>
                <th className="p-4">Quantity</th>
                <th className="p-4">Status</th>
                <th className="p-4">Requested By</th>
                <th className="p-4 text-right">Workflow Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transfers.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-mono font-bold text-slate-900">{t.transferNo}</td>
                  <td className="p-4">
                    <p className="font-bold text-slate-900">{t.productName}</p>
                    <p className="text-[10px] text-slate-500 font-mono">SKU: {t.productSku}</p>
                  </td>
                  <td className="p-4 text-slate-700 font-medium">📍 {t.sourceBranchName}</td>
                  <td className="p-4 text-slate-700 font-medium">📍 {t.destinationBranchName}</td>
                  <td className="p-4 font-extrabold text-slate-900 text-sm">{t.quantity} UNITS</td>
                  <td className="p-4">{getStatusBadge(t.status)}</td>
                  <td className="p-4 text-slate-600">
                    <p className="font-semibold">{t.requestedByUserName}</p>
                    <p className="text-[10px] text-slate-400">{t.requestDate}</p>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* CEO / Manager Approve */}
                      {t.status === 'PENDING' && (isCEO || currentUser.branchId === t.sourceBranchId) && (
                        <>
                          <button
                            onClick={() => onApproveTransfer(t.id)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => setRejectId(t.id)}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[11px] font-bold"
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {/* Source Branch Dispatch */}
                      {t.status === 'APPROVED' && (isCEO || currentUser.branchId === t.sourceBranchId) && (
                        <button
                          onClick={() => onDispatchTransfer(t.id)}
                          className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[11px] font-bold flex items-center gap-1"
                        >
                          <Truck className="w-3.5 h-3.5" /> Dispatch Stock
                        </button>
                      )}

                      {/* Destination Branch Receive & Confirm */}
                      {t.status === 'DISPATCHED' && (isCEO || currentUser.branchId === t.destinationBranchId) && (
                        <button
                          onClick={() => onReceiveTransfer(t.id)}
                          className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-[11px] font-bold flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Confirm Receipt
                        </button>
                      )}

                      {t.status === 'RECEIVED' && (
                        <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Transfer Request Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-emerald-600" /> Request Inter-Branch Stock Transfer
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Source Branch (Dispatching) *</label>
                <select
                  value={sourceBranchId}
                  onChange={(e) => setSourceBranchId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold focus:outline-none"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      📍 {b.name} ({b.state})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Destination Branch (Receiving) *</label>
                <select
                  value={destinationBranchId}
                  onChange={(e) => setDestinationBranchId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold focus:outline-none"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      📍 {b.name} ({b.state})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Product / Seed Variety *</label>
                <select
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold focus:outline-none"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Transfer Quantity *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Transfer Reason / Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. High customer demand for planting season in Abuja depot..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-xs"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm p-6">
            <h3 className="text-sm font-bold text-slate-900">Reject Transfer Request</h3>
            <p className="text-xs text-slate-500 mt-1">Please provide a reason for rejecting this transfer.</p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Source branch stock is insufficient for local sales..."
              className="w-full mt-3 p-2 border border-slate-200 rounded-xl text-xs focus:outline-none"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setRejectId(null)}
                className="px-3 py-1.5 text-xs font-semibold border rounded-lg text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onRejectTransfer(rejectId, rejectReason);
                  setRejectId(null);
                  setRejectReason('');
                }}
                className="px-3 py-1.5 text-xs font-bold bg-rose-600 text-white rounded-lg"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
