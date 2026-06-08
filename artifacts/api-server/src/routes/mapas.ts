import { Router } from 'express';
import { db } from '../db.js';
import { actor } from '../middleware/actor.js';

export const mapasRouter = Router();

mapasRouter.use(actor);

mapasRouter.get('/', async (_req, res) => {
  const mapas = await db.mapa.findMany({ orderBy: { id: 'asc' } });
  res.json(mapas);
});