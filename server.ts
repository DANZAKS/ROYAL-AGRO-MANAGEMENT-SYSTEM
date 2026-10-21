import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // In-memory server backup archive index and temporary store
  interface ServerBackupEntry {
    id: string;
    timestamp: string;
    appName: string;
    schemaVersion: string;
    performedBy: string;
    userRole: string;
    details: string;
    recordsCount: number;
    fileSizeBytes: number;
    checksum: string;
    data: any;
  }

  const serverBackups: ServerBackupEntry[] = [];

  // API Health Check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      system: 'Royal Agro Management System API',
      timestamp: new Date().toISOString()
    });
  });

  // Example API info endpoint
  app.get('/api/info', (req, res) => {
    res.json({
      name: 'Royal Agro Management System',
      version: '1.4.0',
      company: 'Royal Agro Agricultural Corp',
      modules: [
        'Authentication & User Management',
        'Multi-Branch Management',
        'CEO Dashboard & Analytics',
        'Product & Seed Variety Management',
        'Branch Inventory & Stock Movements',
        'POS & Receipt Generation',
        'Customer Directory',
        'Supplier & Purchase Receiving',
        'Inter-Branch Stock Transfer',
        'Expense Tracking',
        'Reports & Analytics',
        'Notification Center',
        'Audit Logging',
        'Backup, Restore & Disaster Recovery (Module 14)'
      ]
    });
  });

  // MODULE 14: Server Backup Endpoints
  // 1. Create/Archive Server Backup (Restricted to CEO)
  app.post('/api/backup/create', (req, res) => {
    const userRole = req.headers['x-user-role'];
    if (userRole !== 'CEO') {
      res.status(403).json({ error: 'Access Denied: Only CEO / Super Admin can archive server backups.' });
      return;
    }

    const backupPackage = req.body;
    if (!backupPackage || !backupPackage.metadata || !backupPackage.data) {
      res.status(400).json({ error: 'Invalid backup package payload: missing metadata or data.' });
      return;
    }

    const { metadata } = backupPackage;
    const entry: ServerBackupEntry = {
      id: metadata.id || `srv-backup-${Date.now()}`,
      timestamp: metadata.createdAt || new Date().toISOString(),
      appName: metadata.appName || 'Royal Agro Management System',
      schemaVersion: metadata.schemaVersion || '1.4.0',
      performedBy: metadata.createdByUserName || 'Administrator',
      userRole: metadata.createdByUserRole || 'CEO',
      details: metadata.description || 'Server archived backup',
      recordsCount: metadata.totalRecords || 0,
      fileSizeBytes: metadata.fileSizeBytes || JSON.stringify(backupPackage).length,
      checksum: metadata.checksum || 'server_verified',
      data: backupPackage.data
    };

    serverBackups.unshift(entry);
    // Keep max 20 snapshots in memory
    if (serverBackups.length > 20) {
      serverBackups.pop();
    }

    res.json({
      success: true,
      backupId: entry.id,
      timestamp: entry.timestamp,
      recordsCount: entry.recordsCount,
      message: 'Server backup successfully archived in server repository.'
    });
  });

  // 2. Fetch Server Backup History
  app.get('/api/backup/history', (req, res) => {
    const historyList = serverBackups.map(b => ({
      id: b.id,
      timestamp: b.timestamp,
      type: 'MANUAL_BACKUP',
      status: 'SUCCESS',
      performedBy: b.performedBy,
      userRole: b.userRole,
      details: b.details,
      recordsCount: b.recordsCount,
      fileSizeBytes: b.fileSizeBytes,
      checksum: b.checksum
    }));

    res.json({
      backups: historyList,
      totalCount: historyList.length,
      serverStorageStatus: 'ACTIVE'
    });
  });

  // 3. Verify Backup Integrity
  app.post('/api/backup/verify', (req, res) => {
    const pkg = req.body;
    if (!pkg || !pkg.metadata || !pkg.data) {
      res.status(400).json({ valid: false, errors: ['Missing metadata or data structures.'] });
      return;
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    if (!pkg.metadata.schemaVersion?.startsWith('1.')) {
      errors.push(`Incompatible schema version: ${pkg.metadata.schemaVersion}`);
    }

    if (!pkg.data.products && !pkg.data.sales) {
      warnings.push('Backup contains empty primary sales and products datasets.');
    }

    res.json({
      valid: errors.length === 0,
      errors,
      warnings,
      metadata: pkg.metadata
    });
  });

  // 4. Download Specific Server Backup
  app.get('/api/backup/download/:id', (req, res) => {
    const backupId = req.params.id;
    const found = serverBackups.find(b => b.id === backupId);
    if (!found) {
      res.status(404).json({ error: 'Server backup not found.' });
      return;
    }

    const pkg = {
      metadata: {
        id: found.id,
        createdAt: found.timestamp,
        appName: found.appName,
        appVersion: '1.4.0',
        schemaVersion: found.schemaVersion,
        createdByUserName: found.performedBy,
        createdByUserRole: found.userRole,
        backupScope: 'FULL_SYSTEM',
        isOfflineSnapshot: false,
        checksum: found.checksum,
        totalRecords: found.recordsCount,
        description: found.details
      },
      data: found.data
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="royal_agro_server_backup_${found.id}.json"`);
    res.send(JSON.stringify(pkg, null, 2));
  });

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Royal Agro Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Royal Agro server:', err);
});
