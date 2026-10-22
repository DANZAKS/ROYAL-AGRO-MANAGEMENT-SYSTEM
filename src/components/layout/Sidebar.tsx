import React, { useState } from 'react';
import {
  LayoutDashboard,
  Building2,
  Boxes,
  ShoppingCart,
  Users,
  CreditCard,
  Truck,
  ArrowRightLeft,
  BarChart3,
  Undo2,
  ShieldCheck,
  UserCheck,
  Sprout,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sliders,
  CloudUpload,
  Wallet,
  Database,
  Award,
  Settings,
  X
} from 'lucide-react';
import { User, Branch, UserRole } from '../../types';

interface SidebarProps {
  currentUser: User;
  activeBranch?: Branch | null;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  setActiveTab?: (tab: string) => void;
  collapsed?: boolean;
  setCollapsed?: (collapsed: boolean) => void;
  unreadNotifCount?: number;
  onLogout?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  activeTab,
  onSelectTab,
  setActiveTab,
  onLogout,
  isMobileOpen = false,
  onCloseMobile
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleTabClick = (tab: string) => {
    onSelectTab(tab);
    if (setActiveTab) setActiveTab(tab);
    if (onCloseMobile) onCloseMobile();
  };

  const isCEO = currentUser?.role === 'CEO';
  const isManager = currentUser?.role === 'BRANCH_MANAGER' || isCEO;
  const isSales = currentUser?.role === 'SALES_STAFF' || currentUser?.role === 'SALES_CASHIER' || isCEO || isManager;
  const isInventory = currentUser?.role === 'INVENTORY_OFFICER' || isCEO || isManager;

  const mainNavItems = [
    {
      id: isCEO ? 'CEO_DASHBOARD' : 'BRANCH_DASHBOARD',
      label: isCEO ? 'CEO Dashboard' : 'Branch Dashboard',
      icon: LayoutDashboard,
      show: true
    },
    {
      id: 'POS',
      label: 'Point of Sale (POS)',
      icon: ShoppingCart,
      show: isSales
    },
    {
      id: 'PRODUCTS',
      label: 'Seeds & Products',
      icon: Sprout,
      show: true
    },
    {
      id: 'INVENTORY',
      label: 'Branch Inventory',
      icon: Boxes,
      show: isInventory
    },
    {
      id: 'TRANSFERS',
      label: 'Transfers & Reordering',
      icon: ArrowRightLeft,
      show: isInventory || isCEO
    },
    {
      id: 'BRANCHES',
      label: 'Multi-Branch Hub',
      icon: Building2,
      show: isCEO
    },
    {
      id: 'CUSTOMERS',
      label: 'Farmers Directory',
      icon: Users,
      show: isSales || isCEO
    },
    {
      id: 'CREDIT_MANAGEMENT',
      label: 'Credit & Receivables',
      icon: CreditCard,
      show: true
    },
    {
      id: 'RETURNS',
      label: 'Sales Returns',
      icon: Undo2,
      show: true
    },
    {
      id: 'SUPPLIERS',
      label: 'Suppliers & Receiving',
      icon: Truck,
      show: isInventory || isCEO
    },
    {
      id: 'FINANCE',
      label: 'Financials & Cashbook',
      icon: Wallet,
      show: true
    },
    {
      id: 'EXPENSES',
      label: 'Branch Expenses',
      icon: Sliders,
      show: isManager
    },
    {
      id: 'REPORTS',
      label: 'Reports & Analytics',
      icon: BarChart3,
      show: isManager || isSales || isInventory
    },
    {
      id: 'USERS',
      label: 'Staff Management',
      icon: UserCheck,
      show: isCEO
    },
    {
      id: 'STAFF_PERFORMANCE',
      label: 'Attendance & Commissions',
      icon: Award,
      show: true
    },
    {
      id: 'AUDIT_LOGS',
      label: 'Audit Trail System',
      icon: ShieldCheck,
      show: isCEO
    },
    {
      id: 'BACKUP_RECOVERY',
      label: 'Backup & Recovery',
      icon: Database,
      show: isCEO
    },
    {
      id: 'SETTINGS',
      label: 'System Settings',
      icon: Settings,
      show: isCEO || isManager
    },
    {
      id: 'SYNC_CENTER',
      label: 'Synchronization Center',
      icon: CloudUpload,
      show: true
    }
  ];

  const roleLabelMap: Record<UserRole, string> = {
    CEO: 'CEO / Super Admin',
    BRANCH_MANAGER: 'Branch Manager',
    SALES_STAFF: 'Sales Staff',
    SALES_CASHIER: 'Sales Cashier',
    INVENTORY_OFFICER: 'Inventory Officer'
  };

  return (
    <>
      {/* Mobile Drawer Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs z-30 lg:hidden transition-opacity"
        />
      )}

      {/* Main Sidebar Container */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 bg-[#1B3022] text-stone-200 flex flex-col transition-all duration-300 border-r border-white/10 shrink-0 h-full ${
          isMobileOpen ? 'translate-x-0 w-72 max-w-[85vw] shadow-2xl' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-white/10 bg-black/10 shrink-0">
          {(!isCollapsed || isMobileOpen) && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#7E9D73] flex items-center justify-center text-[#1B3022] font-bold text-xl shadow-xs">
                <Sprout className="w-5 h-5 text-[#1B3022]" />
              </div>
              <div>
                <h1 className="font-extrabold text-white text-base tracking-tight leading-none">
                  ROYAL AGRO
                </h1>
                <p className="text-[10px] font-semibold text-[#7E9D73] tracking-widest uppercase mt-0.5">
                  Management System
                </p>
              </div>
            </div>
          )}

          {isCollapsed && !isMobileOpen && (
            <div className="w-10 h-10 mx-auto rounded-xl bg-[#7E9D73] flex items-center justify-center text-[#1B3022] shadow-xs">
              <Sprout className="w-6 h-6 text-[#1B3022]" />
            </div>
          )}

          {/* Desktop Collapse Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-white/10 transition-colors hidden lg:flex"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>

          {/* Mobile Close Button */}
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-stone-300 hover:text-white hover:bg-white/10 transition-colors lg:hidden"
            title="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Profile Summary Card */}
        {(!isCollapsed || isMobileOpen) ? (
          <div className="p-3 mx-3 my-3 rounded-xl bg-black/25 border border-white/10 flex items-center gap-3 shrink-0">
            <div className="relative shrink-0">
              <img
                src={currentUser?.avatarUrl || currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100'}
                alt={currentUser?.name || 'User'}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-[#7E9D73]"
              />
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#E07A5F] text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-xs">
                ★
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{currentUser?.name || 'Guest'}</p>
              <p className="text-[10px] text-[#7E9D73] font-medium truncate mt-0.5">
                {currentUser?.role ? roleLabelMap[currentUser.role] : 'Staff'}
              </p>
              <p className="text-[10px] text-stone-400 truncate flex items-center gap-1 mt-0.5">
                <Building2 className="w-3 h-3 text-[#7E9D73]" />
                {currentUser?.role === 'CEO' ? 'Central HQ' : currentUser?.branchName || 'Branch'}
              </p>
            </div>
          </div>
        ) : (
          <div className="py-3 flex justify-center border-b border-white/10 shrink-0">
            <img
              src={currentUser?.avatarUrl || currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100'}
              alt={currentUser?.name || 'User'}
              className="w-9 h-9 rounded-full object-cover ring-2 ring-[#7E9D73]"
              title={`${currentUser?.name || 'User'} (${currentUser?.role || ''})`}
            />
          </div>
        )}

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1 custom-scrollbar">
          {(!isCollapsed || isMobileOpen) && (
            <div className="text-[10px] uppercase font-bold text-stone-400 tracking-widest px-3 pt-2 pb-1">
              Menu Navigation
            </div>
          )}
          {mainNavItems
            .filter((item) => item.show)
            .map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all group ${
                    isActive
                      ? 'bg-[#7E9D73]/20 text-[#A3C299] font-bold shadow-2xs border border-[#7E9D73]/30'
                      : 'text-stone-300 hover:text-white hover:bg-white/10'
                  }`}
                  title={isCollapsed && !isMobileOpen ? item.label : undefined}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-[#7E9D73]' : 'text-stone-400 group-hover:text-[#7E9D73]'
                    }`}
                  />
                  {(!isCollapsed || isMobileOpen) && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
        </nav>

        {/* Footer / Sign Out */}
        {onLogout && (
          <div className="p-3 border-t border-white/10 bg-black/20 shrink-0">
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-rose-300 hover:text-white hover:bg-rose-900/40 border border-transparent hover:border-rose-700/30 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              {(!isCollapsed || isMobileOpen) && <span>Sign Out</span>}
            </button>
          </div>
        )}
      </aside>
    </>
  );
};
