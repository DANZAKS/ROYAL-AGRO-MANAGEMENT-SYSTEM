import React, { useState } from 'react';
import {
  Building2,
  Sliders,
  FileText,
  Upload,
  History,
  ShieldCheck,
  Building,
  Store,
  Layers
} from 'lucide-react';
import {
  AppState,
  CompanySettings,
  BusinessRulesSettings,
  Branch,
  Product,
  Customer,
  Supplier,
  BranchInventory,
  StockMovement,
  DataImportRecord,
  User
} from '../../types';
import { CompanyProfileTab } from './CompanyProfileTab';
import { BranchConfigTab } from './BranchConfigTab';
import { BusinessRulesTab } from './BusinessRulesTab';
import { ReceiptNumberingTab } from './ReceiptNumberingTab';
import { BulkImportTab } from './BulkImportTab';
import { ImportHistoryTab } from './ImportHistoryTab';
import { SettingsAuditTab } from './SettingsAuditTab';
import { DEFAULT_COMPANY_SETTINGS, DEFAULT_BUSINESS_RULES } from '../../data/initialData';

interface SettingsLayoutProps {
  appState: AppState;
  currentUser: User;
  onUpdateCompanySettings: (updated: CompanySettings, auditNote: string) => void;
  onUpdateBusinessRules: (updated: BusinessRulesSettings, auditNote: string) => void;
  onAddBranch: (branch: Branch) => void;
  onUpdateBranch: (branch: Branch, auditNote?: string) => void;
  onToggleBranchStatus: (branchId: string, reason?: string) => void;
  onCommitProducts: (newProducts: Product[], importRecord: DataImportRecord) => void;
  onCommitCustomers: (newCustomers: Customer[], importRecord: DataImportRecord) => void;
  onCommitSuppliers: (newSuppliers: Supplier[], importRecord: DataImportRecord) => void;
  onCommitOpeningStock: (
    updatedInventory: BranchInventory[],
    movements: StockMovement[],
    importRecord: DataImportRecord
  ) => void;
}

export type SettingsTabId =
  | 'COMPANY'
  | 'BRANCHES'
  | 'BUSINESS_RULES'
  | 'RECEIPT_NUMBERING'
  | 'BULK_IMPORT'
  | 'IMPORT_HISTORY'
  | 'AUDIT_TRAIL';

export const SettingsLayout: React.FC<SettingsLayoutProps> = ({
  appState,
  currentUser,
  onUpdateCompanySettings,
  onUpdateBusinessRules,
  onAddBranch,
  onUpdateBranch,
  onToggleBranchStatus,
  onCommitProducts,
  onCommitCustomers,
  onCommitSuppliers,
  onCommitOpeningStock
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTabId>('COMPANY');

  const companySettings = appState.companySettings || DEFAULT_COMPANY_SETTINGS;
  const businessRules = appState.businessRules || DEFAULT_BUSINESS_RULES;
  const dataImports = appState.dataImports || [];

  const isCEO = currentUser.role === 'CEO';

  const tabs = [
    {
      id: 'COMPANY' as SettingsTabId,
      label: 'Company Profile',
      icon: Building2,
      description: 'Identity, contacts, currency & VAT'
    },
    {
      id: 'BRANCHES' as SettingsTabId,
      label: 'Branch Configuration',
      icon: Store,
      description: 'Branch details & safe deactivation'
    },
    {
      id: 'BUSINESS_RULES' as SettingsTabId,
      label: 'Business Rules & Limits',
      icon: Sliders,
      description: 'Stock thresholds, credit & discounts'
    },
    {
      id: 'RECEIPT_NUMBERING' as SettingsTabId,
      label: 'Receipt & Numbering',
      icon: FileText,
      description: 'Prefixes, templates & live preview'
    },
    {
      id: 'BULK_IMPORT' as SettingsTabId,
      label: 'Bulk Data Import',
      icon: Upload,
      description: 'Products, customers, opening stock CSV'
    },
    {
      id: 'IMPORT_HISTORY' as SettingsTabId,
      label: 'Import History',
      icon: History,
      description: 'Batches, row counts & metrics'
    },
    {
      id: 'AUDIT_TRAIL' as SettingsTabId,
      label: 'Settings Audit Trail',
      icon: ShieldCheck,
      description: 'Configuration change logs & diffs'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Module Title Banner */}
      <div className="bg-[#1B3022] text-white p-6 rounded-2xl shadow-sm border border-emerald-900/40 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Module 19
              </span>
              <span className="text-xs text-stone-300">• Corporate Governance & Data Import Engine</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
              System Settings & Business Configuration
            </h1>
            <p className="text-stone-300 text-xs mt-1 max-w-2xl">
              Centralized corporate configuration, multi-branch policy enforcement, transaction
              numbering formats, and controlled CSV data onboarding for Royal Agro Nigeria.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-black/25 px-4 py-2.5 rounded-xl border border-white/10 shrink-0">
            <Building2 className="w-5 h-5 text-emerald-400" />
            <div className="text-xs">
              <p className="font-bold text-white leading-tight">{companySettings.companyName}</p>
              <p className="text-stone-400 font-mono text-[10px]">
                {companySettings.currencySymbol} ({companySettings.currencyCode}) • {companySettings.timezone}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-stone-200">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'bg-white text-stone-600 hover:text-stone-900 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-stone-500'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Tab Content */}
      <div className="animate-in fade-in duration-200">
        {activeTab === 'COMPANY' && (
          <CompanyProfileTab
            settings={companySettings}
            currentUser={currentUser}
            onSaveSettings={onUpdateCompanySettings}
          />
        )}

        {activeTab === 'BRANCHES' && (
          <BranchConfigTab
            branches={appState.branches}
            users={appState.users}
            sales={appState.sales}
            inventory={appState.inventory}
            transfers={appState.transfers}
            movements={appState.stockMovements || appState.movements || []}
            currentUser={currentUser}
            onAddBranch={onAddBranch}
            onUpdateBranch={onUpdateBranch}
            onToggleBranchStatus={onToggleBranchStatus}
          />
        )}

        {activeTab === 'BUSINESS_RULES' && (
          <BusinessRulesTab
            businessRules={businessRules}
            currentUser={currentUser}
            onSaveBusinessRules={onUpdateBusinessRules}
          />
        )}

        {activeTab === 'RECEIPT_NUMBERING' && (
          <ReceiptNumberingTab
            companySettings={companySettings}
            businessRules={businessRules}
            currentUser={currentUser}
            onSaveCompanySettings={onUpdateCompanySettings}
            onSaveBusinessRules={onUpdateBusinessRules}
          />
        )}

        {activeTab === 'BULK_IMPORT' && (
          <BulkImportTab
            products={appState.products}
            customers={appState.customers}
            suppliers={appState.suppliers}
            branches={appState.branches}
            inventory={appState.inventory}
            currentUser={currentUser}
            onCommitProducts={onCommitProducts}
            onCommitCustomers={onCommitCustomers}
            onCommitSuppliers={onCommitSuppliers}
            onCommitOpeningStock={onCommitOpeningStock}
          />
        )}

        {activeTab === 'IMPORT_HISTORY' && (
          <ImportHistoryTab
            dataImports={dataImports}
            branches={appState.branches}
          />
        )}

        {activeTab === 'AUDIT_TRAIL' && (
          <SettingsAuditTab auditLogs={appState.auditLogs || []} />
        )}
      </div>
    </div>
  );
};
