import { Router, Request, Response } from 'express';
import { mysqlTemplates } from '../db/mysql';
import { BankType } from '../../src/types/index';

export const templateRouter = Router();

// GET /api/templates - ดึงการตั้งค่าพิกัดเช็คธนาคารจาก MySQL
templateRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const templates = await mysqlTemplates.getAll();
    res.json({ success: true, data: templates });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/templates/:bankType - บันทึกการตั้งค่าพิกัดเช็คธนาคารลง MySQL
templateRouter.put('/:bankType', async (req: Request, res: Response) => {
  const { bankType } = req.params;
  const config = req.body;
  if (!config) {
    return res.status(400).json({ success: false, message: 'ข้อมูลการตั้งค่าไม่ถูกต้อง' });
  }

  try {
    const saved = await mysqlTemplates.save(bankType as BankType, config);
    res.json({ success: true, data: saved });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/templates/reset - รีเซ็ตพิกัดเช็คเป็นค่าเริ่มต้น
templateRouter.post('/reset', async (_req: Request, res: Response) => {
  try {
    const defaultTemplates = await mysqlTemplates.reset();
    res.json({ success: true, data: defaultTemplates, message: 'รีเซ็ตพิกัดเช็คเป็นค่าเริ่มต้นเรียบร้อยแล้ว' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});
