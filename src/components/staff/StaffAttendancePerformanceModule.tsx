import React, { useState, useMemo } from 'react';
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  DollarSign,
  TrendingUp,
  UserCheck,
  Award,
  FileText,
  Download,
  Printer,
  Search,
  Filter,
  Plus,
  RefreshCw,
  Percent,
  ChevronDown,
  Eye,
  Check,
  X,
  CreditCard,
  Building2,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Send,
  User as UserIcon,
  ShoppingBag,
  Sliders
} from 'lucide-react';
import {
  AppState,
  User,
  Branch,
  Sale,
  SalesReturn,
  Product,
  AttendanceRecord,
  AttendanceStatus,
  LeaveType,
  CommissionRecord,
  CommissionRule,
  CommissionRuleType,
  ProductCategory
} from '../../types';
import {
  formatWorkingHours,
  getTodayDateString,
  getCurrentTimeString,
  canUserClockIn,
  canUserClockOut,
  createClockInRecord,
  processClockOut,
  calculateStaffPerformance,
  calculateMonthlyStaffCommission,
  exportAttendanceToCSV,
  exportPerformanceToCSV,
  exportCommissionsToCSV
} from '../../services/attendanceCommissionService';

interface StaffAttendancePerformanceModuleProps {
  appState: AppState;
  currentUser: User;
  onUpdateAttendance: (updatedRecords: AttendanceRecord[], auditAction?: string, auditDetails?: string) => void;
  onUpdateCommissions: (updatedCommissions: CommissionRecord[], auditAction?: string, auditDetails?: string) => void;
  onUpdateCommissionRules: (updatedRules: CommissionRule[], auditAction?: string, auditDetails?: string) => void;
  onRecordCommissionPayment?: (
    commission: CommissionRecord,
    paymentDetails: { paymentReference: string; paymentMethod: 'BANK_TRANSFER' | 'CASH' | 'CHEQUE'; notes?: string }
  ) => void;
}

type TabType = 'MY_ATTENDANCE' | 'ATTENDANCE_DASHBOARD' | 'SALES_PERFORMANCE' | 'COMMISSIONS' | 'REPORTS';

export const StaffAttendancePerformanceModule: React.FC<StaffAttendancePerformanceModuleProps> = ({
  appState,
  currentUser,
  onUpdateAttendance,
  onUpdateCommissions,
  onUpdateCommissionRules,
  onRecordCommissionPayment
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('MY_ATTENDANCE');

  // Filters
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    currentUser.role === 'CEO' ? 'ALL' : currentUser.branchId || 'ALL'
  );
  const [selectedStaffId, setSelectedStaffId] = useState<string>('ALL');
  const [selectedPeriodMonth, setSelectedPeriodMonth] = useState<string>(
    getTodayDateString().slice(0, 7)
  );
  const [selectedDateFilter, setSelectedDateFilter] = useState<'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'ALL'>('THIS_MONTH');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Drawers
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [selectedAttendanceForCorrection, setSelectedAttendanceForCorrection] = useState<AttendanceRecord | null>(null);
  const [correctionClockIn, setCorrectionClockIn] = useState('');
  const [correctionClockOut, setCorrectionClockOut] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');

  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveStaffId, setLeaveStaffId] = useState('');
  const [leaveDate, setLeaveDate] = useState(getTodayDateString());
  const [leaveType, setLeaveType] = useState<LeaveType>('SICK');
  const [leaveReason, setLeaveReason] = useState('');

  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [ruleName, setRuleName] = useState('');
  const [ruleDescription, setRuleDescription] = useState('');
  const [ruleType, setRuleType] = useState<CommissionRuleType>('CATEGORY_TIERED');
  const [rulePercentage, setRulePercentage] = useState(2.0);
  const [ruleFixedAmount, setRuleFixedAmount] = useState(2000);
  const [ruleSeedsRate, setRuleSeedsRate] = useState(3.0);
  const [ruleFertilizersRate, setRuleFertilizersRate] = useState(1.5);
  const [ruleAgrochemRate, setRuleAgrochemRate] = useState(2.5);
  const [ruleEquipRate, setRuleEquipRate] = useState(2.0);
  const [ruleIncludeCredit, setRuleIncludeCredit] = useState(true);
  const [ruleDeductReturns, setRuleDeductReturns] = useState(true);
  const [ruleMinThreshold, setRuleMinThreshold] = useState(5000);

  const [isCalcModalOpen, setIsCalcModalOpen] = useState(false);
  const [calcStaffId, setCalcStaffId] = useState(currentUser.id);
  const [calcRuleId, setCalcRuleId] = useState('');

  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [selectedCommissionForPayout, setSelectedCommissionForPayout] = useState<CommissionRecord | null>(null);
  const [payoutReference, setPayoutReference] = useState('');
  const [payoutMethod, setPayoutMethod] = useState<'BANK_TRANSFER' | 'CASH' | 'CHEQUE'>('BANK_TRANSFER');
  const [payoutNotes, setPayoutNotes] = useState('');

  const [statementCommission, setStatementCommission] = useState<CommissionRecord | null>(null);
  const [staffSalesDetailsUser, setStaffSalesDetailsUser] = useState<User | null>(null);

  const isCEO = currentUser.role === 'CEO';
  const isBranchManager = currentUser.role === 'BRANCH_MANAGER';
  const canManageBranch = isCEO || isBranchManager;

  const attendanceRecords = appState.attendance || [];
  const commissions = appState.commissions || [];
  const commissionRules = appState.commissionRules || [];
  const users = appState.users || [];
  const branches = appState.branches || [];
  const sales = appState.sales || [];
  const returns = appState.salesReturns || [];
  const products = appState.products || [];

  const todayStr = getTodayDateString();

  // Find user's attendance record today
  const myTodayAttendance = attendanceRecords.find(
    r => r.userId === currentUser.id && r.date === todayStr
  );

  const clockInCheck = canUserClockIn(attendanceRecords, currentUser.id, todayStr);
  const clockOutCheck = canUserClockOut(attendanceRecords, currentUser.id, todayStr);

  // Handle Clock In
  const handleClockIn = () => {
    if (!clockInCheck.allowed) {
      alert(clockInCheck.reason);
      return;
    }
    const userBranch = branches.find(b => b.id === currentUser.branchId);
    const branchName = userBranch?.name || currentUser.branchName || 'Headquarters';
    const isOffline = !navigator.onLine;

    const newRec = createClockInRecord({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      branchId: currentUser.branchId || 'br-1',
      branchName,
      isOffline,
      scheduledStart: '08:30'
    });

    const updated = [newRec, ...attendanceRecords.filter(r => r.id !== newRec.id)];
    onUpdateAttendance(
      updated,
      'STAFF_CLOCK_IN',
      `${currentUser.name} clocked in at ${newRec.clockIn} (${newRec.status})`
    );
  };

  // Handle Clock Out
  const handleClockOut = () => {
    if (!clockOutCheck.allowed || !myTodayAttendance) {
      alert(clockOutCheck.reason || 'Cannot clock out');
      return;
    }
    const isOffline = !navigator.onLine;
    const updatedRec = processClockOut(myTodayAttendance, isOffline);
    const updated = attendanceRecords.map(r => r.id === updatedRec.id ? updatedRec : r);
    onUpdateAttendance(
      updated,
      'STAFF_CLOCK_OUT',
      `${currentUser.name} clocked out at ${updatedRec.clockOut} (${formatWorkingHours(updatedRec.workMinutes)})`
    );
  };

  // Submit Attendance Correction
  const handleSubmitCorrection = () => {
    if (!selectedAttendanceForCorrection) return;
    if (!correctionReason.trim()) {
      alert('Please state a reason for this attendance correction request.');
      return;
    }

    const updatedRec: AttendanceRecord = {
      ...selectedAttendanceForCorrection,
      correctionRequest: {
        id: `cor-${Date.now()}`,
        requestedClockIn: correctionClockIn || selectedAttendanceForCorrection.clockIn || undefined,
        requestedClockOut: correctionClockOut || selectedAttendanceForCorrection.clockOut || undefined,
        reason: correctionReason,
        status: 'PENDING',
        requestedAt: new Date().toISOString()
      },
      updatedAt: new Date().toISOString()
    };

    const updated = attendanceRecords.map(r => r.id === updatedRec.id ? updatedRec : r);
    onUpdateAttendance(
      updated,
      'ATTENDANCE_CORRECTION_REQUESTED',
      `Correction request submitted by ${currentUser.name} for ${selectedAttendanceForCorrection.date}`
    );

    setIsCorrectionModalOpen(false);
    setSelectedAttendanceForCorrection(null);
    setCorrectionReason('');
    setCorrectionClockIn('');
    setCorrectionClockOut('');
  };

  // Manager Approve/Reject Attendance Correction
  const handleReviewCorrection = (record: AttendanceRecord, approved: boolean, reason?: string) => {
    if (!record.correctionRequest) return;
    if (record.userId === currentUser.id) {
      alert('Separation of duties: You cannot approve or review your own attendance correction.');
      return;
    }

    const req = record.correctionRequest;
    const newClockIn = approved && req.requestedClockIn ? req.requestedClockIn : record.clockIn;
    const newClockOut = approved && req.requestedClockOut ? req.requestedClockOut : record.clockOut;

    // Recalculate duration if approved
    const workMinutes = approved
      ? (newClockIn && newClockOut ? Math.max(0, (new Date(`1970-01-01T${newClockOut}:00`).getTime() - new Date(`1970-01-01T${newClockIn}:00`).getTime()) / 60000) : record.workMinutes)
      : record.workMinutes;

    const updatedRec: AttendanceRecord = {
      ...record,
      clockIn: newClockIn,
      clockOut: newClockOut,
      workMinutes: isNaN(workMinutes) ? record.workMinutes : workMinutes,
      isMissingClockOut: approved ? false : record.isMissingClockOut,
      correctionRequest: {
        ...req,
        status: approved ? 'APPROVED' : 'REJECTED',
        reviewedByUserId: currentUser.id,
        reviewedByUserName: currentUser.name,
        reviewedAt: new Date().toISOString(),
        rejectionReason: !approved ? (reason || 'Disapproved by manager') : undefined
      },
      updatedAt: new Date().toISOString()
    };

    const updated = attendanceRecords.map(r => r.id === updatedRec.id ? updatedRec : r);
    onUpdateAttendance(
      updated,
      approved ? 'ATTENDANCE_CORRECTION_APPROVED' : 'ATTENDANCE_CORRECTION_REJECTED',
      `Correction ${approved ? 'approved' : 'rejected'} for ${record.userName} (${record.date}) by ${currentUser.name}`
    );
  };

  // Record Staff Leave
  const handleRecordLeave = () => {
    const targetUser = users.find(u => u.id === leaveStaffId);
    if (!targetUser) {
      alert('Please select a staff member.');
      return;
    }
    const targetBranch = branches.find(b => b.id === targetUser.branchId);

    const leaveRec: AttendanceRecord = {
      id: `att-leave-${Date.now()}`,
      userId: targetUser.id,
      userName: targetUser.name,
      userRole: targetUser.role,
      branchId: targetUser.branchId || 'br-1',
      branchName: targetBranch?.name || 'Headquarters',
      date: leaveDate,
      clockIn: null,
      clockOut: null,
      workMinutes: 0,
      status: 'ON_LEAVE',
      isMissingClockOut: false,
      leaveType,
      leaveReason,
      syncStatus: 'synced',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updated = [leaveRec, ...attendanceRecords.filter(r => !(r.userId === targetUser.id && r.date === leaveDate))];
    onUpdateAttendance(
      updated,
      'STAFF_LEAVE_REGISTERED',
      `${leaveType} leave recorded for ${targetUser.name} on ${leaveDate}`
    );

    setIsLeaveModalOpen(false);
    setLeaveReason('');
  };

  // Filtered attendance for manager dashboard
  const dashboardAttendance = useMemo(() => {
    return attendanceRecords.filter(r => {
      if (selectedBranchId !== 'ALL' && r.branchId !== selectedBranchId) return false;
      if (selectedStaffId !== 'ALL' && r.userId !== selectedStaffId) return false;
      if (selectedDateFilter === 'TODAY' && r.date !== todayStr) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return r.userName.toLowerCase().includes(q) || r.branchName.toLowerCase().includes(q);
      }
      return true;
    });
  }, [attendanceRecords, selectedBranchId, selectedStaffId, selectedDateFilter, searchQuery, todayStr]);

  // Today's attendance stats for dashboard
  const todayRecords = attendanceRecords.filter(r => r.date === todayStr);
  const presentTodayCount = todayRecords.filter(r => r.status === 'PRESENT' || r.status === 'LATE').length;
  const lateTodayCount = todayRecords.filter(r => r.status === 'LATE').length;
  const missingClockOutCount = attendanceRecords.filter(r => r.isMissingClockOut || (r.date < todayStr && r.clockIn && !r.clockOut)).length;
  const pendingCorrectionsCount = attendanceRecords.filter(r => r.correctionRequest?.status === 'PENDING').length;
  const onLeaveTodayCount = todayRecords.filter(r => r.status === 'ON_LEAVE').length;

  // Staff Performance Data
  const performanceSummaries = useMemo(() => {
    return calculateStaffPerformance(
      sales,
      returns,
      users,
      branches,
      commissions,
      attendanceRecords,
      {
        branchId: selectedBranchId !== 'ALL' ? selectedBranchId : null
      }
    );
  }, [sales, returns, users, branches, commissions, attendanceRecords, selectedBranchId]);

  // Filtered Performance
  const filteredPerformance = useMemo(() => {
    return performanceSummaries.filter(s => {
      if (selectedBranchId !== 'ALL' && s.branchId !== selectedBranchId) return false;
      if (selectedStaffId !== 'ALL' && s.userId !== selectedStaffId) return false;
      if (searchQuery) {
        return s.userName.toLowerCase().includes(searchQuery.toLowerCase()) || s.branchName.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return true;
    });
  }, [performanceSummaries, selectedBranchId, selectedStaffId, searchQuery]);

  // Handle Calculate Monthly Commission
  const handleCalculateCommission = () => {
    const targetUser = users.find(u => u.id === calcStaffId);
    if (!targetUser) {
      alert('Select staff member.');
      return;
    }
    const rule = commissionRules.find(r => r.id === calcRuleId) || commissionRules[0];
    if (!rule) {
      alert('No commission rule found.');
      return;
    }

    const yearMonth = selectedPeriodMonth;
    const periodStart = `${yearMonth}-01`;
    const periodEnd = `${yearMonth}-31`;

    const userBranch = branches.find(b => b.id === targetUser.branchId);
    const branchName = userBranch?.name || targetUser.branchName || 'Headquarters';

    const newCommission = calculateMonthlyStaffCommission({
      user: targetUser,
      periodMonth: yearMonth,
      periodStart,
      periodEnd,
      rule,
      sales,
      returns,
      products,
      branchName
    });

    // Replace if exists for this user and period
    const existingIndex = commissions.findIndex(
      c => c.userId === targetUser.id && c.periodMonth === yearMonth
    );

    let updated: CommissionRecord[];
    if (existingIndex >= 0) {
      updated = [...commissions];
      updated[existingIndex] = { ...newCommission, id: commissions[existingIndex].id };
    } else {
      updated = [newCommission, ...commissions];
    }

    onUpdateCommissions(
      updated,
      'COMMISSION_CALCULATED',
      `Commission calculated for ${targetUser.name} for period ${yearMonth} (Net: ₦${newCommission.netCommissionAmount.toLocaleString()})`
    );

    setIsCalcModalOpen(false);
  };

  // Commission Approval (Separation of duties enforced)
  const handleApproveCommission = (commission: CommissionRecord) => {
    if (commission.userId === currentUser.id) {
      alert('Separation of duties: You cannot approve your own commission.');
      return;
    }
    if (!canManageBranch) {
      alert('Only branch managers or CEO can approve commissions.');
      return;
    }

    const updatedRec: CommissionRecord = {
      ...commission,
      status: 'APPROVED',
      approvedByUserId: currentUser.id,
      approvedByUserName: currentUser.name,
      approvedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      updatedAt: new Date().toISOString()
    };

    const updated = commissions.map(c => c.id === updatedRec.id ? updatedRec : c);
    onUpdateCommissions(
      updated,
      'COMMISSION_APPROVED',
      `Commission ${commission.commissionNo} for ${commission.userName} approved by ${currentUser.name}`
    );
  };

  // Commission Rejection
  const handleRejectCommission = (commission: CommissionRecord) => {
    if (commission.userId === currentUser.id) {
      alert('Separation of duties: You cannot reject your own commission.');
      return;
    }
    const reason = prompt('Please enter reason for rejection:');
    if (reason === null) return;

    const updatedRec: CommissionRecord = {
      ...commission,
      status: 'REJECTED',
      rejectionReason: reason || 'Disapproved during manager review',
      updatedAt: new Date().toISOString()
    };

    const updated = commissions.map(c => c.id === updatedRec.id ? updatedRec : c);
    onUpdateCommissions(
      updated,
      'COMMISSION_REJECTED',
      `Commission ${commission.commissionNo} rejected by ${currentUser.name}`
    );
  };

  // Record Commission Payment
  const handleConfirmPayout = () => {
    if (!selectedCommissionForPayout) return;
    if (!payoutReference.trim()) {
      alert('Please provide a bank transfer, cheque, or voucher payment reference.');
      return;
    }

    const updatedRec: CommissionRecord = {
      ...selectedCommissionForPayout,
      status: 'PAID',
      paidAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      paidByUserId: currentUser.id,
      paidByUserName: currentUser.name,
      paymentReference: payoutReference.trim(),
      paymentMethod: payoutMethod,
      notes: payoutNotes ? `${selectedCommissionForPayout.notes || ''} | ${payoutNotes}` : selectedCommissionForPayout.notes,
      updatedAt: new Date().toISOString()
    };

    const updated = commissions.map(c => c.id === updatedRec.id ? updatedRec : c);
    onUpdateCommissions(
      updated,
      'COMMISSION_PAID',
      `Commission ${selectedCommissionForPayout.commissionNo} (₦${selectedCommissionForPayout.netCommissionAmount.toLocaleString()}) disbursed to ${selectedCommissionForPayout.userName}. Ref: ${payoutReference}`
    );

    if (onRecordCommissionPayment) {
      onRecordCommissionPayment(updatedRec, {
        paymentReference: payoutReference.trim(),
        paymentMethod: payoutMethod,
        notes: payoutNotes
      });
    }

    setIsPayoutModalOpen(false);
    setSelectedCommissionForPayout(null);
    setPayoutReference('');
    setPayoutNotes('');
  };

  // Save Commission Rule
  const handleSaveCommissionRule = () => {
    if (!ruleName.trim()) {
      alert('Please enter a rule name.');
      return;
    }

    const newRule: CommissionRule = {
      id: `rule-${Date.now()}`,
      name: ruleName.trim(),
      description: ruleDescription.trim() || 'Custom agronomy sales commission rule',
      ruleType,
      percentageRate: ruleType === 'PERCENTAGE_TOTAL' ? rulePercentage : undefined,
      fixedAmountPerSale: ruleType === 'FIXED_PER_SALE' ? ruleFixedAmount : undefined,
      categoryRates: ruleType === 'CATEGORY_TIERED' ? {
        SEEDS: ruleSeedsRate,
        FERTILIZERS: ruleFertilizersRate,
        AGROCHEMICALS: ruleAgrochemRate,
        EQUIPMENT: ruleEquipRate,
        CROP_CARE: ruleAgrochemRate,
        SEEDLINGS: ruleSeedsRate,
        IRRIGATION: ruleEquipRate,
        ANIMAL_HEALTH: ruleAgrochemRate
      } : undefined,
      includeCreditSales: ruleIncludeCredit,
      deductReturns: ruleDeductReturns,
      minSaleThreshold: ruleMinThreshold,
      status: 'ACTIVE',
      effectiveDate: getTodayDateString(),
      createdByUserId: currentUser.id,
      createdAt: new Date().toISOString()
    };

    const updated = [newRule, ...commissionRules];
    onUpdateCommissionRules(
      updated,
      'COMMISSION_RULE_CREATED',
      `New commission policy created: ${newRule.name} (${newRule.ruleType})`
    );

    setIsRuleModalOpen(false);
    setRuleName('');
    setRuleDescription('');
  };

  // Exports
  const handleExportAttendanceCSV = () => {
    const csv = exportAttendanceToCSV(dashboardAttendance);
    downloadFile(csv, `RoyalAgro_Attendance_${getTodayDateString()}.csv`, 'text/csv');
  };

  const handleExportPerformanceCSV = () => {
    const csv = exportPerformanceToCSV(filteredPerformance);
    downloadFile(csv, `RoyalAgro_Staff_Performance_${getTodayDateString()}.csv`, 'text/csv');
  };

  const handleExportCommissionsCSV = () => {
    const csv = exportCommissionsToCSV(commissions);
    downloadFile(csv, `RoyalAgro_Commissions_${getTodayDateString()}.csv`, 'text/csv');
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type: `${type};charset=utf-8;` });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-600 mb-1">
            <UserCheck className="w-4 h-4" />
            Module 18: Staff Management
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Staff Attendance, Performance & Commissions
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time biometric-free shift tracking, sales attribution, return clawbacks & audited commission disbursements.
          </p>
        </div>

        {/* Global Quick Action Clock Button */}
        <div className="flex items-center gap-3">
          {myTodayAttendance?.clockIn && !myTodayAttendance?.clockOut ? (
            <button
              onClick={handleClockOut}
              className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-xl shadow-sm transition-colors text-sm"
            >
              <Clock className="w-4 h-4 animate-spin" />
              Clock Out (Shift Active)
            </button>
          ) : (
            <button
              onClick={handleClockIn}
              disabled={!clockInCheck.allowed}
              className={`flex items-center gap-2 px-5 py-2.5 font-medium rounded-xl shadow-sm transition-colors text-sm ${
                clockInCheck.allowed
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
              }`}
            >
              <Clock className="w-4 h-4" />
              {myTodayAttendance?.clockOut ? 'Shift Completed Today' : 'Clock In for Shift'}
            </button>
          )}

          {canManageBranch && (
            <button
              onClick={() => setIsLeaveModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl border border-slate-200 text-sm transition-colors"
            >
              <Calendar className="w-4 h-4 text-slate-500" />
              Record Leave
            </button>
          )}
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-4 pt-2 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('MY_ATTENDANCE')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-all whitespace-nowrap ${
            activeTab === 'MY_ATTENDANCE'
              ? 'border-emerald-600 text-emerald-600 font-semibold'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4" />
          My Attendance & Shifts
        </button>

        {canManageBranch && (
          <button
            onClick={() => setActiveTab('ATTENDANCE_DASHBOARD')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-all whitespace-nowrap ${
              activeTab === 'ATTENDANCE_DASHBOARD'
                ? 'border-emerald-600 text-emerald-600 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Branch Attendance Hub
            {pendingCorrectionsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-amber-500 text-white rounded-full font-bold">
                {pendingCorrectionsCount}
              </span>
            )}
          </button>
        )}

        <button
          onClick={() => setActiveTab('SALES_PERFORMANCE')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-all whitespace-nowrap ${
            activeTab === 'SALES_PERFORMANCE'
              ? 'border-emerald-600 text-emerald-600 font-semibold'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Staff Sales Performance
        </button>

        <button
          onClick={() => setActiveTab('COMMISSIONS')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-all whitespace-nowrap ${
            activeTab === 'COMMISSIONS'
              ? 'border-emerald-600 text-emerald-600 font-semibold'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Award className="w-4 h-4" />
          Commissions & Disbursements
        </button>

        <button
          onClick={() => setActiveTab('REPORTS')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-all whitespace-nowrap ${
            activeTab === 'REPORTS'
              ? 'border-emerald-600 text-emerald-600 font-semibold'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          Audit Reports & CSV Exports
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: MY ATTENDANCE */}
      {/* ======================================================== */}
      {activeTab === 'MY_ATTENDANCE' && (
        <div className="space-y-6">
          {/* Today's Shift Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-sm border border-slate-700">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-700/60 pb-4 mb-4">
                <div>
                  <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                    Today's Roster Status
                  </span>
                  <h3 className="text-xl font-bold mt-1 flex items-center gap-2">
                    {currentUser.name}
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-700 text-slate-300 font-normal">
                      {currentUser.role.replace('_', ' ')}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Branch: {branches.find(b => b.id === currentUser.branchId)?.name || 'Headquarters'}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400">Scheduled Work Shift</div>
                  <div className="text-sm font-semibold text-emerald-300">08:30 AM – 05:30 PM</div>
                  <div className="text-xs text-slate-500 mt-0.5">5-Minute Grace Period Applies</div>
                </div>
              </div>

              {/* Attendance metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 my-4">
                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/50">
                  <span className="text-xs text-slate-400">Clock In Time</span>
                  <div className="text-lg font-bold text-white mt-1">
                    {myTodayAttendance?.clockIn ? myTodayAttendance.clockIn : '--:--'}
                  </div>
                  <span className="text-[11px] text-emerald-400">
                    {myTodayAttendance?.clockIn ? 'Captured' : 'Pending In'}
                  </span>
                </div>

                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/50">
                  <span className="text-xs text-slate-400">Clock Out Time</span>
                  <div className="text-lg font-bold text-white mt-1">
                    {myTodayAttendance?.clockOut ? myTodayAttendance.clockOut : '--:--'}
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {myTodayAttendance?.clockOut ? 'Finished' : 'In Progress'}
                  </span>
                </div>

                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/50">
                  <span className="text-xs text-slate-400">Logged Hours</span>
                  <div className="text-lg font-bold text-emerald-300 mt-1">
                    {myTodayAttendance?.workMinutes
                      ? formatWorkingHours(myTodayAttendance.workMinutes)
                      : (myTodayAttendance?.clockIn ? 'Counting...' : '0h 0m')}
                  </div>
                  <span className="text-[11px] text-slate-400">Standard 8h Shift</span>
                </div>

                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/50">
                  <span className="text-xs text-slate-400">Shift Status</span>
                  <div className="mt-1">
                    {myTodayAttendance ? (
                      <span className={`inline-block px-2.5 py-1 text-xs rounded-lg font-bold ${
                        myTodayAttendance.status === 'PRESENT'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : myTodayAttendance.status === 'LATE'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      }`}>
                        {myTodayAttendance.status}
                      </span>
                    ) : (
                      <span className="inline-block px-2.5 py-1 text-xs rounded-lg font-medium bg-slate-700 text-slate-400">
                        NOT CLOCKED IN
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    {myTodayAttendance?.syncStatus === 'pending_verification' ? 'Offline Local Time' : 'Verified Server Time'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-700/60">
                {!myTodayAttendance?.clockIn && (
                  <button
                    onClick={handleClockIn}
                    disabled={!clockInCheck.allowed}
                    className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl shadow-md text-sm transition-all"
                  >
                    Confirm Clock In
                  </button>
                )}

                {myTodayAttendance?.clockIn && !myTodayAttendance?.clockOut && (
                  <button
                    onClick={handleClockOut}
                    className="px-6 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl shadow-md text-sm transition-all"
                  >
                    Confirm Clock Out
                  </button>
                )}

                {myTodayAttendance && (
                  <button
                    onClick={() => {
                      setSelectedAttendanceForCorrection(myTodayAttendance);
                      setCorrectionClockIn(myTodayAttendance.clockIn || '');
                      setCorrectionClockOut(myTodayAttendance.clockOut || '');
                      setIsCorrectionModalOpen(true);
                    }}
                    className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium rounded-xl transition-all"
                  >
                    Request Correction
                  </button>
                )}

                {!navigator.onLine && (
                  <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-950/40 px-3 py-1.5 rounded-lg border border-amber-800/40">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Offline mode: Time recorded locally & marked 'Pending Verification'.
                  </div>
                )}
              </div>
            </div>

            {/* Attendance Rules Notice Card */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Royal Agro Attendance Policy
                </h4>
                <ul className="text-xs text-slate-600 space-y-2 mt-3 list-disc pl-4">
                  <li>Standard morning check-in cutoff is <strong>08:35 AM</strong> (08:30 + 5-minute grace period).</li>
                  <li>Arrivals after 08:35 AM automatically register as <strong>LATE</strong>.</li>
                  <li>Duplicate clock-ins on the same calendar date are strictly prevented.</li>
                  <li>Missing clock-outs flag an automatic review requirement before end-of-month commission audit.</li>
                  <li>Attendance corrections require branch manager or CEO sign-off.</li>
                </ul>
              </div>

              <div className="mt-4 p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-xs text-emerald-800">
                <span className="font-semibold">Commission Eligibility:</span> Consistent punctuality is evaluated during monthly bonus reviews.
              </div>
            </div>
          </div>

          {/* Personal Attendance History Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">My Shift & Attendance History</h3>
                <p className="text-xs text-slate-500">Review all logged hours, punctuality records, and pending manager reviews.</p>
              </div>

              <button
                onClick={() => {
                  const myRecords = attendanceRecords.filter(r => r.userId === currentUser.id);
                  const csv = exportAttendanceToCSV(myRecords);
                  downloadFile(csv, `My_Attendance_${currentUser.name.replace(/\s+/g, '_')}.csv`, 'text/csv');
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Export My Log (CSV)
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-semibold text-xs border-b border-slate-200">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Branch</th>
                    <th className="py-3 px-4">Clock In</th>
                    <th className="py-3 px-4">Clock Out</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Audit / Correction</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {attendanceRecords
                    .filter(r => r.userId === currentUser.id)
                    .map(record => (
                      <tr key={record.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-medium text-slate-900">
                          {record.date}
                          {record.date === todayStr && (
                            <span className="ml-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                              TODAY
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{record.branchName}</td>
                        <td className="py-3 px-4 font-mono text-xs">{record.clockIn || '—'}</td>
                        <td className="py-3 px-4 font-mono text-xs">
                          {record.clockOut || (record.isMissingClockOut ? (
                            <span className="text-amber-600 font-bold text-xs flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> Missing
                            </span>
                          ) : '—')}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900">
                          {formatWorkingHours(record.workMinutes)}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            record.status === 'PRESENT'
                              ? 'bg-emerald-100 text-emerald-800'
                              : record.status === 'LATE'
                              ? 'bg-amber-100 text-amber-800'
                              : record.status === 'ON_LEAVE'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {record.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs">
                          {record.correctionRequest ? (
                            <div className="flex flex-col">
                              <span className={`font-semibold ${
                                record.correctionRequest.status === 'APPROVED'
                                  ? 'text-emerald-600'
                                  : record.correctionRequest.status === 'REJECTED'
                                  ? 'text-rose-600'
                                  : 'text-amber-600'
                              }`}>
                                Correction: {record.correctionRequest.status}
                              </span>
                              <span className="text-[11px] text-slate-500 truncate max-w-xs">
                                {record.correctionRequest.reason}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400">Regular Record</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedAttendanceForCorrection(record);
                              setCorrectionClockIn(record.clockIn || '');
                              setCorrectionClockOut(record.clockOut || '');
                              setIsCorrectionModalOpen(true);
                            }}
                            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md"
                          >
                            Correct
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: ATTENDANCE DASHBOARD (Manager / CEO View) */}
      {/* ======================================================== */}
      {activeTab === 'ATTENDANCE_DASHBOARD' && canManageBranch && (
        <div className="space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">Present Today</span>
              <div className="text-2xl font-bold text-slate-900 mt-1 flex items-center justify-between">
                {presentTodayCount}
                <UserCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="text-xs text-emerald-600 mt-1 block font-medium">Active On-Site Staff</span>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">Late Arrivals</span>
              <div className="text-2xl font-bold text-amber-600 mt-1 flex items-center justify-between">
                {lateTodayCount}
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
              <span className="text-xs text-amber-600 mt-1 block font-medium">&gt; 08:35 AM Cutoff</span>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">Missing Clock-Outs</span>
              <div className="text-2xl font-bold text-rose-600 mt-1 flex items-center justify-between">
                {missingClockOutCount}
                <AlertCircle className="w-5 h-5 text-rose-500" />
              </div>
              <span className="text-xs text-rose-600 mt-1 block font-medium">Requires Resolution</span>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">Pending Corrections</span>
              <div className="text-2xl font-bold text-indigo-600 mt-1 flex items-center justify-between">
                {pendingCorrectionsCount}
                <Send className="w-5 h-5 text-indigo-500" />
              </div>
              <span className="text-xs text-indigo-600 mt-1 block font-medium">Awaiting Manager Review</span>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">On Approved Leave</span>
              <div className="text-2xl font-bold text-blue-600 mt-1 flex items-center justify-between">
                {onLeaveTodayCount}
                <Calendar className="w-5 h-5 text-blue-500" />
              </div>
              <span className="text-xs text-blue-600 mt-1 block font-medium">Sick / Annual / Casual</span>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {isCEO && (
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <select
                    value={selectedBranchId}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 bg-white"
                  >
                    <option value="ALL">All Branches</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <select
                  value={selectedDateFilter}
                  onChange={(e) => setSelectedDateFilter(e.target.value as any)}
                  className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 bg-white"
                >
                  <option value="TODAY">Today Only</option>
                  <option value="THIS_MONTH">This Month</option>
                  <option value="ALL">All Recorded Dates</option>
                </select>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search staff or notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg w-48 text-slate-800"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportAttendanceCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100"
              >
                <Download className="w-3.5 h-3.5" />
                Export Attendance (CSV)
              </button>
            </div>
          </div>

          {/* Pending Attendance Correction Requests Section */}
          {pendingCorrectionsCount > 0 && (
            <div className="bg-amber-50/60 rounded-2xl p-5 border border-amber-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-amber-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Attendance Correction Requests Awaiting Manager Sign-Off ({pendingCorrectionsCount})
                </h3>
                <span className="text-xs text-amber-700 font-medium">Separation of duties applies</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {attendanceRecords
                  .filter(r => r.correctionRequest?.status === 'PENDING')
                  .map(rec => (
                    <div key={rec.id} className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{rec.userName}</div>
                          <div className="text-xs text-slate-500">
                            {rec.branchName} • Shift Date: <span className="font-semibold text-slate-700">{rec.date}</span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 text-[10px] bg-amber-100 text-amber-800 rounded font-bold">
                          PENDING REVIEW
                        </span>
                      </div>

                      <div className="my-2.5 p-2 bg-slate-50 rounded-lg text-xs space-y-1">
                        <div>
                          <span className="text-slate-500">Original Recorded Times:</span>{' '}
                          <span className="font-mono text-slate-700">{rec.clockIn || 'None'} – {rec.clockOut || 'None'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Staff Requested Times:</span>{' '}
                          <span className="font-mono font-bold text-emerald-700">
                            {rec.correctionRequest?.requestedClockIn || rec.clockIn || '--:--'} – {rec.correctionRequest?.requestedClockOut || rec.clockOut || '--:--'}
                          </span>
                        </div>
                        <div className="text-slate-600 italic">
                          "{rec.correctionRequest?.reason}"
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                        {rec.userId === currentUser.id ? (
                          <span className="text-xs text-slate-400 italic">Cannot review own request</span>
                        ) : (
                          <>
                            <button
                              onClick={() => handleReviewCorrection(rec, false)}
                              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-rose-700 text-xs font-semibold rounded-lg"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => handleReviewCorrection(rec, true)}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg"
                            >
                              Approve Correction
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Master Roster Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900">Branch Attendance Master Records</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-semibold text-xs border-b border-slate-200">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Branch</th>
                    <th className="py-3 px-4">Clock In</th>
                    <th className="py-3 px-4">Clock Out</th>
                    <th className="py-3 px-4">Work Duration</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Sync State</th>
                    <th className="py-3 px-4">Notes / Explication</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {dashboardAttendance.map(record => (
                    <tr key={record.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-900 text-xs">{record.date}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900 text-xs">{record.userName}</td>
                      <td className="py-3 px-4 text-xs text-slate-500">{record.userRole.replace('_', ' ')}</td>
                      <td className="py-3 px-4 text-xs text-slate-600">{record.branchName}</td>
                      <td className="py-3 px-4 font-mono text-xs">{record.clockIn || '—'}</td>
                      <td className="py-3 px-4 font-mono text-xs">
                        {record.clockOut || (record.isMissingClockOut ? (
                          <span className="text-rose-600 font-bold text-xs flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Missing
                          </span>
                        ) : '—')}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900 text-xs">
                        {formatWorkingHours(record.workMinutes)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          record.status === 'PRESENT'
                            ? 'bg-emerald-100 text-emerald-800'
                            : record.status === 'LATE'
                            ? 'bg-amber-100 text-amber-800'
                            : record.status === 'ON_LEAVE'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {record.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                          record.syncStatus === 'pending_verification'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {record.syncStatus === 'pending_verification' ? 'Pending Verify' : 'Synced'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 max-w-xs truncate">
                        {record.explanation || record.notes || (record.leaveReason ? `Leave: ${record.leaveReason}` : '—')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: STAFF SALES PERFORMANCE */}
      {/* ======================================================== */}
      {activeTab === 'SALES_PERFORMANCE' && (
        <div className="space-y-6">
          {/* Performance Overview Banner */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">Total Staff Sales (Gross)</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                ₦{filteredPerformance.reduce((acc, p) => acc + p.grossSalesValue, 0).toLocaleString()}
              </div>
              <span className="text-xs text-emerald-600 mt-1 block font-medium">Attributed to active cashiers</span>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">Discounts Granted</span>
              <div className="text-2xl font-bold text-amber-600 mt-1">
                ₦{filteredPerformance.reduce((acc, p) => acc + p.discountsGiven, 0).toLocaleString()}
              </div>
              <span className="text-xs text-slate-500 mt-1 block">Authorized counter discounts</span>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">Returns Deducted</span>
              <div className="text-2xl font-bold text-rose-600 mt-1">
                ₦{filteredPerformance.reduce((acc, p) => acc + p.returnsValue, 0).toLocaleString()}
              </div>
              <span className="text-xs text-rose-600 mt-1 block">
                {filteredPerformance.reduce((acc, p) => acc + p.returnsCount, 0)} returns clawbacked
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">Net Sales Realized</span>
              <div className="text-2xl font-bold text-emerald-600 mt-1">
                ₦{filteredPerformance.reduce((acc, p) => acc + p.netSalesValue, 0).toLocaleString()}
              </div>
              <span className="text-xs text-emerald-600 mt-1 block font-medium">Basis for commission pool</span>
            </div>
          </div>

          {/* Performance Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Staff Sales Leaderboard & Attribution</h3>
                <p className="text-xs text-slate-500">Attributed directly from actual Point-of-Sale receipts & verified returns.</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportPerformanceCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export Leaderboard (CSV)
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-semibold text-xs border-b border-slate-200">
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-4">Branch</th>
                    <th className="py-3 px-4 text-center">Transactions</th>
                    <th className="py-3 px-4 text-right">Gross Sales</th>
                    <th className="py-3 px-4 text-right">Discounts</th>
                    <th className="py-3 px-4 text-right">Returns</th>
                    <th className="py-3 px-4 text-right">Net Sales</th>
                    <th className="py-3 px-4 text-center">Punctuality</th>
                    <th className="py-3 px-4 text-right">Commission Earned</th>
                    <th className="py-3 px-4 text-center">Receipts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredPerformance.map(staff => (
                    <tr key={staff.userId} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 text-xs">{staff.userName}</div>
                        <div className="text-[11px] text-slate-500">{staff.userRole.replace('_', ' ')}</div>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">{staff.branchName}</td>
                      <td className="py-3 px-4 text-center font-medium text-xs">
                        <span className="font-bold text-slate-900">{staff.completedTransactions}</span>
                        {staff.cancelledTransactions > 0 && (
                          <span className="text-slate-400 text-[10px] block">({staff.cancelledTransactions} cancelled)</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-xs text-slate-900">
                        ₦{staff.grossSalesValue.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right text-xs text-amber-600">
                        {staff.discountsGiven > 0 ? `-₦${staff.discountsGiven.toLocaleString()}` : '—'}
                      </td>
                      <td className="py-3 px-4 text-right text-xs text-rose-600">
                        {staff.returnsValue > 0 ? (
                          <div>
                            <span className="font-semibold">-₦{staff.returnsValue.toLocaleString()}</span>
                            <span className="text-[10px] block text-slate-400">({staff.returnsCount} items)</span>
                          </div>
                        ) : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-xs text-emerald-700">
                        ₦{staff.netSalesValue.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center text-xs">
                        <span className={`px-2 py-0.5 rounded font-bold text-xs ${
                          staff.onTimeRate >= 90
                            ? 'bg-emerald-100 text-emerald-800'
                            : staff.onTimeRate >= 75
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {staff.onTimeRate}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-xs text-emerald-600">
                        ₦{staff.commissionEarned.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => {
                            const u = users.find(usr => usr.id === staff.userId);
                            setStaffSalesDetailsUser(u || null);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1 mx-auto"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: COMMISSIONS & DISBURSEMENTS */}
      {/* ======================================================== */}
      {activeTab === 'COMMISSIONS' && (
        <div className="space-y-6">
          {/* Header Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <div>
              <h3 className="text-base font-bold text-slate-900">Commission Management & Disbursements</h3>
              <p className="text-xs text-slate-500">
                Audited calculation cycles, manager approval separation & payment reconciliation.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Cycle:</span>
                <input
                  type="month"
                  value={selectedPeriodMonth}
                  onChange={(e) => setSelectedPeriodMonth(e.target.value)}
                  className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white"
                />
              </div>

              {canManageBranch && (
                <>
                  <button
                    onClick={() => {
                      setIsCalcModalOpen(true);
                      setCalcStaffId(users[0]?.id || '');
                      setCalcRuleId(commissionRules[0]?.id || '');
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Calculate Commission
                  </button>

                  <button
                    onClick={() => setIsRuleModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors"
                  >
                    <Sliders className="w-3.5 h-3.5 text-slate-500" />
                    Configure Rules
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Commissions Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-semibold text-xs border-b border-slate-200">
                    <th className="py-3 px-4">Ref #</th>
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-4">Branch</th>
                    <th className="py-3 px-4">Period</th>
                    <th className="py-3 px-4 text-right">Eligible Sales</th>
                    <th className="py-3 px-4 text-right">Base Comm.</th>
                    <th className="py-3 px-4 text-right">Adjustments</th>
                    <th className="py-3 px-4 text-right">Net Commission</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {commissions.map(c => {
                    const isSelf = c.userId === currentUser.id;
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-xs text-slate-900">{c.commissionNo}</td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 text-xs">{c.userName}</div>
                          <div className="text-[11px] text-slate-400">{c.ruleName}</div>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600">{c.branchName}</td>
                        <td className="py-3 px-4 text-xs font-medium text-slate-800">{c.periodMonth}</td>
                        <td className="py-3 px-4 text-right text-xs font-medium">₦{c.eligibleSalesAmount.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right text-xs">₦{c.baseCommissionAmount.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right text-xs text-rose-600">
                          {c.adjustmentsAmount !== 0 ? `₦${c.adjustmentsAmount.toLocaleString()}` : '0'}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-xs text-emerald-700">
                          ₦{c.netCommissionAmount.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            c.status === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800'
                              : c.status === 'APPROVED'
                              ? 'bg-blue-100 text-blue-800'
                              : c.status === 'AWAITING_APPROVAL'
                              ? 'bg-amber-100 text-amber-800'
                              : c.status === 'REJECTED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {c.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setStatementCommission(c)}
                              title="View Statement Voucher"
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md"
                            >
                              Statement
                            </button>

                            {/* Manager Approval */}
                            {canManageBranch && c.status === 'AWAITING_APPROVAL' && (
                              <>
                                <button
                                  onClick={() => handleApproveCommission(c)}
                                  disabled={isSelf}
                                  title={isSelf ? 'Cannot approve own commission' : 'Approve'}
                                  className={`px-2 py-1 text-xs font-bold rounded-md ${
                                    isSelf
                                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                  }`}
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleRejectCommission(c)}
                                  disabled={isSelf}
                                  className={`px-2 py-1 text-xs font-bold rounded-md ${
                                    isSelf
                                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                      : 'bg-rose-100 hover:bg-rose-200 text-rose-700'
                                  }`}
                                >
                                  Reject
                                </button>
                              </>
                            )}

                            {/* Payout Action */}
                            {canManageBranch && c.status === 'APPROVED' && (
                              <button
                                onClick={() => {
                                  setSelectedCommissionForPayout(c);
                                  setPayoutReference(`PAY-TRF-${c.periodMonth.replace('-', '')}-${c.userId.slice(-3).toUpperCase()}`);
                                  setIsPayoutModalOpen(true);
                                }}
                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-md shadow-xs"
                              >
                                Disburse
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Commission Rules Active Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-600" />
                Active Commission Policies & Calculation Rules
              </h4>
              <span className="text-xs text-slate-500 font-medium">Automatic deduction for returned products</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {commissionRules.map(rule => (
                <div key={rule.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm">{rule.name}</span>
                      <span className="px-2 py-0.5 text-[10px] bg-emerald-100 text-emerald-800 rounded font-bold">
                        {rule.ruleType.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{rule.description}</p>

                    {rule.ruleType === 'CATEGORY_TIERED' && rule.categoryRates && (
                      <div className="mt-3 grid grid-cols-2 gap-1.5 text-[11px] bg-white p-2.5 rounded-lg border border-slate-200">
                        {Object.entries(rule.categoryRates).slice(0, 6).map(([cat, rate]) => (
                          <div key={cat} className="flex justify-between">
                            <span className="text-slate-500">{cat}:</span>
                            <span className="font-bold text-emerald-700">{rate}%</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Returns Deducted: {rule.deductReturns ? 'YES' : 'NO'}</span>
                    <span>Credit Sales: {rule.includeCreditSales ? 'YES' : 'NO'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 5: REPORTS & EXPORTS */}
      {/* ======================================================== */}
      {activeTab === 'REPORTS' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">Attendance & Commission Audit Exports</h3>
            <p className="text-xs text-slate-500 mb-6">
              Download regulatory, tax compliance, and payroll-ready CSV extracts and printable statements.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
                <div>
                  <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl w-fit mb-3">
                    <Clock className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-base">Shift Attendance Log</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Complete records including clock-in/out timestamps, hours worked, late flags, and manager review audit trails.
                  </p>
                </div>
                <button
                  onClick={handleExportAttendanceCSV}
                  className="mt-5 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs shadow-xs transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export Attendance CSV
                </button>
              </div>

              <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
                <div>
                  <div className="p-3 bg-blue-100 text-blue-700 rounded-xl w-fit mb-3">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-base">Sales Performance Leaderboard</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Staff-attributed revenue, completed vs cancelled receipts, counter discounts, and return deductions.
                  </p>
                </div>
                <button
                  onClick={handleExportPerformanceCSV}
                  className="mt-5 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs shadow-xs transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export Performance CSV
                </button>
              </div>

              <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
                <div>
                  <div className="p-3 bg-indigo-100 text-indigo-700 rounded-xl w-fit mb-3">
                    <Award className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-base">Commissions & Disbursements</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Audited monthly calculations, approved bonuses, bank transfer references, and return clawback statements.
                  </p>
                </div>
                <button
                  onClick={handleExportCommissionsCSV}
                  className="mt-5 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs shadow-xs transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export Commissions CSV
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: REQUEST ATTENDANCE CORRECTION */}
      {/* ======================================================== */}
      {isCorrectionModalOpen && selectedAttendanceForCorrection && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-base">Request Attendance Correction</h3>
              <button
                onClick={() => setIsCorrectionModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 my-4">
              <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
                <div><span className="text-slate-500">Staff:</span> <span className="font-semibold">{selectedAttendanceForCorrection.userName}</span></div>
                <div><span className="text-slate-500">Date:</span> <span className="font-semibold">{selectedAttendanceForCorrection.date}</span></div>
                <div><span className="text-slate-500">Current Recorded Clock In:</span> <span className="font-mono">{selectedAttendanceForCorrection.clockIn || 'None'}</span></div>
                <div><span className="text-slate-500">Current Recorded Clock Out:</span> <span className="font-mono">{selectedAttendanceForCorrection.clockOut || 'None'}</span></div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Requested Clock-In Time (HH:mm)</label>
                <input
                  type="time"
                  value={correctionClockIn}
                  onChange={(e) => setCorrectionClockIn(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Requested Clock-Out Time (HH:mm)</label>
                <input
                  type="time"
                  value={correctionClockOut}
                  onChange={(e) => setCorrectionClockOut(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Reason / Explanation for Missed Timestamp *</label>
                <textarea
                  rows={3}
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder="e.g. Device power loss at depot shutdown, urgent agro dispatch duty offsite..."
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                onClick={() => setIsCorrectionModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitCorrection}
                className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs"
              >
                Submit for Approval
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: RECORD APPROVED LEAVE */}
      {/* ======================================================== */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-base">Record Approved Staff Leave</h3>
              <button onClick={() => setIsLeaveModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 my-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Staff Member *</label>
                <select
                  value={leaveStaffId}
                  onChange={(e) => setLeaveStaffId(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                >
                  <option value="">Select Staff...</option>
                  {users.filter(u => u.role !== 'CEO').map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Leave Date *</label>
                <input
                  type="date"
                  value={leaveDate}
                  onChange={(e) => setLeaveDate(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Leave Category *</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                >
                  <option value="SICK">Sick Leave (Medical)</option>
                  <option value="ANNUAL">Annual Leave</option>
                  <option value="CASUAL">Casual / Compassionate Leave</option>
                  <option value="EMERGENCY">Emergency Family Leave</option>
                  <option value="MATERNITY">Maternity / Paternity Leave</option>
                  <option value="UNPAID">Unpaid Authorized Leave</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Approved Reason / Documentation</label>
                <textarea
                  rows={2}
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="Medical doctor note, approved annual plan..."
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                onClick={() => setIsLeaveModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordLeave}
                className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs"
              >
                Register Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: CONFIGURE COMMISSION RULES */}
      {/* ======================================================== */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-base">Configure Commission Policy</h3>
              <button onClick={() => setIsRuleModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 my-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Policy Title *</label>
                <input
                  type="text"
                  placeholder="e.g. 2026 Planting Season Incentive"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Description</label>
                <input
                  type="text"
                  placeholder="Brief summary of eligibility..."
                  value={ruleDescription}
                  onChange={(e) => setRuleDescription(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Calculation Mechanism *</label>
                <select
                  value={ruleType}
                  onChange={(e) => setRuleType(e.target.value as CommissionRuleType)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                >
                  <option value="CATEGORY_TIERED">Category-Tiered Rates (Seeds 3%, Fertilizers 1.5%, etc.)</option>
                  <option value="PERCENTAGE_TOTAL">Flat Percentage on Total Eligible Sales</option>
                  <option value="FIXED_PER_SALE">Fixed Amount per Qualifying Sale</option>
                </select>
              </div>

              {ruleType === 'PERCENTAGE_TOTAL' && (
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Flat Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={rulePercentage}
                    onChange={(e) => setRulePercentage(parseFloat(e.target.value) || 0)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              )}

              {ruleType === 'FIXED_PER_SALE' && (
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Fixed Bonus Amount (₦)</label>
                  <input
                    type="number"
                    value={ruleFixedAmount}
                    onChange={(e) => setRuleFixedAmount(parseInt(e.target.value, 10) || 0)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              )}

              {ruleType === 'CATEGORY_TIERED' && (
                <div className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-200">
                  <div className="text-xs font-bold text-slate-800">Category Percentage Rates:</div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500">Seeds (%):</span>
                      <input
                        type="number"
                        step="0.1"
                        value={ruleSeedsRate}
                        onChange={(e) => setRuleSeedsRate(parseFloat(e.target.value) || 0)}
                        className="w-full border border-slate-300 rounded px-2 py-1 mt-0.5"
                      />
                    </div>
                    <div>
                      <span className="text-slate-500">Fertilizers (%):</span>
                      <input
                        type="number"
                        step="0.1"
                        value={ruleFertilizersRate}
                        onChange={(e) => setRuleFertilizersRate(parseFloat(e.target.value) || 0)}
                        className="w-full border border-slate-300 rounded px-2 py-1 mt-0.5"
                      />
                    </div>
                    <div>
                      <span className="text-slate-500">Agrochemicals (%):</span>
                      <input
                        type="number"
                        step="0.1"
                        value={ruleAgrochemRate}
                        onChange={(e) => setRuleAgrochemRate(parseFloat(e.target.value) || 0)}
                        className="w-full border border-slate-300 rounded px-2 py-1 mt-0.5"
                      />
                    </div>
                    <div>
                      <span className="text-slate-500">Equipment (%):</span>
                      <input
                        type="number"
                        step="0.1"
                        value={ruleEquipRate}
                        onChange={(e) => setRuleEquipRate(parseFloat(e.target.value) || 0)}
                        className="w-full border border-slate-300 rounded px-2 py-1 mt-0.5"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2 pt-2">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ruleDeductReturns}
                    onChange={(e) => setRuleDeductReturns(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  Automatically clawback/deduct returns from commissions
                </label>

                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ruleIncludeCredit}
                    onChange={(e) => setRuleIncludeCredit(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  Include Credit Sales in commission eligibility
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                onClick={() => setIsRuleModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCommissionRule}
                className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs"
              >
                Save Policy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: CALCULATE COMMISSION */}
      {/* ======================================================== */}
      {isCalcModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-base">Calculate Monthly Staff Commission</h3>
              <button onClick={() => setIsCalcModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 my-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Staff Member *</label>
                <select
                  value={calcStaffId}
                  onChange={(e) => setCalcStaffId(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                >
                  {users.filter(u => u.role !== 'CEO').map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role.replace('_', ' ')})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Commission Policy *</label>
                <select
                  value={calcRuleId}
                  onChange={(e) => setCalcRuleId(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                >
                  {commissionRules.map(r => (
                    <option key={r.id} value={r.id}>{r.name} ({r.ruleType})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Calculation Period (YYYY-MM) *</label>
                <input
                  type="month"
                  value={selectedPeriodMonth}
                  onChange={(e) => setSelectedPeriodMonth(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                />
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl text-xs text-emerald-800">
                The system engine will tally all verified sales receipts for the period, apply category/flat rates, and apply clawback deductions for returned items.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                onClick={() => setIsCalcModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCalculateCommission}
                className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs"
              >
                Execute Calculation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 5: RECORD DISBURSEMENT / COMMISSION PAYMENT */}
      {/* ======================================================== */}
      {isPayoutModalOpen && selectedCommissionForPayout && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-base">Record Commission Disbursement</h3>
              <button onClick={() => setIsPayoutModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 my-4">
              <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
                <div><span className="text-slate-500">Staff:</span> <span className="font-semibold text-slate-900">{selectedCommissionForPayout.userName}</span></div>
                <div><span className="text-slate-500">Ref #:</span> <span className="font-mono">{selectedCommissionForPayout.commissionNo}</span></div>
                <div><span className="text-slate-500">Period:</span> <span className="font-semibold">{selectedCommissionForPayout.periodMonth}</span></div>
                <div className="text-sm font-bold text-emerald-700 pt-1">
                  Disbursement Amount: ₦{selectedCommissionForPayout.netCommissionAmount.toLocaleString()}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Disbursement Method *</label>
                <select
                  value={payoutMethod}
                  onChange={(e) => setPayoutMethod(e.target.value as any)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                >
                  <option value="BANK_TRANSFER">Corporate Bank Transfer (EFT/NIP)</option>
                  <option value="CASH">Branch Petty Cash Voucher</option>
                  <option value="CHEQUE">Corporate Cheque</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Payment Reference / Transaction ID *</label>
                <input
                  type="text"
                  placeholder="e.g. TRF-CBN-99213459"
                  value={payoutReference}
                  onChange={(e) => setPayoutReference(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Payment Notes / Voucher Ref</label>
                <input
                  type="text"
                  placeholder="e.g. Paid alongside July payroll batch"
                  value={payoutNotes}
                  onChange={(e) => setPayoutNotes(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                onClick={() => setIsPayoutModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPayout}
                className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs"
              >
                Confirm Disbursement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 6: DETAILED STATEMENT / PRINTABLE VOUCHER */}
      {/* ======================================================== */}
      {statementCommission && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Royal Agro Seed Co.</span>
                <h3 className="font-bold text-slate-900 text-lg">Official Commission Statement Voucher</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 rounded-lg"
                  title="Print Statement"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button onClick={() => setStatementCommission(null)} className="p-2 text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="my-5 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block">Staff Name</span>
                  <span className="font-bold text-slate-900 text-sm">{statementCommission.userName}</span>
                  <span className="text-slate-500 block">{statementCommission.userRole}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Voucher Reference</span>
                  <span className="font-mono font-bold text-slate-900">{statementCommission.commissionNo}</span>
                  <span className="text-slate-500 block">Period: {statementCommission.periodMonth}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Branch Location</span>
                  <span className="font-semibold text-slate-800">{statementCommission.branchName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Policy Applied</span>
                  <span className="font-semibold text-slate-800">{statementCommission.ruleName}</span>
                </div>
              </div>

              {/* Adjustments (Return clawbacks) */}
              {statementCommission.adjustments?.length > 0 && (
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs">
                  <div className="font-bold text-rose-900 mb-1">Clawbacks & Adjustments:</div>
                  {statementCommission.adjustments.map(adj => (
                    <div key={adj.id} className="flex justify-between py-1 border-b border-rose-100 last:border-none text-rose-800">
                      <span>{adj.description}</span>
                      <span className="font-mono font-bold">₦{adj.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Financial Tally Box */}
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600">Gross Sales Value:</span>
                  <span className="font-mono font-semibold">₦{statementCommission.grossSalesAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Eligible Sales Value:</span>
                  <span className="font-mono font-semibold">₦{statementCommission.eligibleSalesAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Base Commission:</span>
                  <span className="font-mono font-semibold">₦{statementCommission.baseCommissionAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-rose-700">
                  <span>Deductions / Adjustments:</span>
                  <span className="font-mono font-semibold">₦{statementCommission.adjustmentsAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-emerald-300 text-sm font-bold text-emerald-900">
                  <span>Net Commission Payable:</span>
                  <span className="font-mono text-base">₦{statementCommission.netCommissionAmount.toLocaleString()}</span>
                </div>
              </div>

              {/* Signatures & Approvals */}
              <div className="grid grid-cols-2 gap-6 pt-4 text-xs border-t border-slate-200">
                <div>
                  <span className="text-slate-400 block">Approval Sign-off</span>
                  <span className="font-semibold text-slate-800">
                    {statementCommission.approvedByUserName || 'Pending Approval'}
                  </span>
                  <span className="text-slate-400 text-[10px] block">
                    {statementCommission.approvedAt ? `Date: ${statementCommission.approvedAt}` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Payment Disbursement</span>
                  <span className="font-semibold text-slate-800">
                    {statementCommission.paidAt ? `Paid Ref: ${statementCommission.paymentReference}` : 'Pending Payout'}
                  </span>
                  <span className="text-slate-400 text-[10px] block">
                    {statementCommission.paidAt ? `Date: ${statementCommission.paidAt}` : ''}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <button
                onClick={() => setStatementCommission(null)}
                className="px-4 py-2 text-xs font-semibold bg-slate-900 text-white rounded-lg"
              >
                Close Statement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* DRAWER 7: STAFF COMPLETED RECEIPTS BREAKDOWN */}
      {/* ======================================================== */}
      {staffSalesDetailsUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-end">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{staffSalesDetailsUser.name}</h3>
                  <p className="text-xs text-slate-500">Sales Attribution & Transaction History</p>
                </div>
                <button onClick={() => setStaffSalesDetailsUser(null)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="divide-y divide-slate-100 my-4">
                {sales
                  .filter(s => s.staffUserId === staffSalesDetailsUser.id || s.staffName === staffSalesDetailsUser.name)
                  .map(sale => (
                    <div key={sale.id} className="py-3 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-slate-900">{sale.receiptNo}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          sale.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {sale.status}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-500 text-[11px]">
                        <span>Customer: {sale.customerName || 'Walk-in'}</span>
                        <span>{sale.date}</span>
                      </div>
                      <div className="flex justify-between font-medium">
                        <span className="text-slate-600">Method: {sale.paymentMethod}</span>
                        <span className="font-bold text-slate-900">₦{sale.totalAmount.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <button
              onClick={() => setStaffSalesDetailsUser(null)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
