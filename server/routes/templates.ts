import { Router, Request, Response } from 'express';
import { StorageService } from '../../src/utils/storage';

export const templateRouter = Router();

// In-memory templates cache on server
let templatesCache = StorageService.getDefaultTemplates();

// GET /api/templates
templateRouter.get('/', (_req: Request, res: Response) => {
  res.json({ success: true, data: templatesCache });
});

// PUT /api/templates/:bankType
templateRouter.put('/:bankType', (req: Request, res: Response) => {
  const { bankType } = req.params;
  const config = req.body;
  if (!config) {
    return res.status(400).json({ success: false, message: 'Invalid template config' });
  }
  templatesCache[bankType] = config;
  res.json({ success: true, data: templatesCache[bankType] });
});

// POST /api/templates/reset
templateRouter.post('/reset', (_req: Request, res: Response) => {
  templatesCache = StorageService.getDefaultTemplates();
  res.json({ success: true, data: templatesCache, message: 'Templates reset to default' });
});
