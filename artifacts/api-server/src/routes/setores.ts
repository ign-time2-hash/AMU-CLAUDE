import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { actor } from '../middleware/actor.js';
import { requireRole } from '../middleware/require-role.js';

export const setoresRouter = Router();

setoresRouter.use(actor);

setoresRouter.get('/', async (req, res) => {
  const mapaIdStr = req.query['mapaId'] as string | undefined;
  const mapaId = mapaIdStr ? parseInt(mapaIdStr) : undefined;

  const setores = await db.setor.findMany({
    ...(mapaId != null ? { where: { idMapa: mapaId } } : {}),
    include: { labs: true },
    orderBy: { name: 'asc' },
  });
  res.json(setores);
});

setoresRouter.patch('/:id/coords', requireRole('planejador'), async (req, res) => {
  const id = parseInt((req.params['id'] as string) ?? '');
  const schema = z.object({
    actorUsername: z.string(),
    mapX: z.number().nullable().optional(),
    mapY: z.number().nullable().optional(),
  });
  const parse = schema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0]?.message });
    return;
  }
  const { actorUsername: _, mapX, mapY } = parse.data;
  const clamp = (v: number | null | undefined) =>
    v != null ? Math.max(0, Math.min(100, v)) : null;

  const setor = await db.setor.update({
    where: { id },
    data: {
      ...(mapX !== undefined ? { mapX: clamp(mapX) } : {}),
      ...(mapY !== undefined ? { mapY: clamp(mapY) } : {}),
    },
  });
  res.json(setor);
});