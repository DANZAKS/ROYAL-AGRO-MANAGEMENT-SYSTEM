import React, { useState } from 'react';
import {
  Building2,
  Save,
  CheckCircle2,
  AlertCircle,
  Globe,
  Phone,
  Mail,
  MapPin,
  FileText,
  DollarSign,
  Calendar,
  Clock,
  Percent,
  RefreshCw
} from 'lucide-react';
import { CompanySettings, User } from '../../types';

interface CompanyProfileTabProps {
  settings: CompanySettings;
  currentUser: User;
  onSaveSettings: (updated: CompanySettings, changeNote: string) => void;
}

export const CompanyProfileTab: React.FC<CompanyProfileTabProps> = ({
  settings,
  currentUser,
  onSaveSettings
}) => {
  const [formData, setFormData] = useState<CompanySettings>({ ...settings });
  const [isSaved, setIsSaved] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const isCEO = currentUser.role === 'CEO';

  const handleChange = (field: keyof CompanySettings, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
    setIsSaved(false);
    setValidationError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCEO) {
      setValidationError('Only CEO / Super Administrator can modify corporate company settings.');
      return;
    }

    if (!formData.companyName.trim()) {
      setValidationError('Company Name is required.');
      return;
    }

    if (!formData.currencySymbol.trim()) {
      setValidationError('Currency symbol is required.');
      return;
    }

    onSaveSettings(
      {
        ...formData,
        updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
        updatedByUserId: currentUser.id,
        updatedByUserName: currentUser.name
      },
      'Updated corporate company profile, contact details, currency and tax configuration.'
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
            <p className="font-semibold text-sm">Company Settings Successfully Saved!</p>
            <p className="text-xs text-emerald-700">
              Corporate identity and defaults have been updated across all connected devices and offline caches.
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

      {/* Basic Company Identity */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-stone-100 bg-stone-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-base">Corporate Organization Identity</h3>
              <p className="text-xs text-stone-500">Official business name, CAC registration, and tax ID</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            Headquarters: Kano Central
          </span>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wider">
              Company Full Legal Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              disabled={!isCEO}
              value={formData.companyName}
              onChange={(e) => handleChange('companyName', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 text-stone-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-stone-100 font-medium"
              placeholder="e.g. Royal Agro Allied Services Ltd"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wider">
              Corporate Tagline
            </label>
            <input
              type="text"
              disabled={!isCEO}
              value={formData.tagline}
              onChange={(e) => handleChange('tagline', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 text-stone-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-stone-100"
              placeholder="e.g. Quality Certified Seeds & Inputs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wider">
              CAC Registration Number (RC)
            </label>
            <input
              type="text"
              disabled={!isCEO}
              value={formData.registrationNumber}
              onChange={(e) => handleChange('registrationNumber', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 text-stone-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-stone-100 font-mono"
              placeholder="RC 1489201"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wider">
              Tax Identification Number (TIN)
            </label>
            <input
              type="text"
              disabled={!isCEO}
              value={formData.taxIdentificationNumber}
              onChange={(e) => handleChange('taxIdentificationNumber', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 text-stone-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-stone-100 font-mono"
              placeholder="TIN-23849102-0001"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wider">
              Default System Language
            </label>
            <select
              disabled={!isCEO}
              value={formData.defaultLanguage}
              onChange={(e) => handleChange('defaultLanguage', e.target.value as any)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 text-stone-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-stone-100"
            >
              <option value="en">English (Official Nigerian Business Standard)</option>
              <option value="ha">Hausa (Northern Agro Regional)</option>
              <option value="yo">Yoruba (South-West Agro Hubs)</option>
              <option value="ig">Igbo (South-East Hubs)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Contact & Physical Address */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-stone-100 bg-stone-50/70 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-stone-900 text-base">Head Office Address & Contact Information</h3>
            <p className="text-xs text-stone-500">Official contact records printed on customer invoices and receipts</p>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wider">
              Head Office Street Address
            </label>
            <input
              type="text"
              disabled={!isCEO}
              value={formData.headOfficeAddress}
              onChange={(e) => handleChange('headOfficeAddress', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 text-stone-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-stone-100"
              placeholder="Plot 42 Farm Center Road, Tarauni"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wider">
              State & Country
            </label>
            <input
              type="text"
              disabled={!isCEO}
              value={`${formData.state}, ${formData.country}`}
              onChange={(e) => {
                const parts = e.target.value.split(',');
                handleChange('state', parts[0]?.trim() || formData.state);
                if (parts[1]) handleChange('country', parts[1].trim());
              }}
              className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 text-stone-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-stone-100"
              placeholder="Kano State, Nigeria"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wider">
              Primary Phone / Hotline
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
              <input
                type="text"
                disabled={!isCEO}
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-stone-300 text-stone-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-stone-100"
                placeholder="+234 803 111 2233"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wider">
              Official Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
              <input
                type="email"
                disabled={!isCEO}
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-stone-300 text-stone-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-stone-100"
                placeholder="contact@royalagro.ng"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wider">
              Website / Portal URL
            </label>
            <div className="relative">
              <Globe className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
              <input
                type="url"
                disabled={!isCEO}
                value={formData.website}
                onChange={(e) => handleChange('website', e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-stone-300 text-stone-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-stone-100"
                placeholder="https://royalagro.ng"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Currency, Timezone & Number Formatting */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-stone-100 bg-stone-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-base">Currency, Date & Regional Standards</h3>
              <p className="text-xs text-stone-500">
                Default currency is Nigerian Naira (₦). Changes apply consistently without altering past transactions.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-stone-700 bg-stone-200/80 px-2.5 py-1 rounded-md">
            Preview: {formData.currencyPosition === 'BEFORE' ? `${formData.currencySymbol} 125,000.00` : `125,000.00 ${formData.currencySymbol}`}
          </span>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wider">
              Currency Symbol <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              disabled={!isCEO}
              value={formData.currencySymbol}
              onChange={(e) => handleChange('currencySymbol', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 text-stone-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-stone-100 font-bold"
              placeholder="₦"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wider">
              ISO Currency Code
            </label>
            <input
              type="text"
              disabled={!isCEO}
              value={formData.currencyCode}
              onChange={(e) => handleChange('currencyCode', e.target.value.toUpperCase())}
              className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 text-stone-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-stone-100 font-mono font-bold"
              placeholder="NGN"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wider">
              Currency Symbol Position
            </label>
            <select
              disabled={!isCEO}
              value={formData.currencyPosition}
              onChange={(e) => handleChange('currencyPosition', e.target.value as any)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 text-stone-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-stone-100"
            >
              <option value="BEFORE">Before Amount (e.g. ₦ 50,000)</option>
              <option value="AFTER">After Amount (e.g. 50,000 ₦)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wider">
              Business Timezone
            </label>
            <div className="relative">
              <Clock className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
              <input
                type="text"
                disabled={!isCEO}
                value={formData.timezone}
                onChange={(e) => handleChange('timezone', e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-stone-300 text-stone-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-stone-100 font-mono text-xs"
                placeholder="Africa/Lagos"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wider">
              Date Format
            </label>
            <select
              disabled={!isCEO}
              value={formData.dateFormat}
              onChange={(e) => handleChange('dateFormat', e.target.value as any)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 text-stone-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-stone-100"
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 21/10/2026)</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-10-21)</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 10/21/2026)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wider">
              Number & Thousands Separator
            </label>
            <select
              disabled={!isCEO}
              value={formData.numberFormat}
              onChange={(e) => handleChange('numberFormat', e.target.value as any)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 text-stone-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-stone-100"
            >
              <option value="COMMA_DECIMAL">1,250,000.00 (Standard Commercial)</option>
              <option value="SPACE_DECIMAL">1 250 000.00 (SI Format)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wider">
              Tax (VAT) Enablement
            </label>
            <div className="flex items-center h-10">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!isCEO}
                  checked={formData.taxEnabled}
                  onChange={(e) => handleChange('taxEnabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-stone-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                <span className="ml-3 text-xs font-bold text-stone-800">
                  {formData.taxEnabled ? 'VAT Enabled' : 'Tax Exempt / Disabled'}
                </span>
              </label>
            </div>
          </div>

          {formData.taxEnabled && (
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wider">
                VAT Rate Percentage (%)
              </label>
              <div className="relative">
                <Percent className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="50"
                  disabled={!isCEO}
                  value={formData.taxRate}
                  onChange={(e) => handleChange('taxRate', parseFloat(e.target.value) || 0)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-stone-300 text-stone-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-stone-100 font-bold"
                  placeholder="7.5"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      {isCEO && (
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => setFormData({ ...settings })}
            className="px-4 py-2.5 rounded-lg border border-stone-300 text-stone-700 text-xs font-bold hover:bg-stone-100 transition-colors"
          >
            Reset Form
          </button>
          <button
            type="submit"
            className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
          >
            <Save className="w-4 h-4" /> Save Company Settings
          </button>
        </div>
      )}
    </form>
  );
};
