import {
  Product,
  BranchInventory,
  Branch,
  Sale,
  SalesReturn,
  StockTransfer,
  PurchaseOrder,
  Supplier,
  ReorderRecommendation,
  DemandForecast,
  StockRedistributionSuggestion,
  ProductCategory
} from '../types';

/**
 * Calculates stock currently in transit to destination branches from open dispatched transfers
 */
export function calculateStockInTransit(
  transfers: StockTransfer[] = []
): Record<string, Record<string, number>> {
  // destinationBranchId -> productId -> inTransitQuantity
  const map: Record<string, Record<string, number>> = {};

  transfers.forEach((t) => {
    const isInTransit = t.status === 'IN_TRANSIT' || t.status === 'DISPATCHED';
    if (!isInTransit) return;

    if (!map[t.destinationBranchId]) {
      map[t.destinationBranchId] = {};
    }

    if (t.items && t.items.length > 0) {
      t.items.forEach((item) => {
        const qty = item.dispatchedQuantity ?? item.requestedQuantity ?? 0;
        map[t.destinationBranchId][item.productId] = (map[t.destinationBranchId][item.productId] || 0) + qty;
      });
    } else if (t.productId && t.quantity) {
      map[t.destinationBranchId][t.productId] = (map[t.destinationBranchId][t.productId] || 0) + t.quantity;
    }
  });

  return map;
}

/**
 * Calculates stock currently on order from approved/pending purchase orders
 */
export function calculateOnOrderStock(
  purchaseOrders: PurchaseOrder[] = []
): Record<string, Record<string, number>> {
  // branchId -> productId -> onOrderQuantity
  const map: Record<string, Record<string, number>> = {};

  purchaseOrders.forEach((po) => {
    const isPending = po.status === 'PENDING_APPROVAL' || po.status === 'APPROVED' || po.status === 'PARTIALLY_RECEIVED';
    if (!isPending) return;

    if (!map[po.branchId]) {
      map[po.branchId] = {};
    }

    if (po.items && po.items.length > 0) {
      po.items.forEach((item) => {
        const remainingToDeliver = Math.max(0, item.quantity - (item.receivedQuantity || 0));
        map[po.branchId][item.productId] = (map[po.branchId][item.productId] || 0) + remainingToDeliver;
      });
    }
  });

  return map;
}

/**
 * Reorder Recommendations Engine
 * Formula:
 * - targetStockLevel = max(reorderLevel * 2.5, minStockLevel * 2, 20)
 * - netAvailable = currentStock + inTransitStock + onOrderStock
 * - if netAvailable <= reorderLevel: suggestedQty = max(0, targetStockLevel - netAvailable)
 */
export function calculateReorderRecommendations(
  products: Product[] = [],
  inventory: BranchInventory[] = [],
  branches: Branch[] = [],
  suppliers: Supplier[] = [],
  transfers: StockTransfer[] = [],
  purchaseOrders: PurchaseOrder[] = [],
  selectedBranchId: string = 'ALL'
): ReorderRecommendation[] {
  const inTransitMap = calculateStockInTransit(transfers);
  const onOrderMap = calculateOnOrderStock(purchaseOrders);

  const recommendations: ReorderRecommendation[] = [];

  const targetBranches = selectedBranchId === 'ALL'
    ? branches
    : branches.filter((b) => b.id === selectedBranchId);

  targetBranches.forEach((branch) => {
    products.forEach((product) => {
      if (product.status === 'INACTIVE') return;

      const inv = inventory.find((i) => i.branchId === branch.id && i.productId === product.id);
      const currentStock = inv ? inv.quantity : 0;
      const reorderLevel = inv?.reorderLevel ?? product.minStockLevel ?? 20;
      const minStockLevel = product.minStockLevel ?? 10;

      const inTransitStock = inTransitMap[branch.id]?.[product.id] || 0;
      const onOrderStock = onOrderMap[branch.id]?.[product.id] || 0;

      const targetStockLevel = Math.max(Math.ceil(reorderLevel * 2.5), minStockLevel * 2, 25);
      const netAvailable = currentStock + inTransitStock + onOrderStock;

      if (netAvailable <= reorderLevel) {
        const rawSuggested = targetStockLevel - netAvailable;
        // Round to nearest reasonable package unit or 5
        const suggestedQuantity = Math.max(5, Math.ceil(rawSuggested / 5) * 5);

        // Find preferred supplier matching product category
        const preferredSupplier = suppliers.find((s) =>
          s.categoriesSupplied && s.categoriesSupplied.includes(product.category)
        ) || suppliers[0];

        let urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'NORMAL' = 'NORMAL';
        if (currentStock === 0) {
          urgency = 'CRITICAL';
        } else if (currentStock <= Math.floor(reorderLevel * 0.5)) {
          urgency = 'HIGH';
        } else if (netAvailable <= reorderLevel) {
          urgency = 'MEDIUM';
        }

        const unitCost = product.purchasePrice || 0;
        const estimatedTotalCost = suggestedQuantity * unitCost;

        recommendations.push({
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          category: product.category,
          unit: product.unit,
          branchId: branch.id,
          branchName: branch.name,
          currentStock,
          reorderLevel,
          minStockLevel,
          targetStockLevel,
          onOrderStock,
          inTransitStock,
          suggestedQuantity,
          preferredSupplierId: preferredSupplier?.id,
          preferredSupplierName: preferredSupplier?.companyName,
          unitCost,
          estimatedTotalCost,
          urgency
        });
      }
    });
  });

  // Sort by urgency: CRITICAL first, then HIGH, MEDIUM, NORMAL
  const urgencyWeight = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, NORMAL: 1 };
  return recommendations.sort((a, b) => urgencyWeight[b.urgency] - urgencyWeight[a.urgency]);
}

/**
 * Historical Demand Forecasting Engine
 * Calculates daily sales velocity, days of stock remaining, stockout risk
 * Excludes cancelled sales and internal transfers; accounts for returns
 */
export function calculateDemandForecasts(
  products: Product[] = [],
  inventory: BranchInventory[] = [],
  sales: Sale[] = [],
  salesReturns: SalesReturn[] = [],
  branches: Branch[] = [],
  selectedBranchId: string = 'ALL',
  analysisDaysWindow: number = 30
): DemandForecast[] {
  // Aggregate sales by (branchId -> productId)
  const salesMap: Record<string, Record<string, { count: number; units: number; dates: Set<string> }>> = {};

  const now = new Date();
  const cutoffDate = new Date(now.getTime() - analysisDaysWindow * 24 * 60 * 60 * 1000);

  // Filter valid sales
  (sales || []).forEach((sale) => {
    // Exclude cancelled sales
    if (sale.status === 'CANCELLED') return;

    const saleDate = new Date(sale.date);
    if (!isNaN(saleDate.getTime()) && saleDate < cutoffDate) return;

    if (!salesMap[sale.branchId]) {
      salesMap[sale.branchId] = {};
    }

    (sale.items || []).forEach((item) => {
      if (!salesMap[sale.branchId][item.productId]) {
        salesMap[sale.branchId][item.productId] = { count: 0, units: 0, dates: new Set() };
      }
      salesMap[sale.branchId][item.productId].count += 1;
      salesMap[sale.branchId][item.productId].units += item.quantity;
      salesMap[sale.branchId][item.productId].dates.add(sale.date ? sale.date.slice(0, 10) : 'today');
    });
  });

  // Subtract returned quantities
  (salesReturns || []).forEach((ret) => {
    if (ret.status === 'REJECTED') return;
    const branchId = ret.branchId;
    if (salesMap[branchId]) {
      (ret.items || []).forEach((item) => {
        if (salesMap[branchId][item.productId]) {
          salesMap[branchId][item.productId].units = Math.max(
            0,
            salesMap[branchId][item.productId].units - item.quantity
          );
        }
      });
    }
  });

  const forecasts: DemandForecast[] = [];

  const targetBranches = selectedBranchId === 'ALL'
    ? branches
    : branches.filter((b) => b.id === selectedBranchId);

  // Month-based seasonal indicator (West African Agriculture Calendar)
  const currentMonth = now.getMonth(); // 0 = Jan, 11 = Dec
  let seasonalLabel = 'Normal Trading Cycle';
  if (currentMonth >= 3 && currentMonth <= 6) {
    // April - July: Planting Season
    seasonalLabel = 'High Planting Season (Peak Seed & Fertilizer Demand)';
  } else if (currentMonth >= 7 && currentMonth <= 9) {
    // August - October: Crop Maintenance & Spraying
    seasonalLabel = 'Crop Protection & Maintenance (Peak Agrochemical Demand)';
  } else if (currentMonth >= 10 || currentMonth <= 2) {
    // November - March: Harvest & Irrigation
    seasonalLabel = 'Dry Season Irrigation & Post-Harvest Storage';
  }

  targetBranches.forEach((branch) => {
    products.forEach((product) => {
      if (product.status === 'INACTIVE') return;

      const inv = inventory.find((i) => i.branchId === branch.id && i.productId === product.id);
      const currentStock = inv ? inv.quantity : 0;

      const stat = salesMap[branch.id]?.[product.id] || { count: 0, units: 0, dates: new Set() };
      const totalUnitsSold = stat.units;
      const salesCountTotal = stat.count;

      // Effective days: use analysisDaysWindow
      const effectiveDays = Math.max(7, analysisDaysWindow);
      const rawDailyRate = totalUnitsSold / effectiveDays;
      const dailyRunRate = Math.round(rawDailyRate * 100) / 100;
      const weeklyRunRate = Math.round(rawDailyRate * 7 * 10) / 10;

      const hasSufficientData = salesCountTotal >= 2 && totalUnitsSold > 0;

      let daysOfStockRemaining = 999;
      if (hasSufficientData && dailyRunRate > 0) {
        daysOfStockRemaining = Math.max(0, Math.round(currentStock / dailyRunRate));
      } else if (currentStock === 0) {
        daysOfStockRemaining = 0;
      }

      let stockoutRisk: 'CRITICAL' | 'MODERATE' | 'HEALTHY' | 'OVERSTOCKED' | 'INSUFFICIENT_DATA';
      if (!hasSufficientData && currentStock > 0) {
        stockoutRisk = 'INSUFFICIENT_DATA';
      } else if (currentStock === 0 || daysOfStockRemaining <= 5) {
        stockoutRisk = 'CRITICAL';
      } else if (daysOfStockRemaining <= 14) {
        stockoutRisk = 'MODERATE';
      } else if (daysOfStockRemaining <= 45) {
        stockoutRisk = 'HEALTHY';
      } else {
        stockoutRisk = 'OVERSTOCKED';
      }

      // Suggested 30-day replenishment buffer
      const target30DaysUnits = Math.ceil(dailyRunRate * 30);
      const suggested30DayRestock = Math.max(0, target30DaysUnits - currentStock);

      forecasts.push({
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        category: product.category,
        unit: product.unit,
        branchId: branch.id,
        branchName: branch.name,
        currentStock,
        salesCountTotal,
        totalUnitsSold,
        dailyRunRate,
        weeklyRunRate,
        daysOfStockRemaining,
        stockoutRisk,
        hasSufficientData,
        seasonalFactor: seasonalLabel,
        suggested30DayRestock
      });
    });
  });

  return forecasts.sort((a, b) => {
    // Sort by most urgent days of stock remaining first
    if (a.currentStock === 0 && b.currentStock > 0) return -1;
    if (b.currentStock === 0 && a.currentStock > 0) return 1;
    return a.daysOfStockRemaining - b.daysOfStockRemaining;
  });
}

/**
 * Intelligent Inter-Branch Stock Redistribution Suggestions
 * Detects branches with critical shortage that can be satisfied from another branch
 * with excess / stagnant stock without needing a new supplier purchase!
 */
export function calculateRedistributionSuggestions(
  forecasts: DemandForecast[] = [],
  branches: Branch[] = []
): StockRedistributionSuggestion[] {
  const suggestions: StockRedistributionSuggestion[] = [];

  // Group forecasts by productId
  const productForecasts: Record<string, DemandForecast[]> = {};
  forecasts.forEach((f) => {
    if (!productForecasts[f.productId]) {
      productForecasts[f.productId] = [];
    }
    productForecasts[f.productId].push(f);
  });

  Object.entries(productForecasts).forEach(([productId, list]) => {
    const deficitBranches = list.filter(
      (f) => f.currentStock === 0 || (f.daysOfStockRemaining <= 7 && f.dailyRunRate > 0)
    );
    const surplusBranches = list.filter(
      (f) => f.currentStock >= 30 && (f.daysOfStockRemaining > 45 || f.dailyRunRate === 0)
    );

    if (deficitBranches.length > 0 && surplusBranches.length > 0) {
      deficitBranches.forEach((dest) => {
        // Find best source surplus branch
        const bestSource = surplusBranches.sort((a, b) => b.currentStock - a.currentStock)[0];
        if (!bestSource || bestSource.branchId === dest.branchId) return;

        // Calculate a safe transferable amount
        const safetyMargin = Math.max(10, Math.ceil(bestSource.dailyRunRate * 20));
        const availableToTransfer = Math.max(0, bestSource.currentStock - safetyMargin);
        const needed = Math.max(10, Math.ceil((dest.dailyRunRate || 1) * 21) - dest.currentStock);

        const transferQty = Math.min(availableToTransfer, needed);

        if (transferQty >= 5) {
          suggestions.push({
            id: `redis-${bestSource.branchId}-${dest.branchId}-${productId}`,
            productId,
            productName: dest.productName,
            unit: dest.unit,
            sourceBranchId: bestSource.branchId,
            sourceBranchName: bestSource.branchName,
            sourceStock: bestSource.currentStock,
            sourceDaysRemaining: bestSource.daysOfStockRemaining,
            destBranchId: dest.branchId,
            destBranchName: dest.branchName,
            destStock: dest.currentStock,
            destDaysRemaining: dest.daysOfStockRemaining,
            suggestedTransferQty: Math.ceil(transferQty / 5) * 5,
            reason: `${dest.branchName} is facing stockout (${dest.daysOfStockRemaining} days left) while ${bestSource.branchName} has surplus ${bestSource.currentStock} units with ${bestSource.daysOfStockRemaining > 300 ? 'slow sales' : `${bestSource.daysOfStockRemaining} days buffer`}.`
          });
        }
      });
    }
  });

  return suggestions;
}
