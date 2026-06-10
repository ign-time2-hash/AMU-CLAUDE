import { Router } from 'express';
import { db } from '../db.js';

export const systemRouter = Router();

systemRouter.get('/healthz', async (_req, res) => {
  try {
    await db.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'connected' });
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});

systemRouter.get('/demo', (_req, res) => {
  res.json({
    name: 'AMU',
    version: '1.0.0',
    description: 'Sistema de gestão de manutenção de laboratórios industriais',
  });
});
