import {
  Product,
  Customer,
  Supplier,
  Branch,
  BranchInventory,
  StockMovement,
  DataImportType,
  DataImportRecord,
  ImportRowValidation,
  OpeningStockImportItem,
  ProductCategory,
  UnitOfMeasurement
} from '../types';

/**
 * Valid product categories for validation
 */
export const VALID_CATEGORIES: ProductCategory[] = [
  'SEEDS',
  'FERTILIZERS',
  'AGROCHEMICALS',
  'EQUIPMENT',
  'SEEDLINGS',
  'CROP_CARE',
  'IRRIGATION',
  'ANIMAL_HEALTH'
];

/**
 * Valid units of measurement for validation
 */
export const VALID_UNITS: UnitOfMeasurement[] = [
  'KG',
  'BAG_50KG',
  'PACK',
  'SACHET',
  'CARTON',
  'PIECE'
];

/**
 * Generates sample CSV templates for bulk data import
 */
export function getSampleCsvTemplate(type: DataImportType): string {
  switch (type) {
    case 'PRODUCTS':
      return [
        'sku,name,seedVariety,category,unit,packageSizeKg,purchasePrice,sellingPrice,minStockLevel,description',
        'RA-SD-MZ-99,Hybrid Maize Seed DK-777,DK-777 High Yield Maize,SEEDS,BAG_50KG,50,32000,38500,15,Drought tolerant certified maize seeds for savannah zones',
        'RA-FT-NP-01,NPK 20-10-10 Granular,Standard Blend,FERTILIZERS,BAG_50KG,50,28500,33000,20,Multi-nutrient compound fertilizer for cereals and grains',
        'RA-CH-GL-05,Glyphosate Herbicide 480SL,ClearField,AGROCHEMICALS,PACK,5,12500,16000,10,Non-selective systemic broad-spectrum post-emergence herbicide',
        'RA-SD-RC-12,Faro 44 Certified Foundation Rice,Faro 44 Sipi,SEEDS,BAG_50KG,50,35000,42000,20,Early maturing lowland certified high-purity rice seeds'
      ].join('\n');

    case 'CUSTOMERS':
      return [
        'fullName,phone,email,address,state,farmerType,creditLimit,initialBalance',
        'Mallam Haruna Bello,+234 803 445 6789,haruna.bello@farmmail.ng,Danbatta Irrigation Scheme,Kano,COMMERCIAL_GRAIN,350000,0',
        'Chief Emeka Eze,+234 802 334 1122,emeka.eze@agrogreens.com,Km 14 Airport Road,FCT Abuja,VEGETABLE_GREENHOUSE,500000,0',
        'Hajiya Maryam Aliyu,+234 805 778 9900,maryam.a@agrocoop.org,Kachia Road Farm Cluster,Kaduna,SMALLHOLDER_COOP,200000,0',
        'Babatunde Adeleke,+234 807 889 0011,tunde.adeleke@farmtech.ng,Ibadan Outskirts Agro Zone,Oyo,CASSAVA_TUBER,250000,0'
      ].join('\n');

    case 'SUPPLIERS':
      return [
        'name,contactPerson,phone,email,address,state,suppliedCategories,paymentTerms,taxId',
        'Premier Seeds Nigeria PLC,Engr. Kabir Lawan,+234 803 999 1122,orders@premierseeds.ng,Chikun Industrial Layout,Kaduna,SEEDS;CROP_CARE,30_DAYS_NET,TIN-10928374-0001',
        'Notore Chemical Industries,Dr. Stephanie Cole,+234 802 888 3344,supply@notore.com,Onne Oil & Gas Free Zone,Rivers,FERTILIZERS,15_DAYS_NET,TIN-29384711-0001',
        'Jubaili Agrotec Ltd,Mustapha Gbadamosi,+234 805 111 4455,sales@jubailiagrotec.com,Plot 18 Ilupeju Industrial Estate,Lagos,AGROCHEMICALS;EQUIPMENT,IMMEDIATE,TIN-98472910-0001'
      ].join('\n');

    case 'OPENING_STOCK':
      return [
        'productSku,branchCode,quantity,unitCost,batchNumber,expiryDate,notes',
        'RA-SD-MZ-01,RA-KNO,80,24500,BAT-2026-MZ01,2027-12-31,2026 planting season baseline warehouse stock',
        'RA-FT-UR-01,RA-KNO,120,29000,BAT-2026-UR02,2028-06-30,Kano main fertilizer store opening audit',
        'RA-SD-RC-01,RA-ABJ,60,33000,BAT-2026-RC01,2027-09-30,Abuja depot rice seed balance carryforward',
        'RA-CH-AT-01,RA-KAD,40,7500,BAT-2026-AT04,2026-11-30,Kaduna pre-emergence chemicals opening balance'
      ].join('\n');
  }
}

/**
 * Downloads a string content as a CSV file in the browser
 */
export function downloadCsvFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Robust CSV parser that handles quotes, escaped commas, newlines, and trims
 */
export function parseCSV(csvText: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines: string[] = [];
  let currentLine = '';
  let insideQuote = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (insideQuote && nextChar === '"') {
        currentLine += '"';
        i++; // skip escaped quote
      } else {
        insideQuote = !insideQuote;
      }
    } else if ((char === '\r' || char === '\n') && !insideQuote) {
      if (currentLine.trim()) {
        lines.push(currentLine);
      }
      currentLine = '';
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
    } else {
      currentLine += char;
    }
  }

  if (currentLine.trim()) {
    lines.push(currentLine);
  }

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  // Parse header line
  const parseLine = (line: string): string[] => {
    const cells: string[] = [];
    let cell = '';
    let inQuote = false;

    for (let j = 0; j < line.length; j++) {
      const c = line[j];
      const nc = line[j + 1];

      if (c === '"') {
        if (inQuote && nc === '"') {
          cell += '"';
          j++;
        } else {
          inQuote = !inQuote;
        }
      } else if (c === ',' && !inQuote) {
        cells.push(cell.trim());
        cell = '';
      } else {
        cell += c;
      }
    }
    cells.push(cell.trim());
    return cells;
  };

  const rawHeaders = parseLine(lines[0]);
  const headers = rawHeaders.map((h) => h.replace(/^["']|["']$/g, '').trim());

  const rows: Record<string, string>[] = [];
  for (let k = 1; k < lines.length; k++) {
    const rawCells = parseLine(lines[k]);
    // Skip empty lines
    if (rawCells.every((c) => !c)) continue;

    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = rawCells[idx] !== undefined ? rawCells[idx].replace(/^["']|["']$/g, '').trim() : '';
    });
    rows.push(rowObj);
  }

  return { headers, rows };
}

/**
 * Validates product import rows
 */
export function validateProductRows(
  rows: Record<string, string>[],
  existingProducts: Product[]
): ImportRowValidation<Product>[] {
  const existingSkus = new Set(existingProducts.map((p) => p.sku.toUpperCase()));
  const seenSkusInFile = new Set<string>();

  return rows.map((row, index) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    const rawSku = (row.sku || row.SKU || '').trim();
    const rawName = (row.name || row.Name || row.productName || '').trim();
    const rawVariety = (row.seedVariety || row.variety || row.seed_variety || '').trim();
    const rawCategory = (row.category || row.Category || '').toUpperCase().trim() as ProductCategory;
    const rawUnit = (row.unit || row.Unit || '').toUpperCase().trim() as UnitOfMeasurement;
    const rawPackageSize = parseFloat(row.packageSizeKg || row.package_size || '1');
    const rawPurchasePrice = parseFloat(row.purchasePrice || row.purchase_price || row.cost || '0');
    const rawSellingPrice = parseFloat(row.sellingPrice || row.selling_price || row.price || '0');
    const rawMinStock = parseInt(row.minStockLevel || row.min_stock || row.reorderLevel || '10', 10);
    const rawDesc = (row.description || row.desc || '').trim();

    // 1. SKU validation
    if (!rawSku) {
      errors.push('Product SKU is required');
    } else {
      const upperSku = rawSku.toUpperCase();
      if (existingSkus.has(upperSku)) {
        errors.push(`SKU "${rawSku}" already exists in the product catalog`);
      }
      if (seenSkusInFile.has(upperSku)) {
        errors.push(`Duplicate SKU "${rawSku}" found multiple times in this CSV file`);
      }
      seenSkusInFile.add(upperSku);
    }

    // 2. Name validation
    if (!rawName) {
      errors.push('Product Name is required');
    } else if (rawName.length < 3) {
      errors.push('Product Name must be at least 3 characters');
    }

    // 3. Category validation
    if (!rawCategory) {
      errors.push('Product Category is required');
    } else if (!VALID_CATEGORIES.includes(rawCategory)) {
      errors.push(
        `Invalid category "${rawCategory}". Allowed: ${VALID_CATEGORIES.join(', ')}`
      );
    }

    // 4. Unit validation
    if (!rawUnit) {
      errors.push('Unit of measurement is required');
    } else if (!VALID_UNITS.includes(rawUnit)) {
      errors.push(`Invalid unit "${rawUnit}". Allowed: ${VALID_UNITS.join(', ')}`);
    }

    // 5. Pricing validation
    if (isNaN(rawPurchasePrice) || rawPurchasePrice < 0) {
      errors.push('Purchase price must be a non-negative number');
    }
    if (isNaN(rawSellingPrice) || rawSellingPrice <= 0) {
      errors.push('Selling price must be a positive number (> 0)');
    }
    if (rawSellingPrice < rawPurchasePrice) {
      warnings.push('Selling price is lower than purchase price (negative margin)');
    }

    // 6. Min stock
    if (isNaN(rawMinStock) || rawMinStock < 0) {
      warnings.push('Min stock level invalid, defaulting to 10');
    }

    const isValid = errors.length === 0;

    let parsed: Product | null = null;
    if (isValid) {
      parsed = {
        id: `prod-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        sku: rawSku.toUpperCase(),
        name: rawName,
        seedVariety: rawVariety || rawName,
        category: rawCategory,
        unit: rawUnit,
        packageSizeKg: isNaN(rawPackageSize) ? 1 : rawPackageSize,
        purchasePrice: rawPurchasePrice,
        sellingPrice: rawSellingPrice,
        minStockLevel: isNaN(rawMinStock) ? 10 : rawMinStock,
        description: rawDesc || `${rawName} (${rawCategory})`,
        imageUrl: '',
        status: 'ACTIVE',
        createdAt: new Date().toISOString()
      };
    }

    return {
      rowNumber: index + 1,
      raw: row,
      parsed,
      isValid,
      errors,
      warnings,
      isDuplicate: existingSkus.has(rawSku.toUpperCase())
    };
  });
}

/**
 * Validates customer import rows
 */
export function validateCustomerRows(
  rows: Record<string, string>[],
  existingCustomers: Customer[],
  defaultBranchId: string
): ImportRowValidation<Customer>[] {
  const existingPhones = new Set(existingCustomers.map((c) => c.phone.replace(/\s+/g, '')));
  const seenPhonesInFile = new Set<string>();

  return rows.map((row, index) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    const rawName = (row.fullName || row.name || row.customerName || '').trim();
    const rawPhone = (row.phone || row.telephone || row.mobile || '').trim();
    const rawEmail = (row.email || '').trim();
    const rawAddress = (row.address || '').trim();
    const rawState = (row.state || 'Kano').trim();
    const rawFarmerType = (row.farmerType || row.type || 'COMMERCIAL_GRAIN').toUpperCase().trim();
    const rawCreditLimit = parseFloat(row.creditLimit || row.credit_limit || '150000');

    if (!rawName) {
      errors.push('Customer full name is required');
    }

    if (!rawPhone) {
      errors.push('Customer phone number is required');
    } else {
      const cleanPhone = rawPhone.replace(/\s+/g, '');
      if (cleanPhone.length < 10) {
        errors.push('Phone number must have at least 10 digits');
      }
      if (existingPhones.has(cleanPhone)) {
        errors.push(`Customer phone "${rawPhone}" already exists in the system`);
      }
      if (seenPhonesInFile.has(cleanPhone)) {
        errors.push(`Duplicate phone "${rawPhone}" in this CSV file`);
      }
      seenPhonesInFile.add(cleanPhone);
    }

    if (isNaN(rawCreditLimit) || rawCreditLimit < 0) {
      warnings.push('Credit limit invalid, defaulting to ₦150,000');
    }

    const isValid = errors.length === 0;

    let parsed: Customer | null = null;
    if (isValid) {
      parsed = {
        id: `cust-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        fullName: rawName,
        phone: rawPhone,
        email: rawEmail || '',
        address: rawAddress || 'Commercial Farm Hub',
        state: rawState || 'Kano',
        registeredBranchId: defaultBranchId,
        farmerType: (rawFarmerType as any) || 'COMMERCIAL_GRAIN',
        creditLimit: isNaN(rawCreditLimit) ? 150000 : rawCreditLimit,
        creditBalance: 0,
        currentBalance: 0,
        totalPurchases: 0,
        totalSpent: 0,
        createdAt: new Date().toISOString()
      };
    }

    return {
      rowNumber: index + 1,
      raw: row,
      parsed,
      isValid,
      errors,
      warnings,
      isDuplicate: existingPhones.has(rawPhone.replace(/\s+/g, ''))
    };
  });
}

/**
 * Validates supplier import rows
 */
export function validateSupplierRows(
  rows: Record<string, string>[],
  existingSuppliers: Supplier[]
): ImportRowValidation<Supplier>[] {
  const existingNames = new Set(existingSuppliers.map((s) => (s.companyName || s.name || '').toUpperCase()));
  const seenNamesInFile = new Set<string>();

  return rows.map((row, index) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    const rawName = (row.name || row.supplierName || row.company || '').trim();
    const rawContact = (row.contactPerson || row.contact || '').trim();
    const rawPhone = (row.phone || '').trim();
    const rawEmail = (row.email || '').trim();
    const rawAddress = (row.address || '').trim();
    const rawState = (row.state || '').trim();
    const rawTerms = (row.paymentTerms || '30_DAYS_NET').trim();
    const rawTaxId = (row.taxId || row.tin || '').trim();

    if (!rawName) {
      errors.push('Supplier Company Name is required');
    } else {
      const upper = rawName.toUpperCase();
      if (existingNames.has(upper)) {
        errors.push(`Supplier "${rawName}" already exists`);
      }
      if (seenNamesInFile.has(upper)) {
        errors.push(`Duplicate supplier "${rawName}" in this file`);
      }
      seenNamesInFile.add(upper);
    }

    if (!rawPhone) {
      errors.push('Supplier phone contact is required');
    }

    const isValid = errors.length === 0;

    let parsed: Supplier | null = null;
    if (isValid) {
      parsed = {
        id: `sup-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        companyName: rawName,
        name: rawName,
        contactPerson: rawContact || 'Supply Director',
        phone: rawPhone,
        email: rawEmail || `${rawName.toLowerCase().replace(/[^a-z0-9]/g, '')}@supplier.ng`,
        address: rawAddress || 'Commercial Seed Production Zone',
        state: rawState || 'Kaduna',
        categoriesSupplied: ['SEEDS' as const, 'FERTILIZERS' as const],
        suppliedCategories: ['SEEDS', 'FERTILIZERS'],
        paymentTerms: rawTerms,
        creditTerms: rawTerms,
        taxId: rawTaxId || undefined,
        status: 'ACTIVE',
        createdAt: new Date().toISOString()
      };
    }

    return {
      rowNumber: index + 1,
      raw: row,
      parsed,
      isValid,
      errors,
      warnings,
      isDuplicate: existingNames.has(rawName.toUpperCase())
    };
  });
}

/**
 * Validates opening stock rows.
 * Opening stock requires that the Product SKU exists and Branch Code exists!
 */
export function validateOpeningStockRows(
  rows: Record<string, string>[],
  products: Product[],
  branches: Branch[]
): ImportRowValidation<OpeningStockImportItem>[] {
  const productMap = new Map<string, Product>();
  products.forEach((p) => {
    productMap.set(p.sku.toUpperCase(), p);
  });

  const branchMap = new Map<string, Branch>();
  branches.forEach((b) => {
    branchMap.set(b.code.toUpperCase(), b);
    branchMap.set(b.name.toUpperCase(), b);
    branchMap.set(b.id.toUpperCase(), b);
  });

  const seenKeysInFile = new Set<string>();

  return rows.map((row, index) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    const rawSku = (row.productSku || row.sku || row.SKU || '').trim().toUpperCase();
    const rawBranch = (row.branchCode || row.branch || row.branchId || '').trim().toUpperCase();
    const rawQuantity = parseFloat(row.quantity || row.qty || '0');
    const rawCost = parseFloat(row.unitCost || row.cost || row.purchasePrice || '0');
    const rawBatch = (row.batchNumber || row.batch || '').trim();
    const rawExpiry = (row.expiryDate || row.expiry || '').trim();
    const rawNotes = (row.notes || row.remarks || '').trim();

    // 1. Product check
    const matchedProduct = productMap.get(rawSku);
    if (!rawSku) {
      errors.push('Product SKU is required');
    } else if (!matchedProduct) {
      errors.push(
        `Product with SKU "${rawSku}" does not exist. Products must be created or imported before opening stock is uploaded.`
      );
    }

    // 2. Branch check
    const matchedBranch = branchMap.get(rawBranch);
    if (!rawBranch) {
      errors.push('Branch Code or Name is required');
    } else if (!matchedBranch) {
      errors.push(`Branch "${rawBranch}" does not exist in the branch directory`);
    } else if (matchedBranch.status === 'INACTIVE') {
      errors.push(`Branch "${matchedBranch.name}" is currently inactive`);
    }

    // 3. Quantity check
    if (isNaN(rawQuantity) || rawQuantity <= 0) {
      errors.push('Opening stock quantity must be a positive number (> 0)');
    }

    // 4. Duplicate product + branch check in same file
    if (rawSku && matchedBranch) {
      const compositeKey = `${rawSku}_${matchedBranch.id}`;
      if (seenKeysInFile.has(compositeKey)) {
        errors.push(
          `Duplicate opening stock entry for SKU "${rawSku}" at branch "${matchedBranch.name}" in this file`
        );
      }
      seenKeysInFile.add(compositeKey);
    }

    // 5. Expiry format check
    if (rawExpiry && !/^\d{4}-\d{2}-\d{2}$/.test(rawExpiry)) {
      warnings.push(`Expiry date "${rawExpiry}" is not in YYYY-MM-DD format`);
    }

    const isValid = errors.length === 0;

    let parsed: OpeningStockImportItem | null = null;
    if (isValid && matchedProduct && matchedBranch) {
      parsed = {
        productSku: matchedProduct.sku,
        productName: matchedProduct.name,
        branchCode: matchedBranch.code,
        branchName: matchedBranch.name,
        quantity: rawQuantity,
        unitCost: isNaN(rawCost) || rawCost <= 0 ? matchedProduct.purchasePrice : rawCost,
        batchNumber: rawBatch || `BATCH-${matchedProduct.sku}-${new Date().getFullYear()}`,
        expiryDate: rawExpiry || undefined,
        notes: rawNotes || 'Initial opening stock balance'
      };
    }

    return {
      rowNumber: index + 1,
      raw: row,
      parsed,
      isValid,
      errors,
      warnings,
      isDuplicate: false
    };
  });
}

/**
 * Generates an error report CSV for all invalid rows so the user can easily fix and re-import
 */
export function generateErrorReportCSV(
  type: DataImportType,
  validations: ImportRowValidation[]
): string {
  const invalidRows = validations.filter((v) => !v.isValid);
  if (invalidRows.length === 0) return '';

  const allKeys = Object.keys(invalidRows[0].raw);
  const headerLine = ['ROW_NUMBER', ...allKeys, 'VALIDATION_ERRORS', 'WARNINGS'].join(',');

  const lines = invalidRows.map((v) => {
    const rawValues = allKeys.map((k) => `"${(v.raw[k] || '').replace(/"/g, '""')}"`);
    const errorStr = `"${v.errors.join(' | ').replace(/"/g, '""')}"`;
    const warnStr = `"${v.warnings.join(' | ').replace(/"/g, '""')}"`;
    return [v.rowNumber, ...rawValues, errorStr, warnStr].join(',');
  });

  return [headerLine, ...lines].join('\n');
}

/**
 * Commits opening stock into the inventory movement system safely.
 * DOES NOT overwrite or treat as regular sales/purchases.
 * Generates explicit StockMovement entries with type 'ADJUSTMENT_IN' and updates BranchInventory.
 */
export function processOpeningStockCommit(
  items: OpeningStockImportItem[],
  currentInventory: BranchInventory[],
  products: Product[],
  branches: Branch[],
  userId: string,
  userName: string,
  importBatchRef: string
): {
  updatedInventory: BranchInventory[];
  movements: StockMovement[];
  successfulCount: number;
} {
  const updatedInvMap = new Map<string, BranchInventory>();
  currentInventory.forEach((inv) => {
    updatedInvMap.set(`${inv.branchId}_${inv.productId}`, { ...inv });
  });

  const movements: StockMovement[] = [];
  const nowIso = new Date().toISOString();
  const dateStr = nowIso.replace('T', ' ').slice(0, 16);
  let successfulCount = 0;

  for (const item of items) {
    const product = products.find((p) => p.sku.toUpperCase() === item.productSku.toUpperCase());
    const branch = branches.find(
      (b) =>
        b.code.toUpperCase() === item.branchCode.toUpperCase() ||
        b.name.toUpperCase() === item.branchName?.toUpperCase()
    );

    if (!product || !branch) continue;

    const key = `${branch.id}_${product.id}`;
    const existing = updatedInvMap.get(key);

    const prevQty = existing ? existing.quantity : 0;
    const newQty = prevQty + item.quantity;

    const updatedRecord: BranchInventory = existing
      ? {
          ...existing,
          quantity: newQty,
          batchNumber: item.batchNumber || existing.batchNumber,
          expiryDate: item.expiryDate || existing.expiryDate,
          lastUpdated: nowIso.split('T')[0]
        }
      : {
          id: `inv-${branch.id}-${product.id}`,
          branchId: branch.id,
          productId: product.id,
          quantity: newQty,
          reorderLevel: product.minStockLevel || 10,
          batchNumber: item.batchNumber,
          expiryDate: item.expiryDate,
          lastUpdated: nowIso.split('T')[0]
        };

    updatedInvMap.set(key, updatedRecord);

    const movement: StockMovement = {
      id: `mov-opn-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      productId: product.id,
      productName: product.name,
      branchId: branch.id,
      branchName: branch.name,
      type: 'ADJUSTMENT_IN',
      quantityDelta: item.quantity,
      previousQty: prevQty,
      newQty,
      referenceNo: `${importBatchRef}-${product.sku}`,
      date: dateStr,
      userId,
      userName,
      notes: `Opening Stock Balance Import [Batch: ${importBatchRef}] - Batch: ${
        item.batchNumber || 'N/A'
      }${item.expiryDate ? `, Exp: ${item.expiryDate}` : ''}. ${item.notes || ''}`,
      syncStatus: navigator.onLine ? 'synced' : 'pending'
    };

    movements.push(movement);
    successfulCount++;
  }

  return {
    updatedInventory: Array.from(updatedInvMap.values()),
    movements,
    successfulCount
  };
}
