import React, { useState, useEffect, useRef } from 'react';
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
  X,
  WifiOff,
  Loader2,
  Scan,
  Barcode,
  Keyboard,
  Volume2,
  VolumeX,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Coins
} from 'lucide-react';
import {
  Product,
  BranchInventory,
  Branch,
  Customer,
  PaymentMethod,
  PaymentStatus,
  Sale,
  SaleItem,
  User,
  ProductCategory,
  CompanySettings
} from '../../types';
import { ReceiptModal } from './ReceiptModal';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { useNetworkStatus } from '../../offline/networkStatus';
import {
  findProductByBarcode,
  playScanFeedbackSound
} from '../../services/barcodeService';

interface POSModuleProps {
  products: Product[];
  inventory: BranchInventory[];
  activeBranch?: Branch | null;
  branches?: Branch[];
  customers: Customer[];
  currentUser: User;
  onCompleteSale: (newSale: Sale) => void;
  onAddCustomer: (customer: Customer) => void;
  companySettings?: CompanySettings;
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
  onAddCustomer,
  companySettings
}) => {
  const { isOnline } = useNetworkStatus();
  const currentBranch = activeBranch || branches[0] || null;

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Fast Barcode Input & Scanner Modal
  const [quickBarcodeInput, setQuickBarcodeInput] = useState('');
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
  const [scanAlertBanner, setScanAlertBanner] = useState<{
    type: 'success' | 'error' | 'warning';
    message: string;
  } | null>(null);

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [paymentReference, setPaymentReference] = useState('');
  const [amountPaidInput, setAmountPaidInput] = useState<string>('');
  const [creditDueDate, setCreditDueDate] = useState<string>(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split('T')[0];
  });
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saleBannerMessage, setSaleBannerMessage] = useState<string | null>(null);

  // Duplicate Sale Prevention Lock
  const lastSubmitTimeRef = useRef<number>(0);

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

  // Hardware USB/Bluetooth Barcode Scanner Keyboard Listener
  useEffect(() => {
    let keyBuffer = '';
    let lastKeyTime = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      // If user is actively typing in a standard text input (except barcode-quick-input), don't intercept
      const target = e.target as HTMLElement;
      const isInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
      if (isInput && target.id !== 'barcode-quick-input') {
        return;
      }

      const now = Date.now();
      // Hardware scanners send keystrokes within 20-50ms of each other
      if (now - lastKeyTime > 90) {
        keyBuffer = '';
      }
      lastKeyTime = now;

      if (e.key === 'Enter') {
        if (keyBuffer.length >= 3) {
          e.preventDefault();
          handleProcessBarcodeScan(keyBuffer.trim());
          keyBuffer = '';
        }
      } else if (e.key.length === 1) {
        keyBuffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [products, inventory, currentBranch, cart]);

  // Barcode Processing Logic
  const handleProcessBarcodeScan = (code: string): { success: boolean; message: string } => {
    const cleanCode = code.trim();
    if (!cleanCode) return { success: false, message: 'Empty barcode' };

    const product = findProductByBarcode(cleanCode, products);

    if (!product) {
      playScanFeedbackSound('error');
      const msg = `Unknown Barcode: No product matching "${cleanCode}"`;
      setScanAlertBanner({ type: 'error', message: msg });
      setTimeout(() => setScanAlertBanner(null), 5000);
      return { success: false, message: msg };
    }

    const availableStock = getBranchStock(product.id);
    const branchName = currentBranch?.name || 'Active Branch';

    if (availableStock <= 0) {
      playScanFeedbackSound('error');
      const msg = `Out of Stock: "${product.name}" has 0 stock at ${branchName}.`;
      setScanAlertBanner({ type: 'error', message: msg });
      setTimeout(() => setScanAlertBanner(null), 5000);
      return { success: false, message: msg };
    }

    const existingCartItem = cart.find((i) => i.productId === product.id);

    if (existingCartItem) {
      if (existingCartItem.quantity >= availableStock) {
        playScanFeedbackSound('warning');
        const msg = `Stock Limit Reached: Cannot add more "${product.name}". Max available: ${availableStock}.`;
        setScanAlertBanner({ type: 'warning', message: msg });
        setTimeout(() => setScanAlertBanner(null), 5000);
        return { success: false, message: msg };
      }

      // Increment quantity
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

      playScanFeedbackSound('success');
      const msg = `Scanned +1 "${product.name}" (Cart Qty: ${existingCartItem.quantity + 1})`;
      setScanAlertBanner({ type: 'success', message: msg });
      setTimeout(() => setScanAlertBanner(null), 3000);
      return { success: true, message: msg };
    } else {
      // Add new item to cart
      setCart([
        ...cart,
        {
          id: 'item-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          barcode: product.barcode,
          unit: product.unit,
          unitPrice: product.sellingPrice,
          quantity: 1,
          subtotal: product.sellingPrice,
          discount: 0,
          availableStock
        }
      ]);

      playScanFeedbackSound('success');
      const msg = `Added "${product.name}" to cart (₦${product.sellingPrice.toLocaleString()})`;
      setScanAlertBanner({ type: 'success', message: msg });
      setTimeout(() => setScanAlertBanner(null), 3000);
      return { success: true, message: msg };
    }
  };

  // Quick Barcode Form Submit
  const handleQuickBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickBarcodeInput.trim()) return;
    handleProcessBarcodeScan(quickBarcodeInput);
    setQuickBarcodeInput('');
  };

  // Manual Add from Product Catalog Grid
  const handleAddToCart = (product: Product) => {
    handleProcessBarcodeScan(product.barcode || product.sku);
  };

  const handleUpdateQty = (productId: string, delta: number) => {
    setCart(
      cart
        .map((item) => {
          if (item.productId === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > item.availableStock) {
              setScanAlertBanner({
                type: 'warning',
                message: `Maximum stock for "${item.productName}" is ${item.availableStock}.`
              });
              setTimeout(() => setScanAlertBanner(null), 3000);
              return item;
            }
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

  const handleSetExactQty = (productId: string, qtyStr: string) => {
    const val = parseInt(qtyStr, 10);
    if (isNaN(val) || val <= 0) return;

    setCart(
      cart.map((item) => {
        if (item.productId === productId) {
          const clamped = Math.min(val, item.availableStock);
          return {
            ...item,
            quantity: clamped,
            subtotal: clamped * item.unitPrice
          };
        }
        return item;
      })
    );
  };

  const handleRemoveItem = (productId: string) => {
    setCart(cart.filter((i) => i.productId !== productId));
  };

  // Calculate Subtotal & Total
  const cartSubtotal = cart.reduce((acc, item) => acc + item.subtotal, 0);
  const cartTotal = Math.max(0, cartSubtotal - discountAmount);

  // Compute amount paid and balance due
  const rawAmountPaid =
    amountPaidInput === ''
      ? paymentMethod === 'CREDIT'
        ? 0
        : cartTotal
      : Math.max(0, Number(amountPaidInput));

  const amountPaid = Math.min(cartTotal, rawAmountPaid);
  const balanceDue = Math.max(0, cartTotal - amountPaid);
  const isCreditOrPartial = paymentMethod === 'CREDIT' || balanceDue > 0;
  const paymentStatus: PaymentStatus =
    balanceDue === 0 ? 'PAID' : amountPaid > 0 ? 'PARTIAL' : 'UNPAID';

  // Fast Cash Presets
  const handleApplyCashPreset = (presetAmount: number) => {
    setAmountPaidInput(presetAmount.toString());
  };

  // Complete Sale with Duplicate Prevention
  const handleCheckout = () => {
    const now = Date.now();
    // Debounce guard: block clicks within 2.5 seconds
    if (now - lastSubmitTimeRef.current < 2500) {
      return;
    }
    lastSubmitTimeRef.current = now;

    if (cart.length === 0 || isSubmitting) return;

    if (isCreditOrPartial && !selectedCustomerId) {
      alert('A registered customer account must be selected to issue credit or record partial payment.');
      return;
    }

    // Strict Branch Stock Protection
    for (const item of cart) {
      const currentStock = getBranchStock(item.productId);
      if (item.quantity > currentStock) {
        alert(
          `Insufficient stock at ${currentBranch?.name || 'this branch'} for "${item.productName}". Available: ${currentStock}, Requested: ${item.quantity}`
        );
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const selectedCust = customers.find((c) => c.id === selectedCustomerId);
      const uniqueId = `sale-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const receiptNo = `RA-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const newSale: Sale = {
        id: uniqueId,
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
        amountPaid,
        balanceDue,
        paymentStatus,
        creditDueDate: balanceDue > 0 ? creditDueDate : undefined,
        paymentMethod,
        paymentReference: paymentReference || undefined,
        status: 'COMPLETED',
        staffUserId: currentUser.id,
        staffName: currentUser.name,
        date: new Date().toISOString().split('T')[0],
        timestamp: new Date().toISOString(),
        syncStatus: isOnline ? 'synced' : 'pending'
      };

      onCompleteSale(newSale);
      setCompletedSale(newSale);

      playScanFeedbackSound('success');

      if (!isOnline) {
        setSaleBannerMessage(
          '✓ Sale saved offline. This transaction is stored locally on this device and will synchronize automatically when connected.'
        );
      } else {
        setSaleBannerMessage('✓ Sale created and queued for synchronization.');
      }

      setTimeout(() => setSaleBannerMessage(null), 8000);

      // Reset cart and inputs
      setCart([]);
      setDiscountAmount(0);
      setAmountPaidInput('');
      setPaymentReference('');
    } finally {
      setIsSubmitting(false);
    }
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

  // Filter products for catalog grid
  const filteredProducts = products.filter((p) => {
    if (p.status !== 'ACTIVE') return false;
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
    <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 min-h-0 lg:h-[calc(100vh-7rem)]">
      {/* Top Banner Alert (Offline / Sale Confirmation / Scanner alerts) */}
      {scanAlertBanner && (
        <div
          className={`col-span-12 p-3 rounded-2xl border text-xs font-bold flex items-center justify-between shadow-xs animate-in slide-in-from-top-2 ${
            scanAlertBanner.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : scanAlertBanner.type === 'warning'
              ? 'bg-amber-50 text-amber-900 border-amber-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {scanAlertBanner.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            {scanAlertBanner.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-600" />}
            {scanAlertBanner.type === 'error' && <ShieldAlert className="w-4 h-4 text-rose-600" />}
            <span>{scanAlertBanner.message}</span>
          </div>
          <button
            onClick={() => setScanAlertBanner(null)}
            className="p-1 hover:bg-black/5 rounded-md cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {!isOnline && (
        <div className="col-span-12 p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2.5 text-xs text-amber-900">
          <WifiOff className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Offline POS Active:</strong> Sales validated against local browser inventory and queued for auto-sync.
          </span>
        </div>
      )}

      {saleBannerMessage && (
        <div className="col-span-12 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs font-bold text-emerald-900">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{saleBannerMessage}</span>
          </div>
          <button onClick={() => setSaleBannerMessage(null)}>
            <X className="w-3.5 h-3.5 text-emerald-700" />
          </button>
        </div>
      )}

      {/* LEFT COLUMN: Fast Barcode Scanner Header + Product Catalog Grid (7 Cols) */}
      <div className="lg:col-span-7 flex flex-col space-y-4 min-h-0">
        {/* Fast POS Barcode Scanner Toolbar */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-[#7E9D73]/15 rounded-xl text-[#1B3022]">
                <Barcode className="w-5 h-5 text-[#7E9D73]" />
              </div>
              <div>
                <h2 className="font-extrabold text-sm text-stone-900">Fast Barcode Checkout</h2>
                <div className="flex items-center gap-2 text-[11px] text-stone-500 font-medium">
                  <span>Branch: <strong className="text-stone-800">{currentBranch?.name || 'Central'}</strong></span>
                  <span className="text-stone-300">•</span>
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    USB / Bluetooth Scanner Ready
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsScannerModalOpen(true)}
                className="px-3.5 py-2 bg-[#1B3022] hover:bg-[#284732] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Scan className="w-4 h-4 text-emerald-300" />
                <span>Camera Scanner</span>
              </button>
            </div>
          </div>

          {/* Quick Barcode Scan Input Field */}
          <form onSubmit={handleQuickBarcodeSubmit} className="flex items-center gap-2">
            <div className="relative flex-1">
              <Scan className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
              <input
                id="barcode-quick-input"
                type="text"
                placeholder="Scan or type barcode / SKU and press Enter..."
                value={quickBarcodeInput}
                onChange={(e) => setQuickBarcodeInput(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono font-bold text-stone-900 focus:outline-none focus:border-[#7E9D73] focus:bg-white transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={!quickBarcodeInput.trim()}
              className="px-4 py-2 bg-[#7E9D73] hover:bg-[#6c8a62] disabled:opacity-40 text-[#1B3022] font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Add Item
            </button>
          </form>

          {/* Search & Category Pills */}
          <div className="flex flex-col sm:flex-row items-center gap-2 pt-1 border-t border-stone-100 text-xs">
            <div className="relative flex-1 w-full">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Filter seed catalog by title or variety..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:outline-none focus:border-[#7E9D73]"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full custom-scrollbar">
              {categories.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setSelectedCategory(c.value)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-colors cursor-pointer ${
                    selectedCategory === c.value
                      ? 'bg-[#1B3022] text-white'
                      : 'bg-stone-100 text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Product Catalog Cards Grid */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredProducts.map((product) => {
              const stock = getBranchStock(product.id);
              const inCart = cart.find((i) => i.productId === product.id);

              return (
                <div
                  key={product.id}
                  onClick={() => handleAddToCart(product)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    stock <= 0
                      ? 'bg-stone-50 border-stone-200 opacity-60 pointer-events-none'
                      : inCart
                      ? 'bg-emerald-50/50 border-[#7E9D73] shadow-xs'
                      : 'bg-white border-stone-200 hover:border-[#7E9D73] shadow-2xs hover:shadow-xs'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between text-[10px] text-stone-400 font-mono mb-1">
                      <span>{product.sku}</span>
                      {product.barcode && (
                        <span className="text-emerald-700 font-bold bg-emerald-50 px-1 rounded">
                          {product.barcode}
                        </span>
                      )}
                    </div>

                    <h4 className="font-bold text-xs text-stone-900 line-clamp-2 leading-tight">
                      {product.name}
                    </h4>
                    <p className="text-[10px] text-stone-500 truncate mt-0.5">{product.seedVariety}</p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-black text-stone-900">
                        ₦{product.sellingPrice.toLocaleString()}
                      </span>
                      <span className="text-[9px] text-stone-400 block uppercase">
                        {product.unit.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="text-right">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          stock <= 0
                            ? 'bg-rose-100 text-rose-800'
                            : stock <= product.minStockLevel
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {stock} in stock
                      </span>
                      {inCart && (
                        <span className="text-[10px] text-emerald-800 font-extrabold block">
                          Cart: {inCart.quantity}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="p-12 text-center text-stone-400 bg-white rounded-2xl border border-stone-200">
              <Sprout className="w-10 h-10 text-stone-300 mx-auto mb-2" />
              <p className="font-bold text-xs text-stone-600">No matching certified seeds or products</p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Active Sale Cart & Fast Checkout Panel (5 Cols) */}
      <div className="lg:col-span-5 bg-white rounded-2xl border border-stone-200 shadow-xs flex flex-col min-h-0 overflow-hidden">
        {/* Cart Header */}
        <div className="p-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-[#7E9D73]" />
            <h3 className="font-extrabold text-sm text-stone-900">Sales Order Cart</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-stone-200 rounded-full font-mono text-xs font-bold text-stone-700">
              {cart.reduce((sum, i) => sum + i.quantity, 0)} items
            </span>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={() => setCart([])}
                className="text-[11px] text-rose-600 hover:underline font-bold cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar divide-y divide-stone-100">
          {cart.map((item) => (
            <div key={item.id} className="pt-2.5 first:pt-0 flex items-center justify-between gap-3 text-xs">
              <div className="min-w-0 flex-1">
                <p className="font-bold text-stone-900 truncate">{item.productName}</p>
                <div className="flex items-center gap-2 text-[10px] text-stone-500 font-mono mt-0.5">
                  <span>{item.sku}</span>
                  {item.barcode && <span>• Barcode: {item.barcode}</span>}
                  <span>• ₦{item.unitPrice.toLocaleString()}/{item.unit.replace('_', ' ')}</span>
                </div>
              </div>

              {/* Quantity Controls & Total */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-lg border border-stone-200">
                  <button
                    type="button"
                    onClick={() => handleUpdateQty(item.productId, -1)}
                    className="p-1 hover:bg-white rounded text-stone-700 cursor-pointer"
                  >
                    <Minus className="w-3 h-3" />
                  </button>

                  <input
                    type="number"
                    min="1"
                    max={item.availableStock}
                    value={item.quantity}
                    onChange={(e) => handleSetExactQty(item.productId, e.target.value)}
                    className="w-10 text-center font-bold text-xs bg-transparent focus:outline-none"
                  />

                  <button
                    type="button"
                    onClick={() => handleUpdateQty(item.productId, 1)}
                    disabled={item.quantity >= item.availableStock}
                    className="p-1 hover:bg-white rounded text-stone-700 disabled:opacity-30 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                <div className="text-right min-w-[70px]">
                  <p className="font-extrabold text-stone-900 font-mono">₦{item.subtotal.toLocaleString()}</p>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.productId)}
                    className="text-[10px] text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}

          {cart.length === 0 && (
            <div className="py-16 text-center text-stone-400 space-y-2">
              <ShoppingCart className="w-10 h-10 text-stone-300 mx-auto" />
              <p className="font-bold text-xs text-stone-600">Cart is empty</p>
              <p className="text-[11px] text-stone-400 max-w-xs mx-auto">
                Scan barcode sticker, use camera scanner, or click products from the catalog to add items.
              </p>
            </div>
          )}
        </div>

        {/* Customer & Payment Setup */}
        <div className="p-4 bg-stone-50/70 border-t border-stone-200 space-y-3 text-xs">
          {/* Customer Selection */}
          <div className="flex items-center gap-2">
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="flex-1 bg-white border border-stone-300 px-3 py-1.5 rounded-xl font-medium text-stone-800 focus:outline-none text-xs"
            >
              <option value="">👤 Walk-in Customer (Standard Cash)</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName} ({c.phone}) {c.creditLimit ? `• Limit ₦${c.creditLimit.toLocaleString()}` : ''}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setShowNewCustomerModal(true)}
              className="p-2 bg-white border border-stone-300 hover:bg-stone-100 rounded-xl text-stone-700 cursor-pointer"
              title="Add Customer"
            >
              <UserPlus className="w-4 h-4" />
            </button>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-stone-600">
              <span>Payment Method:</span>
              {isCreditOrPartial && (
                <span className="text-amber-800 font-extrabold">⚠️ Credit Receivable Active</span>
              )}
            </div>

            <div className="grid grid-cols-5 gap-1.5 text-center">
              {(['CASH', 'POS', 'BANK_TRANSFER', 'MOBILE_MONEY', 'CREDIT'] as PaymentMethod[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPaymentMethod(m)}
                  className={`py-1.5 px-1 rounded-xl text-[10px] font-bold uppercase transition-all cursor-pointer ${
                    paymentMethod === m
                      ? 'bg-[#1B3022] text-white shadow-xs'
                      : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  {m === 'BANK_TRANSFER' ? 'Transfer' : m === 'MOBILE_MONEY' ? 'MoMo' : m}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Cash Presets (if CASH) */}
          {paymentMethod === 'CASH' && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[10px] font-bold text-stone-600 custom-scrollbar">
              <span className="shrink-0 text-stone-400">Presets:</span>
              <button
                type="button"
                onClick={() => handleApplyCashPreset(cartTotal)}
                className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg shrink-0 cursor-pointer"
              >
                Exact (₦{cartTotal.toLocaleString()})
              </button>
              {[10000, 20000, 50000, 100000, 200000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleApplyCashPreset(preset)}
                  className="px-2 py-0.5 bg-white hover:bg-stone-100 border border-stone-200 rounded-lg shrink-0 cursor-pointer"
                >
                  ₦{preset.toLocaleString()}
                </button>
              ))}
            </div>
          )}

          {/* Amount Paid Input & Balance Due Calculation */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[10px] font-bold text-stone-500 uppercase">Amount Paid (₦):</span>
              <input
                type="number"
                placeholder={paymentMethod === 'CREDIT' ? '0' : cartTotal.toString()}
                value={amountPaidInput}
                onChange={(e) => setAmountPaidInput(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-xl font-mono font-bold text-xs text-stone-900 focus:outline-none"
              />
            </div>

            <div>
              <span className="text-[10px] font-bold text-stone-500 uppercase">
                {rawAmountPaid > cartTotal ? 'Change Due:' : 'Balance Due (Credit):'}
              </span>
              <div
                className={`px-2.5 py-1.5 rounded-xl font-mono font-extrabold text-xs border ${
                  rawAmountPaid > cartTotal
                    ? 'bg-blue-50 text-blue-900 border-blue-200'
                    : balanceDue > 0
                    ? 'bg-amber-50 text-amber-900 border-amber-200'
                    : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                }`}
              >
                ₦{Math.abs(rawAmountPaid - cartTotal).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Credit Due Date Picker if Credit or Partial */}
          {isCreditOrPartial && (
            <div className="space-y-1 bg-amber-50/80 p-2.5 rounded-xl border border-amber-200">
              <div className="flex items-center justify-between text-[11px] font-bold text-amber-950">
                <span>Credit Repayment Due Date:</span>
              </div>
              <input
                type="date"
                value={creditDueDate}
                onChange={(e) => setCreditDueDate(e.target.value)}
                className="w-full px-2.5 py-1 bg-white border border-amber-300 rounded-lg text-xs font-bold text-stone-800"
              />
            </div>
          )}

          {/* Order Financial Summary */}
          <div className="space-y-1.5 pt-2 border-t border-stone-200 text-xs">
            <div className="flex justify-between text-stone-600">
              <span>Subtotal:</span>
              <span className="font-mono font-bold text-stone-900">₦{cartSubtotal.toLocaleString()}</span>
            </div>

            <div className="flex items-center justify-between text-stone-600">
              <span>Authorized Discount (₦):</span>
              <input
                type="number"
                min="0"
                value={discountAmount || ''}
                onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value)))}
                placeholder="0"
                className="w-24 text-right px-2 py-0.5 bg-white border border-stone-300 rounded-lg font-mono text-xs font-bold"
              />
            </div>

            <div className="flex justify-between items-baseline pt-1.5 border-t border-stone-200 text-sm font-extrabold text-stone-950">
              <span>Total Invoice:</span>
              <span className="text-xl font-black font-mono text-[#1B3022]">₦{cartTotal.toLocaleString()}</span>
            </div>
          </div>

          {/* Complete Checkout Button with Duplicate Protection */}
          <button
            type="button"
            disabled={cart.length === 0 || isSubmitting}
            onClick={handleCheckout}
            className="w-full py-3 bg-[#1B3022] hover:bg-[#284732] disabled:opacity-40 text-white font-extrabold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-emerald-300" />
                <span>Processing Sale Transaction...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Complete Sale (₦{cartTotal.toLocaleString()})</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Camera Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerModalOpen}
        onClose={() => setIsScannerModalOpen(false)}
        onScan={handleProcessBarcodeScan}
        activeBranchName={currentBranch?.name}
      />

      {/* Sale Receipt Modal */}
      <ReceiptModal
        sale={completedSale}
        branch={currentBranch || undefined}
        companySettings={companySettings}
        onClose={() => setCompletedSale(null)}
      />

      {/* New Customer Inline Modal */}
      {showNewCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-sm text-stone-900">Register New Customer</h3>
              <button onClick={() => setShowNewCustomerModal(false)}>
                <X className="w-4 h-4 text-stone-400" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-stone-700">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alhaji Garba Seeds Farm"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full p-2 bg-stone-50 border rounded-xl text-xs mt-1"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700">Phone Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="0803 000 0000"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="w-full p-2 bg-stone-50 border rounded-xl text-xs mt-1"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700">Farm / Business Address</label>
                <input
                  type="text"
                  placeholder="Farm location, Village/LGA"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  className="w-full p-2 bg-stone-50 border rounded-xl text-xs mt-1"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewCustomerModal(false)}
                  className="px-4 py-2 bg-stone-100 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1B3022] text-white font-bold rounded-xl"
                >
                  Save & Select
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
