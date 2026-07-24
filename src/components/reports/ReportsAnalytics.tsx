import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Download,
  Printer,
  Calendar,
  Building2,
  DollarSign,
  Boxes,
  Users,
  PieChart as PieChartIcon,
  ArrowUpRight
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import {
  Sale,
  Expense,
  Branch,
  Product,
  BranchInventory,
  Customer
} from '../../types';

interface ReportsAnalyticsProps {
  sales: Sale[];
  expenses: Expense[];
  branches: Branch[];
  products: Product[];
  inventory: BranchInventory[];
  customers: Customer[];
}

export const ReportsAnalytics: React.FC<ReportsAnalyticsProps> = ({
  sales = [],
  expenses = [],
  branches = [],
  products = [],
  inventory = [],
  customers = []
}) => {
  const [reportType, setReportType] = useState<'FINANCIAL' | 'SALES' | 'INVENTORY' | 'CUSTOMERS'>('FINANCIAL');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');

  const completedSales = sales.filter((s) => {
    const matchesStatus = s.status === 'COMPLETED';
    const matchesBranch = selectedBranchId === 'ALL' || s.branchId === selectedBranchId;
    return matchesStatus && matchesBranch;
  });

  const filteredExpenses = expenses.filter((e) => {
    return selectedBranchId === 'ALL' || e.branchId === selectedBranchId;
  });

  const totalRevenue = completedSales.reduce((acc, s) => acc + s.totalAmount, 0);
  const totalExpenses = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
  const netProfit = totalRevenue - totalExpenses;

  // Inventory Valuation Calculation
  const totalInventoryValue = inventory.reduce((acc, item) => {
    const prod = products.find((p) => p.id === item.productId);
    return acc + (prod ? prod.purchasePrice * item.quantity : 0);
  }, 0);

  // Export CSV
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';

    if (reportType === 'FINANCIAL') {
      csvContent += 'Branch,Revenue (NGN),Expenses (NGN),Net Profit (NGN)\n';
      branches.forEach((b) => {
        const bSales = sales.filter((s) => s.branchId === b.id && s.status === 'COMPLETED');
        const bRev = bSales.reduce((sum, s) => sum + s.totalAmount, 0);
        const bExp = expenses.filter((e) => e.branchId === b.id).reduce((sum, e) => sum + e.amount, 0);
        csvContent += `"${b.name}",${bRev},${bExp},${bRev - bExp}\n`;
      });
    } else if (reportType === 'SALES') {
      csvContent += 'Receipt No,Branch,Customer,Date,Payment Method,Total Amount (NGN)\n';
      completedSales.forEach((s) => {
        csvContent += `"${s.receiptNo}","${s.branchName}","${s.customerName}","${s.date}","${s.paymentMethod}",${s.totalAmount}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Royal_Agro_${reportType}_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-emerald-600" />
            <h1 className="text-lg font-bold text-slate-900">Executive Reports & Business Analytics</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Profit & Loss statements, sales breakdowns, stock valuation, and downloadable CSV audit sheets.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-4 h-4 text-emerald-700" /> Export CSV
          </button>
          <button
            onClick={handlePrint}
            className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-900/30 flex items-center gap-1.5 transition-all"
          >
            <Printer className="w-4 h-4 text-amber-300" /> Print Summary
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 custom-scrollbar">
          <button
            onClick={() => setReportType('FINANCIAL')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              reportType === 'FINANCIAL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            Financial P&L
          </button>
          <button
            onClick={() => setReportType('SALES')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              reportType === 'SALES' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            Sales Reports
          </button>
          <button
            onClick={() => setReportType('INVENTORY')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              reportType === 'INVENTORY' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            Inventory Valuation
          </button>
          <button
            onClick={() => setReportType('CUSTOMERS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              reportType === 'CUSTOMERS' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            Customer Analytics
          </button>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
          <Building2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
          >
            <option value="ALL">🌐 All Branches Consolidated</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                📍 {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gross Revenue</span>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">₦{totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Expenses</span>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">₦{totalExpenses.toLocaleString()}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Net Profit</span>
          <p className="text-2xl font-extrabold text-emerald-700 mt-1">₦{netProfit.toLocaleString()}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Stock Asset Valuation</span>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">₦{totalInventoryValue.toLocaleString()}</p>
        </div>
      </div>

      {/* Main Report Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden p-6">
        <h3 className="text-sm font-bold text-slate-900 mb-4">
          {reportType === 'FINANCIAL' && 'Profit & Loss Statement by Branch'}
          {reportType === 'SALES' && 'Consolidated Sales Audit Log'}
          {reportType === 'INVENTORY' && 'Branch Inventory Valuation & Stock Asset Breakdown'}
          {reportType === 'CUSTOMERS' && 'Top Buyers & Commercial Farm Accounts'}
        </h3>

        <div className="overflow-x-auto">
          {reportType === 'FINANCIAL' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px]">
                <tr>
                  <th className="p-3">Branch Location</th>
                  <th className="p-3">Completed Sales</th>
                  <th className="p-3">Gross Revenue (₦)</th>
                  <th className="p-3">Operating Expenses (₦)</th>
                  <th className="p-3">Net Profit (₦)</th>
                  <th className="p-3">Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {branches.map((b) => {
                  const bSales = sales.filter((s) => s.branchId === b.id && s.status === 'COMPLETED');
                  const rev = bSales.reduce((acc, s) => acc + s.totalAmount, 0);
                  const exp = expenses.filter((e) => e.branchId === b.id).reduce((acc, e) => acc + e.amount, 0);
                  const profit = rev - exp;
                  const margin = rev > 0 ? ((profit / rev) * 100).toFixed(1) : '0';

                  return (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-900">📍 {b.name} ({b.state})</td>
                      <td className="p-3 text-slate-700">{bSales.length} sales</td>
                      <td className="p-3 font-extrabold text-slate-900">₦{rev.toLocaleString()}</td>
                      <td className="p-3 font-semibold text-rose-700">₦{exp.toLocaleString()}</td>
                      <td className="p-3 font-extrabold text-emerald-700">₦{profit.toLocaleString()}</td>
                      <td className="p-3 font-bold text-slate-800">{margin}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {reportType === 'SALES' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px]">
                <tr>
                  <th className="p-3">Receipt No</th>
                  <th className="p-3">Branch</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Cashier Staff</th>
                  <th className="p-3">Payment Method</th>
                  <th className="p-3">Total Amount</th>
                  <th className="p-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {completedSales.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold font-mono text-slate-900">{s.receiptNo}</td>
                    <td className="p-3 text-slate-700">{s.branchName}</td>
                    <td className="p-3 font-medium text-slate-800">{s.customerName}</td>
                    <td className="p-3 text-slate-600">{s.staffName}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                        {s.paymentMethod}
                      </span>
                    </td>
                    <td className="p-3 font-extrabold text-emerald-700">₦{s.totalAmount.toLocaleString()}</td>
                    <td className="p-3 text-slate-500">{s.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {reportType === 'INVENTORY' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px]">
                <tr>
                  <th className="p-3">Product Name</th>
                  <th className="p-3">SKU</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Unit Cost Price</th>
                  <th className="p-3">Total Units in Stock</th>
                  <th className="p-3">Total Stock Asset Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => {
                  const units = inventory
                    .filter((i) => i.productId === p.id)
                    .reduce((sum, item) => sum + item.quantity, 0);
                  const totalVal = units * p.purchasePrice;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-900">{p.name}</td>
                      <td className="p-3 font-mono font-bold text-slate-800">{p.sku}</td>
                      <td className="p-3 text-slate-600">{p.category}</td>
                      <td className="p-3 font-semibold text-slate-700">₦{p.purchasePrice.toLocaleString()}</td>
                      <td className="p-3 font-extrabold text-slate-900">{units} {p.unit}</td>
                      <td className="p-3 font-extrabold text-emerald-700">₦{totalVal.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {reportType === 'CUSTOMERS' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px]">
                <tr>
                  <th className="p-3">Customer Name</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">State</th>
                  <th className="p-3">Registered Branch</th>
                  <th className="p-3">Orders Count</th>
                  <th className="p-3">Lifetime Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c) => {
                  const b = branches.find((br) => br.id === c.registeredBranchId);
                  return (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-900">{c.fullName}</td>
                      <td className="p-3 text-slate-700">{c.phone}</td>
                      <td className="p-3 text-slate-600">📍 {c.state}</td>
                      <td className="p-3 text-slate-600">{b?.name || 'Central'}</td>
                      <td className="p-3 font-bold text-slate-800">{c.totalPurchases} orders</td>
                      <td className="p-3 font-extrabold text-emerald-700">₦{c.totalSpent.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
