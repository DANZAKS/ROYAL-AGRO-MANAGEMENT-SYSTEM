import React from 'react';
import { Bell, X, AlertTriangle, ArrowRightLeft, Check, CheckCheck } from 'lucide-react';
import { Notification } from '../../types';

interface NotificationCenterProps {
  notifications: Notification[];
  isOpen: boolean;
  onClose: () => void;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications = [],
  isOpen,
  onClose,
  onMarkAsRead,
  onMarkAllAsRead
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end">
      <div className="bg-white w-full max-w-md h-full shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">System Alerts & Notifications</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onMarkAllAsRead}
              className="text-[10px] font-bold text-emerald-700 hover:underline flex items-center gap-1"
            >
              <CheckCheck className="w-3.5 h-3.5" /> Mark all read
            </button>
            <button onClick={onClose} className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => onMarkAsRead(n.id)}
              className={`p-3.5 rounded-2xl border text-xs transition-all cursor-pointer ${
                n.isRead
                  ? 'bg-slate-50 border-slate-200/80 opacity-75'
                  : 'bg-emerald-50/50 border-emerald-200/80 shadow-2xs'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-bold text-slate-900">{n.title}</span>
                <span className="text-[10px] text-slate-400 shrink-0">{n.timestamp}</span>
              </div>
              <p className="text-slate-600 mt-1">{n.message}</p>
            </div>
          ))}

          {notifications.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-xs">
              No notifications at this time.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
