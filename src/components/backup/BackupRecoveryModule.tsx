import React, { useState, useEffect } from 'react';
import {
  Database,
  Download,
  Upload,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  HardDrive,
  Cloud,
  CloudOff,
  RefreshCw,
  Search,
  Filter,
  Check,
  X,
  Layers,
  Wrench,
  ShieldAlert,
  Server,
  Calendar,
  UserCheck,
  ArrowRight,
  Info
} from 'lucide-react';
import {
  AppState,
  User,
  BackupPackage,
  BackupLogEntry,
  IntegrityReport,
  IntegrityIssue,
  RestoreOptions,
  RestoreResult,
  Branch
} from '../../types';
import {
  createBackupPackage,
  downloadBackupPackage,
  validateBackupContent,
  executeRestore,
  createSafetyBackup,
  getLatestSafetyBackup,
  uploadBackupToServer,
  fetchServerBackupHistory,
  APP_VERSION,
  SCHEMA_VERSION
} from '../../services/backupService';
import {
  runDataIntegrityAudit,
  applySafeIntegrityFix
} from '../../services/integrityService';
import { useNetworkStatus } from '../../offline/networkStatus';
import { getPendingCount } from '../../offline/offlineQueue';
import { RestoreModal } from './RestoreModal';

interface BackupRecoveryModuleProps {
  appState: AppState;
  currentUser: User;
  branches: Branch[];
  onUpdateState: (updater: (prev: AppState) => AppState) => void;
  onLogAudit: (action: string, details: string) => void;
}

export const BackupRecoveryModule: React.FC<BackupRecoveryModuleProps> = ({
  appState,
  currentUser,
  branches,
  onUpdateState,
  onLogAudit
}) => {
  const { isOnline } = useNetworkStatus();
  const isCEO = currentUser.role === 'CEO';

  // Sub-tab Navigation
  const [activeTab, setActiveTab] = useState<'backup' | 'restore' | 'integrity' | 'offline_resilience'>('backup');

  // Backup Creation State
  const [backupScope, setBackupScope] = useState<'FULL_SYSTEM' | 'BRANCH_SNAPSHOT'>('FULL_SYSTEM');
  const [selectedBranchId, setSelectedBranchId] = useState<string>(branches[0]?.id || '');
  const [backupDescription, setBackupDescription] = useState<string>('');
  const [isCreatingBackup, setIsCreatingBackup] = useState<boolean>(false);
  const [saveToServerArchive, setSaveToServerArchive] = useState<boolean>(true);

  // Restore State
  const [uploadedFileText, setUploadedFileText] = useState<string | null>(null);
  const [candidatePackage, setCandidatePackage] = useState<BackupPackage | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [isEvaluatingFile, setIsEvaluatingFile] = useState<boolean>(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState<boolean>(false);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [restoreOutcome, setRestoreOutcome] = useState<RestoreResult | null>(null);

  // Integrity Audit State
  const [integrityReport, setIntegrityReport] = useState<IntegrityReport | null>(
    appState.lastIntegrityReport || null
  );
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [selectedSeverityFilter, setSelectedSeverityFilter] = useState<string>('ALL');
  const [repairSuccessMessage, setRepairSuccessMessage] = useState<string | null>(null);

  // Offline Diagnostics
  const [pendingOpsCount, setPendingOpsCount] = useState<number>(0);
  const [serverBackupsList, setServerBackupsList] = useState<BackupLogEntry[]>([]);

  // Banner feedback state
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
  } | null>(null);

  // Safety Backup Rollback
  const [latestSafetyBackup, setLatestSafetyBackup] = useState<BackupPackage | null>(null);

  // Load initial diagnostics
  useEffect(() => {
    getPendingCount().then((cnt) => setPendingOpsCount(cnt)).catch(() => {});
    setLatestSafetyBackup(getLatestSafetyBackup());

    if (isOnline) {
      fetchServerBackupHistory().then((list) => setServerBackupsList(list)).catch(() => {});
    }
  }, [isOnline, appState]);

  // =========================================================================
  // HANDLERS: BACKUP CREATION
  // =========================================================================
  const handleCreateManualBackup = async () => {
    if (!isCEO) {
      setFeedback({
        type: 'error',
        message: 'Permission Denied: Only CEO / Super Admin can generate enterprise data backups.'
      });
      return;
    }

    setIsCreatingBackup(true);
    setFeedback(null);

    try {
      const pkg = await createBackupPackage(appState, currentUser, {
        scope: backupScope,
        branchId: backupScope === 'BRANCH_SNAPSHOT' ? selectedBranchId : undefined,
        description: backupDescription || (backupScope === 'FULL_SYSTEM' ? 'Full Enterprise Backup' : 'Branch Snapshot')
      });

      // 1. Download file to client browser
      downloadBackupPackage(pkg);

      // 2. Attempt archive to server if online and checked
      let serverArchived = false;
      if (isOnline && saveToServerArchive) {
        const serverRes = await uploadBackupToServer(pkg);
        serverArchived = serverRes.success;
        if (serverRes.success) {
          fetchServerBackupHistory().then((list) => setServerBackupsList(list)).catch(() => {});
        }
      }

      // 3. Update in-app state backup history & log audit
      const logEntry: BackupLogEntry = {
        id: `backup-log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'MANUAL_BACKUP',
        status: 'SUCCESS',
        performedBy: currentUser.name,
        userRole: currentUser.role,
        details: `${pkg.metadata.backupScope} backup created with ${pkg.metadata.totalRecords.toLocaleString()} records.${
          serverArchived ? ' Archived to server.' : ''
        }`,
        backupId: pkg.metadata.id,
        checksum: pkg.metadata.checksum,
        recordsCount: pkg.metadata.totalRecords,
        fileSizeBytes: pkg.metadata.fileSizeBytes
      };

      onUpdateState((prev) => ({
        ...prev,
        backupHistory: [logEntry, ...(prev.backupHistory || [])]
      }));

      onLogAudit(
        'BACKUP_CREATED',
        `Generated ${pkg.metadata.backupScope} backup #${pkg.metadata.id} containing ${pkg.metadata.totalRecords} records.`
      );

      setFeedback({
        type: 'success',
        message: `Backup #${pkg.metadata.id} generated successfully! ${
          serverArchived ? 'File downloaded and safely archived to server repository.' : 'File downloaded to your local device.'
        }`
      });

      setBackupDescription('');
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `Backup failed: ${err.message || 'Unknown error occurred.'}`
      });
    } finally {
      setIsCreatingBackup(false);
    }
  };

  // =========================================================================
  // HANDLERS: RESTORE & DISASTER RECOVERY
  // =========================================================================
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsEvaluatingFile(true);
    setValidationErrors([]);
    setValidationWarnings([]);
    setCandidatePackage(null);
    setRestoreOutcome(null);
    setFeedback(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      setUploadedFileText(content);

      const validation = await validateBackupContent(content);
      setIsEvaluatingFile(false);

      if (validation.isValid && validation.backupPackage) {
        setCandidatePackage(validation.backupPackage);
        setValidationWarnings(validation.warnings);
        setFeedback({
          type: 'info',
          message: `Backup file "${file.name}" validated successfully. Review contents before restoration.`
        });
      } else {
        setValidationErrors(validation.errors);
        setValidationWarnings(validation.warnings);
        setFeedback({
          type: 'error',
          message: 'The uploaded file failed structure or schema validation.'
        });
      }
    };

    reader.onerror = () => {
      setIsEvaluatingFile(false);
      setValidationErrors(['Failed to read file from disk.']);
    };

    reader.readAsText(file);
    // Reset file input value
    e.target.value = '';
  };

  const handleConfirmRestore = async (options: RestoreOptions) => {
    if (!candidatePackage) return;
    setIsRestoring(true);

    try {
      const { updatedState, result } = executeRestore(
        appState,
        candidatePackage,
        currentUser,
        options
      );

      onUpdateState(() => updatedState);
      setRestoreOutcome(result);
      setIsRestoreModalOpen(false);

      setLatestSafetyBackup(getLatestSafetyBackup());

      setFeedback({
        type: 'success',
        message: `Restoration completed! Successfully applied ${result.totalRestored.toLocaleString()} records in ${result.mode} mode (${result.totalSkipped.toLocaleString()} duplicate records skipped).`
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `Restoration halted: ${err.message}`
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const handleRollbackSafetyBackup = () => {
    if (!latestSafetyBackup) return;
    if (!confirm('Are you sure you want to rollback to the latest pre-restoration safety backup?')) {
      return;
    }

    try {
      const { updatedState, result } = executeRestore(
        appState,
        latestSafetyBackup,
        currentUser,
        {
          mode: 'FULL_OVERWRITE',
          createSafetyBackup: false,
          skipDuplicateReceipts: false,
          skipDuplicatePayments: false,
          skipDuplicateStockMovements: false
        }
      );

      onUpdateState(() => updatedState);
      setFeedback({
        type: 'success',
        message: `Emergency Rollback Succeeded! Restored ${result.totalRestored.toLocaleString()} records from pre-restore safety snapshot.`
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `Rollback failed: ${err.message}`
      });
    }
  };

  // =========================================================================
  // HANDLERS: DATA INTEGRITY AUDIT & REPAIR
  // =========================================================================
  const handleRunIntegrityAudit = async () => {
    setIsAuditing(true);
    setRepairSuccessMessage(null);
    setFeedback(null);

    try {
      const report = await runDataIntegrityAudit(appState, currentUser);
      setIntegrityReport(report);

      onUpdateState((prev) => ({
        ...prev,
        lastIntegrityReport: report
      }));

      onLogAudit(
        'INTEGRITY_AUDIT_EXECUTED',
        `Completed system data integrity audit: found ${report.criticalCount} critical, ${report.warningCount} warnings, ${report.infoCount} informational variances across ${report.collectionsChecked.length} collections.`
      );

      setFeedback({
        type: report.criticalCount > 0 ? 'warning' : 'success',
        message: `Data Integrity Audit finished in ${report.executionTimeMs}ms. Detected ${report.totalIssuesFound} total issue(s).`
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `Integrity audit encountered an error: ${err.message}`
      });
    } finally {
      setIsAuditing(false);
    }
  };

  const handleSafeRepair = (issue: IntegrityIssue) => {
    if (!isCEO) {
      setFeedback({
        type: 'error',
        message: 'Permission Denied: Only CEO / Super Admin can perform integrity repairs.'
      });
      return;
    }

    try {
      const { updatedState, message } = applySafeIntegrityFix(appState, issue, currentUser);
      onUpdateState(() => updatedState);

      // Re-run audit to reflect fix
      runDataIntegrityAudit(updatedState, currentUser).then((rep) => {
        setIntegrityReport(rep);
        onUpdateState((prev) => ({ ...prev, lastIntegrityReport: rep }));
      });

      setRepairSuccessMessage(message);
      setFeedback({
        type: 'success',
        message: `Safe Repair Applied: ${message}`
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `Repair failed: ${err.message}`
      });
    }
  };

  // Computed metrics
  const combinedHistory: BackupLogEntry[] = [
    ...(appState.backupHistory || []),
    ...serverBackupsList
  ].reduce((acc: BackupLogEntry[], item) => {
    if (!acc.some((x) => x.id === item.id)) acc.push(item);
    return acc;
  }, []).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const lastSuccessfulBackup = combinedHistory.find((b) => b.status === 'SUCCESS');

  const filteredIssues = (integrityReport?.issues || []).filter((issue) => {
    if (selectedCategoryFilter !== 'ALL' && issue.category !== selectedCategoryFilter) return false;
    if (selectedSeverityFilter !== 'ALL' && issue.severity !== selectedSeverityFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Module Header */}
      <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#1B3022] text-[#7E9D73] flex items-center justify-center shadow-md">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-stone-900 tracking-tight">
                  Backup, Restore & Disaster Recovery
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                  Module 14
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Enterprise Data Protection, Multi-Collection Integrity Audits & Offline Safety Controls
              </p>
            </div>
          </div>

          {/* Status Badges */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Connectivity Badge */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-semibold ${
                isOnline
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              {isOnline ? <Cloud className="w-3.5 h-3.5" /> : <CloudOff className="w-3.5 h-3.5" />}
              <span>{isOnline ? 'Cloud Reachable' : 'Offline Mode'}</span>
            </div>

            {/* Role Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-stone-50 text-stone-700 border-stone-200 font-semibold">
              <UserCheck className="w-3.5 h-3.5 text-stone-500" />
              <span>Role: {currentUser.role}</span>
              {isCEO ? (
                <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-bold">Admin</span>
              ) : (
                <span className="text-[10px] bg-stone-200 text-stone-700 px-1.5 py-0.2 rounded">Read Only</span>
              )}
            </div>
          </div>
        </div>

        {/* Global Feedback Alert */}
        {feedback && (
          <div
            className={`mt-4 p-4 rounded-xl flex items-start gap-3 border text-xs animate-in fade-in ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : feedback.type === 'error'
                ? 'bg-red-50 text-red-900 border-red-200'
                : feedback.type === 'warning'
                ? 'bg-amber-50 text-amber-900 border-amber-200'
                : 'bg-blue-50 text-blue-900 border-blue-200'
            }`}
          >
            {feedback.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
            {feedback.type === 'error' && <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />}
            {feedback.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />}
            {feedback.type === 'info' && <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />}
            <div className="flex-1 font-medium">{feedback.message}</div>
            <button onClick={() => setFeedback(null)} className="text-stone-400 hover:text-stone-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Permission Notice for Non-CEO Users */}
        {!isCEO && (
          <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Restricted Access: Full backup creation, data restoration, and integrity repairs are reserved for CEO / Super Administrator accounts.
            </span>
          </div>
        )}
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex border-b border-stone-200 bg-white rounded-xl px-2 shadow-xs overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setActiveTab('backup')}
          className={`flex items-center gap-2 px-5 py-3.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'backup'
              ? 'border-emerald-700 text-emerald-800 bg-emerald-50/40'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Download className="w-4 h-4" />
          Create & Download Backup
        </button>

        <button
          onClick={() => setActiveTab('restore')}
          className={`flex items-center gap-2 px-5 py-3.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'restore'
              ? 'border-emerald-700 text-emerald-800 bg-emerald-50/40'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          Restore & Data Recovery
        </button>

        <button
          onClick={() => setActiveTab('integrity')}
          className={`flex items-center gap-2 px-5 py-3.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'integrity'
              ? 'border-emerald-700 text-emerald-800 bg-emerald-50/40'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Data Integrity Diagnostics
          {integrityReport && integrityReport.criticalCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('offline_resilience')}
          className={`flex items-center gap-2 px-5 py-3.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'offline_resilience'
              ? 'border-emerald-700 text-emerald-800 bg-emerald-50/40'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <HardDrive className="w-4 h-4" />
          Offline & PWA Resilience
          {pendingOpsCount > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800">
              {pendingOpsCount}
            </span>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CREATE & DOWNLOAD BACKUP */}
      {/* ========================================================================= */}
      {activeTab === 'backup' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-stone-500 text-xs font-medium block">Last Successful Backup</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-lg font-extrabold text-stone-900">
                  {lastSuccessfulBackup
                    ? new Date(lastSuccessfulBackup.timestamp).toLocaleDateString()
                    : 'None Recorded'}
                </span>
                {lastSuccessfulBackup && (
                  <span className="text-xs text-stone-500 font-mono">
                    {new Date(lastSuccessfulBackup.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-400 mt-1">
                {lastSuccessfulBackup
                  ? `Contains ${lastSuccessfulBackup.recordsCount?.toLocaleString()} records`
                  : 'Generate your first full backup'}
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-stone-500 text-xs font-medium block">Total Protected Records</span>
              <div className="mt-2 text-lg font-extrabold text-emerald-800 font-mono">
                {(
                  (appState.products?.length || 0) +
                  (appState.sales?.length || 0) +
                  (appState.inventory?.length || 0) +
                  (appState.customers?.length || 0) +
                  (appState.branches?.length || 0) +
                  (appState.users?.length || 0) +
                  ((appState.stockMovements || appState.movements || []).length) +
                  (appState.credits?.length || 0)
                ).toLocaleString()}{' '}
                <span className="text-xs font-sans font-normal text-stone-500">primary entities</span>
              </div>
              <p className="text-xs text-stone-400 mt-1">Ready for full export</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-stone-500 text-xs font-medium block">Backend Archive Status</span>
              <div className="mt-2 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-sm font-bold text-stone-800">API Archive Active</span>
              </div>
              <p className="text-xs text-stone-400 mt-1">
                {serverBackupsList.length} snapshot(s) archived on server
              </p>
            </div>
          </div>

          {/* Backup Generator Form Card */}
          <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs space-y-6">
            <div>
              <h3 className="text-base font-bold text-stone-900">Generate Enterprise Backup</h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Creates an encrypted, structured JSON snapshot covering all 18+ business collections, schemas, and metadata.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Scope Selection */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-600 block">
                  Backup Scope
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => isCEO && setBackupScope('FULL_SYSTEM')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      backupScope === 'FULL_SYSTEM'
                        ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                        : 'border-stone-200 hover:border-stone-300 bg-white'
                    }`}
                  >
                    <span className="font-bold text-xs text-stone-900 block">Full Enterprise System</span>
                    <span className="text-[11px] text-stone-500 mt-0.5 block">
                      All branches, master catalogs, financial records & logs.
                    </span>
                  </div>

                  <div
                    onClick={() => isCEO && setBackupScope('BRANCH_SNAPSHOT')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      backupScope === 'BRANCH_SNAPSHOT'
                        ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                        : 'border-stone-200 hover:border-stone-300 bg-white'
                    }`}
                  >
                    <span className="font-bold text-xs text-stone-900 block">Single Branch Snapshot</span>
                    <span className="text-[11px] text-stone-500 mt-0.5 block">
                      Scoped inventory, sales, expenses, and staff for one branch.
                    </span>
                  </div>
                </div>

                {backupScope === 'BRANCH_SNAPSHOT' && (
                  <div className="mt-3">
                    <label className="text-xs font-semibold text-stone-600 block mb-1">Select Branch</label>
                    <select
                      value={selectedBranchId}
                      onChange={(e) => setSelectedBranchId(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-600 bg-white"
                    >
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.code}) - {b.state}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Description & Options */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-600 block">
                  Backup Notes & Metadata
                </label>
                <input
                  type="text"
                  value={backupDescription}
                  onChange={(e) => setBackupDescription(e.target.value)}
                  placeholder="e.g. Pre-month-end closing snapshot, weekly safety archive"
                  className="w-full text-xs px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-600 bg-white"
                />

                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={saveToServerArchive}
                      onChange={(e) => setSaveToServerArchive(e.target.checked)}
                      disabled={!isOnline}
                      className="rounded text-emerald-700 focus:ring-emerald-600"
                    />
                    <span className="text-stone-700">Archive copy in server backup repository</span>
                  </label>
                  {!isOnline && (
                    <span className="text-[10px] text-amber-700 block ml-6">
                      (Server archive disabled while offline. File will download locally.)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="pt-4 border-t border-stone-200 flex items-center justify-between">
              <div className="text-xs text-stone-500">
                Application Schema: <span className="font-mono font-semibold text-stone-700">v{SCHEMA_VERSION}</span> • Format: <span className="font-mono font-semibold text-stone-700">JSON</span>
              </div>

              <button
                onClick={handleCreateManualBackup}
                disabled={isCreatingBackup || !isCEO}
                className={`px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-all ${
                  isCEO && !isCreatingBackup
                    ? 'bg-[#1B3022] hover:bg-[#284732] text-white cursor-pointer'
                    : 'bg-stone-200 text-stone-500 cursor-not-allowed'
                }`}
              >
                {isCreatingBackup ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-300" />
                    Packaging Backup...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 text-emerald-300" />
                    Create & Download Backup
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Backup History Table */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-stone-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-stone-900">Backup & Archive History</h3>
                <p className="text-xs text-stone-500">Recorded system snapshots and restorations</p>
              </div>
              <span className="text-xs font-mono bg-stone-100 text-stone-700 px-2.5 py-1 rounded-lg">
                {combinedHistory.length} total entries
              </span>
            </div>

            {combinedHistory.length === 0 ? (
              <div className="p-10 text-center text-xs text-stone-400">
                No previous backup activity logged yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-200">
                    <tr>
                      <th className="px-5 py-3">Timestamp</th>
                      <th className="px-5 py-3">Operation</th>
                      <th className="px-5 py-3">Performed By</th>
                      <th className="px-5 py-3">Records</th>
                      <th className="px-5 py-3">Details</th>
                      <th className="px-5 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {combinedHistory.map((item) => (
                      <tr key={item.id} className="hover:bg-stone-50/50">
                        <td className="px-5 py-3.5 whitespace-nowrap font-mono text-stone-600">
                          {new Date(item.timestamp).toLocaleString()}
                        </td>
                        <td className="px-5 py-3.5 font-bold text-stone-800">
                          {item.type.replace(/_/g, ' ')}
                        </td>
                        <td className="px-5 py-3.5 text-stone-600">
                          {item.performedBy} ({item.userRole})
                        </td>
                        <td className="px-5 py-3.5 font-mono text-emerald-800 font-semibold">
                          {item.recordsCount?.toLocaleString() || '-'}
                        </td>
                        <td className="px-5 py-3.5 text-stone-600 max-w-xs truncate">
                          {item.details}
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.status === 'SUCCESS'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: RESTORE & DATA RECOVERY */}
      {/* ========================================================================= */}
      {activeTab === 'restore' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Emergency Safety Rollback Bar */}
          {latestSafetyBackup && (
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-amber-900">Pre-Restoration Safety Snapshot Available</h4>
                  <p className="text-amber-800 text-[11px] mt-0.5">
                    Saved on {new Date(latestSafetyBackup.metadata.createdAt).toLocaleString()} before last restore ({latestSafetyBackup.metadata.totalRecords.toLocaleString()} records).
                  </p>
                </div>
              </div>

              {isCEO && (
                <button
                  onClick={handleRollbackSafetyBackup}
                  className="px-3.5 py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-lg font-bold text-xs transition-colors shrink-0"
                >
                  Rollback to Safety Snapshot
                </button>
              )}
            </div>
          )}

          {/* Upload Card */}
          <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs space-y-6">
            <div>
              <h3 className="text-base font-bold text-stone-900">Restore Data From Backup</h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Upload a verified JSON backup package. The system validates the schema, inspects entity collections, and protects existing data before applying changes.
              </p>
            </div>

            {/* Drop Zone */}
            <div className="p-8 border-2 border-dashed border-stone-300 rounded-2xl bg-stone-50/50 hover:bg-stone-50 text-center transition-colors">
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                disabled={!isCEO || isEvaluatingFile}
                id="backup-file-input"
                className="hidden"
              />
              <label
                htmlFor="backup-file-input"
                className={`flex flex-col items-center justify-center cursor-pointer ${
                  !isCEO ? 'cursor-not-allowed opacity-60' : ''
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <span className="text-sm font-bold text-stone-800">
                  {isEvaluatingFile ? 'Validating File Content...' : 'Choose Backup JSON File'}
                </span>
                <span className="text-xs text-stone-500 mt-1">
                  Click to select file or drag and drop (.json format)
                </span>
              </label>
            </div>

            {/* Validation Feedback */}
            {validationErrors.length > 0 && (
              <div className="p-4 bg-red-50 rounded-xl border border-red-200 text-xs text-red-900 space-y-1">
                <div className="font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  Validation Errors - File Cannot Be Restored
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-red-800 mt-1">
                  {validationErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {validationWarnings.length > 0 && (
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Restoration Warnings
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-amber-800 mt-1">
                  {validationWarnings.map((warn, i) => (
                    <li key={i}>{warn}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Validated Package Preview Card */}
            {candidatePackage && (
              <div className="p-5 bg-stone-50 rounded-xl border border-stone-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span className="font-bold text-sm text-stone-900">Verified Backup Package</span>
                  </div>
                  <span className="text-xs font-mono bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold">
                    v{candidatePackage.metadata.schemaVersion} Compatible
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-stone-500 block">Package ID</span>
                    <span className="font-mono text-stone-800 truncate block">{candidatePackage.metadata.id}</span>
                  </div>
                  <div>
                    <span className="text-stone-500 block">Created On</span>
                    <span className="font-medium text-stone-800">{new Date(candidatePackage.metadata.createdAt).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-stone-500 block">Author</span>
                    <span className="font-medium text-stone-800">{candidatePackage.metadata.createdByUserName}</span>
                  </div>
                  <div>
                    <span className="text-stone-500 block">Total Entities</span>
                    <span className="font-mono font-bold text-emerald-800 text-sm">
                      {candidatePackage.metadata.totalRecords.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => setIsRestoreModalOpen(true)}
                    className="px-5 py-2.5 bg-[#1B3022] hover:bg-[#284732] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
                  >
                    <RotateCcw className="w-4 h-4 text-emerald-300" />
                    Review & Proceed with Restoration
                  </button>
                </div>
              </div>
            )}

            {/* Restoration Result Outcome Card */}
            {restoreOutcome && (
              <div className="p-5 bg-emerald-50 rounded-xl border border-emerald-200 space-y-3 text-xs">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  Restoration Completed Successfully
                </div>
                <p className="text-emerald-800">
                  Restored {restoreOutcome.totalRestored.toLocaleString()} records in {restoreOutcome.mode} mode. {restoreOutcome.totalSkipped.toLocaleString()} duplicate records were safely skipped.
                </p>
                {restoreOutcome.safetyBackupId && (
                  <p className="text-stone-600 text-[11px]">
                    Automatic safety snapshot created: <span className="font-mono">{restoreOutcome.safetyBackupId}</span>
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: DATA INTEGRITY DIAGNOSTICS */}
      {/* ========================================================================= */}
      {activeTab === 'integrity' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Header Card */}
          <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-stone-900">Multi-Collection Data Integrity Checker</h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Detects stock balance vs movement discrepancies, customer credit mismatches, orphaned foreign keys, and stalled sync records.
              </p>
            </div>

            <button
              onClick={handleRunIntegrityAudit}
              disabled={isAuditing}
              className="px-5 py-2.5 bg-[#1B3022] hover:bg-[#284732] text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs transition-colors shrink-0"
            >
              {isAuditing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-300" />
                  Auditing Database...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-300" />
                  Run Full System Audit
                </>
              )}
            </button>
          </div>

          {/* Audit Metrics */}
          {integrityReport && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
                <span className="text-stone-500 text-xs">Total Issues</span>
                <div className="text-xl font-extrabold text-stone-900 font-mono mt-1">
                  {integrityReport.totalIssuesFound}
                </div>
                <span className="text-[10px] text-stone-400">across {integrityReport.collectionsChecked.length} collections</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
                <span className="text-red-700 text-xs font-semibold">Critical Anomalies</span>
                <div className="text-xl font-extrabold text-red-600 font-mono mt-1">
                  {integrityReport.criticalCount}
                </div>
                <span className="text-[10px] text-stone-400">Requires attention</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
                <span className="text-amber-700 text-xs font-semibold">Warnings</span>
                <div className="text-xl font-extrabold text-amber-600 font-mono mt-1">
                  {integrityReport.warningCount}
                </div>
                <span className="text-[10px] text-stone-400">Calculated variances</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
                <span className="text-stone-500 text-xs">Informational</span>
                <div className="text-xl font-extrabold text-stone-700 font-mono mt-1">
                  {integrityReport.infoCount}
                </div>
                <span className="text-[10px] text-stone-400">Notices & observations</span>
              </div>
            </div>
          )}

          {/* Issues List & Filter */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
            {/* Filter Bar */}
            <div className="p-4 border-b border-stone-200 bg-stone-50/50 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-stone-500" />
                <span className="font-bold text-stone-700">Filter Category:</span>
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="text-xs px-2.5 py-1.5 border border-stone-300 rounded-lg bg-white"
                >
                  <option value="ALL">All Categories</option>
                  <option value="STOCK_DISCREPANCY">Stock Discrepancies</option>
                  <option value="CREDIT_DISCREPANCY">Credit Discrepancies</option>
                  <option value="ORPHANED_REFERENCE">Orphaned Foreign Keys</option>
                  <option value="INVALID_TRANSACTION">Transaction Inconsistencies</option>
                  <option value="SYNC_STALL">Sync & Queue Stalls</option>
                  <option value="DUPLICATE_ID">Duplicate IDs</option>
                </select>

                <select
                  value={selectedSeverityFilter}
                  onChange={(e) => setSelectedSeverityFilter(e.target.value)}
                  className="text-xs px-2.5 py-1.5 border border-stone-300 rounded-lg bg-white"
                >
                  <option value="ALL">All Severities</option>
                  <option value="CRITICAL">Critical Only</option>
                  <option value="WARNING">Warnings Only</option>
                  <option value="INFO">Informational Only</option>
                </select>
              </div>

              {integrityReport && (
                <span className="text-[11px] text-stone-400">
                  Last audit run {new Date(integrityReport.runAt).toLocaleTimeString()}
                </span>
              )}
            </div>

            {/* List */}
            {!integrityReport ? (
              <div className="p-12 text-center text-xs text-stone-400 space-y-2">
                <ShieldCheck className="w-8 h-8 text-stone-300 mx-auto" />
                <p>Run your first data integrity audit to inspect database consistency.</p>
              </div>
            ) : filteredIssues.length === 0 ? (
              <div className="p-12 text-center text-xs text-emerald-800 space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <p className="font-bold text-sm">No Integrity Variances Found</p>
                <p className="text-stone-500">All inspected business records, balances, and references are consistent.</p>
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {filteredIssues.map((issue) => (
                  <div key={issue.id} className="p-4 hover:bg-stone-50/50 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
                    <div className="space-y-1 max-w-2xl">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            issue.severity === 'CRITICAL'
                              ? 'bg-red-100 text-red-800'
                              : issue.severity === 'WARNING'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {issue.severity}
                        </span>
                        <span className="font-bold text-stone-900">{issue.title}</span>
                        <span className="text-[10px] font-mono text-stone-400">({issue.entityType})</span>
                      </div>
                      <p className="text-stone-600 leading-relaxed">{issue.description}</p>
                      {issue.expectedValue !== undefined && issue.actualValue !== undefined && (
                        <div className="flex items-center gap-4 text-[11px] text-stone-500 pt-0.5">
                          <span>Recorded: <span className="font-mono font-semibold text-stone-700">{issue.actualValue}</span></span>
                          <span>Computed: <span className="font-mono font-semibold text-emerald-700">{issue.expectedValue}</span></span>
                        </div>
                      )}
                    </div>

                    {/* Action Tools */}
                    <div className="shrink-0 flex items-center gap-2">
                      {issue.canAutoRepair && isCEO ? (
                        <button
                          onClick={() => handleSafeRepair(issue)}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                        >
                          <Wrench className="w-3.5 h-3.5 text-emerald-700" />
                          {issue.repairActionLabel || 'Safe Repair'}
                        </button>
                      ) : (
                        <span className="text-[10px] text-stone-400 italic">Manual Audit Required</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: OFFLINE & PWA RESILIENCE */}
      {/* ========================================================================= */}
      {activeTab === 'offline_resilience' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Offline Protection Notice */}
          <div className="p-6 bg-white rounded-2xl border border-stone-200 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  Offline-First Architecture & Synchronization Safety
                </h3>
                <p className="text-xs text-stone-500">
                  Royal Agro uses IndexedDB (<span className="font-mono">RoyalAgroDB v7</span>) with PWA Service Workers to ensure zero data loss during rural connectivity blackouts.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-xs text-stone-500 block">Pending Offline Queue</span>
                <div className="text-xl font-bold font-mono text-stone-900 mt-1">
                  {pendingOpsCount}
                </div>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  Unsynced operations stored in IndexedDB
                </p>
              </div>

              <div className="p-4 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-xs text-stone-500 block">Network Connectivity</span>
                <div className="text-sm font-bold text-emerald-700 mt-1 flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  {isOnline ? 'Cloud Reachable' : 'Offline / Standalone'}
                </div>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  Auto-sync triggers upon reconnection
                </p>
              </div>

              <div className="p-4 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-xs text-stone-500 block">Offline Export Support</span>
                <div className="text-sm font-bold text-stone-800 mt-1">
                  Supported & Tagged
                </div>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  Backups clearly labeled with uncommitted counts
                </p>
              </div>
            </div>
          </div>

          {/* Offline Rules & Safeguards */}
          <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs space-y-4">
            <h4 className="text-sm font-bold text-stone-900">Disaster Recovery Rules for Offline Backups</h4>

            <div className="space-y-3 text-xs text-stone-600">
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-start gap-3">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-stone-900">Local Snapshot Truth:</span> An export generated while offline is tagged as an offline snapshot. It contains local uncommitted transactions.
                </div>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-start gap-3">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-stone-900">Overwriting Prevention:</span> When restoring an older local backup, the system will never silently overwrite newer cloud records. Use "Merge & Deduplicate" mode to safeguard incoming sales and transactions.
                </div>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-start gap-3">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-stone-900">Reconnection Preserved:</span> When the internet returns, the background SyncManager resumes with transaction priority (master records first, then sales, stock movements, and credits) without breaking ID continuity.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Restore Review & Confirmation Modal */}
      <RestoreModal
        isOpen={isRestoreModalOpen}
        onClose={() => setIsRestoreModalOpen(false)}
        backupPackage={candidatePackage}
        currentState={appState}
        onConfirmRestore={handleConfirmRestore}
        isRestoring={isRestoring}
      />
    </div>
  );
};
