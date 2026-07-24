import React, { useState } from 'react';
import {
  Building2,
  Bell,
  UserCheck,
  ChevronDown,
  Calendar,
  CheckCircle2,
  X,
  Menu
} from 'lucide-react';
import { User, Branch, DateFilterOption } from '../../types';

interface HeaderProps {
  currentUser: User;
  allUsers?: User[];
  branches?: Branch[];
  activeBranch?: Branch | null;
  selectedBranchId?: string | null;
  onSelectBranch: (branchId: string | 'ALL') => void;
  onSwitchUser?: (user: User) => void;
  unreadNotifCount?: number;
  unreadNotificationCount?: number;
  onOpenNotifications: () => void;
  dateFilter?: DateFilterOption | string;
  selectedDateFilter?: DateFilterOption | string;
  setDateFilter?: (filter: DateFilterOption) => void;
  onSelectDateFilter?: (filter: DateFilterOption) => void;
  collapsed?: boolean;
  onOpenProfile?: () => void;
  onOpenProfileModal?: () => void;
  onOpenLoginModal?: () => void;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  allUsers = [],
  branches = [],
  activeBranch,
  selectedBranchId,
  onSelectBranch,
  onSwitchUser,
  unreadNotifCount,
  unreadNotificationCount,
  onOpenNotifications,
  dateFilter,
  selectedDateFilter,
  setDateFilter,
  onSelectDateFilter,
  collapsed = false,
  onOpenProfile,
  onOpenProfileModal,
  onOpenLoginModal,
  onToggleMobileMenu
}) => {
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
  const isCEO = currentUser?.role === 'CEO';

  const unreadCount = unreadNotifCount ?? unreadNotificationCount ?? 0;
  const currentDateFilter = dateFilter ?? selectedDateFilter ?? 'THIS_MONTH';

  const handleDateChange = (val: string) => {
    if (setDateFilter) setDateFilter(val as DateFilterOption);
    if (onSelectDateFilter) onSelectDateFilter(val as DateFilterOption);
  };

  const handleProfileClick = () => {
    if (onOpenProfile) onOpenProfile();
    else if (onOpenProfileModal) onOpenProfileModal();
  };

  const activeBranchId = activeBranch?.id || selectedBranchId || 'ALL';

  return (
    <header
      className={`fixed top-0 right-0 z-20 h-16 bg-white border-b border-stone-200 transition-all duration-300 flex items-center justify-between px-3 sm:px-6 shadow-xs left-0 ${
        collapsed ? 'lg:left-20' : 'lg:left-64'
      }`}
    >
      {/* Left Section: Mobile Hamburger Toggle, Active Branch & Date Filter */}
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 rounded-xl text-stone-700 hover:bg-stone-100 transition-colors shrink-0"
          aria-label="Toggle navigation menu"
          title="Open Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 bg-stone-100 hover:bg-stone-200/80 px-2.5 sm:px-3 py-1.5 rounded-lg border border-stone-200 text-xs text-stone-700 transition-colors max-w-[160px] xs:max-w-[200px] sm:max-w-none">
          <Building2 className="w-4 h-4 text-[#7E9D73] shrink-0" />
          <span className="font-bold text-stone-800 hidden sm:inline">Branch:</span>
          {isCEO ? (
            <select
              value={activeBranchId}
              onChange={(e) => onSelectBranch(e.target.value)}
              className="bg-transparent font-semibold text-stone-800 text-xs focus:outline-none cursor-pointer py-0.5 pr-1 truncate"
            >
              <option value="ALL">🌐 All Branches</option>
              {(branches || []).map((b) => (
                <option key={b.id} value={b.id}>
                  📍 {b.name} ({b.state})
                </option>
              ))}
            </select>
          ) : (
            <span className="font-semibold text-stone-800 truncate">
              {activeBranch ? `${activeBranch.name}` : 'Unassigned'}
            </span>
          )}
        </div>

        {/* Global Date Range Filter */}
        <div className="hidden sm:flex items-center gap-1.5 bg-stone-50 px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs shrink-0">
          <Calendar className="w-3.5 h-3.5 text-stone-500 shrink-0" />
          <select
            value={currentDateFilter}
            onChange={(e) => handleDateChange(e.target.value)}
            className="bg-transparent text-stone-700 font-semibold text-xs focus:outline-none cursor-pointer"
          >
            <option value="TODAY">Today</option>
            <option value="THIS_WEEK">This Week</option>
            <option value="THIS_MONTH">This Month</option>
            <option value="THIS_YEAR">This Year</option>
            <option value="ALL">All Time</option>
          </select>
        </div>
      </div>

      {/* Right Section: Quick Role Switcher, Notification Bell, User Avatar */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {/* Quick Demo Role Switcher Button */}
        <div className="relative">
          <button
            onClick={() => {
              if (onOpenLoginModal && allUsers.length === 0) {
                onOpenLoginModal();
              } else {
                setShowRoleSwitcher(!showRoleSwitcher);
              }
            }}
            className="flex items-center gap-1.5 bg-[#1B3022] hover:bg-[#2D4536] text-white px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-2xs transition-colors"
            title="Switch actor role for testing"
          >
            <UserCheck className="w-4 h-4 text-[#7E9D73] shrink-0" />
            <span className="hidden md:inline">Role Switcher</span>
            <ChevronDown className="w-3.5 h-3.5 text-stone-300 shrink-0" />
          </button>

          {/* Role Switcher Dropdown */}
          {showRoleSwitcher && (
            <div className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-xl border border-stone-200 py-2 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-3 py-2 border-b border-stone-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-stone-800">Switch Demo Account</p>
                  <p className="text-[10px] text-stone-500">Test role-based permissions</p>
                </div>
                <button
                  onClick={() => setShowRoleSwitcher(false)}
                  className="p-1 rounded-md text-stone-400 hover:bg-stone-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="py-1 max-h-64 overflow-y-auto custom-scrollbar">
                {(allUsers || []).map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      if (onSwitchUser) onSwitchUser(u);
                      setShowRoleSwitcher(false);
                    }}
                    className={`w-full text-left px-3 py-2 hover:bg-stone-50 flex items-center justify-between transition-colors ${
                      currentUser?.id === u.id ? 'bg-[#7E9D73]/10 font-bold' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={u.avatarUrl || u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100'}
                        alt={u.name}
                        className="w-7 h-7 rounded-full object-cover ring-1 ring-stone-200 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-stone-800 truncate">{u.name}</p>
                        <p className="text-[10px] text-stone-500 truncate">{u.role} • {u.branchName || 'Central'}</p>
                      </div>
                    </div>
                    {currentUser?.id === u.id && (
                      <CheckCircle2 className="w-4 h-4 text-[#7E9D73] shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Notification Bell */}
        <button
          onClick={onOpenNotifications}
          className="relative p-2 rounded-lg text-stone-600 hover:bg-stone-100 transition-colors"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* User Profile Avatar */}
        <button
          onClick={handleProfileClick}
          className="flex items-center gap-2 p-1 hover:bg-stone-100 rounded-lg transition-colors"
          title="View Profile"
        >
          <img
            src={currentUser?.avatarUrl || currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100'}
            alt={currentUser?.name || 'User'}
            className="w-8 h-8 rounded-full object-cover ring-2 ring-[#7E9D73]"
          />
          <span className="hidden xl:inline text-xs font-bold text-stone-800 max-w-[100px] truncate">
            {currentUser?.name}
          </span>
        </button>
      </div>
    </header>
  );
};
