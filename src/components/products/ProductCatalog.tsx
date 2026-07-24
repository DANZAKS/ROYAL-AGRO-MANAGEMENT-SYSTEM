import React, { useState } from 'react';
import {
  Sprout,
  Plus,
  Search,
  Filter,
  Edit2,
  Power,
  Boxes,
  Tag,
  DollarSign,
  AlertTriangle,
  X,
  CheckCircle2,
  Image as ImageIcon
} from 'lucide-react';
import { Product, ProductCategory, UnitOfMeasurement, BranchInventory, User, Branch } from '../../types';

interface ProductCatalogProps {
  products: Product[];
  inventory: BranchInventory[];
  branches: Branch[];
  currentUser: User;
  onAddProduct: (product: Product) => void;
  onUpdateProduct: (product: Product) => void;
  onToggleStatus: (productId: string) => void;
}

export const ProductCatalog: React.FC<ProductCatalogProps> = ({
  products = [],
  inventory = [],
  branches = [],
  currentUser,
  onAddProduct,
  onUpdateProduct,
  onToggleStatus
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [seedVariety, setSeedVariety] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ProductCategory>('SEEDS');
  const [unit, setUnit] = useState<UnitOfMeasurement>('BAG_50KG');
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [minStockLevel, setMinStockLevel] = useState<number>(20);
  const [imageUrl, setImageUrl] = useState('');

  const canManage = currentUser?.role === 'CEO' || currentUser?.role === 'INVENTORY_OFFICER' || currentUser?.role === 'BRANCH_MANAGER';

  // Open modal for New or Edit
  const handleOpenModal = (prod?: Product) => {
    if (prod) {
      setEditingProduct(prod);
      setSku(prod.sku);
      setName(prod.name);
      setSeedVariety(prod.seedVariety);
      setDescription(prod.description);
      setCategory(prod.category);
      setUnit(prod.unit);
      setPurchasePrice(prod.purchasePrice);
      setSellingPrice(prod.sellingPrice);
      setMinStockLevel(prod.minStockLevel);
      setImageUrl(prod.imageUrl);
    } else {
      setEditingProduct(null);
      setSku(`SEED-${Math.floor(100 + Math.random() * 900)}`);
      setName('');
      setSeedVariety('');
      setDescription('');
      setCategory('SEEDS');
      setUnit('BAG_50KG');
      setPurchasePrice(25000);
      setSellingPrice(35000);
      setMinStockLevel(20);
      setImageUrl('https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&q=80&w=600');
    }
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !sku) return;

    if (editingProduct) {
      onUpdateProduct({
        ...editingProduct,
        sku,
        name,
        seedVariety,
        description,
        category,
        unit,
        purchasePrice,
        sellingPrice,
        minStockLevel,
        imageUrl: imageUrl || editingProduct.imageUrl
      });
    } else {
      const newProd: Product = {
        id: 'prod-' + Date.now(),
        sku,
        name,
        seedVariety,
        description,
        category,
        unit,
        purchasePrice,
        sellingPrice,
        minStockLevel,
        imageUrl: imageUrl || 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&q=80&w=600',
        status: 'ACTIVE',
        createdAt: new Date().toISOString().split('T')[0]
      };
      onAddProduct(newProd);
    }

    setShowModal(false);
  };

  // Helper for total stock across all branches
  const getTotalStock = (productId: string) => {
    return inventory
      .filter((i) => i.productId === productId)
      .reduce((sum, item) => sum + item.quantity, 0);
  };

  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
    const searchLower = (searchTerm || '').toLowerCase();
    const matchesSearch =
      (p.name || '').toLowerCase().includes(searchLower) ||
      (p.sku || '').toLowerCase().includes(searchLower) ||
      (p.seedVariety || '').toLowerCase().includes(searchLower);
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Sprout className="w-6 h-6 text-emerald-600" />
            <h1 className="text-lg font-bold text-slate-900">Seeds & Agricultural Product Catalog</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage high-yield certified seed varieties, fertilizers, agrochemicals, and equipment.
          </p>
        </div>

        {canManage && (
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-900/30 flex items-center gap-2 transition-all shrink-0"
          >
            <Plus className="w-4 h-4 text-amber-300" /> Add New Seed / Product
          </button>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by product name, SKU, or seed variety..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 custom-scrollbar">
          {['ALL', 'SEEDS', 'FERTILIZERS', 'AGROCHEMICALS', 'EQUIPMENT', 'CROP_CARE'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-amber-300'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px]">
              <tr>
                <th className="p-4">Product & Seed Variety</th>
                <th className="p-4">SKU / Code</th>
                <th className="p-4">Category</th>
                <th className="p-4">Unit</th>
                <th className="p-4">Purchase Price</th>
                <th className="p-4">Selling Price</th>
                <th className="p-4">Global Stock</th>
                <th className="p-4">Status</th>
                {canManage && <th className="p-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((p) => {
                const totalStock = getTotalStock(p.id);
                const isLow = totalStock <= p.minStockLevel;

                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-200 shrink-0"
                        />
                        <div>
                          <p className="font-bold text-slate-900">{p.name}</p>
                          <p className="text-[10px] text-amber-700 font-semibold">{p.seedVariety}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-mono font-bold text-slate-800">{p.sku}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                        {p.category}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600 font-semibold">{p.unit}</td>
                    <td className="p-4 font-semibold text-slate-600">₦{p.purchasePrice.toLocaleString()}</td>
                    <td className="p-4 font-extrabold text-emerald-700">₦{p.sellingPrice.toLocaleString()}</td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                          totalStock === 0
                            ? 'bg-rose-100 text-rose-700'
                            : isLow
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {totalStock} UNITS
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    {canManage && (
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenModal(p)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                            title="Edit product"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onToggleStatus(p.id)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              p.status === 'ACTIVE'
                                ? 'text-rose-600 hover:bg-rose-50'
                                : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={p.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sprout className="w-5 h-5 text-emerald-600" />
                {editingProduct ? 'Edit Product & Seed Variety' : 'Add New Certified Seed / Product'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">SKU / Code *</label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ProductCategory)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="SEEDS">SEEDS</option>
                    <option value="FERTILIZERS">FERTILIZERS</option>
                    <option value="AGROCHEMICALS">AGROCHEMICALS</option>
                    <option value="EQUIPMENT">EQUIPMENT</option>
                    <option value="SEEDLINGS">SEEDLINGS</option>
                    <option value="CROP_CARE">CROP CARE</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Royal Hybrid Maize Seed SC719"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Seed Variety / Specification</label>
                <input
                  type="text"
                  value={seedVariety}
                  onChange={(e) => setSeedVariety(e.target.value)}
                  placeholder="e.g. SC719 High Yield White Grain"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit of Measurement</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as UnitOfMeasurement)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="BAG_50KG">BAG 50KG</option>
                    <option value="KG">KG</option>
                    <option value="PACK">PACK</option>
                    <option value="SACHET">SACHET</option>
                    <option value="CARTON">CARTON</option>
                    <option value="PIECE">PIECE</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Min Stock Reorder Level</label>
                  <input
                    type="number"
                    min="1"
                    value={minStockLevel}
                    onChange={(e) => setMinStockLevel(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Purchase Price (₦)</label>
                  <input
                    type="number"
                    required
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Selling Price (₦)</label>
                  <input
                    type="number"
                    required
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Product Image URL</label>
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-xs"
                >
                  {editingProduct ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
