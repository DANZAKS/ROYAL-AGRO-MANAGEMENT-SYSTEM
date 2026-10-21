import React, { useState } from 'react';
import {
  Sliders,
  Save,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  AlertTriangle,
  Boxes,
  Calendar,
  CreditCard,
  Percent,
  Truck,
  Info
} from 'lucide-react';
import { BusinessRulesSettings, User } from '../../types';

interface BusinessRulesTabProps {
  businessRules: BusinessRulesSettings;
  currentUser: User;
  onSaveBusinessRules: (updated: BusinessRulesSettings, changeNote: string) => void;
}

export const BusinessRulesTab: React.FC<BusinessRulesTabProps> = ({
  businessRules,
  currentUser,
  onSaveBusinessRules
}) => {
  const [formData, setFormData] = useState<BusinessRulesSettings>({ ...businessRules });
  const [isSaved, setIsSaved] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const isCEO = currentUser.role === 'CEO';

  const handleChange = (field: keyof BusinessRulesSettings, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
    setIsSaved(false);
    setValidationError(null);
  };

  const handleExpiryDaysChange = (valStr: string) => {
    const days = valStr
      .split(',')
      .map((d) => parseInt(d.trim(), 10))
      .filter((n) => !isNaN(n) && n > 0);
    handleChange('expiryWarningDays', days);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCEO) {
      setValidationError('Only CEO / Super Administrator can configure business rules and thresholds.');
      return;
    }

    // Validate discounts
    if (formData.cashierMaxDiscountPercent < 0 || formData.cashierMaxDiscountPercent > 100) {
      setValidationError('Cashier max discount must be between 0% and 100%.');
      return;
    }
    if (formData.managerMaxDiscountPercent < formData.cashierMaxDiscountPercent) {
      setValidationError('Manager discount limit must be greater than or equal to cashier limit.');
      return;
    }
    if (formData.lowStockDefaultThreshold < formData.criticalStockDefaultThreshold) {
      setValidationError('Low-stock warning threshold must be higher than critical threshold.');
      return;
    }

    onSaveBusinessRules(
      {
        ...formData,
        updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
        updatedByUserId: currentUser.id,
        updatedByUserName: currentUser.name
      },
      'Updated system business rules, credit authorization thresholds, discount ceilings, and inventory alerts.'
    );

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 4000);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Alert Banner */}
      {isSaved && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <p className="font-semibold text-sm">Business Rules Successfully Applied!</p>
            <p className="text-xs text-emerald-700">
              New thresholds and authorization rules are active immediately across POS and Inventory modules.
            </p>
          </div>
        </div>
      )}

      {validationError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-800 animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <p className="text-sm font-medium">{validationError}</p>
        </div>
      )}

      {/* Financial Immutability Notice */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3 text-blue-900 text-xs">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold">Prospective Application & Audit Rule</p>
          <p className="mt-0.5 text-blue-800">
            Changes to discount limits, credit ceilings, or stock thresholds apply strictly to new operations.
            Historical sales, past credit approvals, and existing commission receipts remain immutable and
            will not be recalculated or retroactively modified.
          </p>
        </div>
      </div>

      {/* 1. Inventory & Expiry Rules */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-stone-100 bg-stone-50/70 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-stone-900 text-base">Inventory Thresholds & Expiry Alerts</h3>
            <p className="text-xs text-stone-500">System-wide triggers for seed reordering and shelf-life monitoring</p>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wider">
              Default Low-Stock Warning (Units)
            </label>
            <input
              type="number"
              min="1"
              disabled={!isCEO}
              value={formData.lowStockDefaultThreshold}
              onChange={(e) => handleChange('lowStockDefaultThreshold', parseInt(e.target.value, 10) || 1)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 text-stone-900 text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-stone-100"
              placeholder="10"
              required
            />
            <p className="mt-1 text-[11px] text-stone-500">Triggers amber warning badge in inventory view</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wider">
              Critical Low-Stock Level (Units)
            </label>
            <input
              type="number"
              min="0"
              disabled={!isCEO}
              value={formData.criticalStockDefaultThreshold}
              onChange={(e) => handleChange('criticalStockDefaultThreshold', parseInt(e.target.value, 10) || 0)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 text-stone-900 text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-stone-100"
              placeholder="3"
              required
            />
            <p className="mt-1 text-[11px] text-stone-500">Triggers urgent stockout risk and notification</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wider">
              Expiry Warning Days (Comma Separated)
            </label>
            <input
              type="text"
              disabled={!isCEO}
              value={(formData.expiryWarningDays || []).join(', ')}
              onChange={(e) => handleExpiryDaysChange(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 text-stone-900 text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-stone-100"
              placeholder="90, 60, 30, 7"
            />
            <p className="mt-1 text-[11px] text-stone-500">Days prior to expiry for batch alert warnings</p>
          </div>
        </div>
      </div>

      {/* 2. Customer Credit & Receivables Control */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-stone-100 bg-stone-50/70 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-stone-900 text-base">Customer Credit Limits & Approval Gates</h3>
            <p className="text-xs text-stone-500">Enforce risk management on credit sales to farmers and cooperatives</p>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wider">
              Default Customer Credit Limit (₦)
            </label>
            <input
              type="number"
              step="1000"
              min="0"
              disabled={!isCEO}
              value={formData.defaultCustomerCreditLimit}
              onChange={(e) => handleChange('defaultCustomerCreditLimit', parseFloat(e.target.value) || 0)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 text-stone-900 text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-stone-100"
              placeholder="150000"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wider">
              Require Manager Approval Over (₦)
            </label>
            <input
              type="number"
              step="1000"
              min="0"
              disabled={!isCEO}
              value={formData.requireApprovalForCreditOver}
              onChange={(e) => handleChange('requireApprovalForCreditOver', parseFloat(e.target.value) || 0)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 text-stone-900 text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-stone-100"
              placeholder="200000"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wider">
              Credit Grace Period (Days)
            </label>
            <input
              type="number"
              min="1"
              max="180"
              disabled={!isCEO}
              value={formData.creditGracePeriodDays}
              onChange={(e) => handleChange('creditGracePeriodDays', parseInt(e.target.value, 10) || 30)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 text-stone-900 text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-stone-100"
              placeholder="30"
            />
          </div>

          <div className="flex flex-col justify-center">
            <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wider">
              Overdue Credit Enforcement
            </label>
            <label className="relative inline-flex items-center cursor-pointer mt-1">
              <input
                type="checkbox"
                disabled={!isCEO}
                checked={formData.blockCreditOnOverdue}
                onChange={(e) => handleChange('blockCreditOnOverdue', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-stone-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              <span className="ml-3 text-xs font-bold text-stone-800">
                {formData.blockCreditOnOverdue ? 'Block If Overdue' : 'Allow With Warning'}
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* 3. Discount Limits & Authorizations */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-stone-100 bg-stone-50/70 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
            <Percent className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-stone-900 text-base">Point of Sale Discount Permissions</h3>
            <p className="text-xs text-stone-500">Prevent unapproved price reductions and unauthorized margins loss</p>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wider">
              Cashier Max Discount Without Approval (%)
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              max="50"
              disabled={!isCEO}
              value={formData.cashierMaxDiscountPercent}
              onChange={(e) => handleChange('cashierMaxDiscountPercent', parseFloat(e.target.value) || 0)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 text-stone-900 text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-stone-100"
              placeholder="5.0"
            />
            <p className="mt-1 text-[11px] text-stone-500">Higher discounts require manager credentials</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wider">
              Branch Manager Max Discount Limit (%)
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              max="100"
              disabled={!isCEO}
              value={formData.managerMaxDiscountPercent}
              onChange={(e) => handleChange('managerMaxDiscountPercent', parseFloat(e.target.value) || 0)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 text-stone-900 text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-stone-100"
              placeholder="15.0"
            />
            <p className="mt-1 text-[11px] text-stone-500">Discounts above this require CEO approval</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wider">
              Require Reason Note If Discount Over (%)
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              max="50"
              disabled={!isCEO}
              value={formData.requireDiscountReasonOver}
              onChange={(e) => handleChange('requireDiscountReasonOver', parseFloat(e.target.value) || 0)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 text-stone-900 text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-stone-100"
              placeholder="3.0"
            />
            <p className="mt-1 text-[11px] text-stone-500">Mandates audit explanation in sales ledger</p>
          </div>
        </div>
      </div>

      {/* 4. Stock Transfer Approval Rules */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-stone-100 bg-stone-50/70 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-stone-900 text-base">Inter-Branch Stock Transfer Controls</h3>
            <p className="text-xs text-stone-500">Enforce dual-authorization on stock dispatch between depots</p>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                disabled={!isCEO}
                checked={formData.requireTransferApproval}
                onChange={(e) => handleChange('requireTransferApproval', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-stone-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              <div className="ml-3">
                <span className="text-xs font-bold text-stone-800 block">
                  Mandatory Manager Approval on Stock Transfers
                </span>
                <span className="text-[11px] text-stone-500">
                  Transfers must be approved by receiving branch manager or CEO prior to dispatch
                </span>
              </div>
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wider">
              Transit Auto-Alert Days (Days in Transit Before Alarm)
            </label>
            <input
              type="number"
              min="1"
              max="30"
              disabled={!isCEO}
              value={formData.autoAlertTransferTransitDays}
              onChange={(e) => handleChange('autoAlertTransferTransitDays', parseInt(e.target.value, 10) || 3)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 text-stone-900 text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-stone-100"
              placeholder="3"
            />
            <p className="mt-1 text-[11px] text-stone-500">Notifies management of overdue waybills</p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      {isCEO && (
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => setFormData({ ...businessRules })}
            className="px-4 py-2.5 rounded-lg border border-stone-300 text-stone-700 text-xs font-bold hover:bg-stone-100 transition-colors"
          >
            Reset
          </button>
          <button
            type="submit"
            className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
          >
            <Save className="w-4 h-4" /> Save Business Rules
          </button>
        </div>
      )}
    </form>
  );
};
