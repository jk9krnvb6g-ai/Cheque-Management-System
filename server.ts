import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import { chequeRouter } from './server/routes/cheques';
import { templateRouter } from './server/routes/templates';
import { userRouter } from './server/routes/users';
import { logRouter } from './server/routes/logs';
import { testConnection, getDbStatus, bulkPushToMysql, updateDbConfig, repairThaiCharset, DB_CONFIG } from './server/db/mysql';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  // PORT: Respect process.env.PORT (e.g. 3003 from start-backend.bat, or 3000 default)
  const PORT = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  // Enable CORS for IIS or any client origins
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-operator');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Body parser middleware
  app.use(express.json({ limit: '10mb' }));

  // API Health Check (Support /api, /Cash_Cheque/api, and /api/Cash_Cheque)
  const handleHealth = (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'Cheque Management System API',
      timestamp: new Date().toISOString(),
      version: '2.5.0',
      database: {
        targetHost: DB_CONFIG.host,
        port: DB_CONFIG.port,
        name: DB_CONFIG.database,
      },
    });
  };
  app.get('/api/health', handleHealth);
  app.get('/Cash_Cheque/api/health', handleHealth);
  app.get('/api/Cash_Cheque/health', handleHealth);

  // Database Connection Status endpoint
  const handleDbStatus = async (_req: Request, res: Response) => {
    try {
      const status = await getDbStatus();
      res.json({ success: true, ...status });
    } catch (err: any) {
      res.status(500).json({ success: false, connected: false, error: err.message });
    }
  };
  app.get('/api/db/status', handleDbStatus);
  app.get('/Cash_Cheque/api/db/status', handleDbStatus);
  app.get('/api/Cash_Cheque/db/status', handleDbStatus);

  // Database Connection Test endpoint
  const handleDbTest = async (_req: Request, res: Response) => {
    try {
      const connected = await testConnection(true);
      const status = await getDbStatus();
      res.json({ success: true, connected, status });
    } catch (err: any) {
      res.status(500).json({ success: false, connected: false, error: err.message });
    }
  };
  app.post('/api/db/test', handleDbTest);
  app.post('/Cash_Cheque/api/db/test', handleDbTest);
  app.post('/api/Cash_Cheque/db/test', handleDbTest);

  // Database Configuration Update endpoint
  const handleDbConfig = async (req: Request, res: Response) => {
    try {
      const result = await updateDbConfig(req.body);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  };
  app.post('/api/db/config', handleDbConfig);
  app.post('/Cash_Cheque/api/db/config', handleDbConfig);
  app.post('/api/Cash_Cheque/db/config', handleDbConfig);

  // Database Thai Charset & Mojibake Repair endpoint
  const handleDbRepair = async (_req: Request, res: Response) => {
    try {
      const result = await repairThaiCharset();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  };
  app.post('/api/db/repair', handleDbRepair);
  app.post('/Cash_Cheque/api/db/repair', handleDbRepair);
  app.post('/api/Cash_Cheque/db/repair', handleDbRepair);

  // Bulk push from browser local storage to MySQL
  const handleSyncPush = async (req: Request, res: Response) => {
    try {
      const payload = req.body;
      const result = await bulkPushToMysql(payload);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  };
  app.post('/api/sync/push', handleSyncPush);
  app.post('/Cash_Cheque/api/sync/push', handleSyncPush);
  app.post('/api/Cash_Cheque/sync/push', handleSyncPush);

  // Main CRUD Routes (Supports /api, /Cash_Cheque/api, and /api/Cash_Cheque)
  app.use('/api/cheques', chequeRouter);
  app.use('/Cash_Cheque/api/cheques', chequeRouter);
  app.use('/api/Cash_Cheque/cheques', chequeRouter);

  app.use('/api/templates', templateRouter);
  app.use('/Cash_Cheque/api/templates', templateRouter);
  app.use('/api/Cash_Cheque/templates', templateRouter);

  app.use('/api/users', userRouter);
  app.use('/Cash_Cheque/api/users', userRouter);
  app.use('/api/Cash_Cheque/users', userRouter);

  app.use('/api/logs', logRouter);
  app.use('/Cash_Cheque/api/logs', logRouter);
  app.use('/api/Cash_Cheque/logs', logRouter);

  // Frontend integration
  if (!isProd) {
    // In development mode, mount Vite middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production mode, serve built static assets from dist
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.use('/Cash_Cheque', express.static(distPath));
    app.get('/Cash_Cheque*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Initial connection test in background
  testConnection().then(connected => {
    if (connected) {
      console.log(`[MySQL 10.1.0.201] Connected successfully to database "${DB_CONFIG.database}"`);
    } else {
      console.warn(`[MySQL 10.1.0.201] Initial connection attempt: Offline or waiting. Fallback memory DB is ready.`);
    }
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Cash Cheque Server] Server running at http://0.0.0.0:${PORT} (Mode: ${isProd ? 'Production' : 'Development'})`);
    console.log(`[Cash Cheque Server] Full App URL: http://localhost:${PORT}/Cash_Cheque/`);
    console.log(`[Cash Cheque Server] API URL: http://localhost:${PORT}/api/health`);
  });
}

startServer().catch(err => {
  console.error('[Server Error]', err);
});
