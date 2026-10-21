import React, { useState } from 'react';
import {
  ShieldCheck,
  Search,
  Filter,
  Download,
  Calendar,
  UserCheck,
  Building2,
  Clock,
  Sliders,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { AuditLog } from '../../types';
import { downloadCsvFile } from '../../services/importService';

interface SettingsAuditTabProps {
  auditLogs: AuditLog[];
}

export const SettingsAuditTab: React.FC<SettingsAuditTabProps> = ({ auditLogs = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Filter logs related to settings, business rules, branches, and imports
  const settingsLogs = auditLogs.filter((log) => {
    const isSettingsRelated =
      log.action?.includes('SETTINGS') ||
      log.action?.includes('BRANCH') ||
      log.action?.includes('RULE') ||
      log.action?.includes('IMPORT') ||
      log.category?.includes('SETTINGS') ||
      log.category?.includes('CONFIG') ||
      log.category?.includes('BRANCH');

    const matchesSearch =
      log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.branchName && log.branchName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory =
      categoryFilter === 'ALL' ||
      log.action === categoryFilter ||
      log.category === categoryFilter;

    return (isSettingsRelated || log.action?.includes('CONFIG')) && matchesSearch && matchesCategory;
  });

  const handleExportAudit = () => {
    const header = ['TIMESTAMP', 'ACTION', 'USER', 'ROLE', 'BRANCH', 'DESCRIPTION'].join(',');
    const lines = settingsLogs.map((log) =>
      [
        `"${log.timestamp}"`,
        `"${log.action}"`,
        `"${log.userName}"`,
        `"${log.userRole || 'N/A'}"`,
        `"${log.branchName || 'Central Hub'}"`,
        `"${(log.description || log.details || '').replace(/"/g, '""')}"`
      ].join(',')
    );

    const csvContent = [header, ...lines].join('\n');
    downloadCsvFile(`settings_audit_log_${Date.now()}.csv`, csvContent);
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
              placeholder="Search setting actions, staff, details..."
              className="w-full pl-9 pr-3.5 py-2 rounded-lg border border-stone-300 text-stone-900 text-xs focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-stone-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="py-2 px-3 rounded-lg border border-stone-300 text-stone-800 text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">All Actions</option>
              <option value="SETTINGS_UPDATED">Company Settings</option>
              <option value="BUSINESS_RULES_UPDATED">Business Rules</option>
              <option value="BRANCH_CONFIG">Branch Config</option>
              <option value="DATA_IMPORT">Data Import</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleExportAudit}
          className="px-4 py-2 rounded-lg border border-stone-300 bg-stone-50 hover:bg-stone-100 text-stone-700 text-xs font-bold flex items-center gap-2 transition-colors shrink-0"
        >
          <Download className="w-4 h-4 text-stone-600" /> Export Audit Log CSV
        </button>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-stone-100 bg-stone-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-base">Configuration & Settings Audit Trail</h3>
              <p className="text-xs text-stone-500">
                Tamper-evident logs of corporate profile modifications, branch states, and rule adjustments
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-stone-600 bg-stone-200/80 px-2.5 py-1 rounded-md">
            Entries: {settingsLogs.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-700 font-bold">
              <tr>
                <th className="py-3 px-4 w-44">Date & Time</th>
                <th className="py-3 px-4 w-40">Action</th>
                <th className="py-3 px-4 w-48">Staff User</th>
                <th className="py-3 px-4 w-40">Branch Scope</th>
                <th className="py-3 px-4">Modification Details & Audit Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {settingsLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-stone-500">
                    No settings modification logs recorded yet.
                  </td>
                </tr>
              ) : (
                settingsLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-stone-50 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-stone-600">
                      {log.timestamp}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-800">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-stone-900 block">{log.userName}</span>
                      <span className="text-[10px] text-stone-500 uppercase">{log.userRole || 'Admin'}</span>
                    </td>
                    <td className="py-3 px-4 text-stone-700">
                      {log.branchName || 'Central Organization'}
                    </td>
                    <td className="py-3 px-4 text-stone-800 font-medium">
                      {log.description || log.details}
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
