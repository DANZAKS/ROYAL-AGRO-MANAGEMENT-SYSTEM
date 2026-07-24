import React, { useState } from 'react';
import {
  FileCode,
  Search,
  Filter,
  User,
  Building2,
  Calendar,
  Activity,
  ShieldAlert
} from 'lucide-react';
import { AuditLog } from '../../types';

interface AuditLogViewerProps {
  logs: AuditLog[];
}

export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ logs = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const filteredLogs = (logs || []).filter((l) => {
    const searchLower = (searchTerm || '').toLowerCase();
    const catLower = (selectedCategory || '').toLowerCase();
    const matchesCat = selectedCategory === 'ALL' || (l.action || '').toLowerCase().includes(catLower);
    const matchesSearch =
      (l.details || '').toLowerCase().includes(searchLower) ||
      (l.userName || '').toLowerCase().includes(searchLower) ||
      (l.action || '').toLowerCase().includes(searchLower);
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-6 h-6 text-emerald-600" />
            <h1 className="text-lg font-bold text-slate-900">Company Audit Trail & Compliance Log</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable system logs capturing every transaction, stock modification, login, and administrative action.
          </p>
        </div>

        <span className="px-3 py-1 bg-slate-900 text-amber-300 text-xs font-bold font-mono rounded-xl shrink-0">
          {logs.length} Total Audit Entries
        </span>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search audit trail by user, action, or details..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {['ALL', 'SALE', 'STOCK', 'TRANSFER', 'BRANCH', 'LOGIN'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px]">
              <tr>
                <th className="p-4">Timestamp</th>
                <th className="p-4">Staff Member</th>
                <th className="p-4">Branch Location</th>
                <th className="p-4">System Action</th>
                <th className="p-4">Transaction / Event Details</th>
                <th className="p-4">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-mono text-slate-500">{l.timestamp}</td>
                  <td className="p-4">
                    <p className="font-bold text-slate-900">{l.userName}</p>
                    <p className="text-[10px] text-slate-500 font-mono">ID: {l.userId}</p>
                  </td>
                  <td className="p-4 text-slate-700 font-medium">📍 {l.branchName || 'Central'}</td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 text-amber-300 font-mono">
                      {l.action}
                    </span>
                  </td>
                  <td className="p-4 text-slate-800 font-medium max-w-xs">{l.details}</td>
                  <td className="p-4 font-mono text-slate-400">{l.ipAddress || '192.168.1.1'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
