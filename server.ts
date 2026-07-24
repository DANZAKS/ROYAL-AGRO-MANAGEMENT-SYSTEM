import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

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
      version: '1.0.0',
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
        'Audit Logging'
      ]
    });
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
