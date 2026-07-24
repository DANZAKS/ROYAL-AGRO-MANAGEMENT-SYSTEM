import {
  Branch,
  User,
  Product,
  BranchInventory,
  Customer,
  Supplier,
  Sale,
  StockTransfer,
  Expense,
  NotificationItem,
  AuditLog,
  StockMovement,
  PurchaseOrder
} from '../types';

export const INITIAL_BRANCHES: Branch[] = [
  {
    id: 'br-1',
    code: 'RA-KNO',
    name: 'Kano Central Hub',
    state: 'Kano',
    address: 'Plot 42 Farm Center Road, Tarauni, Kano',
    phone: '+234 803 111 2233',
    managerId: 'usr-2',
    managerName: 'Fatima Abubakar',
    status: 'ACTIVE',
    createdAt: '2024-01-15'
  },
  {
    id: 'br-2',
    code: 'RA-ABJ',
    name: 'Abuja Main Depot',
    state: 'FCT Abuja',
    address: 'Suite 12 Agro Market, Gwagwalada, Abuja',
    phone: '+234 802 333 4455',
    managerId: 'usr-3',
    managerName: 'Emeka Okonkwo',
    status: 'ACTIVE',
    createdAt: '2024-02-10'
  },
  {
    id: 'br-3',
    code: 'RA-KAD',
    name: 'Kaduna Grain Branch',
    state: 'Kaduna',
    address: 'KM 8 Kachia Road, Kaduna South',
    phone: '+234 805 444 5566',
    managerId: null,
    managerName: 'Pending Assignment',
    status: 'ACTIVE',
    createdAt: '2024-03-20'
  },
  {
    id: 'br-4',
    code: 'RA-IBD',
    name: 'Ibadan Regional Depot',
    state: 'Oyo',
    address: 'Bodija Market Agro Complex, Ibadan',
    phone: '+234 807 555 6677',
    managerId: null,
    managerName: 'Pending Assignment',
    status: 'ACTIVE',
    createdAt: '2024-05-12'
  },
  {
    id: 'br-5',
    code: 'RA-ENG',
    name: 'Enugu Agro Hub',
    state: 'Enugu',
    address: 'Ogbete Main Market Road, Enugu',
    phone: '+234 809 666 7788',
    managerId: null,
    managerName: 'Pending Assignment',
    status: 'ACTIVE',
    createdAt: '2024-06-01'
  },
  {
    id: 'br-6',
    code: 'RA-SKT',
    name: 'Sokoto Seed Station',
    state: 'Sokoto',
    address: 'Gwadabawa Highway, Sokoto',
    phone: '+234 803 777 8899',
    managerId: null,
    managerName: 'Pending Assignment',
    status: 'ACTIVE',
    createdAt: '2024-07-10'
  }
];

export const INITIAL_USERS: User[] = [
  {
    id: 'usr-1',
    name: 'Alhaji Dahiru Royal',
    email: 'ceo@royalagro.com',
    role: 'CEO',
    branchId: null,
    phone: '+234 801 000 0001',
    status: 'ACTIVE',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
    createdAt: '2024-01-01',
    lastLogin: '2026-07-22 08:30'
  },
  {
    id: 'usr-2',
    name: 'Fatima Abubakar',
    email: 'fatima.kano@royalagro.com',
    role: 'BRANCH_MANAGER',
    branchId: 'br-1',
    phone: '+234 803 111 2233',
    status: 'ACTIVE',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200',
    createdAt: '2024-01-15',
    lastLogin: '2026-07-22 09:12'
  },
  {
    id: 'usr-3',
    name: 'Emeka Okonkwo',
    email: 'emeka.abuja@royalagro.com',
    role: 'BRANCH_MANAGER',
    branchId: 'br-2',
    phone: '+234 802 333 4455',
    status: 'ACTIVE',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200',
    createdAt: '2024-02-10',
    lastLogin: '2026-07-21 17:45'
  },
  {
    id: 'usr-4',
    name: 'Ibrahim Bello',
    email: 'ibrahim.cashier@royalagro.com',
    role: 'SALES_STAFF',
    branchId: 'br-1',
    phone: '+234 803 999 0011',
    status: 'ACTIVE',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200',
    createdAt: '2024-02-01',
    lastLogin: '2026-07-22 10:05'
  },
  {
    id: 'usr-5',
    name: 'Chidi Eze',
    email: 'chidi.inventory@royalagro.com',
    role: 'INVENTORY_OFFICER',
    branchId: 'br-1',
    phone: '+234 805 888 1122',
    status: 'ACTIVE',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=200',
    createdAt: '2024-02-15',
    lastLogin: '2026-07-22 07:50'
  },
  {
    id: 'usr-6',
    name: 'Aisha Garba',
    email: 'aisha.abuja@royalagro.com',
    role: 'SALES_STAFF',
    branchId: 'br-2',
    phone: '+234 808 777 3344',
    status: 'ACTIVE',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=200',
    createdAt: '2024-03-01',
    lastLogin: '2026-07-22 09:30'
  }
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    sku: 'SEED-MZE-719',
    name: 'Royal Hybrid Maize Seed SC719',
    seedVariety: 'Hybrid SC719 High Yield White Grain',
    description: 'Drought tolerant high yield hybrid maize certified seed. Matures in 110 days.',
    category: 'SEEDS',
    unit: 'BAG_50KG',
    purchasePrice: 28000,
    sellingPrice: 38500,
    minStockLevel: 25,
    imageUrl: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&q=80&w=600',
    status: 'ACTIVE',
    createdAt: '2024-01-10'
  },
  {
    id: 'prod-2',
    sku: 'SEED-RIC-F44',
    name: 'Certified Faro 44 Rice Seed',
    seedVariety: 'Faro 44 (Siipi) Long Grain',
    description: 'High germination long grain rice seed suitable for lowland and irrigated fields.',
    category: 'SEEDS',
    unit: 'BAG_50KG',
    purchasePrice: 32000,
    sellingPrice: 42000,
    minStockLevel: 30,
    imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=600',
    status: 'ACTIVE',
    createdAt: '2024-01-12'
  },
  {
    id: 'prod-3',
    sku: 'SEED-CWP-14',
    name: 'SAMPEA 14 Cowpea Seed',
    seedVariety: 'SAMPEA 14 Pest Resistant Beans',
    description: 'Early maturing Maruca-resistant cowpea certified seed.',
    category: 'SEEDS',
    unit: 'PACK',
    purchasePrice: 4500,
    sellingPrice: 6800,
    minStockLevel: 50,
    imageUrl: 'https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?auto=format&fit=crop&q=80&w=600',
    status: 'ACTIVE',
    createdAt: '2024-01-15'
  },
  {
    id: 'prod-4',
    sku: 'FERT-NPK-1515',
    name: 'NPK 15-15-15 Multi-Crop Fertilizer',
    seedVariety: 'Balanced NPK Mineral Blend',
    description: 'Balanced compound fertilizer for soil enrichment during planting season.',
    category: 'FERTILIZERS',
    unit: 'BAG_50KG',
    purchasePrice: 38000,
    sellingPrice: 48500,
    minStockLevel: 40,
    imageUrl: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&q=80&w=600',
    status: 'ACTIVE',
    createdAt: '2024-01-18'
  },
  {
    id: 'prod-5',
    sku: 'FERT-UREA-46',
    name: 'Urea 46% Nitrogen Granular',
    seedVariety: 'High Nitrogen Booster',
    description: '46% Pure nitrogen granular urea for rapid vegetative growth and crop yield boost.',
    category: 'FERTILIZERS',
    unit: 'BAG_50KG',
    purchasePrice: 36000,
    sellingPrice: 45000,
    minStockLevel: 35,
    imageUrl: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb231fc?auto=format&fit=crop&q=80&w=600',
    status: 'ACTIVE',
    createdAt: '2024-01-20'
  },
  {
    id: 'prod-6',
    sku: 'SEED-TOM-5005',
    name: 'Hybrid Tomato NP-5005',
    seedVariety: 'NP-5005 Firm Round Hybrid Tomato',
    description: 'Bacterial wilt resistant high yielding firm tomato seed for open field farming.',
    category: 'SEEDS',
    unit: 'SACHET',
    purchasePrice: 1200,
    sellingPrice: 2200,
    minStockLevel: 100,
    imageUrl: 'https://images.unsplash.com/photo-1592841200221-a6898f307baa?auto=format&fit=crop&q=80&w=600',
    status: 'ACTIVE',
    createdAt: '2024-02-01'
  },
  {
    id: 'prod-7',
    sku: 'AGRO-GLY-480',
    name: 'Glyphosate 480SL Herbicide',
    seedVariety: 'Systemic Non-Selective Herbicide',
    description: 'Systemic broad-spectrum weed killer for field land clearing before planting.',
    category: 'AGROCHEMICALS',
    unit: 'CARTON',
    purchasePrice: 42000,
    sellingPrice: 56000,
    minStockLevel: 15,
    imageUrl: 'https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&q=80&w=600',
    status: 'ACTIVE',
    createdAt: '2024-02-05'
  },
  {
    id: 'prod-8',
    sku: 'EQP-SOLAR-PUMP',
    name: 'Solar Farm Irrigation Pump Kit',
    seedVariety: '2HP Submersible Solar Pump',
    description: 'Off-grid solar powered water pump with PV controller for drip and spray irrigation.',
    category: 'EQUIPMENT',
    unit: 'PIECE',
    purchasePrice: 320000,
    sellingPrice: 425000,
    minStockLevel: 5,
    imageUrl: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&q=80&w=600',
    status: 'ACTIVE',
    createdAt: '2024-02-10'
  },
  {
    id: 'prod-9',
    sku: 'SEED-MELON-SB',
    name: 'Watermelon Sugar Baby F1 Seed',
    seedVariety: 'Sugar Baby Deep Red Hybrid',
    description: 'Sweet, high sugar content hybrid watermelon with dark green rind.',
    category: 'SEEDS',
    unit: 'SACHET',
    purchasePrice: 1500,
    sellingPrice: 2800,
    minStockLevel: 60,
    imageUrl: 'https://images.unsplash.com/photo-1587049352847-4a222e784d38?auto=format&fit=crop&q=80&w=600',
    status: 'ACTIVE',
    createdAt: '2024-02-15'
  },
  {
    id: 'prod-10',
    sku: 'SEED-SRG-17',
    name: 'SAMSORG 17 Sorghum Grain Seed',
    seedVariety: 'SAMSORG 17 White Sorghum',
    description: 'Striga resistant white grain sorghum seed ideal for northern drier regions.',
    category: 'SEEDS',
    unit: 'KG',
    purchasePrice: 1800,
    sellingPrice: 2900,
    minStockLevel: 100,
    imageUrl: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=600',
    status: 'ACTIVE',
    createdAt: '2024-02-20'
  }
];

export const INITIAL_BRANCH_INVENTORY: BranchInventory[] = [
  // Kano Central Hub
  { id: 'inv-1', branchId: 'br-1', productId: 'prod-1', quantity: 120, reorderLevel: 25, lastUpdated: '2026-07-20' },
  { id: 'inv-2', branchId: 'br-1', productId: 'prod-2', quantity: 85, reorderLevel: 30, lastUpdated: '2026-07-20' },
  { id: 'inv-3', branchId: 'br-1', productId: 'prod-3', quantity: 210, reorderLevel: 50, lastUpdated: '2026-07-21' },
  { id: 'inv-4', branchId: 'br-1', productId: 'prod-4', quantity: 15, reorderLevel: 40, lastUpdated: '2026-07-21' }, // Low stock!
  { id: 'inv-5', branchId: 'br-1', productId: 'prod-5', quantity: 90, reorderLevel: 35, lastUpdated: '2026-07-21' },
  { id: 'inv-6', branchId: 'br-1', productId: 'prod-6', quantity: 340, reorderLevel: 100, lastUpdated: '2026-07-21' },
  { id: 'inv-7', branchId: 'br-1', productId: 'prod-7', quantity: 0, reorderLevel: 15, lastUpdated: '2026-07-22' }, // Out of stock!
  { id: 'inv-8', branchId: 'br-1', productId: 'prod-8', quantity: 8, reorderLevel: 5, lastUpdated: '2026-07-20' },
  { id: 'inv-9', branchId: 'br-1', productId: 'prod-9', quantity: 140, reorderLevel: 60, lastUpdated: '2026-07-21' },
  { id: 'inv-10', branchId: 'br-1', productId: 'prod-10', quantity: 450, reorderLevel: 100, lastUpdated: '2026-07-22' },

  // Abuja Main Depot
  { id: 'inv-11', branchId: 'br-2', productId: 'prod-1', quantity: 60, reorderLevel: 25, lastUpdated: '2026-07-21' },
  { id: 'inv-12', branchId: 'br-2', productId: 'prod-2', quantity: 110, reorderLevel: 30, lastUpdated: '2026-07-21' },
  { id: 'inv-13', branchId: 'br-2', productId: 'prod-3', quantity: 95, reorderLevel: 50, lastUpdated: '2026-07-21' },
  { id: 'inv-14', branchId: 'br-2', productId: 'prod-4', quantity: 80, reorderLevel: 40, lastUpdated: '2026-07-21' },
  { id: 'inv-15', branchId: 'br-2', productId: 'prod-5', quantity: 10, reorderLevel: 35, lastUpdated: '2026-07-22' }, // Low stock!
  { id: 'inv-16', branchId: 'br-2', productId: 'prod-6', quantity: 180, reorderLevel: 100, lastUpdated: '2026-07-22' },
  { id: 'inv-17', branchId: 'br-2', productId: 'prod-7', quantity: 28, reorderLevel: 15, lastUpdated: '2026-07-20' },
  { id: 'inv-18', branchId: 'br-2', productId: 'prod-8', quantity: 2, reorderLevel: 5, lastUpdated: '2026-07-20' }, // Low stock!

  // Kaduna Grain Branch
  { id: 'inv-19', branchId: 'br-3', productId: 'prod-1', quantity: 45, reorderLevel: 25, lastUpdated: '2026-07-20' },
  { id: 'inv-20', branchId: 'br-3', productId: 'prod-2', quantity: 70, reorderLevel: 30, lastUpdated: '2026-07-20' },
  { id: 'inv-21', branchId: 'br-3', productId: 'prod-4', quantity: 50, reorderLevel: 40, lastUpdated: '2026-07-20' },

  // Ibadan Regional Depot
  { id: 'inv-22', branchId: 'br-4', productId: 'prod-1', quantity: 30, reorderLevel: 25, lastUpdated: '2026-07-19' },
  { id: 'inv-23', branchId: 'br-4', productId: 'prod-6', quantity: 250, reorderLevel: 100, lastUpdated: '2026-07-19' },
  { id: 'inv-24', branchId: 'br-4', productId: 'prod-9', quantity: 90, reorderLevel: 60, lastUpdated: '2026-07-19' },

  // Enugu Agro Hub
  { id: 'inv-25', branchId: 'br-5', productId: 'prod-2', quantity: 40, reorderLevel: 30, lastUpdated: '2026-07-18' },
  { id: 'inv-26', branchId: 'br-5', productId: 'prod-4', quantity: 35, reorderLevel: 40, lastUpdated: '2026-07-18' },

  // Sokoto Seed Station
  { id: 'inv-27', branchId: 'br-6', productId: 'prod-10', quantity: 300, reorderLevel: 100, lastUpdated: '2026-07-18' }
];

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1',
    fullName: 'Alhaji Sani Dantata Farms',
    phone: '+234 803 555 1212',
    email: 'info@dantatafarms.ng',
    address: 'KM 14 Zaria Road, Kano',
    state: 'Kano',
    totalPurchases: 18,
    totalSpent: 3450000,
    registeredBranchId: 'br-1',
    createdAt: '2024-01-20'
  },
  {
    id: 'cust-2',
    fullName: 'Green Valley Farmers Co-op',
    phone: '+234 802 666 2323',
    email: 'contact@greenvalleycoop.org',
    address: 'Agro Industrial Estate, Gwagwalada',
    state: 'FCT Abuja',
    totalPurchases: 24,
    totalSpent: 4890000,
    registeredBranchId: 'br-2',
    createdAt: '2024-02-05'
  },
  {
    id: 'cust-3',
    fullName: 'Dr. Kabir Usman',
    phone: '+234 805 777 3434',
    email: 'kabir.usman@agrimail.com',
    address: 'Plot 8 Farm Settlement, Kaduna',
    state: 'Kaduna',
    totalPurchases: 7,
    totalSpent: 820000,
    registeredBranchId: 'br-3',
    createdAt: '2024-03-12'
  },
  {
    id: 'cust-4',
    fullName: 'Oyo State Rice Growers Association',
    phone: '+234 807 888 4545',
    email: 'ricegrowers.oyo@gmail.com',
    address: 'Iseyin Road Complex, Oyo State',
    state: 'Oyo',
    totalPurchases: 12,
    totalSpent: 2150000,
    registeredBranchId: 'br-4',
    createdAt: '2024-05-18'
  },
  {
    id: 'cust-5',
    fullName: 'Chief Nnamdi Igwe Commercials',
    phone: '+234 809 999 5656',
    email: 'igwefarms@yahoo.com',
    address: '9 Nike Lake Road, Enugu',
    state: 'Enugu',
    totalPurchases: 5,
    totalSpent: 640000,
    registeredBranchId: 'br-5',
    createdAt: '2024-06-10'
  }
];

export const INITIAL_SUPPLIERS: Supplier[] = [
  {
    id: 'sup-1',
    companyName: 'National Seed Development Council Ltd',
    contactPerson: 'Engr. Sanusi Garba',
    phone: '+234 803 100 2000',
    email: 'supply@nsdc.gov.ng',
    address: 'Plot 104 Seed Village, Sheda, Abuja',
    categoriesSupplied: ['SEEDS', 'SEEDLINGS'],
    status: 'ACTIVE',
    createdAt: '2024-01-05'
  },
  {
    id: 'sup-2',
    companyName: 'Premier Seeds West Africa Ltd',
    contactPerson: 'Mrs. Janet Adesina',
    phone: '+234 802 200 3000',
    email: 'orders@premierseeds.com.ng',
    address: 'Zaria Road Industrial Area, Kaduna',
    categoriesSupplied: ['SEEDS'],
    status: 'ACTIVE',
    createdAt: '2024-01-08'
  },
  {
    id: 'sup-3',
    companyName: 'Notore Chemical Industries Plc',
    contactPerson: 'Mallam Shehu Balarabe',
    phone: '+234 805 300 4000',
    email: 'fertilizer@notore.com',
    address: 'Onne Oil & Gas Free Zone, Rivers State',
    categoriesSupplied: ['FERTILIZERS', 'CROP_CARE'],
    status: 'ACTIVE',
    createdAt: '2024-01-12'
  },
  {
    id: 'sup-4',
    companyName: 'Syngenta Agro Sciences Nigeria',
    contactPerson: 'Dr. Michael Okafor',
    phone: '+234 807 400 5000',
    email: 'sales.ng@syngenta.com',
    address: 'Victoria Island Commercial Hub, Lagos',
    categoriesSupplied: ['AGROCHEMICALS', 'CROP_CARE'],
    status: 'ACTIVE',
    createdAt: '2024-01-25'
  }
];

export const INITIAL_SALES: Sale[] = [
  {
    id: 'sale-1',
    receiptNo: 'RA-2026-0891',
    branchId: 'br-1',
    branchName: 'Kano Central Hub',
    customerId: 'cust-1',
    customerName: 'Alhaji Sani Dantata Farms',
    customerPhone: '+234 803 555 1212',
    items: [
      {
        id: 'si-1',
        productId: 'prod-1',
        productName: 'Royal Hybrid Maize Seed SC719',
        sku: 'SEED-MZE-719',
        unit: 'BAG_50KG',
        unitPrice: 38500,
        quantity: 10,
        subtotal: 385000,
        discount: 5000
      },
      {
        id: 'si-2',
        productId: 'prod-4',
        productName: 'NPK 15-15-15 Multi-Crop Fertilizer',
        sku: 'FERT-NPK-1515',
        unit: 'BAG_50KG',
        unitPrice: 48500,
        quantity: 15,
        subtotal: 727500,
        discount: 7500
      }
    ],
    subtotal: 1112500,
    tax: 0,
    discount: 12500,
    totalAmount: 1100000,
    paymentMethod: 'BANK_TRANSFER',
    paymentReference: 'TRF-KNO-99281',
    status: 'COMPLETED',
    staffUserId: 'usr-4',
    staffName: 'Ibrahim Bello',
    date: '2026-07-22',
    timestamp: '2026-07-22T09:15:00Z'
  },
  {
    id: 'sale-2',
    receiptNo: 'RA-2026-0892',
    branchId: 'br-2',
    branchName: 'Abuja Main Depot',
    customerId: 'cust-2',
    customerName: 'Green Valley Farmers Co-op',
    customerPhone: '+234 802 666 2323',
    items: [
      {
        id: 'si-3',
        productId: 'prod-2',
        productName: 'Certified Faro 44 Rice Seed',
        sku: 'SEED-RIC-F44',
        unit: 'BAG_50KG',
        unitPrice: 42000,
        quantity: 8,
        subtotal: 336000,
        discount: 0
      },
      {
        id: 'si-4',
        productId: 'prod-5',
        productName: 'Urea 46% Nitrogen Granular',
        sku: 'FERT-UREA-46',
        unit: 'BAG_50KG',
        unitPrice: 45000,
        quantity: 10,
        subtotal: 450000,
        discount: 10000
      }
    ],
    subtotal: 786000,
    tax: 0,
    discount: 10000,
    totalAmount: 776000,
    paymentMethod: 'POS',
    paymentReference: 'POS-ABJ-11029',
    status: 'COMPLETED',
    staffUserId: 'usr-6',
    staffName: 'Aisha Garba',
    date: '2026-07-22',
    timestamp: '2026-07-22T10:05:00Z'
  },
  {
    id: 'sale-3',
    receiptNo: 'RA-2026-0890',
    branchId: 'br-1',
    branchName: 'Kano Central Hub',
    customerName: 'Walk-in Farmer (Gwarzo)',
    items: [
      {
        id: 'si-5',
        productId: 'prod-6',
        productName: 'Hybrid Tomato NP-5005',
        sku: 'SEED-TOM-5005',
        unit: 'SACHET',
        unitPrice: 2200,
        quantity: 20,
        subtotal: 44000,
        discount: 0
      },
      {
        id: 'si-6',
        productId: 'prod-9',
        productName: 'Watermelon Sugar Baby F1 Seed',
        sku: 'SEED-MELON-SB',
        unit: 'SACHET',
        unitPrice: 2800,
        quantity: 10,
        subtotal: 28000,
        discount: 0
      }
    ],
    subtotal: 72000,
    tax: 0,
    discount: 0,
    totalAmount: 72000,
    paymentMethod: 'CASH',
    status: 'COMPLETED',
    staffUserId: 'usr-4',
    staffName: 'Ibrahim Bello',
    date: '2026-07-21',
    timestamp: '2026-07-21T15:40:00Z'
  }
];

export const INITIAL_STOCK_TRANSFERS: StockTransfer[] = [
  {
    id: 'tr-1',
    transferNo: 'TR-2026-001',
    sourceBranchId: 'br-1',
    sourceBranchName: 'Kano Central Hub',
    destinationBranchId: 'br-2',
    destinationBranchName: 'Abuja Main Depot',
    productId: 'prod-1',
    productName: 'Royal Hybrid Maize Seed SC719',
    productSku: 'SEED-MZE-719',
    quantity: 40,
    requestedByUserId: 'usr-3',
    requestedByUserName: 'Emeka Okonkwo',
    approvedByUserId: 'usr-1',
    approvedByUserName: 'Alhaji Dahiru Royal',
    status: 'APPROVED',
    notes: 'Urgent restocking for Abuja planting season launch.',
    requestDate: '2026-07-21 11:30',
    dispatchDate: '2026-07-22 08:00'
  },
  {
    id: 'tr-2',
    transferNo: 'TR-2026-002',
    sourceBranchId: 'br-1',
    sourceBranchName: 'Kano Central Hub',
    destinationBranchId: 'br-3',
    destinationBranchName: 'Kaduna Grain Branch',
    productId: 'prod-2',
    productName: 'Certified Faro 44 Rice Seed',
    productSku: 'SEED-RIC-F44',
    quantity: 30,
    requestedByUserId: 'usr-2',
    requestedByUserName: 'Fatima Abubakar',
    status: 'PENDING',
    notes: 'Kaduna branch customer bulk order request.',
    requestDate: '2026-07-22 09:45'
  }
];

export const INITIAL_EXPENSES: Expense[] = [
  {
    id: 'exp-1',
    branchId: 'br-1',
    branchName: 'Kano Central Hub',
    category: 'ELECTRICITY_DIESEL',
    amount: 185000,
    description: 'Purchase of 150 Liters Diesel for cold seed storage generator',
    vendorName: 'TotalEnergies Kano',
    date: '2026-07-20',
    recordedByUserId: 'usr-2',
    recordedByUserName: 'Fatima Abubakar',
    receiptRef: 'REC-DSL-901',
    status: 'APPROVED'
  },
  {
    id: 'exp-2',
    branchId: 'br-2',
    branchName: 'Abuja Main Depot',
    category: 'LOGISTICS',
    amount: 95000,
    description: 'Truck haulage cost for seed transfer arrival from Kano',
    vendorName: 'Dangote Logistics',
    date: '2026-07-21',
    recordedByUserId: 'usr-3',
    recordedByUserName: 'Emeka Okonkwo',
    receiptRef: 'WAY-ABJ-442',
    status: 'APPROVED'
  },
  {
    id: 'exp-3',
    branchId: 'br-1',
    branchName: 'Kano Central Hub',
    category: 'RENT',
    amount: 600000,
    description: 'Quarterly warehouse lease payment for Tarauni complex',
    vendorName: 'Kano State Agro Development Properties',
    date: '2026-07-15',
    recordedByUserId: 'usr-2',
    recordedByUserName: 'Fatima Abubakar',
    receiptRef: 'LSE-2026-Q3',
    status: 'APPROVED'
  }
];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'Low Stock Alert: NPK 15-15-15 Fertilizer',
    message: 'Kano Central Hub stock is down to 15 bags (Reorder level is 40).',
    type: 'LOW_STOCK',
    read: false,
    timestamp: '2026-07-21T16:00:00Z',
    branchId: 'br-1'
  },
  {
    id: 'notif-2',
    title: 'Out of Stock: Glyphosate 480SL Herbicide',
    message: 'Kano Central Hub is completely out of Glyphosate 480SL Herbicide.',
    type: 'LOW_STOCK',
    read: false,
    timestamp: '2026-07-22T07:30:00Z',
    branchId: 'br-1'
  },
  {
    id: 'notif-3',
    title: 'New Stock Transfer Request Pending',
    message: 'Transfer request #TR-2026-002 for 30 bags of Faro 44 Rice Seed requires CEO review.',
    type: 'TRANSFER_REQUEST',
    read: false,
    timestamp: '2026-07-22T09:45:00Z',
    targetRole: 'CEO'
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'audit-1',
    userId: 'usr-1',
    userName: 'Alhaji Dahiru Royal',
    userRole: 'CEO',
    action: 'APPROVED_STOCK_TRANSFER',
    category: 'TRANSFER',
    description: 'Approved stock transfer #TR-2026-001 of 40 units Maize SC719 from Kano to Abuja.',
    timestamp: '2026-07-22 08:00'
  },
  {
    id: 'audit-2',
    userId: 'usr-4',
    userName: 'Ibrahim Bello',
    userRole: 'SALES_STAFF',
    branchId: 'br-1',
    branchName: 'Kano Central Hub',
    action: 'COMPLETED_SALE',
    category: 'SALE',
    description: 'Processed completed sale #RA-2026-0891 for ₦1,100,000 to Alhaji Sani Dantata Farms.',
    timestamp: '2026-07-22 09:15'
  },
  {
    id: 'audit-3',
    userId: 'usr-2',
    userName: 'Fatima Abubakar',
    userRole: 'BRANCH_MANAGER',
    branchId: 'br-1',
    branchName: 'Kano Central Hub',
    action: 'RECORDED_EXPENSE',
    category: 'EXPENSE',
    description: 'Recorded ₦185,000 diesel expense for Kano store generator.',
    timestamp: '2026-07-20 14:10'
  }
];

export const INITIAL_STOCK_MOVEMENTS: StockMovement[] = [
  {
    id: 'sm-1',
    productId: 'prod-1',
    productName: 'Royal Hybrid Maize Seed SC719',
    branchId: 'br-1',
    branchName: 'Kano Central Hub',
    quantityDelta: -10,
    previousQty: 130,
    newQty: 120,
    type: 'SALE',
    referenceNo: 'RA-2026-0891',
    userId: 'usr-4',
    userName: 'Ibrahim Bello',
    date: '2026-07-22 09:15',
    notes: 'POS Direct Sale to Alhaji Sani Dantata Farms'
  },
  {
    id: 'sm-2',
    productId: 'prod-4',
    productName: 'NPK 15-15-15 Multi-Crop Fertilizer',
    branchId: 'br-1',
    branchName: 'Kano Central Hub',
    quantityDelta: -15,
    previousQty: 30,
    newQty: 15,
    type: 'SALE',
    referenceNo: 'RA-2026-0891',
    userId: 'usr-4',
    userName: 'Ibrahim Bello',
    date: '2026-07-22 09:15',
    notes: 'POS Direct Sale'
  }
];

export const INITIAL_PURCHASES: PurchaseOrder[] = [
  {
    id: 'po-1',
    orderNo: 'PO-2026-041',
    supplierId: 'sup-2',
    supplierName: 'Premier Seeds West Africa Ltd',
    branchId: 'br-1',
    branchName: 'Kano Central Hub',
    items: [
      {
        productId: 'prod-1',
        productName: 'Royal Hybrid Maize Seed SC719',
        productSku: 'SEED-MZE-719',
        quantity: 100,
        unitPrice: 28000,
        subtotal: 2800000
      }
    ],
    totalAmount: 2800000,
    receivedDate: '2026-07-10',
    receivedByUserId: 'usr-5',
    receivedByUserName: 'Chidi Eze',
    status: 'RECEIVED',
    notes: 'Main seasonal seed delivery received in good condition.'
  }
];
