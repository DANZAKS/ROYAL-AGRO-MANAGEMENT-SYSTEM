import React, { useState } from 'react';
import {
  Printer,
  Barcode,
  Search,
  Filter,
  CheckSquare,
  Square,
  Sparkles,
  Settings,
  Layers,
  Building2,
  Tag,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Plus,
  Minus
} from 'lucide-react';
import { Product, Branch, BranchInventory, User, ProductCategory } from '../../types';
import { renderCode128Svg, generateUniqueBarcode, isBarcodeUnique } from '../../services/barcodeService';

interface ProductLabelPrintModuleProps {
  products: Product[];
  inventory: BranchInventory[];
  branches: Branch[];
  currentUser: User;
  onUpdateProduct: (product: Product) => void;
  activeBranch?: Branch | null;
}

type LabelTemplate = 'A4_30_UP' | 'A4_14_UP' | 'THERMAL_SINGLE';

export const ProductLabelPrintModule: React.FC<ProductLabelPrintModuleProps> = ({
  products = [],
  inventory = [],
  branches = [],
  currentUser,
  onUpdateProduct,
  activeBranch
}) => {
  const currentBranch = activeBranch || branches[0] || null;

  // Selected Products with Label Quantities: Record<productId, quantityToPrint>
  const [selectedProductQuantities, setSelectedProductQuantities] = useState<Record<string, number>>(() => {
    // Default select first 3 products with quantity 1
    const initial: Record<string, number> = {};
    products.slice(0, 3).forEach((p) => {
      initial[p.id] = 1;
    });
    return initial;
  });

  // Filter & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Label Customizer Options
  const [template, setTemplate] = useState<LabelTemplate>('A4_30_UP');
  const [showPrice, setShowPrice] = useState(true);
  const [showUnit, setShowUnit] = useState(true);
  const [showVariety, setShowVariety] = useState(true);
  const [showBusinessName, setShowBusinessName] = useState(true);
  const [showBarcodeText, setShowBarcodeText] = useState(true);
  const [customHeader, setCustomHeader] = useState('ROYAL AGRO CERTIFIED');

  // Toggle selection for a product
  const toggleSelectProduct = (productId: string) => {
    setSelectedProductQuantities((prev) => {
      const updated = { ...prev };
      if (updated[productId]) {
        delete updated[productId];
      } else {
        updated[productId] = 1;
      }
      return updated;
    });
  };

  // Update print quantity for a product
  const updateQuantity = (productId: string, delta: number) => {
    setSelectedProductQuantities((prev) => {
      const current = prev[productId] || 0;
      const next = Math.max(0, current + delta);
      const updated = { ...prev };
      if (next === 0) {
        delete updated[productId];
      } else {
        updated[productId] = next;
      }
      return updated;
    });
  };

  // Select all filtered products
  const handleSelectAllFiltered = () => {
    const updated = { ...selectedProductQuantities };
    filteredProducts.forEach((p) => {
      if (!updated[p.id]) {
        updated[p.id] = 1;
      }
    });
    setSelectedProductQuantities(updated);
  };

  // Deselect all
  const handleClearSelection = () => {
    setSelectedProductQuantities({});
  };

  // Quick generate barcode for product if missing
  const handleGenerateBarcodeForProduct = (product: Product) => {
    const newBarcode = generateUniqueBarcode(products, product.category);
    onUpdateProduct({
      ...product,
      barcode: newBarcode
    });
  };

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory;
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      p.name.toLowerCase().includes(searchLower) ||
      p.sku.toLowerCase().includes(searchLower) ||
      (p.barcode && p.barcode.toLowerCase().includes(searchLower));
    return matchesCat && matchesSearch;
  });

  // Compile list of labels to render
  const labelsToRender: Array<{ product: Product; index: number }> = [];
  products.forEach((p) => {
    const count = selectedProductQuantities[p.id] || 0;
    for (let i = 0; i < count; i++) {
      labelsToRender.push({ product: p, index: i });
    }
  });

  const totalLabelsCount = labelsToRender.length;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Module Header (Hidden on Print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs print:hidden">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#7E9D73] uppercase tracking-wider mb-0.5">
            <Barcode className="w-4 h-4 text-[#7E9D73]" /> Module 16 • Product Label Studio
          </div>
          <h1 className="text-xl font-extrabold text-stone-900">Barcode Label Printing & Merchandising</h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Batch generate and print Code-128 barcode stickers for seed bags, agrochemicals, and retail shelf tags.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handlePrint}
            disabled={totalLabelsCount === 0}
            className="px-4 py-2.5 bg-[#1B3022] hover:bg-[#284732] disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-amber-300" />
            <span>Print {totalLabelsCount} Label{totalLabelsCount === 1 ? '' : 's'}</span>
          </button>
        </div>
      </div>

      {/* Main Studio Canvas (Sidebar Settings + Product Picker + Real-time Sheet Preview) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Control Panel: Template, Options & Product Checklist (Hidden on Print) */}
        <div className="lg:col-span-5 space-y-5 print:hidden">
          {/* Label Template & Formatting Controls */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 font-bold text-sm text-stone-800 border-b border-stone-100 pb-2.5">
              <Settings className="w-4 h-4 text-[#7E9D73]" />
              <span>Label Sheet & Formatting Settings</span>
            </div>

            {/* Template Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700">Sheet Layout / Label Size:</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setTemplate('A4_30_UP')}
                  className={`p-2.5 rounded-xl border text-left font-bold transition-all ${
                    template === 'A4_30_UP'
                      ? 'bg-[#1B3022] text-white border-[#1B3022] shadow-xs'
                      : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  <div className="font-extrabold text-[11px]">30-up Sheet</div>
                  <div className={`text-[10px] ${template === 'A4_30_UP' ? 'text-stone-300' : 'text-stone-400'}`}>
                    3 × 10 (70×37mm)
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTemplate('A4_14_UP')}
                  className={`p-2.5 rounded-xl border text-left font-bold transition-all ${
                    template === 'A4_14_UP'
                      ? 'bg-[#1B3022] text-white border-[#1B3022] shadow-xs'
                      : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  <div className="font-extrabold text-[11px]">14-up Large Bag</div>
                  <div className={`text-[10px] ${template === 'A4_14_UP' ? 'text-stone-300' : 'text-stone-400'}`}>
                    2 × 7 (105×42mm)
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTemplate('THERMAL_SINGLE')}
                  className={`p-2.5 rounded-xl border text-left font-bold transition-all ${
                    template === 'THERMAL_SINGLE'
                      ? 'bg-[#1B3022] text-white border-[#1B3022] shadow-xs'
                      : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  <div className="font-extrabold text-[11px]">Thermal Roll</div>
                  <div
                    className={`text-[10px] ${template === 'THERMAL_SINGLE' ? 'text-stone-300' : 'text-stone-400'}`}
                  >
                    50×30mm Roll
                  </div>
                </button>
              </div>
            </div>

            {/* Custom Brand Header Text */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700">Business Header Text:</label>
              <input
                type="text"
                value={customHeader}
                onChange={(e) => setCustomHeader(e.target.value)}
                className="w-full px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800 focus:outline-none focus:border-[#7E9D73]"
              />
            </div>

            {/* Field Toggles */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-bold text-stone-700">Label Content Details:</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showPrice}
                    onChange={(e) => setShowPrice(e.target.checked)}
                    className="rounded text-[#7E9D73] focus:ring-[#7E9D73] w-3.5 h-3.5"
                  />
                  <span className="font-semibold text-stone-700">Selling Price (₦)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showUnit}
                    onChange={(e) => setShowUnit(e.target.checked)}
                    className="rounded text-[#7E9D73] focus:ring-[#7E9D73] w-3.5 h-3.5"
                  />
                  <span className="font-semibold text-stone-700">Package Unit Size</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showVariety}
                    onChange={(e) => setShowVariety(e.target.checked)}
                    className="rounded text-[#7E9D73] focus:ring-[#7E9D73] w-3.5 h-3.5"
                  />
                  <span className="font-semibold text-stone-700">Seed Variety Name</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showBarcodeText}
                    onChange={(e) => setShowBarcodeText(e.target.checked)}
                    className="rounded text-[#7E9D73] focus:ring-[#7E9D73] w-3.5 h-3.5"
                  />
                  <span className="font-semibold text-stone-700">Barcode Digits</span>
                </label>
              </div>
            </div>
          </div>

          {/* Product Checklist for Label Selection */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-[#7E9D73]" />
                <h3 className="font-bold text-sm text-stone-800">Select Products to Print</h3>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  className="text-[#7E9D73] hover:underline font-bold cursor-pointer"
                >
                  Select Filtered
                </button>
                <span className="text-stone-300">|</span>
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="text-stone-500 hover:underline font-bold cursor-pointer"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Search & Category Filter */}
            <div className="flex gap-2 text-xs">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search seed name, SKU, or barcode..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:outline-none focus:border-[#7E9D73]"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-stone-50 border border-stone-200 px-2 py-1.5 rounded-xl font-bold text-stone-800 focus:outline-none text-xs"
              >
                <option value="ALL">All Categories</option>
                <option value="SEEDS">Seeds</option>
                <option value="FERTILIZERS">Fertilizers</option>
                <option value="AGROCHEMICALS">Agrochemicals</option>
                <option value="EQUIPMENT">Equipment</option>
              </select>
            </div>

            {/* Products List with Quantity Stepper */}
            <div className="divide-y divide-stone-100 max-h-80 overflow-y-auto space-y-1">
              {filteredProducts.map((p) => {
                const isSelected = Boolean(selectedProductQuantities[p.id]);
                const qty = selectedProductQuantities[p.id] || 0;
                const barcode = p.barcode;

                return (
                  <div key={p.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        type="button"
                        onClick={() => toggleSelectProduct(p.id)}
                        className="text-stone-400 hover:text-stone-700 cursor-pointer shrink-0"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-[#7E9D73]" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>

                      <div className="min-w-0">
                        <p className="font-bold text-stone-900 truncate">{p.name}</p>
                        <div className="flex items-center gap-2 text-[10px] text-stone-500 font-mono">
                          <span>{p.sku}</span>
                          {barcode ? (
                            <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded">
                              {barcode}
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleGenerateBarcodeForProduct(p)}
                              className="text-amber-800 bg-amber-50 hover:bg-amber-100 px-1.5 py-0.2 rounded font-bold underline cursor-pointer"
                            >
                              + Generate Barcode
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quantity Stepper */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => updateQuantity(p.id, -1)}
                        className="p-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-md cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center font-bold font-mono text-stone-800">{qty}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(p.id, 1)}
                        className="p-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-md cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Side: Printable Sheet Preview Canvas */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex items-center justify-between print:hidden">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-stone-800">Print Preview Sheet:</span>
              <span className="bg-[#7E9D73]/15 text-[#1B3022] px-2 py-0.5 rounded-full font-mono font-bold text-[11px]">
                {totalLabelsCount} labels queued
              </span>
            </div>

            <button
              onClick={handlePrint}
              disabled={totalLabelsCount === 0}
              className="px-3.5 py-1.5 bg-[#1B3022] hover:bg-[#284732] disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-amber-300" />
              <span>Print Sheet</span>
            </button>
          </div>

          {/* Printable Label Grid Container */}
          <div
            id="barcode-label-sheet"
            className={`bg-white p-4 sm:p-6 rounded-2xl border border-stone-300 shadow-sm overflow-hidden print:p-0 print:border-none print:shadow-none print:rounded-none ${
              template === 'A4_30_UP'
                ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 print:grid-cols-3 print:gap-2'
                : template === 'A4_14_UP'
                ? 'grid grid-cols-1 sm:grid-cols-2 gap-4 print:grid-cols-2 print:gap-3'
                : 'flex flex-col gap-3 items-center print:block'
            }`}
          >
            {labelsToRender.map(({ product, index }) => {
              const barcodeValue = product.barcode || product.sku;
              const barcodeSvg = renderCode128Svg(barcodeValue, {
                height: template === 'A4_14_UP' ? 44 : 32,
                barWidth: 1.4,
                showText: showBarcodeText,
                fontSize: 9
              });

              return (
                <div
                  key={`${product.id}-${index}`}
                  className={`bg-white border border-stone-300 rounded-xl p-3 flex flex-col justify-between shadow-2xs print:border-black/40 print:rounded-none print:break-inside-avoid ${
                    template === 'THERMAL_SINGLE' ? 'w-64 max-w-full my-2' : ''
                  }`}
                  style={{
                    minHeight: template === 'A4_14_UP' ? '140px' : '110px'
                  }}
                >
                  {/* Label Header */}
                  {showBusinessName && (
                    <div className="flex items-center justify-between border-b border-stone-200 pb-1 mb-1 text-[9px] font-bold text-stone-600 uppercase tracking-wider">
                      <span>{customHeader}</span>
                      {currentBranch && <span>{currentBranch.code}</span>}
                    </div>
                  )}

                  {/* Product Title */}
                  <div>
                    <h4 className="font-extrabold text-stone-900 text-xs leading-tight line-clamp-2">
                      {product.name}
                    </h4>
                    {showVariety && product.seedVariety && (
                      <p className="text-[10px] text-stone-500 font-medium truncate mt-0.5">
                        {product.seedVariety}
                      </p>
                    )}
                  </div>

                  {/* Vector SVG Barcode */}
                  <div
                    className="py-1 flex items-center justify-center my-auto overflow-hidden"
                    dangerouslySetInnerHTML={{ __html: barcodeSvg }}
                  />

                  {/* Label Footer: Unit & Price */}
                  <div className="flex items-end justify-between border-t border-stone-200 pt-1 mt-1">
                    {showUnit ? (
                      <span className="text-[10px] font-bold text-stone-600 uppercase">
                        {product.unit.replace('_', ' ')}
                      </span>
                    ) : (
                      <span />
                    )}

                    {showPrice && (
                      <span className="text-xs font-black text-stone-950 font-mono tracking-tight">
                        ₦{product.sellingPrice.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {totalLabelsCount === 0 && (
              <div className="col-span-full p-12 text-center text-stone-400 space-y-2">
                <Barcode className="w-12 h-12 text-stone-300 mx-auto mb-1 animate-pulse" />
                <p className="font-bold text-stone-700 text-sm">No Labels Selected</p>
                <p className="text-xs text-stone-400 max-w-sm mx-auto">
                  Select one or more products from the list on the left to queue barcode stickers for printing.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
