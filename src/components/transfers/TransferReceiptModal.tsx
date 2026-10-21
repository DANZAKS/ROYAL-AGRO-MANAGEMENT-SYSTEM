import React from 'react';
import { X, Printer, ArrowRightLeft, Building2, User, Calendar, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import { StockTransfer } from '../../types';

interface TransferReceiptModalProps {
  transfer: StockTransfer;
  onClose: () => void;
}

export const TransferReceiptModal: React.FC<TransferReceiptModalProps> = ({ transfer, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  const items = transfer.items && transfer.items.length > 0
    ? transfer.items
    : [
        {
          id: 'item-1',
          productId: transfer.productId || 'p1',
          productName: transfer.productName || 'Agro Product',
          productSku: transfer.productSku || 'SKU-000',
          requestedQuantity: transfer.quantity || 0,
          dispatchedQuantity: transfer.quantity || 0,
          receivedQuantity: transfer.quantity || 0
        }
      ];

  const totalRequested = items.reduce((sum, i) => sum + (i.requestedQuantity || 0), 0);
  const totalDispatched = items.reduce((sum, i) => sum + (i.dispatchedQuantity || 0), 0);
  const totalReceived = items.reduce((sum, i) => sum + (i.receivedQuantity || 0), 0);
  const hasDiscrepancy = totalDispatched > 0 && totalReceived < totalDispatched;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-transfer-slip, #printable-transfer-slip * {
            visibility: visible;
          }
          #printable-transfer-slip {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold">Inter-Branch Transfer Voucher #{transfer.transferNo}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Print Voucher
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Content Body */}
        <div id="printable-transfer-slip" className="p-6 overflow-y-auto space-y-6 text-slate-900">
          {/* Header Banner */}
          <div className="border-b-2 border-emerald-700 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-emerald-800 text-amber-400 px-2.5 py-1 rounded font-black text-sm uppercase tracking-wider">
                  ROYAL AGRO
                </span>
                <span className="text-xs font-bold text-emerald-800 tracking-wider uppercase">Management System</span>
              </div>
              <h1 className="text-xl font-black text-slate-900 mt-1 uppercase tracking-tight">
                INTER-BRANCH STOCK TRANSFER SLIP
              </h1>
              <p className="text-xs text-slate-500">Official Waybill & Inventory Dispatch Document</p>
            </div>

            <div className="text-right sm:text-right">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Waybill / Transfer No</span>
              <span className="text-lg font-mono font-black text-slate-900">{transfer.transferNo}</span>
              <div className="mt-1">
                <span
                  className={`inline-block px-2.5 py-0.5 text-[11px] font-black uppercase rounded border ${
                    transfer.status === 'RECEIVED'
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                      : transfer.status === 'PARTIALLY_RECEIVED'
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : transfer.status === 'DISPATCHED' || transfer.status === 'IN_TRANSIT'
                      ? 'bg-blue-100 text-blue-900 border-blue-300'
                      : transfer.status === 'APPROVED'
                      ? 'bg-purple-100 text-purple-900 border-purple-300'
                      : transfer.status === 'REJECTED' || transfer.status === 'CANCELLED'
                      ? 'bg-rose-100 text-rose-900 border-rose-300'
                      : 'bg-slate-100 text-slate-800 border-slate-300'
                  }`}
                >
                  STATUS: {transfer.status.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>

          {/* Source & Destination Logistics */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div className="space-y-1">
              <span className="font-extrabold text-rose-800 uppercase tracking-wider block flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-rose-700" /> SOURCE / DISPATCHING BRANCH
              </span>
              <p className="font-black text-sm text-slate-900">{transfer.sourceBranchName}</p>
              <p className="text-slate-500">Authorized Stock Depot</p>
            </div>

            <div className="space-y-1 border-l border-slate-200 pl-4">
              <span className="font-extrabold text-emerald-800 uppercase tracking-wider block flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-emerald-700" /> DESTINATION / RECEIVING BRANCH
              </span>
              <p className="font-black text-sm text-slate-900">{transfer.destinationBranchName}</p>
              <p className="text-slate-500">Destination Outlet</p>
            </div>
          </div>

          {/* Logistics & Carrier Transit Details */}
          {(transfer.driverName || transfer.vehicleNumber || transfer.waybillNumber) && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-blue-50/60 p-3 rounded-xl border border-blue-100 text-xs text-slate-800">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Waybill Ref</span>
                <span className="font-mono font-bold text-blue-900">{transfer.waybillNumber || transfer.transferNo}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Driver / Carrier</span>
                <span className="font-bold text-slate-900">{transfer.driverName || 'Designated Driver'}</span>
                {transfer.driverPhone && <span className="text-[10px] text-slate-500 block">{transfer.driverPhone}</span>}
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Vehicle Plate</span>
                <span className="font-mono font-bold text-slate-900">{transfer.vehicleNumber || 'Standard Fleet'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Est. Arrival</span>
                <span className="font-bold text-slate-900">{transfer.estimatedArrivalDate || 'Direct Dispatch'}</span>
              </div>
            </div>
          )}

          {/* Timeline Dates */}
          <div className="grid grid-cols-3 gap-2 text-[11px] bg-slate-100/70 p-3 rounded-lg text-slate-700">
            <div>
              <span className="font-bold text-slate-400 uppercase block">Request Date</span>
              <span className="font-extrabold text-slate-900">{transfer.requestDate}</span>
            </div>
            <div>
              <span className="font-bold text-slate-400 uppercase block">Dispatch Date</span>
              <span className="font-extrabold text-slate-900">{transfer.dispatchDate || 'Pending Dispatch'}</span>
            </div>
            <div>
              <span className="font-bold text-slate-400 uppercase block">Receipt Date</span>
              <span className="font-extrabold text-slate-900">{transfer.receiveDate || 'Pending Receipt'}</span>
            </div>
          </div>

          {/* Items Table */}
          <div className="space-y-2">
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Transferred Product Inventory Items</h3>
            <table className="w-full text-left text-xs border border-slate-200">
              <thead className="bg-slate-800 text-white uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-2 border-r border-slate-700">#</th>
                  <th className="p-2 border-r border-slate-700">SKU</th>
                  <th className="p-2 border-r border-slate-700">Product Description</th>
                  <th className="p-2 text-right border-r border-slate-700">Req</th>
                  <th className="p-2 text-right border-r border-slate-700">Disp</th>
                  <th className="p-2 text-right border-r border-slate-700">Recv</th>
                  <th className="p-2 text-right border-r border-slate-700">Short</th>
                  <th className="p-2 text-right">Dmg</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {items.map((item, idx) => {
                  const dQty = item.dispatchedQuantity ?? item.requestedQuantity ?? 0;
                  const rQty = item.receivedQuantity ?? (transfer.status === 'RECEIVED' ? dQty : 0);
                  const mQty = item.missingQuantity ?? (dQty > rQty ? dQty - rQty - (item.damagedQuantity || 0) : 0);
                  const dmgQty = item.damagedQuantity ?? 0;

                  return (
                    <tr key={item.id || idx} className="hover:bg-slate-50">
                      <td className="p-2 border-r border-slate-200 font-bold text-slate-500">{idx + 1}</td>
                      <td className="p-2 border-r border-slate-200 font-mono font-bold text-slate-700">{item.productSku}</td>
                      <td className="p-2 border-r border-slate-200 font-bold text-slate-900">
                        {item.productName}
                        {item.notes && <p className="text-[10px] text-amber-800 italic mt-0.5">Note: {item.notes}</p>}
                        {item.discrepancyReason && <p className="text-[10px] text-rose-700 font-semibold mt-0.5">Discrepancy: {item.discrepancyReason}</p>}
                      </td>
                      <td className="p-2 text-right border-r border-slate-200 font-bold text-slate-800">{item.requestedQuantity}</td>
                      <td className="p-2 text-right border-r border-slate-200 font-extrabold text-blue-800">
                        {item.dispatchedQuantity ?? '-'}
                      </td>
                      <td className={`p-2 text-right border-r border-slate-200 font-black ${
                        rQty < dQty ? 'text-amber-700' : 'text-emerald-800'
                      }`}>
                        {item.receivedQuantity ?? '-'}
                      </td>
                      <td className="p-2 text-right border-r border-slate-200 font-black text-rose-700">
                        {mQty > 0 ? mQty : '-'}
                      </td>
                      <td className="p-2 text-right font-black text-purple-700">
                        {dmgQty > 0 ? dmgQty : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-100 font-extrabold text-xs">
                <tr>
                  <td colSpan={3} className="p-2 text-right uppercase border-r border-slate-200">Total Quantities:</td>
                  <td className="p-2 text-right border-r border-slate-200">{totalRequested}</td>
                  <td className="p-2 text-right border-r border-slate-200 text-blue-900">{totalDispatched}</td>
                  <td className="p-2 text-right border-r border-slate-200 text-emerald-900">{totalReceived}</td>
                  <td className="p-2 text-right border-r border-slate-200 text-rose-900">
                    {Math.max(0, totalDispatched - totalReceived)}
                  </td>
                  <td className="p-2 text-right text-purple-900">
                    {items.reduce((sum, i) => sum + (i.damagedQuantity || 0), 0)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Discrepancy Note Warning if any */}
          {hasDiscrepancy && (
            <div className="bg-amber-50 border border-amber-300 p-3 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold text-amber-950">Discrepancy / Partial Stock Notice:</span> Total received stock ({totalReceived}) is less than dispatched waybill stock ({totalDispatched}). Shortage has NOT been credited to destination inventory.
                {transfer.discrepancyStatus && (
                  <div className="mt-1 font-bold text-amber-900">
                    Status: <span className="uppercase text-rose-800">{transfer.discrepancyStatus.replace(/_/g, ' ')}</span>
                    {transfer.discrepancyResolutionNotes && (
                      <span className="block font-normal text-slate-700 mt-0.5">Resolution: {transfer.discrepancyResolutionNotes}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes or Rejection Reason */}
          {transfer.notes && (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              <span className="font-bold text-slate-500 uppercase block">Transfer Notes & Remarks:</span>
              <p className="text-slate-800 mt-0.5">{transfer.notes}</p>
            </div>
          )}

          {transfer.rejectionReason && (
            <div className="bg-rose-50 p-3 rounded-xl border border-rose-200 text-xs text-rose-900">
              <span className="font-bold text-rose-700 uppercase block">Rejection Reason:</span>
              <p className="mt-0.5">{transfer.rejectionReason}</p>
            </div>
          )}

          {/* Verification Signatures & Personnel Audit */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-200 text-[10px]">
            <div className="border border-slate-200 p-2.5 rounded-lg space-y-1">
              <span className="font-bold text-slate-400 uppercase block">Requested By</span>
              <p className="font-bold text-slate-900 text-xs">{transfer.requestedByUserName}</p>
              <div className="border-b border-dashed border-slate-300 pt-6"></div>
              <span className="text-[9px] text-slate-400 text-center block">Signature & Date</span>
            </div>

            <div className="border border-slate-200 p-2.5 rounded-lg space-y-1">
              <span className="font-bold text-slate-400 uppercase block">Approved By</span>
              <p className="font-bold text-slate-900 text-xs">{transfer.approvedByUserName || 'Pending'}</p>
              <div className="border-b border-dashed border-slate-300 pt-6"></div>
              <span className="text-[9px] text-slate-400 text-center block">Signature & Date</span>
            </div>

            <div className="border border-slate-200 p-2.5 rounded-lg space-y-1">
              <span className="font-bold text-slate-400 uppercase block">Dispatched By</span>
              <p className="font-bold text-slate-900 text-xs">{transfer.dispatchedByUserName || 'Pending'}</p>
              <div className="border-b border-dashed border-slate-300 pt-6"></div>
              <span className="text-[9px] text-slate-400 text-center block">Signature & Date</span>
            </div>

            <div className="border border-slate-200 p-2.5 rounded-lg space-y-1">
              <span className="font-bold text-slate-400 uppercase block">Received By</span>
              <p className="font-bold text-slate-900 text-xs">{transfer.receivedByUserName || 'Pending'}</p>
              <div className="border-b border-dashed border-slate-300 pt-6"></div>
              <span className="text-[9px] text-slate-400 text-center block">Signature & Date</span>
            </div>
          </div>

          {/* Footer Note */}
          <div className="text-center pt-2 text-[10px] text-slate-400 border-t border-slate-100">
            Royal Agro Management System • Offline PWA Inter-Branch Waybill Verification Document • Printed {new Date().toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
};
