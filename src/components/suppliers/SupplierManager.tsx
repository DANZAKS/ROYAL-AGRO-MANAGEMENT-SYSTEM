import React, { useState } from 'react';
import {
  Truck,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  PackageCheck,
  Building2,
  X,
  CheckCircle2
} from 'lucide-react';
import { Supplier, PurchaseOrder, Branch, Product, User } from '../../types';

interface SupplierManagerProps {
  suppliers: Supplier[];
  purchases: PurchaseOrder[];
  branches: Branch[];
  products: Product[];
  currentUser: User;
  onAddSupplier: (supplier: Supplier) => void;
  onReceivePurchaseOrder: (po: PurchaseOrder) => void;
}

export const SupplierManager: React.FC<SupplierManagerProps> = ({
  suppliers = [],
  purchases = [],
  branches = [],
  products = [],
  currentUser,
  onAddSupplier,
  onReceivePurchaseOrder
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'SUPPLIERS' | 'PURCHASES'>('SUPPLIERS');

  // New Supplier Modal
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  // Receive Purchase Order Modal
  const [showPOModal, setShowPOModal] = useState(false);
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || '');
  const [branchId, setBranchId] = useState(branches[0]?.id || '');
  const [productId, setProductId] = useState(products[0]?.id || '');
  const [quantity, setQuantity] = useState<number>(100);
  const [unitPrice, setUnitPrice] = useState<number>(28000);

  const handleCreateSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !phone) return;

    const newSup: Supplier = {
      id: 'sup-' + Date.now(),
      companyName,
      contactPerson,
      phone,
      email,
      address,
      categoriesSupplied: ['SEEDS'],
      status: 'ACTIVE',
      createdAt: new Date().toISOString().split('T')[0]
    };

    onAddSupplier(newSup);
    setShowSupplierModal(false);
  };

  const handleReceivePO = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || !branchId || !productId || quantity <= 0) return;

    const sup = suppliers.find((s) => s.id === supplierId);
    const branch = branches.find((b) => b.id === branchId);
    const prod = products.find((p) => p.id === productId);

    const subtotal = quantity * unitPrice;
    const orderNo = `PO-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

    const po: PurchaseOrder = {
      id: 'po-' + Date.now(),
      orderNo,
      supplierId,
      supplierName: sup?.companyName || '',
      branchId,
      branchName: branch?.name || '',
      items: [
        {
          productId,
          productName: prod?.name || '',
          productSku: prod?.sku || '',
          quantity,
          unitPrice,
          subtotal
        }
      ],
      totalAmount: subtotal,
      receivedDate: new Date().toISOString().split('T')[0],
      receivedByUserId: currentUser?.id || 'system',
      receivedByUserName: currentUser?.name || 'System',
      status: 'RECEIVED'
    };

    onReceivePurchaseOrder(po);
    setShowPOModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Truck className="w-6 h-6 text-emerald-600" />
            <h1 className="text-lg font-bold text-slate-900">Supplier & Stock Receiving Management</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage seed development councils, fertilizer plants, and record official stock purchases.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPOModal(true)}
            className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-colors"
          >
            <PackageCheck className="w-4 h-4 text-emerald-400" /> Receive Supplier Stock
          </button>
          <button
            onClick={() => setShowSupplierModal(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-900/30 flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4 text-amber-300" /> Add Supplier
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200/80 shadow-xs">
        <button
          onClick={() => setActiveTab('SUPPLIERS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            activeTab === 'SUPPLIERS' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Suppliers Directory
        </button>
        <button
          onClick={() => setActiveTab('PURCHASES')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            activeTab === 'PURCHASES' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Stock Receiving Records ({purchases.length})
        </button>
      </div>

      {activeTab === 'SUPPLIERS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {suppliers.map((s) => (
            <div key={s.id} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-extrabold text-slate-900">{s.companyName}</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  {s.status}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600">
                <p>👤 Contact: <strong>{s.contactPerson}</strong></p>
                <p>📞 Phone: <strong>{s.phone}</strong></p>
                <p>✉️ Email: {s.email}</p>
                <p>📍 Address: {s.address}</p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 flex-wrap">
                {s.categoriesSupplied.map((cat) => (
                  <span key={cat} className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'PURCHASES' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px]">
                <tr>
                  <th className="p-4">Order No</th>
                  <th className="p-4">Supplier</th>
                  <th className="p-4">Receiving Branch</th>
                  <th className="p-4">Items Received</th>
                  <th className="p-4">Total Amount</th>
                  <th className="p-4">Received Date</th>
                  <th className="p-4">Officer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchases.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-50">
                    <td className="p-4 font-mono font-bold text-slate-900">{po.orderNo}</td>
                    <td className="p-4 font-bold text-slate-800">{po.supplierName}</td>
                    <td className="p-4 text-slate-700">📍 {po.branchName}</td>
                    <td className="p-4">
                      {po.items.map((i, idx) => (
                        <p key={idx} className="font-semibold text-slate-900">
                          {i.productName} ({i.quantity} units)
                        </p>
                      ))}
                    </td>
                    <td className="p-4 font-extrabold text-emerald-700">₦{po.totalAmount.toLocaleString()}</td>
                    <td className="p-4 text-slate-500">{po.receivedDate}</td>
                    <td className="p-4 font-semibold text-slate-700">{po.receivedByUserName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Add New Supplier</h3>
              <button onClick={() => setShowSupplierModal(false)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSupplier} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Premier Seeds West Africa Ltd"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Contact Person</label>
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="Mrs. Janet Adesina"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone *</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSupplierModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-xs"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receive Stock Modal */}
      {showPOModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Receive Stock from Supplier</h3>
              <button onClick={() => setShowPOModal(false)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleReceivePO} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Supplier *</label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold focus:outline-none"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.companyName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Receiving Branch *</label>
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold focus:outline-none"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      📍 {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Product Received *</label>
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Quantity Received *</label>
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
                  <label className="block font-semibold text-slate-700 mb-1">Purchase Price Unit (₦)</label>
                  <input
                    type="number"
                    required
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPOModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-xs"
                >
                  Confirm Stock Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
