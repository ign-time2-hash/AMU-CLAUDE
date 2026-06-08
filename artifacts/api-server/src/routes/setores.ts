import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { actor } from '../middleware/actor.js';
import { requireRole } from '../middleware/require-role.js';

export const setoresRouter = Router();

setoresRouter.use(actor);

setoresRouter.get('/', async (_req, res) => {
  const setores = await db.setor.findMany({ include: { labs: true }, orderBy: { name: 'asc' } });
  res.json(setores);
});

setoresRouter.patch('/:id/coords', requireRole('planejador'), async (req, res) => {
  const id = parseInt(req.params['id'] ?? '');
  const schema = z.object({ actorUsername: z.string(), mapX: z.number().optional(), mapY: z.number().optional() });
  const parse = schema.safeParse(req.body);
  if (!parse.success) { res.status(400).json({ error: parse.error.errors[0]?.message }); return; }
  const { actorUsername: _, ...data } = parse.data;
  const setor = await db.setor.update({ where: { id }, data });
  res.json(setor);
});
