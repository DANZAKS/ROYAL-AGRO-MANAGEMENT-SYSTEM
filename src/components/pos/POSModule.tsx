import React, { useState } from 'react';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  UserPlus,
  CreditCard,
  Building2,
  AlertCircle,
  CheckCircle2,
  Tag,
  Sprout,
  Receipt,
  DollarSign,
  X
} from 'lucide-react';
import {
  Product,
  BranchInventory,
  Branch,
  Customer,
  PaymentMethod,
  Sale,
  SaleItem,
  User,
  ProductCategory
} from '../../types';
import { ReceiptModal } from './ReceiptModal';

interface POSModuleProps {
  products: Product[];
  inventory: BranchInventory[];
  activeBranch?: Branch | null;
  branches?: Branch[];
  customers: Customer[];
  currentUser: User;
  onCompleteSale: (newSale: Sale) => void;
  onAddCustomer: (customer: Customer) => void;
}

interface CartItem extends SaleItem {
  availableStock: number;
}

export const POSModule: React.FC<POSModuleProps> = ({
  products,
  inventory,
  activeBranch,
  branches = [],
  customers,
  currentUser,
  onCompleteSale,
  onAddCustomer
}) => {
  const currentBranch = activeBranch || branches[0] || null;

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [paymentReference, setPaymentReference] = useState('');
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);

  // New Customer Modal state
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');

  // Categories list
  const categories: { label: string; value: string }[] = [
    { label: 'All Products', value: 'ALL' },
    { label: 'Seeds & Varieties', value: 'SEEDS' },
    { label: 'Fertilizers', value: 'FERTILIZERS' },
    { label: 'Agrochemicals', value: 'AGROCHEMICALS' },
    { label: 'Equipment', value: 'EQUIPMENT' },
    { label: 'Seedlings', value: 'SEEDLINGS' },
    { label: 'Crop Care', value: 'CROP_CARE' }
  ];

  // Helper to get stock for product in active branch
  const getBranchStock = (productId: string): number => {
    if (!currentBranch) {
      const items = (inventory || []).filter((i) => i.productId === productId);
      return items.reduce((sum, i) => sum + i.quantity, 0);
    }
    const inv = (inventory || []).find((i) => i.productId === productId && i.branchId === currentBranch.id);
    return inv ? inv.quantity : 0;
  };

  // Filter products
  const filteredProducts = products.filter((p) => {
    if (p.status !== 'ACTIVE') return false;
    const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
    const searchLower = (searchTerm || '').toLowerCase();
    const matchesSearch =
      (p.name || '').toLowerCase().includes(searchLower) ||
      (p.sku || '').toLowerCase().includes(searchLower) ||
      (p.seedVariety || '').toLowerCase().includes(searchLower);
    return matchesCategory && matchesSearch;
  });

  // Cart Handlers
  const handleAddToCart = (product: Product) => {
    const stock = getBranchStock(product.id);
    if (stock <= 0) return;

    const existing = cart.find((item) => item.productId === product.id);
    if (existing) {
      if (existing.quantity >= stock) return; // Prevent selling more than stock
      setCart(
        cart.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                subtotal: (item.quantity + 1) * item.unitPrice
              }
            : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          id: 'item-' + Date.now() + '-' + Math.random(),
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          unit: product.unit,
          unitPrice: product.sellingPrice,
          quantity: 1,
          subtotal: product.sellingPrice,
          discount: 0,
          availableStock: stock
        }
      ]);
    }
  };

  const handleUpdateQty = (productId: string, delta: number) => {
    setCart(
      cart
        .map((item) => {
          if (item.productId === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > item.availableStock) return item; // stock cap
            return {
              ...item,
              quantity: newQty,
              subtotal: newQty * item.unitPrice
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveItem = (productId: string) => {
    setCart(cart.filter((i) => i.productId !== productId));
  };

  // Calculate Subtotal & Total
  const cartSubtotal = cart.reduce((acc, item) => acc + item.subtotal, 0);
  const cartTotal = Math.max(0, cartSubtotal - discountAmount);

  // Complete Sale
  const handleCheckout = () => {
    if (cart.length === 0) return;

    const selectedCust = customers.find((c) => c.id === selectedCustomerId);
    const receiptNo = `RA-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newSale: Sale = {
      id: 'sale-' + Date.now(),
      receiptNo,
      branchId: currentBranch?.id || 'central',
      branchName: currentBranch?.name || 'Central HQ',
      customerId: selectedCust?.id,
      customerName: selectedCust?.fullName || 'Walk-in Customer',
      customerPhone: selectedCust?.phone,
      items: cart.map(({ availableStock, ...item }) => item),
      subtotal: cartSubtotal,
      tax: 0,
      discount: discountAmount,
      totalAmount: cartTotal,
      paymentMethod,
      paymentReference: paymentReference || undefined,
      status: 'COMPLETED',
      staffUserId: currentUser.id,
      staffName: currentUser.name,
      date: new Date().toISOString().split('T')[0],
      timestamp: new Date().toISOString()
    };

    onCompleteSale(newSale);
    setCompletedSale(newSale);
    setCart([]);
    setDiscountAmount(0);
    setPaymentReference('');
  };

  // Create Customer inline
  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName || !newCustPhone) return;

    const newCust: Customer = {
      id: 'cust-' + Date.now(),
      fullName: newCustName,
      phone: newCustPhone,
      email: newCustEmail,
      address: newCustAddress,
      state: currentBranch?.state || 'FCT',
      totalPurchases: 0,
      totalSpent: 0,
      registeredBranchId: currentBranch?.id || 'branch-1',
      createdAt: new Date().toISOString().split('T')[0]
    };

    onAddCustomer(newCust);
    setSelectedCustomerId(newCust.id);
    setShowNewCustomerModal(false);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustEmail('');
    setNewCustAddress('');
  };

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 min-h-0 lg:h-[calc(100vh-7rem)]">
      {/* Left: Product Catalog & Search Grid (8 Cols) */}
      <div className="lg:col-span-7 xl:col-span-8 flex flex-col h-full bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* POS Header Bar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sprout className="w-5 h-5 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900">Point of Sale Catalog</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                {currentBranch?.name || 'Central HQ'}
              </span>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              {filteredProducts.length} items available
            </span>
          </div>

          {/* Search Input & Category Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search seeds, fertilizers, products by name or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors ${
                  selectedCategory === cat.value
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 custom-scrollbar">
          {filteredProducts.map((prod) => {
            const stock = getBranchStock(prod.id);
            const isOutOfStock = stock <= 0;
            const isLowStock = stock > 0 && stock <= prod.minStockLevel;

            return (
              <div
                key={prod.id}
                onClick={() => !isOutOfStock && handleAddToCart(prod)}
                className={`group rounded-xl border p-3 flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden ${
                  isOutOfStock
                    ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                    : 'bg-white hover:border-emerald-500 hover:shadow-md border-slate-200'
                }`}
              >
                <div>
                  <div className="h-24 w-full rounded-lg bg-slate-100 mb-2 overflow-hidden relative">
                    <img
                      src={prod.imageUrl}
                      alt={prod.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-900/80 text-white backdrop-blur-xs">
                      {prod.unit}
                    </span>
                  </div>

                  <p className="text-[10px] font-bold text-amber-700 tracking-wider uppercase">
                    {prod.seedVariety || prod.category}
                  </p>
                  <h3 className="text-xs font-bold text-slate-900 line-clamp-2 leading-tight">
                    {prod.name}
                  </h3>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">SKU: {prod.sku}</p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">Price</span>
                    <span className="text-sm font-extrabold text-emerald-700">
                      ₦{prod.sellingPrice.toLocaleString()}
                    </span>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                      isOutOfStock
                        ? 'bg-rose-100 text-rose-700'
                        : isLowStock
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {isOutOfStock ? 'OUT' : `${stock} IN STOCK`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Cart & Checkout Panel (4 Cols) */}
      <div className="lg:col-span-5 xl:col-span-4 flex flex-col h-full bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Cart Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-amber-400" />
            <h2 className="text-sm font-bold">Current Order Cart</h2>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-amber-300">
            {cart.reduce((sum, item) => sum + item.quantity, 0)} Items
          </span>
        </div>

        {/* Customer Selector */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
          <div className="flex-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
              Select Customer
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none"
            >
              <option value="">👤 Walk-in Customer (Guest)</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  👤 {c.fullName} ({c.phone})
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setShowNewCustomerModal(true)}
            className="mt-4 p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
            title="Register new customer"
          >
            <UserPlus className="w-4 h-4" />
          </button>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <ShoppingCart className="w-12 h-12 stroke-1 mb-2 text-slate-300" />
              <p className="text-xs font-bold text-slate-600">Your cart is empty</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Click products from the catalog to add items to this order.
              </p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.productId} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <div className="flex-1 min-w-0 pr-2">
                  <p className="font-bold text-slate-900 truncate">{item.productName}</p>
                  <p className="text-[10px] text-slate-500">
                    ₦{item.unitPrice.toLocaleString()} × {item.quantity} ({item.unit})
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-white border border-slate-200 rounded-lg">
                    <button
                      onClick={() => handleUpdateQty(item.productId, -1)}
                      className="p-1 hover:bg-slate-100 text-slate-600 rounded-l-lg"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="px-2 font-bold text-xs text-slate-900">{item.quantity}</span>
                    <button
                      onClick={() => handleUpdateQty(item.productId, 1)}
                      className="p-1 hover:bg-slate-100 text-slate-600 rounded-r-lg"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <span className="font-extrabold text-emerald-800 w-16 text-right">
                    ₦{item.subtotal.toLocaleString()}
                  </span>

                  <button
                    onClick={() => handleRemoveItem(item.productId)}
                    className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Payment & Checkout Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
          {/* Discount & Totals */}
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600 font-medium">
              <span>Subtotal:</span>
              <span className="font-bold text-slate-900">₦{cartSubtotal.toLocaleString()}</span>
            </div>

            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-amber-600" /> Discount (₦):
              </span>
              <input
                type="number"
                min="0"
                value={discountAmount || ''}
                onChange={(e) => setDiscountAmount(Number(e.target.value))}
                placeholder="0"
                className="w-24 px-2 py-0.5 bg-white border border-slate-200 rounded text-right text-xs font-bold text-slate-900 focus:outline-none"
              />
            </div>

            <div className="flex justify-between text-base font-extrabold text-slate-900 pt-2 border-t border-slate-200">
              <span>Total Payable:</span>
              <span className="text-emerald-700">₦{cartTotal.toLocaleString()}</span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
              Payment Method
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['CASH', 'POS', 'BANK_TRANSFER'] as PaymentMethod[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPaymentMethod(mode)}
                  className={`py-1.5 px-2 rounded-lg text-[10px] font-extrabold uppercase transition-colors border ${
                    paymentMethod === mode
                      ? 'bg-slate-900 text-amber-300 border-slate-900 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Payment Reference for POS/Transfer */}
          {(paymentMethod === 'POS' || paymentMethod === 'BANK_TRANSFER') && (
            <input
              type="text"
              placeholder={`Enter ${paymentMethod} transaction reference / RRR...`}
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none"
            />
          )}

          {/* Complete Sale Button */}
          <button
            disabled={cart.length === 0}
            onClick={handleCheckout}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 text-xs uppercase tracking-wider transition-all"
          >
            <Receipt className="w-4 h-4 text-amber-300" /> Complete Sale & Print Receipt
          </button>
        </div>
      </div>

      {/* New Customer Modal */}
      {showNewCustomerModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-600" /> Register New Customer
              </h3>
              <button
                onClick={() => setShowNewCustomerModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="e.g. Alhaji Garba Shehu"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone Number *</label>
                <input
                  type="text"
                  required
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="+234 803 000 0000"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={newCustEmail}
                  onChange={(e) => setNewCustEmail(e.target.value)}
                  placeholder="customer@farm.com"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Farm / Delivery Address</label>
                <input
                  type="text"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  placeholder="KM 5 Zaria Road, Kano"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewCustomerModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-xs"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Completed Sale Receipt Modal */}
      {completedSale && (
        <ReceiptModal
          sale={completedSale}
          branch={activeBranch}
          onClose={() => setCompletedSale(null)}
        />
      )}
    </div>
  );
};
