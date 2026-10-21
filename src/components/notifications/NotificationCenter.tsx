import React, { useState, useMemo } from 'react';
import {
  Bell,
  X,
  AlertTriangle,
  ArrowRightLeft,
  Check,
  CheckCheck,
  Filter,
  Search,
  Volume2,
  VolumeX,
  Sliders,
  ExternalLink,
  ShieldAlert,
  Clock,
  Sparkles,
  Calendar,
  CreditCard,
  Truck,
  Boxes,
  Wallet,
  CloudUpload,
  UserCheck,
  CheckCircle2,
  Trash2,
  RotateCcw
} from 'lucide-react';
import {
  NotificationItem,
  NotificationCategory,
  NotificationPriority,
  NotificationStatus,
  NotificationSettings,
  Branch
} from '../../types';
import {
  playNotificationChime,
  requestPushNotificationPermission
} from '../../services/notificationService';

interface NotificationCenterProps {
  notifications: NotificationItem[];
  isOpen: boolean;
  onClose: () => void;
  onMarkAsRead: (id: string) => void;
  onMarkAsUnread?: (id: string) => void;
  onMarkAllAsRead: () => void;
  onResolveNotification?: (id: string) => void;
  onDismissNotification?: (id: string) => void;
  onClearAll?: () => void;
  onNavigate?: (tab: string, payload?: any) => void;
  branches?: Branch[];
  settings?: NotificationSettings;
  onUpdateSettings?: (settings: NotificationSettings) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications = [],
  isOpen,
  onClose,
  onMarkAsRead,
  onMarkAsUnread,
  onMarkAllAsRead,
  onResolveNotification,
  onDismissNotification,
  onClearAll,
  onNavigate,
  branches = [],
  settings,
  onUpdateSettings
}) => {
  const [activeTab, setActiveTab] = useState<'ALL' | 'UNREAD' | 'URGENT' | 'RESOLVED' | 'SETTINGS'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Local settings copy for edits
  const [localSettings, setLocalSettings] = useState<NotificationSettings>(() => {
    return (
      settings || {
        soundEnabled: true,
        browserPushEnabled: false,
        significantSaleThreshold: 500000,
        cashDiscrepancyThreshold: 5000,
        expiryWarningDays: [90, 60, 30, 7],
        enabledCategories: {
          INVENTORY_LOW_STOCK: true,
          EXPIRY_ALERT: true,
          CUSTOMER_CREDIT: true,
          SALES_RETURNS: true,
          PURCHASE_SUPPLIER: true,
          BRANCH_TRANSFERS: true,
          EXPENSE_RECONCILIATION: true,
          SECURITY_USERS: true,
          SYNC_OFFLINE: true,
          SYSTEM_ANNOUNCEMENT: true
        },
        mutedBranches: []
      }
    );
  });

  const [pushStatus, setPushStatus] = useState<string>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'unsupported';
  });

  // Filtered Notifications - hooks must be called unconditionally before any early returns
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      const isUnread = !n.isRead && n.status !== 'READ' && n.status !== 'RESOLVED';
      const isUrgent = (n.priority === 'CRITICAL' || n.priority === 'HIGH') && n.status !== 'RESOLVED';
      const isResolved = n.status === 'RESOLVED';

      // Tab Filter
      if (activeTab === 'UNREAD' && !isUnread) return false;
      if (activeTab === 'URGENT' && !isUrgent) return false;
      if (activeTab === 'RESOLVED' && !isResolved) return false;

      // Category Filter
      if (selectedCategory !== 'ALL' && n.category !== selectedCategory) return false;

      // Branch Filter
      if (selectedBranchId !== 'ALL' && n.branchId && n.branchId !== selectedBranchId) return false;

      // Priority Filter
      if (selectedPriority !== 'ALL' && n.priority !== selectedPriority) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          (n.title && n.title.toLowerCase().includes(q)) ||
          (n.message && n.message.toLowerCase().includes(q)) ||
          (n.branchName && n.branchName.toLowerCase().includes(q)) ||
          (n.referenceId && n.referenceId.toLowerCase().includes(q));
        if (!matches) return false;
      }

      return true;
    });
  }, [notifications, activeTab, selectedCategory, selectedBranchId, selectedPriority, searchQuery]);

  if (!isOpen) return null;

  // Unread count
  const unreadCount = notifications.filter((n) => !n.isRead && n.status !== 'READ' && n.status !== 'RESOLVED').length;
  const urgentCount = notifications.filter(
    (n) => (n.priority === 'CRITICAL' || n.priority === 'HIGH') && n.status !== 'RESOLVED'
  ).length;

  const handleActionClick = (n: NotificationItem) => {
    if (onMarkAsRead) onMarkAsRead(n.id);
    if (n.actionTab && onNavigate) {
      onNavigate(n.actionTab, n.actionPayload);
      onClose();
    }
  };

  const handleRequestPush = async () => {
    const res = await requestPushNotificationPermission();
    setPushStatus(res);
    if (res === 'granted' && onUpdateSettings) {
      const updated = { ...localSettings, browserPushEnabled: true };
      setLocalSettings(updated);
      onUpdateSettings(updated);
    }
  };

  const handleSaveSettings = () => {
    if (onUpdateSettings) {
      onUpdateSettings(localSettings);
    }
    setActiveTab('ALL');
  };

  const formatTimestamp = (ts?: string) => {
    if (!ts) return 'Just now';
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return ts;
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    } catch {
      return ts;
    }
  };

  const getPriorityBadge = (p: NotificationPriority) => {
    switch (p) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span> CRITICAL
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span> HIGH
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
            MEDIUM
          </span>
        );
      case 'LOW':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 text-stone-700 border border-stone-200">
            INFO
          </span>
        );
    }
  };

  const getCategoryIcon = (cat: NotificationCategory) => {
    switch (cat) {
      case 'INVENTORY_LOW_STOCK':
        return <Boxes className="w-3.5 h-3.5 text-amber-600" />;
      case 'EXPIRY_ALERT':
        return <Calendar className="w-3.5 h-3.5 text-rose-600" />;
      case 'CUSTOMER_CREDIT':
        return <CreditCard className="w-3.5 h-3.5 text-purple-600" />;
      case 'BRANCH_TRANSFERS':
        return <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-600" />;
      case 'PURCHASE_SUPPLIER':
        return <Truck className="w-3.5 h-3.5 text-blue-600" />;
      case 'EXPENSE_RECONCILIATION':
        return <Wallet className="w-3.5 h-3.5 text-indigo-600" />;
      case 'SECURITY_USERS':
        return <UserCheck className="w-3.5 h-3.5 text-stone-700" />;
      case 'SYNC_OFFLINE':
        return <CloudUpload className="w-3.5 h-3.5 text-amber-700" />;
      default:
        return <Bell className="w-3.5 h-3.5 text-stone-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex justify-end">
      <div className="bg-white w-full max-w-xl h-full shadow-2xl border-l border-stone-200 flex flex-col animate-in slide-in-from-right duration-200">
        {/* Top Header */}
        <div className="p-4 bg-[#1B3022] text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#7E9D73]/20 flex items-center justify-center text-[#7E9D73]">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">Enterprise Alerts & Notifications</h2>
              <p className="text-[11px] text-stone-300">
                {unreadCount > 0 ? (
                  <span>
                    <strong className="text-[#7E9D73] font-bold">{unreadCount} unread</strong> alert(s) across branches
                  </span>
                ) : (
                  <span>All caught up • System running normally</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab(activeTab === 'SETTINGS' ? 'ALL' : 'SETTINGS')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                activeTab === 'SETTINGS'
                  ? 'bg-[#7E9D73] text-[#1B3022]'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
              title="Notification Configuration & Preferences"
            >
              <Sliders className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Close panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-stone-200 bg-stone-50 px-4 flex items-center justify-between shrink-0 overflow-x-auto custom-scrollbar">
          <div className="flex items-center gap-1 py-1.5">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'ALL'
                  ? 'bg-[#1B3022] text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
              }`}
            >
              All ({notifications.length})
            </button>

            <button
              onClick={() => setActiveTab('UNREAD')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all relative ${
                activeTab === 'UNREAD'
                  ? 'bg-[#1B3022] text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
              }`}
            >
              Unread
              {unreadCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 bg-rose-500 text-white text-[10px] rounded-full font-bold">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('URGENT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all relative ${
                activeTab === 'URGENT'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'text-rose-700 hover:bg-rose-50'
              }`}
            >
              Urgent ({urgentCount})
            </button>

            <button
              onClick={() => setActiveTab('RESOLVED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'RESOLVED'
                  ? 'bg-[#1B3022] text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
              }`}
            >
              Resolved
            </button>
          </div>

          <div className="flex items-center gap-2 py-1.5">
            {activeTab !== 'SETTINGS' && (
              <>
                <button
                  onClick={onMarkAllAsRead}
                  className="text-[11px] font-bold text-[#1B3022] hover:underline flex items-center gap-1 cursor-pointer"
                  title="Mark all notifications as read"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-[#7E9D73]" />
                  <span className="hidden sm:inline">Mark all read</span>
                </button>
                {onClearAll && (
                  <button
                    onClick={onClearAll}
                    className="text-[11px] font-semibold text-rose-600 hover:underline flex items-center gap-1 cursor-pointer ml-1"
                    title="Clear dismissed notifications"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Content Body */}
        {activeTab === 'SETTINGS' ? (
          /* Preferences & Thresholds Configuration Panel */
          <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar text-xs">
            <div>
              <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#7E9D73]" /> Notification Preferences & Thresholds
              </h3>
              <p className="text-stone-500 text-[11px] mt-0.5">
                Customize operational notification triggers, audio feedback, and browser alerts.
              </p>
            </div>

            {/* Channels & Sound */}
            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-3">
              <h4 className="font-bold text-stone-800 text-xs">Delivery Channels & Chimes</h4>

              <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-stone-200">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-emerald-50 text-emerald-800">
                    <Volume2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-stone-800">Sound Chime Alerts</p>
                    <p className="text-[11px] text-stone-500">Play two-tone synthesized chime on Critical and High alerts</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => playNotificationChime('HIGH')}
                    className="px-2 py-1 text-[10px] font-bold bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-md border border-stone-200"
                  >
                    Test Chime
                  </button>
                  <input
                    type="checkbox"
                    checked={localSettings.soundEnabled}
                    onChange={(e) => setLocalSettings({ ...localSettings, soundEnabled: e.target.checked })}
                    className="w-4 h-4 text-[#1B3022] rounded accent-[#1B3022] cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-stone-200">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-blue-50 text-blue-800">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-stone-800">Browser / PWA Web Push</p>
                    <p className="text-[11px] text-stone-500">
                      Permission status: <strong className="uppercase font-mono">{pushStatus}</strong>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {pushStatus !== 'granted' && (
                    <button
                      type="button"
                      onClick={handleRequestPush}
                      className="px-2.5 py-1 text-[10px] font-bold bg-[#1B3022] text-white rounded-md hover:bg-[#2D4536]"
                    >
                      Request Permission
                    </button>
                  )}
                  <input
                    type="checkbox"
                    disabled={pushStatus !== 'granted'}
                    checked={localSettings.browserPushEnabled && pushStatus === 'granted'}
                    onChange={(e) => setLocalSettings({ ...localSettings, browserPushEnabled: e.target.checked })}
                    className="w-4 h-4 text-[#1B3022] rounded accent-[#1B3022] cursor-pointer disabled:opacity-40"
                  />
                </div>
              </div>
            </div>

            {/* Thresholds */}
            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-4">
              <h4 className="font-bold text-stone-800 text-xs">Alert Trigger Thresholds</h4>

              <div>
                <label className="block font-semibold text-stone-700 text-[11px] mb-1">
                  Significant Sale Threshold (₦)
                </label>
                <input
                  type="number"
                  min="50000"
                  step="50000"
                  value={localSettings.significantSaleThreshold}
                  onChange={(e) =>
                    setLocalSettings({ ...localSettings, significantSaleThreshold: Number(e.target.value) || 500000 })
                  }
                  className="w-full px-3 py-2 bg-white rounded-lg border border-stone-300 text-xs font-semibold text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#7E9D73]"
                />
                <p className="text-[10px] text-stone-500 mt-1">
                  Sales exceeding this total will generate immediate notification to managers.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 text-[11px] mb-1">
                  Cash Discrepancy Alert Threshold (₦)
                </label>
                <input
                  type="number"
                  min="500"
                  step="500"
                  value={localSettings.cashDiscrepancyThreshold}
                  onChange={(e) =>
                    setLocalSettings({ ...localSettings, cashDiscrepancyThreshold: Number(e.target.value) || 5000 })
                  }
                  className="w-full px-3 py-2 bg-white rounded-lg border border-stone-300 text-xs font-semibold text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#7E9D73]"
                />
                <p className="text-[10px] text-stone-500 mt-1">
                  Drawer reconciliations exceeding this variance will be flagged for investigation.
                </p>
              </div>
            </div>

            {/* Category Subscriptions */}
            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-3">
              <h4 className="font-bold text-stone-800 text-xs">Active Notification Categories</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { key: 'INVENTORY_LOW_STOCK', label: 'Low Stock & Reorders' },
                  { key: 'EXPIRY_ALERT', label: 'Expiry & Batch Tracking' },
                  { key: 'CUSTOMER_CREDIT', label: 'Farmer Credit & Overdue Debts' },
                  { key: 'BRANCH_TRANSFERS', label: 'Branch Transfers & Dispatch' },
                  { key: 'PURCHASE_SUPPLIER', label: 'Purchases & Goods Receiving' },
                  { key: 'EXPENSE_RECONCILIATION', label: 'Expenses & Cash Discrepancies' },
                  { key: 'SALES_RETURNS', label: 'Significant Sales & Refunds' },
                  { key: 'SECURITY_USERS', label: 'Security & Staff Activity' },
                  { key: 'SYNC_OFFLINE', label: 'Offline Sync Queue Backlog' },
                  { key: 'SYSTEM_ANNOUNCEMENT', label: 'System Announcements' }
                ].map((cat) => (
                  <label
                    key={cat.key}
                    className="flex items-center gap-2 p-2 bg-white rounded-lg border border-stone-200 cursor-pointer hover:bg-stone-100/50"
                  >
                    <input
                      type="checkbox"
                      checked={localSettings.enabledCategories[cat.key as NotificationCategory] !== false}
                      onChange={(e) =>
                        setLocalSettings({
                          ...localSettings,
                          enabledCategories: {
                            ...localSettings.enabledCategories,
                            [cat.key]: e.target.checked
                          }
                        })
                      }
                      className="w-3.5 h-3.5 text-[#1B3022] rounded accent-[#1B3022]"
                    />
                    <span className="text-[11px] font-semibold text-stone-700">{cat.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Save Buttons */}
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('ALL')}
                className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold rounded-xl text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSettings}
                className="px-5 py-2 bg-[#1B3022] hover:bg-[#2D4536] text-white font-bold rounded-xl text-xs shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Check className="w-4 h-4 text-[#7E9D73]" /> Save Preferences
              </button>
            </div>
          </div>
        ) : (
          /* Normal Notifications List View */
          <>
            {/* Filter Controls Bar */}
            <div className="p-3 bg-stone-100/80 border-b border-stone-200 space-y-2 shrink-0">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search notifications by title, reference, or note..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-[#7E9D73]"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Branch Filter */}
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-semibold text-stone-700 focus:outline-none cursor-pointer max-w-[140px] truncate"
                >
                  <option value="ALL">🌐 All Branches</option>
                  {(branches || []).map((b) => (
                    <option key={b.id} value={b.id}>
                      📍 {b.name}
                    </option>
                  ))}
                </select>

                {/* Priority Filter */}
                <select
                  value={selectedPriority}
                  onChange={(e) => setSelectedPriority(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-semibold text-stone-700 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Urgencies</option>
                  <option value="CRITICAL">🔴 Critical</option>
                  <option value="HIGH">🟠 High</option>
                  <option value="MEDIUM">🔵 Medium</option>
                  <option value="LOW">⚪ Info</option>
                </select>
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-[10px]">
                {[
                  { id: 'ALL', label: 'All Categories' },
                  { id: 'INVENTORY_LOW_STOCK', label: 'Low Stock' },
                  { id: 'EXPIRY_ALERT', label: 'Expiry Batches' },
                  { id: 'CUSTOMER_CREDIT', label: 'Credit & Debt' },
                  { id: 'BRANCH_TRANSFERS', label: 'Transfers' },
                  { id: 'PURCHASE_SUPPLIER', label: 'Purchases' },
                  { id: 'EXPENSE_RECONCILIATION', label: 'Finance' }
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-2.5 py-1 rounded-full whitespace-nowrap font-bold transition-all cursor-pointer ${
                      selectedCategory === cat.id
                        ? 'bg-[#1B3022] text-white shadow-2xs'
                        : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-200/50'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notifications Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {filteredNotifications.map((n) => {
                const isUnread = !n.isRead && n.status !== 'READ' && n.status !== 'RESOLVED';
                const isResolved = n.status === 'RESOLVED';

                return (
                  <div
                    key={n.id}
                    className={`p-3.5 rounded-2xl border transition-all text-xs ${
                      isResolved
                        ? 'bg-stone-50/70 border-stone-200 opacity-70'
                        : isUnread
                        ? 'bg-white border-[#7E9D73]/40 shadow-xs ring-1 ring-[#7E9D73]/20'
                        : 'bg-white border-stone-200'
                    }`}
                  >
                    {/* Header line: Priority, Category, Branch, Timestamp */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {getPriorityBadge(n.priority || 'MEDIUM')}
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 text-stone-700">
                          {getCategoryIcon(n.category)}
                          {n.category ? n.category.replace(/_/g, ' ') : 'ALERT'}
                        </span>
                        {n.branchName && (
                          <span className="text-[10px] text-stone-500 font-medium">
                            • {n.branchName}
                          </span>
                        )}
                      </div>

                      <span className="text-[10px] text-stone-400 shrink-0 font-mono">
                        {formatTimestamp(n.createdAt || n.timestamp)}
                      </span>
                    </div>

                    {/* Title & Message */}
                    <div className="mt-2">
                      <h4
                        className={`text-xs font-bold ${
                          isUnread ? 'text-stone-900' : 'text-stone-700'
                        }`}
                      >
                        {n.title}
                      </h4>
                      <p className="text-stone-600 mt-1 text-[11px] leading-relaxed">{n.message}</p>
                    </div>

                    {/* Resolution Stamp */}
                    {isResolved && (
                      <div className="mt-2 p-1.5 bg-emerald-50 text-emerald-800 rounded-lg text-[10px] font-semibold flex items-center gap-1.5 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>
                          Resolved {n.resolvedAt ? formatTimestamp(n.resolvedAt) : ''}{' '}
                          {n.resolvedByUserName ? `by ${n.resolvedByUserName}` : ''}
                        </span>
                      </div>
                    )}

                    {/* Footer Actions: Jump Button, Mark as Read / Unread, Resolve, Dismiss */}
                    <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        {n.actionTab && (
                          <button
                            onClick={() => handleActionClick(n)}
                            className="px-2.5 py-1 bg-[#1B3022] hover:bg-[#2D4536] text-white text-[10px] font-bold rounded-lg shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <ExternalLink className="w-3 h-3 text-[#7E9D73]" />
                            {n.actionLabel || 'Take Action'}
                          </button>
                        )}

                        {onResolveNotification && !isResolved && (
                          <button
                            onClick={() => onResolveNotification(n.id)}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-lg border border-emerald-200 transition-colors flex items-center gap-1 cursor-pointer"
                            title="Mark this alert as resolved"
                          >
                            <Check className="w-3 h-3 text-emerald-600" />
                            Resolve
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-stone-500">
                        {isUnread ? (
                          <button
                            onClick={() => onMarkAsRead(n.id)}
                            className="hover:text-stone-900 font-semibold cursor-pointer"
                          >
                            Mark Read
                          </button>
                        ) : (
                          onMarkAsUnread && (
                            <button
                              onClick={() => onMarkAsUnread(n.id)}
                              className="hover:text-stone-900 font-semibold cursor-pointer"
                            >
                              Mark Unread
                            </button>
                          )
                        )}

                        {onDismissNotification && (
                          <button
                            onClick={() => onDismissNotification(n.id)}
                            className="hover:text-rose-600 font-semibold cursor-pointer"
                            title="Dismiss notification"
                          >
                            Dismiss
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredNotifications.length === 0 && (
                <div className="text-center py-16 px-4">
                  <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-6 h-6 text-[#7E9D73]" />
                  </div>
                  <h4 className="text-xs font-bold text-stone-700">No Alerts Found</h4>
                  <p className="text-[11px] text-stone-400 mt-1 max-w-xs mx-auto">
                    {activeTab === 'URGENT'
                      ? 'No urgent or critical alerts requiring immediate action.'
                      : activeTab === 'UNREAD'
                      ? 'You have read all pending notifications.'
                      : 'No notifications match the active filter criteria.'}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
