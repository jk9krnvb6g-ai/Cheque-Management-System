import { Router, Request, Response } from 'express';
import { db } from '../db/memoryDb';
import { ChequePrintLog } from '../../src/types/index';

export const logRouter = Router();

// GET /api/logs/print
logRouter.get('/print', (req: Request, res: Response) => {
  const { chequeId } = req.query;
  const logs = db.getPrintLogs(chequeId as string);
  res.json({ success: true, data: logs });
});

// POST /api/logs/print
logRouter.post('/print', (req: Request, res: Response) => {
  const logData: ChequePrintLog = req.body;
  if (!logData || !logData.chequeId) {
    return res.status(400).json({ success: false, message: 'Invalid print log data' });
  }
  const saved = db.addPrintLog({
    ...logData,
    id: logData.id || `prt_${Date.now()}`,
    printedAt: new Date().toISOString(),
  });
  res.json({ success: true, data: saved });
});

// GET /api/logs/audit
logRouter.get('/audit', (_req: Request, res: Response) => {
  const auditLogs = db.getAuditLogs();
  res.json({ success: true, data: auditLogs });
});
