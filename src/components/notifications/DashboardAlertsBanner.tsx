import React from 'react';
import {
  AlertTriangle,
  Boxes,
  Calendar,
  CreditCard,
  ArrowRightLeft,
  Truck,
  ExternalLink,
  ChevronRight,
  Bell,
  CheckCircle2,
  X
} from 'lucide-react';
import { NotificationItem, NotificationCategory } from '../../types';

interface DashboardAlertsBannerProps {
  notifications: NotificationItem[];
  branchId?: string | null;
  onNavigate?: (tab: string, payload?: any) => void;
  onOpenNotificationCenter?: () => void;
  onResolveNotification?: (id: string) => void;
}

export const DashboardAlertsBanner: React.FC<DashboardAlertsBannerProps> = ({
  notifications = [],
  branchId,
  onNavigate,
  onOpenNotificationCenter,
  onResolveNotification
}) => {
  // Filter active, unresolved alerts for this branch (or all if branchId is null/undefined/'ALL')
  const activeAlerts = notifications.filter((n) => {
    if (n.status === 'RESOLVED') return false;
    if (branchId && branchId !== 'ALL' && n.branchId && n.branchId !== branchId) return false;
    return n.priority === 'CRITICAL' || n.priority === 'HIGH';
  });

  if (activeAlerts.length === 0) return null;

  const criticalCount = activeAlerts.filter((n) => n.priority === 'CRITICAL').length;
  const highCount = activeAlerts.filter((n) => n.priority === 'HIGH').length;

  const getCategoryIcon = (cat: NotificationCategory) => {
    switch (cat) {
      case 'INVENTORY_LOW_STOCK':
        return <Boxes className="w-4 h-4 text-amber-600" />;
      case 'EXPIRY_ALERT':
        return <Calendar className="w-4 h-4 text-rose-600" />;
      case 'CUSTOMER_CREDIT':
        return <CreditCard className="w-4 h-4 text-purple-600" />;
      case 'BRANCH_TRANSFERS':
        return <ArrowRightLeft className="w-4 h-4 text-[#1B3022]" />;
      case 'PURCHASE_SUPPLIER':
        return <Truck className="w-4 h-4 text-blue-600" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
    }
  };

  return (
    <div className="bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-amber-500/10 border border-amber-300/80 rounded-2xl p-4 shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-800 flex items-center justify-center font-bold shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-700" />
          </div>
          <div>
            <h3 className="text-xs font-extrabold text-stone-900 uppercase tracking-wider flex items-center gap-2">
              <span>Operational Attention Needed</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-600 text-white font-mono font-bold">
                {activeAlerts.length} Action Items
              </span>
            </h3>
            <p className="text-[11px] text-stone-600">
              {criticalCount > 0 && (
                <strong className="text-rose-700 font-bold">{criticalCount} critical</strong>
              )}
              {criticalCount > 0 && highCount > 0 && ' and '}
              {highCount > 0 && (
                <strong className="text-amber-800 font-bold">{highCount} high priority</strong>
              )}{' '}
              alert(s) require intervention.
            </p>
          </div>
        </div>

        {onOpenNotificationCenter && (
          <button
            onClick={onOpenNotificationCenter}
            className="self-start md:self-auto px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-2xs"
          >
            <Bell className="w-3.5 h-3.5 text-[#7E9D73]" />
            <span>Open Notification Center</span>
            <ChevronRight className="w-3 h-3 text-stone-400" />
          </button>
        )}
      </div>

      {/* Grid of key alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {activeAlerts.slice(0, 3).map((alert) => (
          <div
            key={alert.id}
            className="bg-white/90 backdrop-blur-xs p-3 rounded-xl border border-stone-200/90 shadow-2xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-1 mb-1">
                <div className="flex items-center gap-1 text-[10px] font-bold text-stone-700">
                  {getCategoryIcon(alert.category)}
                  <span className="truncate max-w-[130px]">{alert.branchName || 'Branch'}</span>
                </div>
                <span
                  className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                    alert.priority === 'CRITICAL'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  {alert.priority}
                </span>
              </div>
              <h4 className="text-xs font-bold text-stone-800 line-clamp-1">{alert.title}</h4>
              <p className="text-[11px] text-stone-600 line-clamp-2 mt-0.5 leading-snug">
                {alert.message}
              </p>
            </div>

            <div className="mt-2 pt-2 border-t border-stone-100 flex items-center justify-between gap-2">
              {alert.actionTab && onNavigate ? (
                <button
                  onClick={() => onNavigate(alert.actionTab!, alert.actionPayload)}
                  className="text-[10px] font-extrabold text-[#1B3022] hover:text-[#2D4536] flex items-center gap-1 cursor-pointer"
                >
                  <ExternalLink className="w-3 h-3 text-[#7E9D73]" />
                  <span>{alert.actionLabel || 'Take Action'}</span>
                </button>
              ) : (
                <span></span>
              )}

              {onResolveNotification && (
                <button
                  onClick={() => onResolveNotification(alert.id)}
                  className="text-[10px] font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
                  title="Resolve"
                >
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Resolve</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
