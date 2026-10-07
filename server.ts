import express, { Request, Response } from 'express';
import { chequeRouter } from './server/routes/cheques';
import { templateRouter } from './server/routes/templates';
import { userRouter } from './server/routes/users';
import { logRouter } from './server/routes/logs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  // Body parser middleware
  app.use(express.json());

  // API Routes (Backend)
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'Cheque Management System API',
      timestamp: new Date().toISOString(),
      version: '2.4.0',
    });
  });

  app.use('/api/cheques', chequeRouter);
  app.use('/api/templates', templateRouter);
  app.use('/api/users', userRouter);
  app.use('/api/logs', logRouter);

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
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Full-Stack Server] Server running at http://0.0.0.0:${PORT} (Mode: ${isProd ? 'Production' : 'Development'})`);
  });
}

startServer().catch((err) => {
  console.error('[Full-Stack Server] Failed to start server:', err);
  process.exit(1);
});
