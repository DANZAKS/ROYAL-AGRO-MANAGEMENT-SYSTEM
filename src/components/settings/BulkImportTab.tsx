import React, { useState, useRef } from 'react';
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Eye,
  FileDown,
  ShieldCheck,
  Building2,
  Package,
  Users,
  Truck,
  Boxes,
  HelpCircle
} from 'lucide-react';
import {
  Product,
  Customer,
  Supplier,
  Branch,
  BranchInventory,
  StockMovement,
  DataImportType,
  DataImportRecord,
  ImportRowValidation,
  OpeningStockImportItem,
  User
} from '../../types';
import {
  getSampleCsvTemplate,
  downloadCsvFile,
  parseCSV,
  validateProductRows,
  validateCustomerRows,
  validateSupplierRows,
  validateOpeningStockRows,
  generateErrorReportCSV,
  processOpeningStockCommit
} from '../../services/importService';

interface BulkImportTabProps {
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  branches: Branch[];
  inventory: BranchInventory[];
  currentUser: User;
  onCommitProducts: (newProducts: Product[], importRecord: DataImportRecord) => void;
  onCommitCustomers: (newCustomers: Customer[], importRecord: DataImportRecord) => void;
  onCommitSuppliers: (newSuppliers: Supplier[], importRecord: DataImportRecord) => void;
  onCommitOpeningStock: (
    updatedInventory: BranchInventory[],
    movements: StockMovement[],
    importRecord: DataImportRecord
  ) => void;
}

export const BulkImportTab: React.FC<BulkImportTabProps> = ({
  products,
  customers,
  suppliers,
  branches,
  inventory,
  currentUser,
  onCommitProducts,
  onCommitCustomers,
  onCommitSuppliers,
  onCommitOpeningStock
}) => {
  const [selectedType, setSelectedType] = useState<DataImportType>('PRODUCTS');
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    currentUser.branchId || branches[0]?.id || 'br-1'
  );

  // File Upload State
  const [fileName, setFileName] = useState<string>('');
  const [rawCsvText, setRawCsvText] = useState<string>('');
  const [validations, setValidations] = useState<ImportRowValidation[]>([]);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'VALID' | 'INVALID'>('ALL');

  // Confirmation Modal & Processing
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<{
    status: 'SUCCESS' | 'PARTIAL' | 'ERROR';
    message: string;
    importedCount: number;
    failedCount: number;
    importReference: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isCEO = currentUser.role === 'CEO';
  const isBranchManager = currentUser.role === 'BRANCH_MANAGER';
  const canImport = isCEO || isBranchManager;

  // Change type reset
  const handleTypeChange = (type: DataImportType) => {
    setSelectedType(type);
    setFileName('');
    setRawCsvText('');
    setValidations([]);
    setImportResult(null);
  };

  // Download Sample Template
  const handleDownloadTemplate = () => {
    const csvContent = getSampleCsvTemplate(selectedType);
    const filename = `royal_agro_template_${selectedType.toLowerCase()}_sample.csv`;
    downloadCsvFile(filename, csvContent);
  };

  // Handle File Input
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = (event.target?.result as string) || '';
      setRawCsvText(text);
      runValidation(text, selectedType);
    };
    reader.readAsText(file);
  };

  // Run validation on parsed rows
  const runValidation = (csvText: string, type: DataImportType) => {
    const { rows } = parseCSV(csvText);

    if (rows.length === 0) {
      setValidations([]);
      return;
    }

    let validationResults: ImportRowValidation[] = [];

    switch (type) {
      case 'PRODUCTS':
        validationResults = validateProductRows(rows, products);
        break;
      case 'CUSTOMERS':
        validationResults = validateCustomerRows(rows, customers, selectedBranchId);
        break;
      case 'SUPPLIERS':
        validationResults = validateSupplierRows(rows, suppliers);
        break;
      case 'OPENING_STOCK':
        validationResults = validateOpeningStockRows(rows, products, branches);
        break;
    }

    setValidations(validationResults);
    setActiveFilter('ALL');
  };

  // Download Error CSV
  const handleDownloadErrors = () => {
    const errorCsv = generateErrorReportCSV(selectedType, validations);
    if (!errorCsv) return;
    const errFileName = `import_errors_${selectedType.toLowerCase()}_${Date.now()}.csv`;
    downloadCsvFile(errFileName, errorCsv);
  };

  // Execute Commit
  const handleConfirmCommit = () => {
    const validRows = validations.filter((v) => v.isValid && v.parsed);
    if (validRows.length === 0) return;

    setIsProcessing(true);

    const importBatchRef = `IMP-${selectedType.slice(0, 4)}-${Date.now().toString().slice(-6)}`;
    const nowIso = new Date().toISOString();

    const targetBranch = branches.find((b) => b.id === selectedBranchId);

    const importRecord: DataImportRecord = {
      id: `imp-batch-${Date.now()}`,
      importReference: importBatchRef,
      importType: selectedType,
      fileName: fileName || 'uploaded_batch.csv',
      totalRows: validations.length,
      validRows: validRows.length,
      importedRows: validRows.length,
      skippedRows: validations.length - validRows.length,
      failedRows: validations.length - validRows.length,
      performedByUserId: currentUser.id,
      performedByUserName: currentUser.name,
      branchId: targetBranch?.id,
      branchName: targetBranch?.name,
      status: validRows.length === validations.length ? 'COMPLETED' : 'PARTIAL',
      summaryNotes: `Imported ${validRows.length} ${selectedType.toLowerCase()} records via CSV batch ${importBatchRef}`,
      createdAt: nowIso.replace('T', ' ').slice(0, 19),
      syncStatus: navigator.onLine ? 'synced' : 'pending_verification',
      isOfflineRecord: !navigator.onLine
    };

    try {
      if (selectedType === 'PRODUCTS') {
        const newProds = validRows.map((v) => v.parsed as Product);
        onCommitProducts(newProds, importRecord);
      } else if (selectedType === 'CUSTOMERS') {
        const newCusts = validRows.map((v) => v.parsed as Customer);
        onCommitCustomers(newCusts, importRecord);
      } else if (selectedType === 'SUPPLIERS') {
        const newSups = validRows.map((v) => v.parsed as Supplier);
        onCommitSuppliers(newSups, importRecord);
      } else if (selectedType === 'OPENING_STOCK') {
        const stockItems = validRows.map((v) => v.parsed as OpeningStockImportItem);
        const { updatedInventory, movements, successfulCount } = processOpeningStockCommit(
          stockItems,
          inventory,
          products,
          branches,
          currentUser.id,
          currentUser.name,
          importBatchRef
        );
        importRecord.importedRows = successfulCount;
        onCommitOpeningStock(updatedInventory, movements, importRecord);
      }

      setImportResult({
        status: validRows.length === validations.length ? 'SUCCESS' : 'PARTIAL',
        message: `Successfully imported ${validRows.length} out of ${validations.length} records.`,
        importedCount: validRows.length,
        failedCount: validations.length - validRows.length,
        importReference: importBatchRef
      });

      // Clear preview
      setValidations([]);
      setFileName('');
      setRawCsvText('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error('Import commit error:', err);
      setImportResult({
        status: 'ERROR',
        message: 'An error occurred while committing the imported records.',
        importedCount: 0,
        failedCount: validRows.length,
        importReference: importBatchRef
      });
    } finally {
      setIsProcessing(false);
      setIsConfirmModalOpen(false);
    }
  };

  const validCount = validations.filter((v) => v.isValid).length;
  const invalidCount = validations.filter((v) => !v.isValid).length;

  const displayedRows = validations.filter((v) => {
    if (activeFilter === 'VALID') return v.isValid;
    if (activeFilter === 'INVALID') return !v.isValid;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Role Access Check */}
      {!canImport && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 text-amber-800">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="text-xs font-semibold">
            Bulk data import is restricted to authorized Branch Managers and the CEO / Super Administrator.
          </p>
        </div>
      )}

      {/* Success Banner */}
      {importResult && (
        <div
          className={`p-5 rounded-xl border flex items-start justify-between gap-4 animate-in fade-in ${
            importResult.status === 'SUCCESS'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : importResult.status === 'PARTIAL'
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-start gap-3">
            {importResult.status === 'SUCCESS' ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
            ) : importResult.status === 'PARTIAL' ? (
              <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
            ) : (
              <XCircle className="w-6 h-6 text-rose-600 shrink-0" />
            )}
            <div>
              <h4 className="font-bold text-sm">
                Import Batch Completed • Reference: {importResult.importReference}
              </h4>
              <p className="text-xs mt-0.5">{importResult.message}</p>
              <div className="flex items-center gap-4 mt-2 text-xs font-semibold">
                <span className="text-emerald-700">✓ {importResult.importedCount} Records Committed</span>
                {importResult.failedCount > 0 && (
                  <span className="text-rose-700">✗ {importResult.failedCount} Records Skipped</span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={() => setImportResult(null)}
            className="text-stone-400 hover:text-stone-700 text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* STEP 1: Select Entity Type & Download Template */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-stone-100 bg-stone-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-sm">
              Step 1 of 3
            </span>
            <h3 className="font-bold text-stone-900 text-base mt-1">Select Record Type & Template</h3>
            <p className="text-xs text-stone-500">
              Download the official Royal Agro formatted CSV template before uploading records
            </p>
          </div>

          <button
            onClick={handleDownloadTemplate}
            className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors shrink-0"
          >
            <Download className="w-4 h-4 text-emerald-700" /> Download Sample CSV Template
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              type="button"
              onClick={() => handleTypeChange('PRODUCTS')}
              className={`p-4 rounded-xl border text-left transition-all ${
                selectedType === 'PRODUCTS'
                  ? 'border-emerald-600 bg-emerald-50/70 shadow-xs'
                  : 'border-stone-200 hover:border-stone-300'
              }`}
            >
              <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold mb-2">
                <Package className="w-5 h-5" />
              </div>
              <p className="font-bold text-stone-900 text-xs">Products & Seeds</p>
              <p className="text-[11px] text-stone-500 mt-0.5">SKUs, varieties, packaging, selling & cost prices</p>
            </button>

            <button
              type="button"
              onClick={() => handleTypeChange('CUSTOMERS')}
              className={`p-4 rounded-xl border text-left transition-all ${
                selectedType === 'CUSTOMERS'
                  ? 'border-emerald-600 bg-emerald-50/70 shadow-xs'
                  : 'border-stone-200 hover:border-stone-300'
              }`}
            >
              <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold mb-2">
                <Users className="w-5 h-5" />
              </div>
              <p className="font-bold text-stone-900 text-xs">Farmers & Customers</p>
              <p className="text-[11px] text-stone-500 mt-0.5">Farmer phone, hub address, credit limit</p>
            </button>

            <button
              type="button"
              onClick={() => handleTypeChange('SUPPLIERS')}
              className={`p-4 rounded-xl border text-left transition-all ${
                selectedType === 'SUPPLIERS'
                  ? 'border-emerald-600 bg-emerald-50/70 shadow-xs'
                  : 'border-stone-200 hover:border-stone-300'
              }`}
            >
              <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center font-bold mb-2">
                <Truck className="w-5 h-5" />
              </div>
              <p className="font-bold text-stone-900 text-xs">Agro Suppliers</p>
              <p className="text-[11px] text-stone-500 mt-0.5">Seed breeding companies, chemical vendors, TIN</p>
            </button>

            <button
              type="button"
              onClick={() => handleTypeChange('OPENING_STOCK')}
              className={`p-4 rounded-xl border text-left transition-all ${
                selectedType === 'OPENING_STOCK'
                  ? 'border-emerald-600 bg-emerald-50/70 shadow-xs'
                  : 'border-stone-200 hover:border-stone-300'
              }`}
            >
              <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold mb-2">
                <Boxes className="w-5 h-5" />
              </div>
              <p className="font-bold text-stone-900 text-xs">Opening Stock Balances</p>
              <p className="text-[11px] text-stone-500 mt-0.5">Controlled warehouse stock initialization with audit trail</p>
            </button>
          </div>

          {selectedType === 'OPENING_STOCK' && (
            <div className="mt-4 p-3.5 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3 text-xs text-amber-900">
              <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Opening Stock Audit Compliance Guarantee</p>
                <p className="mt-0.5 text-amber-800">
                  Opening stock does NOT overwrite historical quantities or create sales/purchases.
                  It generates official Stock Movement records of type <code>ADJUSTMENT_IN</code> linked
                  to your import batch reference, preserving an auditable ledger for each warehouse depot.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* STEP 2: Upload CSV File */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-stone-100 bg-stone-50/70">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-sm">
            Step 2 of 3
          </span>
          <h3 className="font-bold text-stone-900 text-base mt-1">Select and Upload CSV File</h3>
          <p className="text-xs text-stone-500">
            Files are validated immediately in-browser against existing database records and duplicates
          </p>
        </div>

        <div className="p-6">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-stone-300 hover:border-emerald-500 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-stone-50/50 hover:bg-emerald-50/20"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3">
              <Upload className="w-6 h-6" />
            </div>
            <p className="font-bold text-sm text-stone-800">
              {fileName ? `Selected File: ${fileName}` : 'Click to Browse or Drag CSV File Here'}
            </p>
            <p className="text-xs text-stone-500 mt-1">
              Supports .csv files up to 10MB (UTF-8 encoding recommended)
            </p>
            {fileName && (
              <span className="inline-block mt-3 px-3 py-1 bg-stone-200 text-stone-800 rounded-full text-xs font-semibold">
                Click to choose another file
              </span>
            )}
          </div>
        </div>
      </div>

      {/* STEP 3: Preview & Validation Table */}
      {validations.length > 0 && (
        <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden animate-in fade-in">
          <div className="p-5 border-b border-stone-100 bg-stone-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-sm">
                Step 3 of 3
              </span>
              <h3 className="font-bold text-stone-900 text-base mt-1">Validation & Pre-Commit Preview</h3>
              <p className="text-xs text-stone-500">
                Review verified rows and any errors before committing to the database
              </p>
            </div>

            <div className="flex items-center gap-3">
              {invalidCount > 0 && (
                <button
                  type="button"
                  onClick={handleDownloadErrors}
                  className="px-3.5 py-1.5 rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <FileDown className="w-4 h-4 text-rose-600" /> Download Error Report CSV ({invalidCount})
                </button>
              )}

              <button
                type="button"
                disabled={validCount === 0 || isProcessing}
                onClick={() => setIsConfirmModalOpen(true)}
                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-300 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors shrink-0"
              >
                <CheckCircle2 className="w-4 h-4" /> Commit Valid Records ({validCount})
              </button>
            </div>
          </div>

          {/* Validation Metrics Bar */}
          <div className="p-4 bg-stone-100/70 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-4">
              <span className="font-bold text-stone-700">Total Rows: {validations.length}</span>
              <span className="font-bold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Valid: {validCount}
              </span>
              {invalidCount > 0 && (
                <span className="font-bold text-rose-700 flex items-center gap-1">
                  <XCircle className="w-4 h-4" /> Invalid: {invalidCount}
                </span>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center bg-white p-0.5 rounded-lg border border-stone-300 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveFilter('ALL')}
                className={`px-3 py-1 rounded-md transition-all ${
                  activeFilter === 'ALL' ? 'bg-stone-800 text-white' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                All ({validations.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('VALID')}
                className={`px-3 py-1 rounded-md transition-all ${
                  activeFilter === 'VALID' ? 'bg-emerald-700 text-white' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Valid Only ({validCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('INVALID')}
                className={`px-3 py-1 rounded-md transition-all ${
                  activeFilter === 'INVALID' ? 'bg-rose-700 text-white' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Errors Only ({invalidCount})
              </button>
            </div>
          </div>

          {/* Preview Table */}
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-700 font-bold sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3 w-16">Row #</th>
                  <th className="py-2.5 px-3 w-28">Status</th>
                  <th className="py-2.5 px-3">Primary Identifier</th>
                  <th className="py-2.5 px-3">Parsed Details</th>
                  <th className="py-2.5 px-3">Validation Message / Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {displayedRows.map((v) => (
                  <tr
                    key={v.rowNumber}
                    className={`hover:bg-stone-50 transition-colors ${
                      !v.isValid ? 'bg-rose-50/40' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 font-mono text-stone-500 font-bold">{v.rowNumber}</td>
                    <td className="py-2.5 px-3">
                      {v.isValid ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3" /> Valid
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                          <XCircle className="w-3 h-3" /> Error
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-stone-900">
                      {selectedType === 'PRODUCTS' && (v.raw.sku || v.raw.SKU || 'N/A')}
                      {selectedType === 'CUSTOMERS' && (v.raw.phone || v.raw.fullName || 'N/A')}
                      {selectedType === 'SUPPLIERS' && (v.raw.name || v.raw.supplierName || 'N/A')}
                      {selectedType === 'OPENING_STOCK' &&
                        `${v.raw.productSku || v.raw.sku} @ ${v.raw.branchCode || v.raw.branch}`}
                    </td>
                    <td className="py-2.5 px-3 text-stone-700">
                      {selectedType === 'PRODUCTS' && (
                        <span>
                          {v.raw.name} • {v.raw.category} • ₦{parseFloat(v.raw.sellingPrice || '0').toLocaleString()}
                        </span>
                      )}
                      {selectedType === 'CUSTOMERS' && (
                        <span>
                          {v.raw.fullName} • {v.raw.state} • Limit: ₦{parseFloat(v.raw.creditLimit || '0').toLocaleString()}
                        </span>
                      )}
                      {selectedType === 'SUPPLIERS' && (
                        <span>
                          {v.raw.name} • Contact: {v.raw.contactPerson} • {v.raw.phone}
                        </span>
                      )}
                      {selectedType === 'OPENING_STOCK' && (
                        <span>
                          Qty: {v.raw.quantity} • Cost: ₦{parseFloat(v.raw.unitCost || '0').toLocaleString()} • Batch: {v.raw.batchNumber || 'N/A'}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-xs">
                      {v.errors.length > 0 && (
                        <p className="text-rose-700 font-semibold">{v.errors.join(' • ')}</p>
                      )}
                      {v.warnings.length > 0 && (
                        <p className="text-amber-700 text-[11px] mt-0.5">⚠️ {v.warnings.join(' • ')}</p>
                      )}
                      {v.isValid && v.warnings.length === 0 && (
                        <span className="text-emerald-700 text-[11px]">Ready to commit</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-emerald-700">
              <CheckCircle2 className="w-8 h-8 shrink-0" />
              <div>
                <h3 className="font-bold text-stone-900 text-base">Confirm Bulk Import Commit</h3>
                <p className="text-xs text-stone-500">Record Type: {selectedType}</p>
              </div>
            </div>

            <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-stone-600">Total Valid Rows to Commit:</span>
                <span className="font-bold text-emerald-800 text-sm">{validCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-600">Invalid Rows to be Skipped:</span>
                <span className="font-bold text-rose-700">{invalidCount}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-stone-200">
                <span className="text-stone-600">Import Batch Ref:</span>
                <span className="font-mono font-bold text-stone-900">
                  IMP-{selectedType.slice(0, 4)}-{Date.now().toString().slice(-6)}
                </span>
              </div>
            </div>

            {selectedType === 'OPENING_STOCK' && (
              <p className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                Stock movements will be generated for each valid row. Discrepancies and invalid SKU rows
                will be skipped safely.
              </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-stone-300 text-stone-700 text-xs font-bold hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmCommit}
                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-xs"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Committing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Confirm & Commit Records
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
