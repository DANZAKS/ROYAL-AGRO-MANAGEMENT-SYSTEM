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
  Image as ImageIcon,
  Barcode,
  Printer,
  Sparkles
} from 'lucide-react';
import { Product, ProductCategory, UnitOfMeasurement, BranchInventory, User, Branch } from '../../types';
import { generateUniqueBarcode, isBarcodeUnique, renderCode128Svg } from '../../services/barcodeService';

interface ProductCatalogProps {
  products: Product[];
  inventory: BranchInventory[];
  branches: Branch[];
  currentUser: User;
  onAddProduct: (product: Product) => void;
  onUpdateProduct: (product: Product) => void;
  onToggleStatus: (productId: string) => void;
  onNavigateToLabels?: () => void;
}

export const ProductCatalog: React.FC<ProductCatalogProps> = ({
  products = [],
  inventory = [],
  branches = [],
  currentUser,
  onAddProduct,
  onUpdateProduct,
  onToggleStatus,
  onNavigateToLabels
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [name, setName] = useState('');
  const [seedVariety, setSeedVariety] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ProductCategory>('SEEDS');
  const [unit, setUnit] = useState<UnitOfMeasurement>('BAG_50KG');
  const [packageSizeKg, setPackageSizeKg] = useState<number | undefined>(50);
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [minStockLevel, setMinStockLevel] = useState<number>(20);
  const [imageUrl, setImageUrl] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const canManage =
    currentUser?.role === 'CEO' ||
    currentUser?.role === 'INVENTORY_OFFICER' ||
    currentUser?.role === 'BRANCH_MANAGER';

  // Open modal for New or Edit
  const handleOpenModal = (prod?: Product) => {
    setFormError(null);
    if (prod) {
      setEditingProduct(prod);
      setSku(prod.sku);
      setBarcode(prod.barcode || '');
      setName(prod.name);
      setSeedVariety(prod.seedVariety);
      setDescription(prod.description);
      setCategory(prod.category);
      setUnit(prod.unit);
      setPackageSizeKg(prod.packageSizeKg || 50);
      setPurchasePrice(prod.purchasePrice);
      setSellingPrice(prod.sellingPrice);
      setMinStockLevel(prod.minStockLevel);
      setImageUrl(prod.imageUrl);
    } else {
      setEditingProduct(null);
      const newSku = `SEED-${Math.floor(100 + Math.random() * 900)}`;
      setSku(newSku);
      setBarcode(generateUniqueBarcode(products, 'SEEDS'));
      setName('');
      setSeedVariety('');
      setDescription('');
      setCategory('SEEDS');
      setUnit('BAG_50KG');
      setPackageSizeKg(50);
      setPurchasePrice(25000);
      setSellingPrice(35000);
      setMinStockLevel(20);
      setImageUrl('https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&q=80&w=600');
    }
    setShowModal(true);
  };

  const handleGenerateBarcode = () => {
    const generated = generateUniqueBarcode(products, category);
    setBarcode(generated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim() || !sku.trim()) {
      setFormError('Product Name and SKU are required.');
      return;
    }

    const cleanBarcode = barcode.trim();
    if (cleanBarcode) {
      if (!isBarcodeUnique(cleanBarcode, editingProduct?.id || '', products)) {
        setFormError(`Barcode "${cleanBarcode}" is already assigned to another product. Barcodes must be unique.`);
        return;
      }
    }

    if (editingProduct) {
      onUpdateProduct({
        ...editingProduct,
        sku: sku.trim(),
        barcode: cleanBarcode || undefined,
        name: name.trim(),
        seedVariety: seedVariety.trim(),
        description: description.trim(),
        category,
        unit,
        packageSizeKg: Number(packageSizeKg) || undefined,
        purchasePrice,
        sellingPrice,
        minStockLevel,
        imageUrl: imageUrl || editingProduct.imageUrl
      });
    } else {
      const newProd: Product = {
        id: 'prod-' + Date.now(),
        sku: sku.trim(),
        barcode: cleanBarcode || undefined,
        name: name.trim(),
        seedVariety: seedVariety.trim(),
        description: description.trim(),
        category,
        unit,
        packageSizeKg: Number(packageSizeKg) || undefined,
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
      (p.seedVariety || '').toLowerCase().includes(searchLower) ||
      (p.barcode && p.barcode.toLowerCase().includes(searchLower));
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
            Manage high-yield certified seed varieties, barcodes, fertilizers, agrochemicals, and equipment.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {onNavigateToLabels && canManage && (
            <button
              onClick={onNavigateToLabels}
              className="px-3.5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs rounded-xl border border-stone-300 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-[#7E9D73]" />
              <span>Print Barcode Labels</span>
            </button>
          )}

          {canManage && (
            <button
              onClick={() => handleOpenModal()}
              className="px-4 py-2.5 bg-[#1B3022] hover:bg-[#284732] text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-all shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-amber-300" /> Add New Seed / Product
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by name, SKU, or barcode (e.g. 200011...)..."
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
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
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
                <th className="p-4">Barcode</th>
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
                      {p.barcode ? (
                        <div className="font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-bold inline-flex items-center gap-1 border border-emerald-200">
                          <Barcode className="w-3 h-3 text-emerald-600" />
                          <span>{p.barcode}</span>
                        </div>
                      ) : (
                        <span className="text-stone-400 italic text-[11px]">- None -</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                        {p.category}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600 font-semibold">
                      {p.unit} {p.packageSizeKg ? `(${p.packageSizeKg}kg)` : ''}
                    </td>
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
                            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                            title="Edit product & barcode"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onToggleStatus(p.id)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
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
                {editingProduct ? 'Edit Product & Seed Barcode' : 'Add New Certified Seed / Product'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

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

              {/* Barcode Field with Generate Button */}
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-stone-800 flex items-center gap-1.5">
                    <Barcode className="w-4 h-4 text-[#7E9D73]" />
                    <span>Product Barcode (Code-128 / EAN-13)</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateBarcode}
                    className="text-[#7E9D73] hover:underline font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Generate Unique
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="e.g. 200011000148 (or scan barcode here)"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl font-mono font-bold text-xs text-stone-900 focus:outline-none focus:border-[#7E9D73]"
                />

                {barcode.trim().length >= 4 && (
                  <div className="pt-2 border-t border-stone-200 flex justify-center">
                    <div
                      className="py-1 px-3 bg-white border border-stone-200 rounded-lg shadow-2xs"
                      dangerouslySetInnerHTML={{
                        __html: renderCode128Svg(barcode.trim(), {
                          height: 32,
                          barWidth: 1.2,
                          showText: true,
                          fontSize: 9
                        })
                      }}
                    />
                  </div>
                )}
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

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit</label>
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
                  <label className="block font-semibold text-slate-700 mb-1">Size (KG)</label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={packageSizeKg || ''}
                    onChange={(e) => setPackageSizeKg(Number(e.target.value))}
                    placeholder="50"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Min Reorder Level</label>
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
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1B3022] hover:bg-[#284732] text-white rounded-xl font-bold shadow-xs cursor-pointer"
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
