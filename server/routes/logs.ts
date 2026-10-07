import { Router, Request, Response } from 'express';
import { mysqlPrintLogs, mysqlAuditLogs } from '../db/mysql';
import { ChequePrintLog } from '../../src/types/index';

export const logRouter = Router();

// GET /api/logs/print - ดึงประวัติการพิมพ์เช็คจาก MySQL
logRouter.get('/print', async (req: Request, res: Response) => {
  const { chequeId } = req.query;
  try {
    const logs = await mysqlPrintLogs.getAll(chequeId as string);
    res.json({ success: true, data: logs, count: logs.length });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/logs/print - บันทึกประวัติการพิมพ์เช็คลง MySQL
logRouter.post('/print', async (req: Request, res: Response) => {
  const logData: ChequePrintLog = req.body;
  if (!logData || !logData.chequeId) {
    return res.status(400).json({ success: false, message: 'Invalid print log data' });
  }

  try {
    const saved = await mysqlPrintLogs.add({
      ...logData,
      id: logData.id || `prt_${Date.now()}`,
      printedAt: logData.printedAt || new Date().toISOString(),
    });
    res.json({ success: true, data: saved });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/logs/audit - ดึง Audit Logs จาก MySQL
logRouter.get('/audit', async (_req: Request, res: Response) => {
  try {
    const auditLogs = await mysqlAuditLogs.getAll();
    res.json({ success: true, data: auditLogs, count: auditLogs.length });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/logs/audit - บันทึก Audit Log จากระบบ
logRouter.post('/audit', async (req: Request, res: Response) => {
  const log = req.body;
  if (!log || !log.action || !log.target) {
    return res.status(400).json({ success: false, message: 'Invalid audit log data' });
  }
  try {
    const saved = await mysqlAuditLogs.add({
      ...log,
      id: log.id || `audit_${Date.now()}`,
      timestamp: log.timestamp || new Date().toISOString(),
    });
    res.json({ success: true, data: saved });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});
