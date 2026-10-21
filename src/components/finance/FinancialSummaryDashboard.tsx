import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  BarChart3,
  Calendar,
  Building2,
  AlertCircle,
  HelpCircle,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Package,
  Users,
  CreditCard,
  Layers,
  CheckCircle2
} from 'lucide-react';
import { AppState, User } from '../../types';
import {
  calculateFinancialMetrics,
  FinancialSummaryMetrics
} from '../../services/financialService';

interface FinancialSummaryDashboardProps {
  state: AppState;
  currentUser: User;
  onNavigateToTab?: (tab: string) => void;
}

export const FinancialSummaryDashboard: React.FC<FinancialSummaryDashboardProps> = ({
  state,
  currentUser,
  onNavigateToTab
}) => {
  const isSuperUser = currentUser.role === 'ADMIN' || currentUser.role === 'FINANCE_OFFICER';

  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    isSuperUser ? 'ALL' : currentUser.branchId
  );
  const [period, setPeriod] = useState<'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'THIS_YEAR' | 'ALL'>('THIS_MONTH');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Calculate date boundaries
  const dateBounds = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (period === 'TODAY') {
      return { startDate: todayStr, endDate: todayStr };
    }
    if (period === 'THIS_WEEK') {
      const d = new Date(now);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      return { startDate: monday.toISOString().split('T')[0], endDate: todayStr };
    }
    if (period === 'THIS_MONTH') {
      return { startDate: `${todayStr.slice(0, 7)}-01`, endDate: todayStr };
    }
    if (period === 'THIS_YEAR') {
      return { startDate: `${todayStr.slice(0, 4)}-01-01`, endDate: todayStr };
    }
    return { startDate: startDate || undefined, endDate: endDate || undefined };
  }, [period, startDate, endDate]);

  // Comprehensive Metrics
  const metrics: FinancialSummaryMetrics = useMemo(() => {
    return calculateFinancialMetrics(
      state,
      selectedBranchId === 'ALL' ? null : selectedBranchId,
      dateBounds
    );
  }, [state, selectedBranchId, dateBounds]);

  // Branch breakdown comparison for Head Office view
  const branchComparison = useMemo(() => {
    return state.branches.map((b) => {
      const bMetrics = calculateFinancialMetrics(state, b.id, dateBounds);
      return {
        branch: b,
        metrics: bMetrics
      };
    });
  }, [state, dateBounds]);

  const totalCompanyValuation = metrics.inventoryValuation + metrics.customerReceivables + (metrics.netCashFlow > 0 ? metrics.netCashFlow : 0);

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center space-x-2">
            <span>Executive Financial Performance Dashboard</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time Profit & Loss statement, operational cash flows, receivables, and balance sheet assets.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Branch Selector */}
          <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <Building2 className="w-4 h-4 text-slate-400" />
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              disabled={!isSuperUser}
              className="bg-transparent text-xs font-semibold text-slate-700 outline-hidden"
            >
              {isSuperUser && <option value="ALL">All Branches (Consolidated)</option>}
              {state.branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Period Selector */}
          <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <Calendar className="w-4 h-4 text-slate-400" />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as any)}
              className="bg-transparent text-xs font-semibold text-slate-700 outline-hidden"
            >
              <option value="TODAY">Today</option>
              <option value="THIS_WEEK">This Week</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="THIS_YEAR">This Year</option>
              <option value="ALL">All Time</option>
            </select>
          </div>
        </div>
      </div>

      {/* Accounting Distinction Alert: Profit vs Cash Flow */}
      <div className="bg-gradient-to-r from-teal-900 to-emerald-950 text-white p-4 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 border border-emerald-800">
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-300 mt-0.5">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-emerald-100">
              Accounting Integrity: Cash Flow vs. Recognized Profit
            </h4>
            <p className="text-xs text-emerald-200/90 max-w-3xl mt-0.5 leading-relaxed">
              <strong>Gross Revenue:</strong> ₦{metrics.salesRevenue.toLocaleString()} (includes credit sales). 
              <strong> Cost of Goods Sold (COGS):</strong> ₦{metrics.costOfGoodsSold.toLocaleString()}. 
              <strong> Net Profit</strong> is calculated after subtracting direct COGS and operating expenses. 
              <strong> Cash Flow</strong> measures physical cash and bank liquidity movements independent of accrued debts.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4 shrink-0 text-xs border-t md:border-t-0 md:border-l border-emerald-700/50 pt-2 md:pt-0 md:pl-4">
          <div>
            <span className="text-emerald-300 block">Gross Profit Margin</span>
            <strong className="text-base text-white">{metrics.grossProfitMargin.toFixed(1)}%</strong>
          </div>
          <div>
            <span className="text-emerald-300 block">Net Profit Margin</span>
            <strong className="text-base text-white">{metrics.netProfitMargin.toFixed(1)}%</strong>
          </div>
        </div>
      </div>

      {/* Primary Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sales Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Sales Revenue
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-800 mt-2">
            ₦{metrics.salesRevenue.toLocaleString()}
          </div>
          <div className="flex items-center justify-between mt-2 text-[11px] text-slate-400">
            <span>Cash: ₦{metrics.cashSalesVolume.toLocaleString()}</span>
            <span>Credit: ₦{metrics.creditSalesVolume.toLocaleString()}</span>
          </div>
        </div>

        {/* Cost of Goods Sold */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Cost of Goods (COGS)
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-900 mt-2">
            ₦{metrics.costOfGoodsSold.toLocaleString()}
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Unit purchase costs of inventory sold
          </div>
        </div>

        {/* Operating Expenses */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Operating Expenses
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 mt-2">
            ₦{metrics.totalExpenses.toLocaleString()}
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Fuel, salaries, logistics, maintenance
          </div>
        </div>

        {/* Net Operating Profit */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Net Operating Result
            </span>
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                metrics.netOperatingResult >= 0
                  ? 'bg-teal-50 text-teal-700'
                  : 'bg-rose-50 text-rose-700'
              }`}
            >
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div
            className={`text-2xl font-black mt-2 ${
              metrics.netOperatingResult >= 0 ? 'text-teal-800' : 'text-rose-700'
            }`}
          >
            {metrics.netOperatingResult >= 0 ? '+' : ''}₦
            {metrics.netOperatingResult.toLocaleString()}
          </div>
          <div className="mt-2 text-[11px] font-semibold text-emerald-700">
            {metrics.netProfitMargin.toFixed(1)}% net operating margin
          </div>
        </div>
      </div>

      {/* Balance Sheet Indicators Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Customer Receivables */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-bold text-slate-700 uppercase">
                Customer Receivables (Credit Owed)
              </h3>
            </div>
            {metrics.overdueReceivables > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 flex items-center space-x-1">
                <AlertCircle className="w-3 h-3" />
                <span>Overdue: ₦{metrics.overdueReceivables.toLocaleString()}</span>
              </span>
            )}
          </div>
          <div className="text-2xl font-black text-indigo-900 mt-2">
            ₦{metrics.customerReceivables.toLocaleString()}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Current outstanding farmer & agribusiness credit balances.
          </p>
        </div>

        {/* Supplier Payables */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-orange-600" />
              <h3 className="text-xs font-bold text-slate-700 uppercase">
                Supplier Payables (Outstanding)
              </h3>
            </div>
          </div>
          <div className="text-2xl font-black text-orange-900 mt-2">
            ₦{metrics.supplierPayables.toLocaleString()}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Pending supplier invoices for fertilizers, seeds & agrochemicals.
          </p>
        </div>

        {/* Inventory Valuation */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-teal-600" />
              <h3 className="text-xs font-bold text-slate-700 uppercase">
                Inventory Asset Valuation
              </h3>
            </div>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
              At Purchase Cost
            </span>
          </div>
          <div className="text-2xl font-black text-teal-900 mt-2">
            ₦{metrics.inventoryValuation.toLocaleString()}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Total capital tied up in warehouses and depots.
          </p>
        </div>
      </div>

      {/* Two-Column Section: Payment Channels & Cash Flow In/Out Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Channels Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-800 flex items-center space-x-2">
              <CreditCard className="w-4 h-4 text-emerald-700" />
              <span>Collections by Payment Channel</span>
            </h3>
            <span className="text-xs font-bold text-slate-500">
              Total In: ₦{metrics.totalMoneyIn.toLocaleString()}
            </span>
          </div>

          <div className="space-y-3">
            {/* Cash */}
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Physical Cash (Counter Drawer)</span>
                <span>
                  ₦{metrics.paymentMethodBreakdown.CASH.toLocaleString()} (
                  {metrics.totalMoneyIn > 0
                    ? ((metrics.paymentMethodBreakdown.CASH / metrics.totalMoneyIn) * 100).toFixed(1)
                    : '0'}
                  %)
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-600 h-full rounded-full"
                  style={{
                    width: `${
                      metrics.totalMoneyIn > 0
                        ? (metrics.paymentMethodBreakdown.CASH / metrics.totalMoneyIn) * 100
                        : 0
                    }%`
                  }}
                />
              </div>
            </div>

            {/* Bank Transfer */}
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Bank Direct Transfer (EFT / Lodgements)</span>
                <span>
                  ₦{metrics.paymentMethodBreakdown.BANK_TRANSFER.toLocaleString()} (
                  {metrics.totalMoneyIn > 0
                    ? (
                        (metrics.paymentMethodBreakdown.BANK_TRANSFER / metrics.totalMoneyIn) *
                        100
                      ).toFixed(1)
                    : '0'}
                  %)
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full"
                  style={{
                    width: `${
                      metrics.totalMoneyIn > 0
                        ? (metrics.paymentMethodBreakdown.BANK_TRANSFER / metrics.totalMoneyIn) *
                          100
                        : 0
                    }%`
                  }}
                />
              </div>
            </div>

            {/* POS */}
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>POS Terminals</span>
                <span>
                  ₦{metrics.paymentMethodBreakdown.POS.toLocaleString()} (
                  {metrics.totalMoneyIn > 0
                    ? ((metrics.paymentMethodBreakdown.POS / metrics.totalMoneyIn) * 100).toFixed(1)
                    : '0'}
                  %)
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-purple-600 h-full rounded-full"
                  style={{
                    width: `${
                      metrics.totalMoneyIn > 0
                        ? (metrics.paymentMethodBreakdown.POS / metrics.totalMoneyIn) * 100
                        : 0
                    }%`
                  }}
                />
              </div>
            </div>

            {/* Cheque / Other */}
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Cheques & Others</span>
                <span>
                  ₦
                  {(
                    metrics.paymentMethodBreakdown.CHEQUE + metrics.paymentMethodBreakdown.OTHER
                  ).toLocaleString()}{' '}
                  (
                  {metrics.totalMoneyIn > 0
                    ? (
                        ((metrics.paymentMethodBreakdown.CHEQUE +
                          metrics.paymentMethodBreakdown.OTHER) /
                          metrics.totalMoneyIn) *
                        100
                      ).toFixed(1)
                    : '0'}
                  %)
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-slate-500 h-full rounded-full"
                  style={{
                    width: `${
                      metrics.totalMoneyIn > 0
                        ? ((metrics.paymentMethodBreakdown.CHEQUE +
                            metrics.paymentMethodBreakdown.OTHER) /
                            metrics.totalMoneyIn) *
                          100
                        : 0
                    }%`
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Operating Cash Flow Inflow vs Outflow */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-800 flex items-center space-x-2">
              <DollarSign className="w-4 h-4 text-teal-700" />
              <span>Net Cash Flow Waterfall</span>
            </h3>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                metrics.netCashFlow >= 0
                  ? 'bg-teal-50 text-teal-800'
                  : 'bg-rose-50 text-rose-700'
              }`}
            >
              Net: {metrics.netCashFlow >= 0 ? '+' : ''}₦{metrics.netCashFlow.toLocaleString()}
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-2.5 bg-emerald-50/60 rounded-xl">
              <div className="flex items-center space-x-2">
                <ArrowDownRight className="w-4 h-4 text-emerald-600" />
                <span className="font-medium text-slate-700">Gross Money Inflow (Collections)</span>
              </div>
              <strong className="text-emerald-700 font-bold">
                +₦{metrics.totalMoneyIn.toLocaleString()}
              </strong>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-rose-50/60 rounded-xl">
              <div className="flex items-center space-x-2">
                <ArrowUpRight className="w-4 h-4 text-rose-600" />
                <span className="font-medium text-slate-700">Operating Expenses Disbursed</span>
              </div>
              <strong className="text-rose-600 font-bold">
                -₦{metrics.totalExpenses.toLocaleString()}
              </strong>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-indigo-50/60 rounded-xl">
              <div className="flex items-center space-x-2">
                <ArrowUpRight className="w-4 h-4 text-indigo-600" />
                <span className="font-medium text-slate-700">Supplier Settlements Paid</span>
              </div>
              <strong className="text-indigo-700 font-bold">
                -₦
                {(
                  metrics.totalMoneyOut - metrics.totalExpenses > 0
                    ? metrics.totalMoneyOut - metrics.totalExpenses
                    : 0
                ).toLocaleString()}
              </strong>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-900 text-white rounded-xl font-bold">
              <span>Ending Operational Cash Position</span>
              <span className="text-sm">
                {metrics.netCashFlow >= 0 ? '+' : ''}₦{metrics.netCashFlow.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Head Office Multi-Branch Comparison Table */}
      {isSuperUser && (
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-800 flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-teal-800" />
              <span>Multi-Branch Performance & Profitability League</span>
            </h3>
            <span className="text-xs text-slate-400">Head Office Oversight</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Branch</th>
                  <th className="py-3 px-3">Location</th>
                  <th className="py-3 px-3 text-right">Revenue (₦)</th>
                  <th className="py-3 px-3 text-right">COGS (₦)</th>
                  <th className="py-3 px-3 text-right">Gross Profit (₦)</th>
                  <th className="py-3 px-3 text-right">Expenses (₦)</th>
                  <th className="py-3 px-3 text-right text-emerald-800 font-bold">Net Profit (₦)</th>
                  <th className="py-3 px-3 text-right">Net Margin</th>
                  <th className="py-3 px-3 text-right">Receivables (₦)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {branchComparison.map(({ branch, metrics: bm }) => (
                  <tr key={branch.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-800">{branch.name}</td>
                    <td className="py-3 px-3 text-slate-500">{branch.address || branch.code}</td>
                    <td className="py-3 px-3 text-right font-medium">
                      ₦{bm.salesRevenue.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-600">
                      ₦{bm.costOfGoodsSold.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-emerald-700">
                      ₦{bm.grossProfit.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right text-rose-600">
                      ₦{bm.totalExpenses.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-emerald-900">
                      {bm.netOperatingResult >= 0 ? '+' : ''}₦
                      {bm.netOperatingResult.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-slate-700">
                      {bm.netProfitMargin.toFixed(1)}%
                    </td>
                    <td className="py-3 px-3 text-right text-indigo-700 font-medium">
                      ₦{bm.customerReceivables.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
