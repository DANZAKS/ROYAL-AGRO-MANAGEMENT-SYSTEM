import React, { useState } from 'react';
import {
  History,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  Download,
  Calendar,
  Building2,
  UserCheck,
  Package,
  Users,
  Truck,
  Boxes
} from 'lucide-react';
import { DataImportRecord, Branch } from '../../types';
import { downloadCsvFile } from '../../services/importService';

interface ImportHistoryTabProps {
  dataImports: DataImportRecord[];
  branches: Branch[];
}

export const ImportHistoryTab: React.FC<ImportHistoryTabProps> = ({
  dataImports = [],
  branches = []
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [branchFilter, setBranchFilter] = useState<string>('ALL');

  const filteredImports = dataImports.filter((imp) => {
    const matchesSearch =
      imp.importReference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      imp.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      imp.performedByUserName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (imp.summaryNotes && imp.summaryNotes.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = typeFilter === 'ALL' || imp.importType === typeFilter;
    const matchesBranch =
      branchFilter === 'ALL' ||
      (branchFilter === 'CENTRAL' && !imp.branchId) ||
      imp.branchId === branchFilter;

    return matchesSearch && matchesType && matchesBranch;
  });

  const handleExportHistorySummary = () => {
    const header = [
      'IMPORT_REFERENCE',
      'TYPE',
      'FILE_NAME',
      'TOTAL_ROWS',
      'IMPORTED_ROWS',
      'FAILED_ROWS',
      'PERFORMED_BY',
      'BRANCH',
      'STATUS',
      'DATE',
      'NOTES'
    ].join(',');

    const lines = filteredImports.map((imp) =>
      [
        `"${imp.importReference}"`,
        `"${imp.importType}"`,
        `"${imp.fileName}"`,
        imp.totalRows,
        imp.importedRows,
        imp.failedRows,
        `"${imp.performedByUserName}"`,
        `"${imp.branchName || 'Central Hub'}"`,
        `"${imp.status}"`,
        `"${imp.createdAt}"`,
        `"${(imp.summaryNotes || '').replace(/"/g, '""')}"`
      ].join(',')
    );

    const csvContent = [header, ...lines].join('\n');
    downloadCsvFile(`import_history_audit_${Date.now()}.csv`, csvContent);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'PRODUCTS':
        return <Package className="w-4 h-4 text-emerald-700" />;
      case 'CUSTOMERS':
        return <Users className="w-4 h-4 text-blue-700" />;
      case 'SUPPLIERS':
        return <Truck className="w-4 h-4 text-purple-700" />;
      case 'OPENING_STOCK':
        return <Boxes className="w-4 h-4 text-amber-700" />;
      default:
        return <FileSpreadsheet className="w-4 h-4 text-stone-700" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search reference, file name, staff..."
              className="w-full pl-9 pr-3.5 py-2 rounded-lg border border-stone-300 text-stone-900 text-xs focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-stone-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="py-2 px-3 rounded-lg border border-stone-300 text-stone-800 text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">All Types</option>
              <option value="PRODUCTS">Products</option>
              <option value="CUSTOMERS">Customers</option>
              <option value="SUPPLIERS">Suppliers</option>
              <option value="OPENING_STOCK">Opening Stock</option>
            </select>
          </div>

          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="py-2 px-3 rounded-lg border border-stone-300 text-stone-800 text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">All Branches</option>
            <option value="CENTRAL">Central Hub Only</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleExportHistorySummary}
          className="px-4 py-2 rounded-lg border border-stone-300 bg-stone-50 hover:bg-stone-100 text-stone-700 text-xs font-bold flex items-center gap-2 transition-colors shrink-0"
        >
          <Download className="w-4 h-4 text-stone-600" /> Export Audit History CSV
        </button>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-stone-100 bg-stone-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-base">Bulk Data Import Execution Log</h3>
              <p className="text-xs text-stone-500">
                Audited records of all CSV files parsed, validated, and committed into ERP modules
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-stone-600 bg-stone-200/80 px-2.5 py-1 rounded-md">
            Total Batches: {filteredImports.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-700 font-bold">
              <tr>
                <th className="py-3 px-4">Batch Reference</th>
                <th className="py-3 px-4">Record Type</th>
                <th className="py-3 px-4">File Name</th>
                <th className="py-3 px-4 text-center">Imported / Total</th>
                <th className="py-3 px-4">Executed By</th>
                <th className="py-3 px-4">Branch Scope</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredImports.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-stone-500">
                    No bulk import batches found matching the selected filters.
                  </td>
                </tr>
              ) : (
                filteredImports.map((imp) => (
                  <tr key={imp.id} className="hover:bg-stone-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-stone-900">
                      {imp.importReference}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold bg-stone-100 text-stone-800">
                        {getTypeIcon(imp.importType)}
                        {imp.importType}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-stone-800">
                      <div className="flex items-center gap-1.5">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span className="truncate max-w-xs">{imp.fileName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-1 font-bold">
                        <span className="text-emerald-700">{imp.importedRows}</span>
                        <span className="text-stone-400">/</span>
                        <span className="text-stone-700">{imp.totalRows}</span>
                      </div>
                      {imp.failedRows > 0 && (
                        <p className="text-[10px] text-rose-600 font-semibold mt-0.5">
                          {imp.failedRows} skipped
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-stone-700 font-medium">
                      {imp.performedByUserName}
                    </td>
                    <td className="py-3 px-4 text-stone-700">
                      {imp.branchName || 'Central Organization'}
                    </td>
                    <td className="py-3 px-4 text-stone-500 font-mono text-[11px]">
                      {imp.createdAt}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {imp.status === 'COMPLETED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3" /> Completed
                        </span>
                      ) : imp.status === 'PARTIAL' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                          <AlertTriangle className="w-3 h-3" /> Partial
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                          <XCircle className="w-3 h-3" /> Failed
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
