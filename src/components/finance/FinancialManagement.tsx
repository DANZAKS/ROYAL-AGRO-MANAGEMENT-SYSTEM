import React, { useState } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  Scale,
  Building2,
  FileSpreadsheet,
  History,
  Coins,
  Wallet
} from 'lucide-react';
import {
  AppState,
  FinancialTransaction,
  CashSession,
  CashReconciliation,
  User,
  AuditLog
} from '../../types';
import { FinancialSummaryDashboard } from './FinancialSummaryDashboard';
import { CashbookView } from './CashbookView';
import { ReconciliationsView } from './ReconciliationsView';
import { CashTransactionModal } from './CashTransactionModal';
import { DailyCashReconciliationModal } from './DailyCashReconciliationModal';

interface FinancialManagementProps {
  state: AppState;
  currentUser: User;
  onUpdateState: (updater: (prev: AppState) => AppState) => void;
}

export const FinancialManagement: React.FC<FinancialManagementProps> = ({
  state,
  currentUser,
  onUpdateState
}) => {
  const [activeTab, setActiveTab] = useState<
    'OVERVIEW' | 'CASHBOOK' | 'RECONCILIATION' | 'BRANCHES' | 'AUDIT'
  >('OVERVIEW');

  const [isCashTxModalOpen, setIsCashTxModalOpen] = useState(false);
  const [isReconModalOpen, setIsReconModalOpen] = useState(false);

  // Handle saving new direct financial transaction (Other income / expense)
  const handleSaveTransaction = (newTx: FinancialTransaction) => {
    onUpdateState((prev) => {
      const existing = prev.financialTransactions || [];
      const updatedList = [newTx, ...existing];

      const audit: AuditLog = {
        id: `aud-${Date.now()}`,
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'SYSTEM_SETTINGS_UPDATE',
        entity: 'FINANCE',
        entityId: newTx.id,
        details: `Recorded direct financial entry: ${newTx.description} (${newTx.moneyIn > 0 ? '+₦' + newTx.moneyIn.toLocaleString() : '-₦' + newTx.moneyOut.toLocaleString()}) via ${newTx.paymentCategory}.`,
        branchId: newTx.branchId,
        timestamp: new Date().toISOString()
      };

      return {
        ...prev,
        financialTransactions: updatedList,
        auditLogs: [audit, ...(prev.auditLogs || [])]
      };
    });
  };

  // Handle saving daily cash session / reconciliation
  const handleSaveSession = (
    session: CashSession,
    recon?: CashReconciliation,
    audit?: AuditLog
  ) => {
    onUpdateState((prev) => {
      const existingSessions = prev.cashSessions || [];
      const sessionIndex = existingSessions.findIndex((s) => s.id === session.id);
      let updatedSessions: CashSession[];
      if (sessionIndex >= 0) {
        updatedSessions = [...existingSessions];
        updatedSessions[sessionIndex] = session;
      } else {
        updatedSessions = [session, ...existingSessions];
      }

      let updatedReconciliations = prev.cashReconciliations || [];
      if (recon) {
        updatedReconciliations = [recon, ...updatedReconciliations];
      }

      const updatedAudit = audit ? [audit, ...(prev.auditLogs || [])] : prev.auditLogs || [];

      return {
        ...prev,
        cashSessions: updatedSessions,
        cashReconciliations: updatedReconciliations,
        auditLogs: updatedAudit
      };
    });
  };

  // Handle reversing a financial transaction
  const handleReverseTransaction = (targetTx: FinancialTransaction, reason: string) => {
    onUpdateState((prev) => {
      const existingTx = prev.financialTransactions || [];
      const reversalId = `rev-${Date.now()}`;

      const reversalTx: FinancialTransaction = {
        id: reversalId,
        financialTransactionId: reversalId,
        branchId: targetTx.branchId,
        branchName: targetTx.branchName,
        transactionType: 'REVERSAL',
        referenceId: targetTx.id,
        referenceNumber: `REV-${targetTx.referenceNumber}`,
        description: `Correction / Reversal for ${targetTx.referenceNumber}: ${reason}`,
        moneyIn: targetTx.moneyOut, // Invert flow
        moneyOut: targetTx.moneyIn, // Invert flow
        paymentMethod: targetTx.paymentMethod,
        paymentCategory: targetTx.paymentCategory,
        createdByUserId: currentUser.id,
        createdByUserName: currentUser.name,
        transactionDate: new Date().toISOString().split('T')[0],
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        status: 'COMPLETED',
        notes: `Reversed transaction ${targetTx.referenceNumber}. Reason: ${reason}`
      };

      // Mark original if in manual financialTransactions
      const updatedFin = existingTx.map((tx) =>
        tx.id === targetTx.id ? { ...tx, status: 'REVERSED' as const } : tx
      );

      const audit: AuditLog = {
        id: `aud-${Date.now()}`,
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'FINANCIAL_TRANSACTION_REVERSED',
        entity: 'FINANCE',
        entityId: targetTx.id,
        details: `Reversed financial transaction ${targetTx.referenceNumber} (₦${(targetTx.moneyIn || targetTx.moneyOut).toLocaleString()}). Reason: ${reason}`,
        branchId: targetTx.branchId,
        timestamp: new Date().toISOString()
      };

      return {
        ...prev,
        financialTransactions: [reversalTx, ...updatedFin],
        auditLogs: [audit, ...(prev.auditLogs || [])]
      };
    });
  };

  // Handle supervisor authorizing a reconciliation
  const handleApproveReconciliation = (reconId: string) => {
    onUpdateState((prev) => {
      const existing = prev.cashReconciliations || [];
      const updated = existing.map((r) =>
        r.id === reconId
          ? {
              ...r,
              investigationStatus: 'RESOLVED' as const,
              approvedByUserId: currentUser.id,
              approvedByUserName: currentUser.name,
              approvedAt: new Date().toISOString()
            }
          : r
      );

      const recon = existing.find((r) => r.id === reconId);
      const audit: AuditLog = {
        id: `aud-${Date.now()}`,
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'SYSTEM_SETTINGS_UPDATE',
        entity: 'FINANCE',
        entityId: reconId,
        details: `Supervisor authorized cash reconciliation ${recon?.reconciliationNo || reconId} (${recon?.branchName}).`,
        branchId: recon?.branchId,
        timestamp: new Date().toISOString()
      };

      return {
        ...prev,
        cashReconciliations: updated,
        auditLogs: [audit, ...(prev.auditLogs || [])]
      };
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Navigation Tabs Header */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('OVERVIEW')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'OVERVIEW'
                ? 'bg-emerald-800 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Financial Overview & P&L</span>
          </button>

          <button
            onClick={() => setActiveTab('CASHBOOK')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'CASHBOOK'
                ? 'bg-emerald-800 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Cashbook & Ledger</span>
          </button>

          <button
            onClick={() => setActiveTab('RECONCILIATION')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'RECONCILIATION'
                ? 'bg-emerald-800 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>Daily Cash Reconciliation</span>
          </button>

          {(currentUser.role === 'ADMIN' || currentUser.role === 'FINANCE_OFFICER') && (
            <button
              onClick={() => setActiveTab('AUDIT')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'AUDIT'
                  ? 'bg-emerald-800 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Financial Audit Trail</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'OVERVIEW' && (
        <FinancialSummaryDashboard
          state={state}
          currentUser={currentUser}
          onNavigateToTab={(tab) => setActiveTab(tab as any)}
        />
      )}

      {activeTab === 'CASHBOOK' && (
        <CashbookView
          state={state}
          currentUser={currentUser}
          onOpenNewTransaction={() => setIsCashTxModalOpen(true)}
          onOpenReconciliation={() => setIsReconModalOpen(true)}
          onReverseTransaction={handleReverseTransaction}
        />
      )}

      {activeTab === 'RECONCILIATION' && (
        <ReconciliationsView
          state={state}
          currentUser={currentUser}
          onOpenReconciliationModal={() => setIsReconModalOpen(true)}
          onApproveReconciliation={handleApproveReconciliation}
        />
      )}

      {activeTab === 'AUDIT' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
          <div className="flex items-center space-x-3 text-slate-800">
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-700">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Financial Governance & Audit Trail</h3>
              <p className="text-xs text-slate-500">
                Immutable event log tracking all financial entries, drawer closures, reconciliations, and reversals.
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100 border-t border-slate-100 pt-3">
            {(state.auditLogs || [])
              .filter((log) => log.entity === 'FINANCE' || log.action?.includes('FINANCIAL'))
              .map((log) => (
                <div key={log.id} className="py-3 flex items-start justify-between text-xs">
                  <div>
                    <div className="font-semibold text-slate-800">{log.details}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Performed by: <strong>{log.userName}</strong> • Action: {log.action}
                    </div>
                  </div>
                  <div className="text-right text-[11px] text-slate-400 whitespace-nowrap ml-4">
                    {new Date(log.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Direct Transaction Modal */}
      <CashTransactionModal
        isOpen={isCashTxModalOpen}
        onClose={() => setIsCashTxModalOpen(false)}
        onSave={handleSaveTransaction}
        state={state}
        currentUser={currentUser}
      />

      {/* Reconciliation Modal */}
      <DailyCashReconciliationModal
        isOpen={isReconModalOpen}
        onClose={() => setIsReconModalOpen(false)}
        state={state}
        currentUser={currentUser}
        onSaveSession={handleSaveSession}
      />
    </div>
  );
};
