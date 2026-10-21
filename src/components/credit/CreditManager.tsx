import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  Search,
  Plus,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  Calendar,
  User,
  Phone,
  FileText,
  DollarSign,
  Download,
  Printer,
  Trash2,
  Edit,
  Eye,
  Building2,
  ShieldAlert,
  Send,
  X,
  TrendingUp,
  Award,
  ChevronDown,
  RefreshCw
} from 'lucide-react';
import { SvgGroupedBarChart } from '../common/SimpleCharts';
import {
  CustomerCredit,
  CreditPayment,
  Customer,
  Branch,
  User as UserType,
  PaymentMethod,
  CreditStatus,
  PaymentStatus,
  Sale
} from '../../types';

interface CreditManagerProps {
  currentUser: UserType;
  credits: CustomerCredit[];
  creditPayments: CreditPayment[];
  customers: Customer[];
  branches: Branch[];
  sales?: Sale[];
  onCreateCredit: (credit: Omit<CustomerCredit, 'id' | 'creditNo' | 'createdAt' | 'updatedAt'>) => void;
  onRecordPayment: (
    creditId: string,
    amountPaid: number,
    paymentMethod: PaymentMethod,
    referenceNumber?: string,
    notes?: string
  ) => void;
  onEditCredit?: (creditId: string, updatedDueDate: string, remarks?: string) => void;
  onDeleteCredit?: (creditId: string) => void;
}

export const CreditManager: React.FC<CreditManagerProps> = ({
  currentUser,
  credits = [],
  creditPayments = [],
  customers = [],
  branches = [],
  sales = [],
  onCreateCredit,
  onRecordPayment,
  onEditCredit,
  onDeleteCredit
}) => {
  // Navigation & View Mode
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'RECORDS' | 'PAYMENTS' | 'REPORTS'>('DASHBOARD');

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERDUE'>('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH'>('ALL');
  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'NEWEST' | 'OLDEST' | 'HIGHEST_DEBT' | 'DUE_DATE'>('HIGHEST_DEBT');

  // Modals state
  const [showNewCreditModal, setShowNewCreditModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedCreditForPayment, setSelectedCreditForPayment] = useState<CustomerCredit | null>(null);
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [selectedCustomerForLedger, setSelectedCustomerForLedger] = useState<Customer | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCreditForEdit, setSelectedCreditForEdit] = useState<CustomerCredit | null>(null);
  const [receiptPayment, setReceiptPayment] = useState<CreditPayment | null>(null);

  // Form states for New Credit
  const [formCustomerId, setFormCustomerId] = useState('');
  const [formCreditAmount, setFormCreditAmount] = useState<number | ''>('');
  const [formPaymentTerms, setFormPaymentTerms] = useState('Net 30');
  const [formDueDate, setFormDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [formRemarks, setFormRemarks] = useState('');
  const [formBranchId, setFormBranchId] = useState(currentUser.branchId || branches[0]?.id || 'br-1');

  // Form states for Payment
  const [payAmount, setPayAmount] = useState<number | ''>('');
  const [payDate, setPayDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('CASH');
  const [payReference, setPayReference] = useState('');
  const [payNotes, setPayNotes] = useState('');

  // Edit Credit form
  const [editDueDate, setEditDueDate] = useState('');
  const [editRemarks, setEditRemarks] = useState('');

  // Role Permissions
  const isCEO = currentUser.role === 'CEO';
  const isManager = currentUser.role === 'BRANCH_MANAGER' || isCEO;
  const canRecordPayment = isManager;
  const canDeleteCredit = isCEO;

  const todayStr = new Date().toISOString().split('T')[0];

  // Helper: Calculate days overdue
  const getDaysOverdue = (dueDateStr: string): number => {
    const due = new Date(dueDateStr).getTime();
    const today = new Date(todayStr).getTime();
    if (today <= due) return 0;
    return Math.ceil((today - due) / (1000 * 60 * 60 * 24));
  };

  // Helper: Calculate days remaining until due
  const getDaysRemaining = (dueDateStr: string): number => {
    const due = new Date(dueDateStr).getTime();
    const today = new Date(todayStr).getTime();
    const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
    return diff;
  };

  // Helper: Auto-determine status
  const computeCreditStatus = (c: CustomerCredit): CreditStatus => {
    if (c.remainingBalance <= 0) return 'GOOD';
    const isOverdue = new Date(todayStr) > new Date(c.dueDate);
    return isOverdue ? 'OVERDUE' : 'ACTIVE';
  };

  // Process credits list with automated status updates
  const processedCredits = useMemo(() => {
    return credits.map((c) => {
      const remainingBalance = Math.max(0, c.creditAmount - c.amountPaid);
      const computedStatus = remainingBalance === 0 ? 'GOOD' : (new Date(todayStr) > new Date(c.dueDate) ? 'OVERDUE' : 'ACTIVE');
      const computedPaymentStatus: PaymentStatus = remainingBalance === 0 ? 'PAID' : (c.amountPaid > 0 ? 'PARTIAL' : 'UNPAID');
      return {
        ...c,
        remainingBalance,
        creditStatus: computedStatus,
        paymentStatus: computedPaymentStatus
      };
    });
  }, [credits, todayStr]);

  // Branch filter condition
  const branchFilteredCredits = useMemo(() => {
    return processedCredits.filter((c) => {
      if (!isCEO && currentUser.branchId) {
        return c.branchId === currentUser.branchId;
      }
      if (branchFilter !== 'ALL') {
        return c.branchId === branchFilter;
      }
      return true;
    });
  }, [processedCredits, isCEO, currentUser.branchId, branchFilter]);

  // KPI Metrics Calculation
  const totalOutstandingCredit = useMemo(() => {
    return branchFilteredCredits.reduce((acc, c) => acc + c.remainingBalance, 0);
  }, [branchFilteredCredits]);

  const totalCreditSales = useMemo(() => {
    return branchFilteredCredits.reduce((acc, c) => acc + c.creditAmount, 0);
  }, [branchFilteredCredits]);

  const totalPaymentsReceived = useMemo(() => {
    return branchFilteredCredits.reduce((acc, c) => acc + c.amountPaid, 0);
  }, [branchFilteredCredits]);

  const overdueCredits = useMemo(() => {
    return branchFilteredCredits.filter((c) => c.creditStatus === 'OVERDUE' && c.remainingBalance > 0);
  }, [branchFilteredCredits]);

  const totalOverdueAmount = useMemo(() => {
    return overdueCredits.reduce((acc, c) => acc + c.remainingBalance, 0);
  }, [overdueCredits]);

  const debtorsCount = useMemo(() => {
    const set = new Set(branchFilteredCredits.filter((c) => c.remainingBalance > 0).map((c) => c.customerId));
    return set.size;
  }, [branchFilteredCredits]);

  // Upcoming Due Dates (Today, This Week, This Month)
  const creditsDueToday = useMemo(() => {
    return branchFilteredCredits.filter((c) => c.remainingBalance > 0 && c.dueDate === todayStr);
  }, [branchFilteredCredits, todayStr]);

  const creditsDueThisWeek = useMemo(() => {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);
    return branchFilteredCredits.filter((c) => {
      if (c.remainingBalance <= 0) return false;
      const due = new Date(c.dueDate);
      return due >= today && due <= nextWeek;
    });
  }, [branchFilteredCredits]);

  const creditsDueThisMonth = useMemo(() => {
    const today = new Date();
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return branchFilteredCredits.filter((c) => {
      if (c.remainingBalance <= 0) return false;
      const due = new Date(c.dueDate);
      return due >= today && due <= endOfMonth;
    });
  }, [branchFilteredCredits]);

  // Top Debtors Ranking
  const topDebtors = useMemo(() => {
    const map = new Map<string, { customerId: string; name: string; phone: string; balance: number; activeCredits: number }>();
    branchFilteredCredits.forEach((c) => {
      if (c.remainingBalance > 0) {
        const existing = map.get(c.customerId) || {
          customerId: c.customerId,
          name: c.customerName,
          phone: c.customerPhone,
          balance: 0,
          activeCredits: 0
        };
        existing.balance += c.remainingBalance;
        existing.activeCredits += 1;
        map.set(c.customerId, existing);
      }
    });
    return Array.from(map.values()).sort((a, b) => b.balance - a.balance).slice(0, 5);
  }, [branchFilteredCredits]);

  // Recharts Chart Data
  const branchCreditChartData = useMemo(() => {
    return branches.map((b) => {
      const bCredits = processedCredits.filter((c) => c.branchId === b.id);
      const totalCredit = bCredits.reduce((sum, c) => sum + c.creditAmount, 0);
      const totalPaid = bCredits.reduce((sum, c) => sum + c.amountPaid, 0);
      const balance = bCredits.reduce((sum, c) => sum + c.remainingBalance, 0);
      return {
        name: b.name.split(' ')[0],
        TotalCredit: totalCredit,
        AmountPaid: totalPaid,
        BalanceDue: balance
      };
    });
  }, [branches, processedCredits]);

  const creditStatusPieData = useMemo(() => {
    const paid = branchFilteredCredits.filter((c) => c.paymentStatus === 'PAID').length;
    const active = branchFilteredCredits.filter((c) => c.creditStatus === 'ACTIVE' && c.remainingBalance > 0).length;
    const overdue = branchFilteredCredits.filter((c) => c.creditStatus === 'OVERDUE' && c.remainingBalance > 0).length;
    return [
      { name: 'Paid / Clear', value: paid, color: '#10B981' },
      { name: 'Active / Current', value: active, color: '#F59E0B' },
      { name: 'Overdue', value: overdue, color: '#EF4444' }
    ];
  }, [branchFilteredCredits]);

  // Filtered and Sorted Records Table
  const filteredRecords = useMemo(() => {
    let list = [...branchFilteredCredits];

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        (c) =>
          c.customerName.toLowerCase().includes(term) ||
          c.creditNo.toLowerCase().includes(term) ||
          c.receiptNo.toLowerCase().includes(term) ||
          c.customerPhone.includes(term)
      );
    }

    // Status filter
    if (statusFilter === 'UNPAID') {
      list = list.filter((c) => c.paymentStatus === 'UNPAID');
    } else if (statusFilter === 'PARTIAL') {
      list = list.filter((c) => c.paymentStatus === 'PARTIAL');
    } else if (statusFilter === 'PAID') {
      list = list.filter((c) => c.paymentStatus === 'PAID');
    } else if (statusFilter === 'OVERDUE') {
      list = list.filter((c) => c.creditStatus === 'OVERDUE' && c.remainingBalance > 0);
    }

    // Period filter
    if (dateFilter === 'TODAY') {
      list = list.filter((c) => c.saleDate === todayStr);
    } else if (dateFilter === 'THIS_WEEK') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      list = list.filter((c) => new Date(c.saleDate) >= weekAgo);
    } else if (dateFilter === 'THIS_MONTH') {
      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 30);
      list = list.filter((c) => new Date(c.saleDate) >= monthAgo);
    }

    // Sort by
    if (sortBy === 'NEWEST') {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortBy === 'OLDEST') {
      list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else if (sortBy === 'HIGHEST_DEBT') {
      list.sort((a, b) => b.remainingBalance - a.remainingBalance);
    } else if (sortBy === 'DUE_DATE') {
      list.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    }

    return list;
  }, [branchFilteredCredits, searchTerm, statusFilter, dateFilter, sortBy, todayStr]);

  // Submit Handler for New Credit
  const handleNewCreditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCustomerId || !formCreditAmount || Number(formCreditAmount) <= 0) {
      alert('Please select a customer and enter a valid credit amount.');
      return;
    }

    const selectedCust = customers.find((c) => c.id === formCustomerId);
    const selectedBr = branches.find((b) => b.id === formBranchId);

    if (!selectedCust) {
      alert('Selected customer not found.');
      return;
    }

    const creditAmt = Number(formCreditAmount);
    const limit = selectedCust.creditLimit ?? 500000;
    const currentBalance = selectedCust.creditBalance || 0;
    const projectBalance = currentBalance + creditAmt;

    if (projectBalance > limit) {
      const proceed = confirm(
        `⚠️ CREDIT LIMIT EXCEEDED!\n\nCustomer ${selectedCust.fullName} has a credit limit of ₦${limit.toLocaleString()}.\nCurrent Debt: ₦${currentBalance.toLocaleString()}\nNew Requested Credit: ₦${creditAmt.toLocaleString()}\nProjected Total: ₦${projectBalance.toLocaleString()}\n\nDo you want to authorize this credit sale override?`
      );
      if (!proceed) return;
    }

    onCreateCredit({
      customerId: selectedCust.id,
      customerName: selectedCust.fullName,
      customerPhone: selectedCust.phone,
      saleId: 'manual-' + Date.now(),
      receiptNo: 'CR-INV-' + Math.floor(1000 + Math.random() * 9000),
      saleDate: todayStr,
      dueDate: formDueDate,
      paymentTerms: formPaymentTerms,
      creditAmount: creditAmt,
      amountPaid: 0,
      remainingBalance: creditAmt,
      paymentStatus: 'UNPAID',
      creditStatus: new Date(todayStr) > new Date(formDueDate) ? 'OVERDUE' : 'ACTIVE',
      remarks: formRemarks || 'Customer credit order issued.',
      branchId: formBranchId,
      branchName: selectedBr?.name || 'Central Depot',
      createdByUserId: currentUser.id,
      createdByUserName: currentUser.name
    });

    // Reset Form
    setFormCustomerId('');
    setFormCreditAmount('');
    setFormRemarks('');
    setShowNewCreditModal(false);
  };

  // Submit Handler for Repayment
  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCreditForPayment || !payAmount || Number(payAmount) <= 0) {
      alert('Please enter a valid repayment amount.');
      return;
    }

    const amt = Number(payAmount);
    if (amt > selectedCreditForPayment.remainingBalance) {
      alert(`Amount exceeds current outstanding balance of ₦${selectedCreditForPayment.remainingBalance.toLocaleString()}`);
      return;
    }

    onRecordPayment(
      selectedCreditForPayment.id,
      amt,
      payMethod,
      payReference || undefined,
      payNotes || undefined
    );

    // Create payment receipt object for preview modal
    const newReceipt: CreditPayment = {
      id: 'pay-' + Date.now(),
      paymentNo: 'PM-' + Math.floor(10000 + Math.random() * 90000),
      creditId: selectedCreditForPayment.id,
      customerId: selectedCreditForPayment.customerId,
      customerName: selectedCreditForPayment.customerName,
      receiptNo: selectedCreditForPayment.receiptNo,
      amountPaid: amt,
      paymentDate: payDate,
      paymentMethod: payMethod,
      referenceNumber: payReference || 'N/A',
      notes: payNotes || 'Debt clearance payment',
      receivedByUserId: currentUser.id,
      receivedByUserName: currentUser.name,
      createdAt: new Date().toISOString()
    };

    setReceiptPayment(newReceipt);

    // Reset payment fields
    setShowPaymentModal(false);
    setPayAmount('');
    setPayReference('');
    setPayNotes('');
    setSelectedCreditForPayment(null);
  };

  // Terms change handler auto sets due date
  const handleTermsChange = (terms: string) => {
    setFormPaymentTerms(terms);
    const d = new Date();
    if (terms === 'Net 7') d.setDate(d.getDate() + 7);
    else if (terms === 'Net 15') d.setDate(d.getDate() + 15);
    else if (terms === 'Net 30') d.setDate(d.getDate() + 30);
    else if (terms === 'Net 60') d.setDate(d.getDate() + 60);
    setFormDueDate(d.toISOString().split('T')[0]);
  };

  // Print Statement Handler
  const handlePrintStatement = () => {
    window.print();
  };

  // Export CSV Handler
  const handleExportCSV = () => {
    const headers = ['Customer Name', 'Phone', 'Invoice No', 'Sale Date', 'Due Date', 'Terms', 'Credit Amount', 'Amount Paid', 'Balance Due', 'Status', 'Branch'];
    const rows = filteredRecords.map((r) => [
      `"${r.customerName}"`,
      `"${r.customerPhone}"`,
      `"${r.receiptNo}"`,
      r.saleDate,
      r.dueDate,
      `"${r.paymentTerms}"`,
      r.creditAmount,
      r.amountPaid,
      r.remainingBalance,
      r.creditStatus,
      `"${r.branchName}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Royal_Agro_Customer_Credit_Report_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Customer Credit & Receivables</h2>
              <p className="text-xs text-slate-500 font-medium">
                Monitor credit sales, record debt repayments, and manage customer credit risk across branches.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isCEO && (
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
            >
              <option value="ALL">All Hubs & Depots</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => setShowNewCreditModal(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-all uppercase tracking-wider"
          >
            <Plus className="w-4 h-4" /> Issue Credit Sale
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200 bg-white px-4 rounded-xl border">
        {[
          { id: 'DASHBOARD', label: 'Credit Dashboard', icon: TrendingUp },
          { id: 'RECORDS', label: 'Customer Credit Records', icon: FileText, badge: overdueCredits.length > 0 ? overdueCredits.length : null },
          { id: 'PAYMENTS', label: 'Repayment Logs', icon: DollarSign },
          { id: 'REPORTS', label: 'Reports & Statements', icon: Printer }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-3.5 px-4 text-xs font-bold transition-all border-b-2 ${
                isActive
                  ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="px-1.5 py-0.5 rounded-full bg-rose-600 text-white font-black text-[10px]">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ==================================================== */}
      {/* TAB 1: CREDIT DASHBOARD */}
      {/* ==================================================== */}
      {activeTab === 'DASHBOARD' && (
        <div className="space-y-6">
          {/* KPI Summary Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Outstanding Debt</p>
                  <p className="text-2xl font-black text-rose-700 mt-1">₦{totalOutstandingCredit.toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-700 font-bold">
                  <CreditCard className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span>{debtorsCount} Customer Accounts</span>
                <span className="font-bold text-rose-600">{overdueCredits.length} Overdue</span>
              </div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Credit Issued</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">₦{totalCreditSales.toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-800 font-bold">
                  <ArrowUpRight className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span>{branchFilteredCredits.length} Total Credit Invoices</span>
                <span className="font-bold text-slate-700">Net 30 Avg</span>
              </div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Payments Recovered</p>
                  <p className="text-2xl font-black text-emerald-700 mt-1">₦{totalPaymentsReceived.toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
                  <ArrowDownRight className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span>Recovery Rate: {totalCreditSales > 0 ? Math.round((totalPaymentsReceived / totalCreditSales) * 100) : 0}%</span>
                <span className="font-bold text-emerald-700">{creditPayments.length} Payments</span>
              </div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-rose-200 shadow-xs bg-rose-50/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">Overdue Risk Amount</p>
                  <p className="text-2xl font-black text-rose-800 mt-1">₦{totalOverdueAmount.toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-rose-200 flex items-center justify-center text-rose-800 font-bold">
                  <AlertCircle className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-rose-200/60 flex items-center justify-between text-[11px] text-rose-700 font-semibold">
                <span>{overdueCredits.length} Default Risk Accounts</span>
                <button onClick={() => { setActiveTab('RECORDS'); setStatusFilter('OVERDUE'); }} className="underline font-bold">
                  Review All
                </button>
              </div>
            </div>
          </div>

          {/* Due Window Alert Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase">Due Today</p>
                  <p className="text-lg font-black text-slate-900">{creditsDueToday.length} Invoices</p>
                </div>
              </div>
              <span className="font-extrabold text-xs text-amber-700">
                ₦{creditsDueToday.reduce((s, c) => s + c.remainingBalance, 0).toLocaleString()}
              </span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-800">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase">Due This Week</p>
                  <p className="text-lg font-black text-slate-900">{creditsDueThisWeek.length} Invoices</p>
                </div>
              </div>
              <span className="font-extrabold text-xs text-blue-700">
                ₦{creditsDueThisWeek.reduce((s, c) => s + c.remainingBalance, 0).toLocaleString()}
              </span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-800">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase">Due This Month</p>
                  <p className="text-lg font-black text-slate-900">{creditsDueThisMonth.length} Invoices</p>
                </div>
              </div>
              <span className="font-extrabold text-xs text-emerald-700">
                ₦{creditsDueThisMonth.reduce((s, c) => s + c.remainingBalance, 0).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Charts & Debtor Ranking Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recharts Bar Chart: Hub Credit Distribution */}
            <div className="lg:col-span-2 p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Credit & Debt Distribution by Hub</h3>
                  <p className="text-xs text-slate-500">Comparison of total credit, paid amount, and outstanding debt.</p>
                </div>
              </div>

              <div className="w-full pt-2">
                <SvgGroupedBarChart
                  data={branchCreditChartData}
                  keys={[
                    { key: 'TotalCredit', label: 'Total Credit', color: '#94A3B8' },
                    { key: 'AmountPaid', label: 'Amount Recovered', color: '#10B981' },
                    { key: 'BalanceDue', label: 'Balance Due', color: '#EF4444' }
                  ]}
                  height={270}
                />
              </div>
            </div>

            {/* Top Debtors List */}
            <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Highest Debtors</h3>
                  <p className="text-xs text-slate-500">Customers owing highest balances</p>
                </div>
                <Award className="w-5 h-5 text-amber-600" />
              </div>

              <div className="space-y-3">
                {topDebtors.map((d, index) => (
                  <div key={d.customerId} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-800 font-black text-[10px] flex items-center justify-center">
                        #{index + 1}
                      </span>
                      <div>
                        <p className="font-extrabold text-slate-900">{d.name}</p>
                        <p className="text-[10px] text-slate-500">{d.phone} • {d.activeCredits} Active Invoices</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-rose-700">₦{d.balance.toLocaleString()}</p>
                      <button
                        onClick={() => {
                          const cust = customers.find((c) => c.id === d.customerId);
                          if (cust) {
                            setSelectedCustomerForLedger(cust);
                            setShowLedgerModal(true);
                          }
                        }}
                        className="text-[10px] font-bold text-emerald-700 hover:underline mt-0.5 block"
                      >
                        View Ledger →
                      </button>
                    </div>
                  </div>
                ))}

                {topDebtors.length === 0 && (
                  <p className="text-xs text-slate-400 py-8 text-center font-medium">No active customer debts recorded.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 2: CUSTOMER CREDIT RECORDS TABLE */}
      {/* ==================================================== */}
      {activeTab === 'RECORDS' && (
        <div className="space-y-4">
          {/* Controls & Search Filters */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Search Bar */}
              <div className="lg:col-span-2 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search customer name, invoice #, phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                >
                  <option value="ALL">All Payment Statuses</option>
                  <option value="UNPAID">Unpaid (Full Debt)</option>
                  <option value="PARTIAL">Partial Payment</option>
                  <option value="OVERDUE">🔴 Overdue Credits</option>
                  <option value="PAID">🟢 Fully Cleared</option>
                </select>
              </div>

              {/* Date Filter */}
              <div>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                >
                  <option value="ALL">All Time</option>
                  <option value="TODAY">Issued Today</option>
                  <option value="THIS_WEEK">This Week</option>
                  <option value="THIS_MONTH">This Month</option>
                </select>
              </div>

              {/* Sort By */}
              <div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                >
                  <option value="HIGHEST_DEBT">Highest Debt First</option>
                  <option value="NEWEST">Newest Date</option>
                  <option value="OLDEST">Oldest Date</option>
                  <option value="DUE_DATE">Due Date Upcoming</option>
                </select>
              </div>
            </div>
          </div>

          {/* Records Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-black tracking-wider text-[10px]">
                    <th className="p-3.5">Customer & Phone</th>
                    <th className="p-3.5">Invoice # & Date</th>
                    <th className="p-3.5">Terms & Due Date</th>
                    <th className="p-3.5 text-right">Credit Amount</th>
                    <th className="p-3.5 text-right">Paid</th>
                    <th className="p-3.5 text-right">Balance Due</th>
                    <th className="p-3.5 text-center">Days Remaining</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-center">Sync Status</th>
                    <th className="p-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {filteredRecords.map((r) => {
                    const daysOver = getDaysOverdue(r.dueDate);
                    const daysLeft = getDaysRemaining(r.dueDate);
                    const custObj = customers.find((c) => c.id === r.customerId);

                    return (
                      <tr key={r.id} className={`hover:bg-slate-50/80 transition-colors ${r.creditStatus === 'OVERDUE' ? 'bg-rose-50/20' : ''}`}>
                        <td className="p-3.5">
                          <button
                            onClick={() => {
                              if (custObj) {
                                setSelectedCustomerForLedger(custObj);
                                setShowLedgerModal(true);
                              }
                            }}
                            className="font-extrabold text-slate-900 hover:text-emerald-700 hover:underline block text-left"
                          >
                            {r.customerName}
                          </button>
                          <span className="text-[10px] text-slate-500 block">{r.customerPhone}</span>
                        </td>

                        <td className="p-3.5">
                          <span className="font-bold text-slate-900 block">{r.receiptNo}</span>
                          <span className="text-[10px] text-slate-500 block">{r.saleDate} • {r.branchName}</span>
                        </td>

                        <td className="p-3.5">
                          <span className="font-bold text-slate-800 block">{r.paymentTerms}</span>
                          <span className="text-[10px] text-slate-500 block">Due: {r.dueDate}</span>
                        </td>

                        <td className="p-3.5 text-right font-extrabold text-slate-900">
                          ₦{r.creditAmount.toLocaleString()}
                        </td>

                        <td className="p-3.5 text-right font-bold text-emerald-700">
                          ₦{r.amountPaid.toLocaleString()}
                        </td>

                        <td className="p-3.5 text-right font-black text-rose-700">
                          ₦{r.remainingBalance.toLocaleString()}
                        </td>

                        <td className="p-3.5 text-center">
                          {r.remainingBalance === 0 ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px]">
                              Cleared
                            </span>
                          ) : daysOver > 0 ? (
                            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-extrabold text-[10px]">
                              {daysOver} Days Overdue
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-extrabold text-[10px]">
                              {daysLeft} Days Left
                            </span>
                          )}
                        </td>

                        <td className="p-3.5 text-center">
                          {r.creditStatus === 'OVERDUE' && r.remainingBalance > 0 && (
                            <span className="px-2 py-0.5 rounded-lg bg-rose-600 text-white font-black text-[10px] uppercase">
                              OVERDUE
                            </span>
                          )}
                          {r.creditStatus === 'ACTIVE' && r.remainingBalance > 0 && (
                            <span className="px-2 py-0.5 rounded-lg bg-amber-500 text-white font-black text-[10px] uppercase">
                              ACTIVE
                            </span>
                          )}
                          {r.remainingBalance === 0 && (
                            <span className="px-2 py-0.5 rounded-lg bg-emerald-600 text-white font-black text-[10px] uppercase">
                              GOOD / PAID
                            </span>
                          )}
                        </td>

                        <td className="p-3.5 text-center">
                          {r.syncStatus === 'synced' ? (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                              ✓ Synced
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                              ⏳ Pending
                            </span>
                          )}
                        </td>

                        <td className="p-3.5 text-right space-x-1 whitespace-nowrap">
                          {r.remainingBalance > 0 && canRecordPayment && (
                            <button
                              onClick={() => {
                                setSelectedCreditForPayment(r);
                                setPayAmount(r.remainingBalance);
                                setShowPaymentModal(true);
                              }}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-lg text-[11px] shadow-2xs"
                              title="Record Repayment"
                            >
                              💳 Pay
                            </button>
                          )}

                          <button
                            onClick={() => {
                              if (custObj) {
                                setSelectedCustomerForLedger(custObj);
                                setShowLedgerModal(true);
                              }
                            }}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[11px]"
                            title="View Customer Ledger"
                          >
                            Ledger
                          </button>

                          {isManager && onEditCredit && (
                            <button
                              onClick={() => {
                                setSelectedCreditForEdit(r);
                                setEditDueDate(r.dueDate);
                                setEditRemarks(r.remarks || '');
                                setShowEditModal(true);
                              }}
                              className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                              title="Edit Due Date / Terms"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {canDeleteCredit && onDeleteCredit && (
                            <button
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete credit record ${r.receiptNo}?`)) {
                                  onDeleteCredit(r.id);
                                }
                              }}
                              className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                              title="Delete Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {filteredRecords.length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400 font-medium">
                        No credit records found matching current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 3: REPAYMENT LOGS */}
      {/* ==================================================== */}
      {activeTab === 'PAYMENTS' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Credit Payment History Log</h3>
              <p className="text-xs text-slate-500">Record of all repayments collected from debtors across all channels.</p>
            </div>
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-black tracking-wider text-[10px]">
                  <th className="p-3">Payment #</th>
                  <th className="p-3">Customer Name</th>
                  <th className="p-3">Invoice #</th>
                  <th className="p-3 text-right">Amount Paid</th>
                  <th className="p-3">Payment Date</th>
                  <th className="p-3">Method & Ref</th>
                  <th className="p-3">Received By</th>
                  <th className="p-3">Sync Status</th>
                  <th className="p-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {creditPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="p-3 font-extrabold text-slate-900">{p.paymentNo}</td>
                    <td className="p-3 font-bold text-slate-900">{p.customerName}</td>
                    <td className="p-3 font-bold text-emerald-800">{p.receiptNo}</td>
                    <td className="p-3 text-right font-black text-emerald-700">₦{p.amountPaid.toLocaleString()}</td>
                    <td className="p-3 text-slate-600 font-medium">{p.paymentDate}</td>
                    <td className="p-3">
                      <span className="font-bold text-slate-800 block">{p.paymentMethod}</span>
                      <span className="text-[10px] text-slate-400 block">{p.referenceNumber || 'N/A'}</span>
                    </td>
                    <td className="p-3 text-slate-600">{p.receivedByUserName}</td>
                    <td className="p-3">
                      {p.syncStatus === 'synced' ? (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                          ✓ Synced
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                          ⏳ Pending
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-slate-500 italic max-w-xs truncate">{p.notes || '-'}</td>
                  </tr>
                ))}

                {creditPayments.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                      No repayment logs recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 4: REPORTS & STATEMENTS */}
      {/* ==================================================== */}
      {activeTab === 'REPORTS' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm">Customer Statement of Account</h4>
                <p className="text-xs text-slate-500 mt-0.5">Generate itemized ledger for individual farmers or co-ops.</p>
              </div>
              <button
                onClick={() => {
                  if (customers.length > 0) {
                    setSelectedCustomerForLedger(customers[0]);
                    setShowLedgerModal(true);
                  }
                }}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl"
              >
                Select Customer & Print
              </button>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center font-bold">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm">Overdue Receivables Audit</h4>
                <p className="text-xs text-slate-500 mt-0.5">Export list of defaulted and past-due accounts for debt recovery.</p>
              </div>
              <button
                onClick={handleExportCSV}
                className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl"
              >
                Export Overdue Report
              </button>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm">Master Credit Sales Summary</h4>
                <p className="text-xs text-slate-500 mt-0.5">Full company-wide credit report formatted for management printing.</p>
              </div>
              <button
                onClick={handlePrintStatement}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl"
              >
                Print Master Summary
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 1: NEW CREDIT SALE MODAL */}
      {/* ==================================================== */}
      {showNewCreditModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Issue New Credit Transaction</h3>
              </div>
              <button onClick={() => setShowNewCreditModal(false)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleNewCreditSubmit} className="space-y-4 mt-4 text-xs">
              {/* Customer Selection */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Customer (Mandatory) *</label>
                <select
                  required
                  value={formCustomerId}
                  onChange={(e) => setFormCustomerId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Choose Customer Account --</option>
                  {customers.map((c) => {
                    const existingDebt = credits
                      .filter((cr) => cr.customerId === c.id)
                      .reduce((sum, cr) => sum + cr.remainingBalance, 0);
                    return (
                      <option key={c.id} value={c.id}>
                        {c.fullName} ({c.phone}) {existingDebt > 0 ? `[Debt: ₦${existingDebt.toLocaleString()}]` : '[Clean]'}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Outstanding Debt Info Box */}
              {formCustomerId && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 flex items-center justify-between">
                  <span className="font-semibold">Current Customer Credit Debt:</span>
                  <span className="font-black text-rose-700 text-sm">
                    ₦
                    {credits
                      .filter((cr) => cr.customerId === formCustomerId)
                      .reduce((sum, cr) => sum + cr.remainingBalance, 0)
                      .toLocaleString()}
                  </span>
                </div>
              )}

              {/* Credit Amount */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Credit Amount (₦) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="e.g. 500000"
                  value={formCreditAmount}
                  onChange={(e) => setFormCreditAmount(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-extrabold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Payment Terms & Due Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payment Terms</label>
                  <select
                    value={formPaymentTerms}
                    onChange={(e) => handleTermsChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  >
                    <option value="Net 7">Net 7 Days</option>
                    <option value="Net 15">Net 15 Days</option>
                    <option value="Net 30">Net 30 Days</option>
                    <option value="Net 60">Net 60 Days</option>
                    <option value="Custom">Custom Terms</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Due Date *</label>
                  <input
                    type="date"
                    required
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold text-slate-800"
                  />
                </div>
              </div>

              {/* Branch */}
              {isCEO && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Issuing Hub / Branch *</label>
                  <select
                    value={formBranchId}
                    onChange={(e) => setFormBranchId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Remarks */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Remarks / Note</label>
                <textarea
                  rows={2}
                  placeholder="Additional notes, seasonal crop guarantees, or collateral agreement..."
                  value={formRemarks}
                  onChange={(e) => setFormRemarks(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium text-slate-800"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewCreditModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-xs uppercase tracking-wider"
                >
                  Save Credit Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 2: RECORD REPAYMENT MODAL */}
      {/* ==================================================== */}
      {showPaymentModal && selectedCreditForPayment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Record Credit Repayment</h3>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-3 mt-4 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <p className="font-extrabold text-slate-900">{selectedCreditForPayment.customerName}</p>
                <p className="text-[10px] text-slate-500">Invoice #{selectedCreditForPayment.receiptNo} • Sale Date: {selectedCreditForPayment.saleDate}</p>
                <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between font-bold">
                  <span>Current Remaining Balance:</span>
                  <span className="text-rose-700">₦{selectedCreditForPayment.remainingBalance.toLocaleString()}</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Repayment Amount (₦) *</label>
                <input
                  type="number"
                  min="1"
                  max={selectedCreditForPayment.remainingBalance}
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-extrabold text-slate-900 text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Method *</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                >
                  <option value="CASH">CASH</option>
                  <option value="POS">POS CARD TERMINAL</option>
                  <option value="BANK_TRANSFER">BANK TRANSFER</option>
                </select>
              </div>

              {(payMethod === 'POS' || payMethod === 'BANK_TRANSFER') && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Reference Number / RRR</label>
                  <input
                    type="text"
                    placeholder="Enter transaction reference..."
                    value={payReference}
                    onChange={(e) => setPayReference(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes / Description</label>
                <input
                  type="text"
                  placeholder="e.g. Deposit for seasonal harvest payment"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-xs uppercase"
                >
                  Process Repayment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 3: CUSTOMER CREDIT PROFILE & LEDGER MODAL */}
      {/* ==================================================== */}
      {showLedgerModal && selectedCustomerForLedger && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl p-6 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">{selectedCustomerForLedger.fullName}</h3>
                <p className="text-xs text-slate-500">{selectedCustomerForLedger.phone} • {selectedCustomerForLedger.address}, {selectedCustomerForLedger.state}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintStatement}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Statement
                </button>
                <button onClick={() => setShowLedgerModal(false)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Customer Credit KPI Summary Box */}
            {(() => {
              const custCredits = credits.filter((c) => c.customerId === selectedCustomerForLedger.id);
              const totalCreditGiven = custCredits.reduce((s, c) => s + c.creditAmount, 0);
              const totalPaid = custCredits.reduce((s, c) => s + c.amountPaid, 0);
              const outstanding = Math.max(0, totalCreditGiven - totalPaid);
              const overdueCount = custCredits.filter((c) => c.creditStatus === 'OVERDUE' && c.remainingBalance > 0).length;

              return (
                <div className="mt-4 grid grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Total Credit</p>
                    <p className="text-sm font-black text-slate-900 mt-0.5">₦{totalCreditGiven.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <p className="text-[10px] font-bold text-emerald-800 uppercase">Total Paid</p>
                    <p className="text-sm font-black text-emerald-700 mt-0.5">₦{totalPaid.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                    <p className="text-[10px] font-bold text-rose-800 uppercase">Outstanding Balance</p>
                    <p className="text-sm font-black text-rose-700 mt-0.5">₦{outstanding.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Credit Risk Status</p>
                    <span className={`inline-block mt-1 font-black text-xs px-2 py-0.5 rounded ${
                      outstanding === 0 ? 'bg-emerald-100 text-emerald-800' : overdueCount > 0 ? 'bg-rose-600 text-white' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {outstanding === 0 ? 'CLEARED' : overdueCount > 0 ? `${overdueCount} OVERDUE` : 'ACTIVE'}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Statement Ledger Table */}
            <div className="mt-4 space-y-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Itemized Statement of Account Ledger</h4>
              <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] sticky top-0">
                    <tr>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Type & Reference</th>
                      <th className="p-2.5 text-right">Debit / Credit</th>
                      <th className="p-2.5 text-right">Paid</th>
                      <th className="p-2.5 text-right">Balance Due</th>
                      <th className="p-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {credits
                      .filter((c) => c.customerId === selectedCustomerForLedger.id)
                      .map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50">
                          <td className="p-2.5 text-slate-600 font-medium">{c.saleDate}</td>
                          <td className="p-2.5 font-bold text-slate-900">
                            Invoice #{c.receiptNo} ({c.paymentTerms})
                          </td>
                          <td className="p-2.5 text-right font-bold text-slate-900">₦{c.creditAmount.toLocaleString()}</td>
                          <td className="p-2.5 text-right font-bold text-emerald-700">₦{c.amountPaid.toLocaleString()}</td>
                          <td className="p-2.5 text-right font-black text-rose-700">₦{c.remainingBalance.toLocaleString()}</td>
                          <td className="p-2.5 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              c.remainingBalance === 0 ? 'bg-emerald-100 text-emerald-800' : c.creditStatus === 'OVERDUE' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {c.remainingBalance === 0 ? 'Paid' : c.creditStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 4: PAYMENT RECEIPT POPUP */}
      {/* ==================================================== */}
      {receiptPayment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 text-xs space-y-4 animate-in fade-in zoom-in-95">
            <div className="text-center pb-3 border-b border-slate-200">
              <h2 className="font-extrabold text-slate-900 text-base">ROYAL AGRO MANAGEMENT</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Credit Repayment Official Receipt</p>
            </div>

            <div className="space-y-1.5 text-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-500">Receipt No:</span>
                <span className="font-black text-slate-900">{receiptPayment.paymentNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Customer Name:</span>
                <span className="font-bold">{receiptPayment.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Invoice Reference:</span>
                <span className="font-bold">{receiptPayment.receiptNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Date:</span>
                <span className="font-medium">{receiptPayment.paymentDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Method:</span>
                <span className="font-bold">{receiptPayment.paymentMethod}</span>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex justify-between items-center text-emerald-900">
              <span className="font-bold text-xs uppercase">Amount Collected:</span>
              <span className="font-black text-base text-emerald-800">₦{receiptPayment.amountPaid.toLocaleString()}</span>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => {
                  const content = `================================================
ROYAL AGRO SEEDS & AGRO MANAGEMENT
Credit Repayment Official Receipt
================================================
Receipt No        : ${receiptPayment.paymentNo}
Customer Name     : ${receiptPayment.customerName}
Invoice Reference : ${receiptPayment.receiptNo}
Payment Date      : ${receiptPayment.paymentDate}
Payment Method    : ${receiptPayment.paymentMethod}
Amount Collected  : ₦${receiptPayment.amountPaid.toLocaleString()}
================================================
Thank you for your prompt repayment!
================================================`;
                  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `Credit_Repayment_${receiptPayment.paymentNo}.txt`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-4 h-4" /> Download
              </button>
              <button
                onClick={() => handlePrintStatement()}
                className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
              >
                <Printer className="w-4 h-4" /> Print
              </button>
              <button
                onClick={() => setReceiptPayment(null)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl text-xs shadow-xs transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 5: EDIT CREDIT DUE DATE MODAL */}
      {/* ==================================================== */}
      {showEditModal && selectedCreditForEdit && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Update Credit Terms / Due Date</h3>
              <button onClick={() => setShowEditModal(false)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (onEditCredit && selectedCreditForEdit) {
                  onEditCredit(selectedCreditForEdit.id, editDueDate, editRemarks);
                }
                setShowEditModal(false);
              }}
              className="space-y-3 mt-4 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">Customer Account</label>
                <input
                  type="text"
                  disabled
                  value={selectedCreditForEdit.customerName}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">New Due Date *</label>
                <input
                  type="date"
                  required
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Remarks / Note</label>
                <textarea
                  rows={2}
                  value={editRemarks}
                  onChange={(e) => setEditRemarks(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-xs"
                >
                  Update Credit Terms
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
