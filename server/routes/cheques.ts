import { Router, Request, Response } from 'express';
import { mysqlCheques, mysqlAuditLogs } from '../db/mysql';
import { Cheque } from '../../src/types/index';

export const chequeRouter = Router();

// GET /api/cheques - ดึงข้อมูลเช็คทั้งหมดจาก MySQL 10.1.0.201
chequeRouter.get('/', async (req: Request, res: Response) => {
  const { fiscalYear, status, q } = req.query;
  const filter = {
    fiscalYear: fiscalYear && fiscalYear !== 'ALL' ? Number(fiscalYear) : undefined,
    status: status as string,
    search: q as string,
  };
  try {
    const cheques = await mysqlCheques.getAll(filter);
    res.json({ success: true, data: cheques, count: cheques.length });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/cheques/:id - ดึงข้อมูลเช็คใบเดียว
chequeRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const cheque = await mysqlCheques.getById(req.params.id);
    if (!cheque) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลเช็ค' });
    }
    res.json({ success: true, data: cheque });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/cheques - เพิ่มหรือแก้ไขข้อมูลเช็คใน MySQL
chequeRouter.post('/', async (req: Request, res: Response) => {
  const { cheque, operator } = req.body;
  if (!cheque || !cheque.chequePayeeName) {
    return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อผู้รับเงิน' });
  }

  try {
    const saved = await mysqlCheques.save(cheque);

    // Audit log
    if (operator) {
      await mysqlAuditLogs.add({
        id: `audit_chq_${Date.now()}`,
        action: 'CREATE',
        target: `เช็คเลขที่: ${saved.chequeNumber || 'ร่าง'} (ฎีกา ${saved.dikaNumber || '-'})`,
        details: `${operator.fullName || 'ผู้ใช้งาน'} บันทึกข้อมูลเช็คสั่งจ่าย: ${saved.chequePayeeName} จำนวนเงิน ${Number(saved.totalAmount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`,
        username: operator.username || 'system',
        userFullName: operator.fullName || 'ผู้ใช้งาน',
        timestamp: new Date().toISOString(),
      });
    }

    res.json({ success: true, data: saved });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/cheques/:id/void - ยกเลิกเช็คใน MySQL
chequeRouter.post('/:id/void', async (req: Request, res: Response) => {
  const { reason, operator } = req.body;
  const operatorName = operator?.fullName || 'ผู้ใช้งาน';
  const username = operator?.username || 'system';

  try {
    const success = await mysqlCheques.voidCheque(req.params.id, reason || 'ยกเลิกเช็ค', operatorName);
    if (!success) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลเช็คที่ต้องการยกเลิก' });
    }

    const voided = await mysqlCheques.getById(req.params.id);

    if (operator && voided) {
      await mysqlAuditLogs.add({
        id: `audit_void_${Date.now()}`,
        action: 'UPDATE',
        target: `เช็คเลขที่: ${voided.chequeNumber || '-'}`,
        details: `${operator.fullName || 'ผู้ใช้งาน'} ยกเลิกเช็ค (VOID) เนื่องจาก: ${reason || 'ไม่ระบุเหตุผล'}`,
        username,
        userFullName: operatorName,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({ success: true, data: voided });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/cheques/:id - ลบเช็คใน MySQL
chequeRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const cheque = await mysqlCheques.getById(req.params.id);
    const success = await mysqlCheques.delete(req.params.id);
    if (!success) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลเช็ค' });
    }

    const operatorHeader = req.headers['x-operator'];
    let operator: any = null;
    if (operatorHeader) {
      try { operator = JSON.parse(operatorHeader as string); } catch {}
    }

    if (operator && cheque) {
      await mysqlAuditLogs.add({
        id: `audit_del_${Date.now()}`,
        action: 'DELETE',
        target: `เช็คเลขที่: ${cheque.chequeNumber || cheque.id}`,
        details: `${operator.fullName || 'Admin'} ลบข้อมูลเช็คสั่งจ่าย ${cheque.chequePayeeName}`,
        username: operator.username || 'admin',
        userFullName: operator.fullName || 'ผู้ดูแลระบบ',
        timestamp: new Date().toISOString(),
      });
    }

    res.json({ success: true, message: 'ลบข้อมูลเช็คสำเร็จ' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});
