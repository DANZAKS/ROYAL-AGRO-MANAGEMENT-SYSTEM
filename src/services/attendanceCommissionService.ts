import {
  AttendanceRecord,
  AttendanceStatus,
  CommissionRecord,
  CommissionRule,
  CommissionAdjustment,
  CommissionBreakdownItem,
  StaffPerformanceSummary,
  Sale,
  SalesReturn,
  User,
  Branch,
  Product,
  UserRole
} from '../types';

/**
 * Parses time string (HH:mm) into minutes from midnight.
 */
export function timeStringToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  // If ISO string
  if (timeStr.includes('T')) {
    const d = new Date(timeStr);
    return d.getHours() * 60 + d.getMinutes();
  }
  const parts = timeStr.split(':');
  if (parts.length < 2) return 0;
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  return hours * 60 + minutes;
}

/**
 * Calculates duration in minutes between clock-in and clock-out.
 */
export function calculateShiftMinutes(clockIn: string | null, clockOut: string | null): number {
  if (!clockIn || !clockOut) return 0;
  const inM = timeStringToMinutes(clockIn);
  const outM = timeStringToMinutes(clockOut);
  if (outM < inM) {
    // Over midnight shift handling
    return (24 * 60 - inM) + outM;
  }
  return Math.max(0, outM - inM);
}

/**
 * Formats minutes into human-readable duration, e.g. "8h 15m".
 */
export function formatWorkingHours(minutes: number): string {
  if (!minutes || minutes <= 0) return '0h 0m';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hrs}h ${mins}m`;
}

/**
 * Returns today's date formatted as YYYY-MM-DD in local time.
 */
export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns current local time formatted as HH:mm.
 */
export function getCurrentTimeString(): string {
  const d = new Date();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Evaluates whether clock-in time is on-time or late compared to scheduled start.
 * Standard start is 08:30.
 */
export function evaluateClockInStatus(
  clockInTime: string,
  scheduledStart: string = '08:30'
): AttendanceStatus {
  const inMinutes = timeStringToMinutes(clockInTime);
  const schedMinutes = timeStringToMinutes(scheduledStart);
  // Allow a 5-minute grace period
  return inMinutes > schedMinutes + 5 ? 'LATE' : 'PRESENT';
}

/**
 * Checks if a user can clock in today.
 * Prevents duplicate clock-ins if already clocked in for the day.
 */
export function canUserClockIn(
  records: AttendanceRecord[],
  userId: string,
  targetDate: string = getTodayDateString()
): { allowed: boolean; reason?: string; existingRecord?: AttendanceRecord } {
  const existing = records.find(r => r.userId === userId && r.date === targetDate);
  if (!existing) {
    return { allowed: true };
  }
  if (existing.clockIn && !existing.clockOut) {
    return {
      allowed: false,
      reason: `You are already clocked in today since ${existing.clockIn}. Please clock out when ending your shift.`,
      existingRecord: existing
    };
  }
  if (existing.clockIn && existing.clockOut) {
    return {
      allowed: false,
      reason: `You have already completed your shift today (Clocked in: ${existing.clockIn}, Clocked out: ${existing.clockOut}). Contact your manager if an attendance correction is needed.`,
      existingRecord: existing
    };
  }
  return { allowed: true, existingRecord: existing };
}

/**
 * Checks if a user can clock out today.
 */
export function canUserClockOut(
  records: AttendanceRecord[],
  userId: string,
  targetDate: string = getTodayDateString()
): { allowed: boolean; reason?: string; existingRecord?: AttendanceRecord } {
  const existing = records.find(r => r.userId === userId && r.date === targetDate);
  if (!existing || !existing.clockIn) {
    return {
      allowed: false,
      reason: 'No active clock-in recorded for today. Please clock in first.'
    };
  }
  if (existing.clockOut) {
    return {
      allowed: false,
      reason: `You have already clocked out at ${existing.clockOut}.`,
      existingRecord: existing
    };
  }
  return { allowed: true, existingRecord: existing };
}

/**
 * Creates a new Clock-in attendance record.
 */
export function createClockInRecord(params: {
  userId: string;
  userName: string;
  userRole: UserRole;
  branchId: string;
  branchName: string;
  isOffline?: boolean;
  notes?: string;
  scheduledStart?: string;
}): AttendanceRecord {
  const today = getTodayDateString();
  const timeNow = getCurrentTimeString();
  const scheduledStart = params.scheduledStart || '08:30';
  const status = evaluateClockInStatus(timeNow, scheduledStart);

  return {
    id: `att-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    userId: params.userId,
    userName: params.userName,
    userRole: params.userRole,
    branchId: params.branchId,
    branchName: params.branchName,
    date: today,
    scheduledStart,
    scheduledEnd: '17:30',
    clockIn: timeNow,
    clockOut: null,
    workMinutes: 0,
    status,
    isMissingClockOut: false,
    notes: params.notes,
    syncStatus: params.isOffline ? 'pending_verification' : 'synced',
    isOfflineRecord: !!params.isOffline,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

/**
 * Completes a Clock-out on an existing attendance record.
 */
export function processClockOut(
  record: AttendanceRecord,
  isOffline?: boolean,
  notes?: string
): AttendanceRecord {
  const timeNow = getCurrentTimeString();
  const minutesWorked = calculateShiftMinutes(record.clockIn, timeNow);

  return {
    ...record,
    clockOut: timeNow,
    workMinutes: minutesWorked,
    isMissingClockOut: false,
    notes: notes ? (record.notes ? `${record.notes} | ${notes}` : notes) : record.notes,
    syncStatus: isOffline ? 'pending_verification' : 'synced',
    updatedAt: new Date().toISOString()
  };
}

/**
 * Aggregates staff performance metrics based on actual sales, returns, and attendance.
 */
export function calculateStaffPerformance(
  sales: Sale[],
  returns: SalesReturn[] = [],
  users: User[],
  branches: Branch[],
  commissions: CommissionRecord[] = [],
  attendanceRecords: AttendanceRecord[] = [],
  filters?: {
    branchId?: string | null;
    startDate?: string;
    endDate?: string;
  }
): StaffPerformanceSummary[] {
  // Only evaluate active or staff users (exclude CEO from staff leaderboard unless selected)
  const targetUsers = users.filter(u => u.role !== 'CEO');

  return targetUsers.map(user => {
    const userBranch = branches.find(b => b.id === user.branchId);
    const branchName = userBranch?.name || user.branchName || 'Unassigned Branch';

    // Filter sales attributed to this staff member
    const userSales = sales.filter(s => {
      const isStaffMatch = s.staffUserId === user.id || s.staffName === user.name;
      if (!isStaffMatch) return false;
      if (filters?.branchId && s.branchId !== filters.branchId) return false;
      if (filters?.startDate && s.date < filters.startDate) return false;
      if (filters?.endDate && s.date > filters.endDate) return false;
      return true;
    });

    const completedSales = userSales.filter(s => s.status === 'COMPLETED');
    const cancelledSales = userSales.filter(s => s.status === 'CANCELLED');

    const grossSalesValue = completedSales.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
    const discountsGiven = completedSales.reduce((acc, s) => acc + (s.discount || 0), 0);

    // Cash collected vs credit sales
    const cashCollected = completedSales.reduce((acc, s) => {
      if (s.paymentMethod === 'CASH' || s.paymentMethod === 'POS' || s.paymentMethod === 'BANK_TRANSFER' || s.paymentMethod === 'MOBILE_MONEY') {
        return acc + (s.totalAmount || 0);
      }
      return acc + (s.amountPaid || 0);
    }, 0);

    const creditSalesValue = completedSales.reduce((acc, s) => {
      if (s.paymentMethod === 'CREDIT' || (s.balanceDue && s.balanceDue > 0)) {
        return acc + (s.balanceDue || (s.totalAmount - (s.amountPaid || 0)));
      }
      return acc;
    }, 0);

    // Find returns attributed to this user or their sales
    const userReturns = returns.filter(r => {
      const matchSubmitter = r.submittedByUserId === user.id;
      const matchSale = completedSales.some(s => s.id === r.saleId || s.receiptNo === r.receiptNo);
      return (matchSubmitter || matchSale) && r.status === 'COMPLETED';
    });

    const returnsCount = userReturns.length;
    const returnsValue = userReturns.reduce((acc, r) => acc + (r.refundAmount || r.totalReturnValue || 0), 0);
    const netSalesValue = Math.max(0, grossSalesValue - returnsValue);

    const completedCount = completedSales.length;
    const avgOrderValue = completedCount > 0 ? Math.round(grossSalesValue / completedCount) : 0;

    // Attendance stats
    const userAttendance = attendanceRecords.filter(a => {
      if (a.userId !== user.id) return false;
      if (filters?.startDate && a.date < filters.startDate) return false;
      if (filters?.endDate && a.date > filters.endDate) return false;
      return true;
    });

    const daysWorked = userAttendance.filter(a => a.status === 'PRESENT' || a.status === 'LATE' || a.status === 'HALF_DAY').length;
    const onTimeDays = userAttendance.filter(a => a.status === 'PRESENT').length;
    const onTimeRate = daysWorked > 0 ? Math.round((onTimeDays / daysWorked) * 100) : 100;

    // Commission stats
    const userCommissions = commissions.filter(c => c.userId === user.id);
    const commissionEarned = userCommissions.reduce((acc, c) => acc + (c.netCommissionAmount || 0), 0);
    const commissionPaid = userCommissions
      .filter(c => c.status === 'PAID')
      .reduce((acc, c) => acc + (c.netCommissionAmount || 0), 0);
    const commissionPending = userCommissions
      .filter(c => c.status === 'PENDING' || c.status === 'AWAITING_APPROVAL' || c.status === 'APPROVED')
      .reduce((acc, c) => acc + (c.netCommissionAmount || 0), 0);

    return {
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      branchId: user.branchId || '',
      branchName,
      totalTransactions: userSales.length,
      completedTransactions: completedCount,
      cancelledTransactions: cancelledSales.length,
      grossSalesValue,
      discountsGiven,
      returnsCount,
      returnsValue,
      netSalesValue,
      cashCollected,
      creditSalesValue,
      avgOrderValue,
      daysWorked,
      onTimeRate,
      commissionEarned,
      commissionPaid,
      commissionPending
    };
  });
}

/**
 * Calculates line-item commission for a sale based on configured CommissionRule.
 */
export function calculateSaleCommission(
  sale: Sale,
  rule: CommissionRule,
  productsMap: Map<string, Product>
): {
  eligibleAmount: number;
  rateApplied: number;
  commission: number;
  breakdownItems: CommissionBreakdownItem[];
} {
  // If sale status is cancelled, no commission
  if (sale.status === 'CANCELLED') {
    return { eligibleAmount: 0, rateApplied: 0, commission: 0, breakdownItems: [] };
  }

  // Credit sale eligibility check
  if (sale.paymentMethod === 'CREDIT' && !rule.includeCreditSales) {
    return { eligibleAmount: 0, rateApplied: 0, commission: 0, breakdownItems: [] };
  }

  const subtotal = sale.totalAmount || 0;
  if (rule.minSaleThreshold && subtotal < rule.minSaleThreshold) {
    return { eligibleAmount: 0, rateApplied: 0, commission: 0, breakdownItems: [] };
  }

  // FIXED AMOUNT PER SALE
  if (rule.ruleType === 'FIXED_PER_SALE') {
    const fixedAmount = rule.fixedAmountPerSale || 0;
    return {
      eligibleAmount: subtotal,
      rateApplied: fixedAmount,
      commission: fixedAmount,
      breakdownItems: [
        {
          id: `item-${sale.id}-fixed`,
          saleId: sale.id,
          receiptNo: sale.receiptNo,
          date: sale.date,
          saleAmount: subtotal,
          eligibleAmount: subtotal,
          rateApplied: fixedAmount,
          calculatedCommission: fixedAmount,
          paymentMethod: sale.paymentMethod,
          isReturned: false,
          returnedAmount: 0,
          netCommission: fixedAmount,
          notes: 'Fixed incentive per transaction'
        }
      ]
    };
  }

  // FLAT PERCENTAGE
  if (rule.ruleType === 'PERCENTAGE_TOTAL') {
    const rate = rule.percentageRate || 2.0;
    const comm = Math.round((subtotal * rate) / 100);
    return {
      eligibleAmount: subtotal,
      rateApplied: rate,
      commission: comm,
      breakdownItems: [
        {
          id: `item-${sale.id}-pct`,
          saleId: sale.id,
          receiptNo: sale.receiptNo,
          date: sale.date,
          saleAmount: subtotal,
          eligibleAmount: subtotal,
          rateApplied: rate,
          calculatedCommission: comm,
          paymentMethod: sale.paymentMethod,
          isReturned: false,
          returnedAmount: 0,
          netCommission: comm,
          notes: `Flat ${rate}% commission`
        }
      ]
    };
  }

  // CATEGORY TIERED
  if (rule.ruleType === 'CATEGORY_TIERED') {
    let totalComm = 0;
    let totalEligible = 0;
    const items: CommissionBreakdownItem[] = [];

    (sale.items || []).forEach((lineItem, idx) => {
      const prod = productsMap.get(lineItem.productId);
      const cat = prod?.category || 'SEEDS';
      const categoryRate = rule.categoryRates?.[cat] ?? 2.0;
      const itemSubtotal = lineItem.subtotal || (lineItem.unitPrice * lineItem.quantity);
      const itemComm = Math.round((itemSubtotal * categoryRate) / 100);

      totalEligible += itemSubtotal;
      totalComm += itemComm;

      items.push({
        id: `item-${sale.id}-${idx}`,
        saleId: sale.id,
        receiptNo: sale.receiptNo,
        date: sale.date,
        saleAmount: itemSubtotal,
        eligibleAmount: itemSubtotal,
        rateApplied: categoryRate,
        calculatedCommission: itemComm,
        paymentMethod: sale.paymentMethod,
        category: cat,
        isReturned: false,
        returnedAmount: 0,
        netCommission: itemComm,
        notes: `${cat} category rate (${categoryRate}%)`
      });
    });

    const effectiveRate = totalEligible > 0 ? parseFloat(((totalComm / totalEligible) * 100).toFixed(2)) : 0;

    return {
      eligibleAmount: totalEligible,
      rateApplied: effectiveRate,
      commission: totalComm,
      breakdownItems: items
    };
  }

  return { eligibleAmount: 0, rateApplied: 0, commission: 0, breakdownItems: [] };
}

/**
 * Calculates a monthly commission period for a staff member.
 * Automatically attributes return adjustments as separate auditable adjustment records.
 */
export function calculateMonthlyStaffCommission(params: {
  user: User;
  periodMonth: string; // YYYY-MM
  periodStart: string; // YYYY-MM-DD
  periodEnd: string; // YYYY-MM-DD
  rule: CommissionRule;
  sales: Sale[];
  returns: SalesReturn[];
  products: Product[];
  branchName: string;
}): CommissionRecord {
  const { user, periodMonth, periodStart, periodEnd, rule, sales, returns, products, branchName } = params;

  const productsMap = new Map<string, Product>();
  products.forEach(p => productsMap.set(p.id, p));

  // Find sales for this user in period
  const userSales = sales.filter(s => {
    const isStaff = s.staffUserId === user.id || s.staffName === user.name;
    if (!isStaff) return false;
    if (s.date < periodStart || s.date > periodEnd) return false;
    return s.status === 'COMPLETED';
  });

  let grossSalesAmount = 0;
  let eligibleSalesAmount = 0;
  let baseCommissionAmount = 0;
  const allBreakdownItems: CommissionBreakdownItem[] = [];

  userSales.forEach(sale => {
    grossSalesAmount += (sale.totalAmount || 0);
    const calc = calculateSaleCommission(sale, rule, productsMap);
    eligibleSalesAmount += calc.eligibleAmount;
    baseCommissionAmount += calc.commission;
    allBreakdownItems.push(...calc.breakdownItems);
  });

  // Calculate return adjustments
  const adjustments: CommissionAdjustment[] = [];
  let returnsDeductionAmount = 0;

  if (rule.deductReturns) {
    const userReturns = returns.filter(r => {
      const matchStaff = r.submittedByUserId === user.id;
      const matchSale = userSales.some(s => s.id === r.saleId || s.receiptNo === r.receiptNo);
      const inPeriod = r.returnDate >= periodStart && r.returnDate <= periodEnd;
      return (matchStaff || matchSale) && inPeriod && r.status === 'COMPLETED';
    });

    userReturns.forEach(ret => {
      // Calculate commission clawback based on return value and rule
      const refundVal = ret.refundAmount || ret.totalReturnValue || 0;
      let reversalAmount = 0;

      if (rule.ruleType === 'PERCENTAGE_TOTAL') {
        reversalAmount = Math.round((refundVal * (rule.percentageRate || 2.0)) / 100);
      } else if (rule.ruleType === 'CATEGORY_TIERED') {
        // Average deduction rate approx 2.5%
        reversalAmount = Math.round((refundVal * 2.5) / 100);
      } else {
        // Fixed rate rule clawback
        reversalAmount = rule.fixedAmountPerSale ? Math.min(rule.fixedAmountPerSale, 1500) : 0;
      }

      if (reversalAmount > 0) {
        returnsDeductionAmount += reversalAmount;
        adjustments.push({
          id: `adj-${ret.id}-${Date.now()}`,
          type: 'RETURN_REVERSAL',
          referenceNo: ret.returnNo,
          saleId: ret.saleId,
          returnId: ret.id,
          description: `Automatic commission deduction for Sales Return ${ret.returnNo} (₦${refundVal.toLocaleString()})`,
          amount: -reversalAmount,
          createdAt: new Date().toISOString(),
          createdByUserId: 'system',
          createdByUserName: 'Royal Agro System Engine'
        });
      }
    });
  }

  const adjustmentsAmount = adjustments.reduce((acc, a) => acc + a.amount, 0);
  const netCommissionAmount = Math.max(0, baseCommissionAmount + adjustmentsAmount);

  return {
    id: `com-${periodMonth.replace('-', '')}-${user.id}`,
    commissionNo: `COM-${periodMonth.replace('-', '')}-${user.id.slice(-4).toUpperCase()}`,
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    branchId: user.branchId || '',
    branchName,
    periodMonth,
    periodStart,
    periodEnd,
    ruleId: rule.id,
    ruleName: rule.name,
    grossSalesAmount,
    eligibleSalesAmount,
    salesCount: userSales.length,
    returnsDeductionAmount,
    baseCommissionAmount,
    adjustmentsAmount,
    netCommissionAmount,
    status: 'AWAITING_APPROVAL',
    breakdownItems: allBreakdownItems,
    adjustments,
    notes: `Calculated commission for ${user.name} covering ${periodMonth}.`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    syncStatus: 'synced'
  };
}

/**
 * Generates CSV string for staff attendance records.
 */
export function exportAttendanceToCSV(records: AttendanceRecord[]): string {
  const headers = [
    'Date',
    'Staff Name',
    'Role',
    'Branch',
    'Clock In',
    'Clock Out',
    'Hours Worked',
    'Status',
    'Missing Clock-Out',
    'Explanation / Notes',
    'Correction Status'
  ];

  const rows = records.map(r => [
    `"${r.date}"`,
    `"${r.userName}"`,
    `"${r.userRole}"`,
    `"${r.branchName}"`,
    `"${r.clockIn || 'N/A'}"`,
    `"${r.clockOut || 'N/A'}"`,
    `"${formatWorkingHours(r.workMinutes)}"`,
    `"${r.status}"`,
    `"${r.isMissingClockOut ? 'YES' : 'NO'}"`,
    `"${(r.explanation || r.notes || '').replace(/"/g, '""')}"`,
    `"${r.correctionRequest ? r.correctionRequest.status : 'None'}"`
  ]);

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

/**
 * Generates CSV string for staff sales performance metrics.
 */
export function exportPerformanceToCSV(summaries: StaffPerformanceSummary[]): string {
  const headers = [
    'Staff Name',
    'Role',
    'Branch',
    'Transactions',
    'Completed',
    'Cancelled',
    'Gross Sales (NGN)',
    'Discounts Given (NGN)',
    'Returns Count',
    'Returns Value (NGN)',
    'Net Sales (NGN)',
    'Cash Collected (NGN)',
    'Credit Sales (NGN)',
    'Avg Order Value (NGN)',
    'Days Worked',
    'On-Time Rate (%)',
    'Commission Earned (NGN)',
    'Commission Paid (NGN)'
  ];

  const rows = summaries.map(s => [
    `"${s.userName}"`,
    `"${s.userRole}"`,
    `"${s.branchName}"`,
    s.totalTransactions,
    s.completedTransactions,
    s.cancelledTransactions,
    s.grossSalesValue,
    s.discountsGiven,
    s.returnsCount,
    s.returnsValue,
    s.netSalesValue,
    s.cashCollected,
    s.creditSalesValue,
    s.avgOrderValue,
    s.daysWorked,
    `${s.onTimeRate}%`,
    s.commissionEarned,
    s.commissionPaid
  ]);

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

/**
 * Generates CSV string for staff commission records.
 */
export function exportCommissionsToCSV(records: CommissionRecord[]): string {
  const headers = [
    'Commission Ref',
    'Staff Name',
    'Branch',
    'Period',
    'Rule Applied',
    'Gross Sales (NGN)',
    'Eligible Sales (NGN)',
    'Base Commission (NGN)',
    'Adjustments / Deductions (NGN)',
    'Net Commission (NGN)',
    'Status',
    'Approved By',
    'Approved At',
    'Payment Ref',
    'Paid At'
  ];

  const rows = records.map(c => [
    `"${c.commissionNo}"`,
    `"${c.userName}"`,
    `"${c.branchName}"`,
    `"${c.periodMonth}"`,
    `"${c.ruleName}"`,
    c.grossSalesAmount,
    c.eligibleSalesAmount,
    c.baseCommissionAmount,
    c.adjustmentsAmount,
    c.netCommissionAmount,
    `"${c.status}"`,
    `"${c.approvedByUserName || 'N/A'}"`,
    `"${c.approvedAt || 'N/A'}"`,
    `"${c.paymentReference || 'N/A'}"`,
    `"${c.paidAt || 'N/A'}"`
  ]);

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}
