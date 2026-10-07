import { Router, Request, Response } from 'express';
import { db } from '../db/memoryDb';

export const chequeRouter = Router();

// GET /api/cheques
chequeRouter.get('/', (req: Request, res: Response) => {
  const { fiscalYear, status, q } = req.query;
  const filter = {
    fiscalYear: fiscalYear && fiscalYear !== 'ALL' ? Number(fiscalYear) : undefined,
    status: status as string,
    search: q as string,
  };
  const cheques = db.getCheques(filter);
  res.json({ success: true, data: cheques, count: cheques.length });
});

// GET /api/cheques/:id
chequeRouter.get('/:id', (req: Request, res: Response) => {
  const cheque = db.getChequeById(req.params.id);
  if (!cheque) {
    return res.status(404).json({ success: false, message: 'Cheque not found' });
  }
  res.json({ success: true, data: cheque });
});

// POST /api/cheques (Create or update)
chequeRouter.post('/', (req: Request, res: Response) => {
  const { cheque, operator } = req.body;
  if (!cheque || !cheque.chequePayeeName) {
    return res.status(400).json({ success: false, message: 'Payee name is required' });
  }
  const operatorName = operator?.fullName || 'ผู้ดูแลระบบ';
  const saved = db.saveCheque(cheque, operatorName);
  res.json({ success: true, data: saved });
});

// POST /api/cheques/:id/void
chequeRouter.post('/:id/void', (req: Request, res: Response) => {
  const { reason, operator } = req.body;
  const operatorName = operator?.fullName || 'ผู้ดูแลระบบ';
  const voided = db.voidCheque(req.params.id, reason, operatorName);
  if (!voided) {
    return res.status(404).json({ success: false, message: 'Cheque not found' });
  }
  res.json({ success: true, data: voided });
});

// DELETE /api/cheques/:id
chequeRouter.delete('/:id', (req: Request, res: Response) => {
  const success = db.deleteCheque(req.params.id);
  if (!success) {
    return res.status(404).json({ success: false, message: 'Cheque not found' });
  }
  res.json({ success: true, message: 'Cheque deleted successfully' });
});
