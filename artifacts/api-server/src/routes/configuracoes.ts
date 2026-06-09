import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { actor } from '../middleware/actor.js';
import { requireRole } from '../middleware/require-role.js';

export const configuracoesRouter = Router();

configuracoesRouter.use(actor);
configuracoesRouter.use(requireRole('planejador'));

const setorSchema = z.object({
  actorUsername: z.string(),
  name: z.string().min(1),
  cenpes: z.enum(['cenpes_1', 'cenpes_2']).optional(),
});

const labSchema = z.object({
  actorUsername: z.string(),
  name: z.string().min(1),
  location: z.string().optional(),
  idSetor: z.number().int().positive().nullable().optional(),
});

configuracoesRouter.get('/setores', async (_req, res) => {
  const setores = await db.setor.findMany({ orderBy: { name: 'asc' } });
  res.json(setores);
});

configuracoesRouter.post('/setores', async (req, res) => {
  const parse = setorSchema.safeParse(req.body);
  if (!parse.success) { res.status(400).json({ error: parse.error.errors[0]?.message }); return; }
  const { actorUsername: _, ...data } = parse.data;
  const setor = await db.setor.create({ data });
  res.status(201).json(setor);
});

configuracoesRouter.patch('/setores/:id', async (req, res) => {
  const id = parseInt(req.params['id'] ?? '');
  const patchSchema = setorSchema.partial().required({ actorUsername: true });
  const parse = patchSchema.safeParse(req.body);
  if (!parse.success) { res.status(400).json({ error: parse.error.errors[0]?.message }); return; }
  const { actorUsername: _, ...data } = parse.data;
  const setor = await db.setor.update({ where: { id }, data });
  res.json(setor);
});

configuracoesRouter.delete('/setores/:id', async (req, res) => {
  const id = parseInt(req.params['id'] ?? '');
  await db.setor.delete({ where: { id } });
  res.status(204).end();
});

configuracoesRouter.get('/labs', async (_req, res) => {
  const labs = await db.lab.findMany({ include: { setor: true }, orderBy: { name: 'asc' } });
  res.json(labs);
});

configuracoesRouter.post('/labs', async (req, res) => {
  const parse = labSchema.safeParse(req.body);
  if (!parse.success) { res.status(400).json({ error: parse.error.errors[0]?.message }); return; }
  const { actorUsername: _, ...data } = parse.data;
  const lab = await db.lab.create({ data });
  res.status(201).json(lab);
});

configuracoesRouter.get('/labs/:id', async (req, res) => {
  const id = parseInt(req.params['id'] ?? '');
  const lab = await db.lab.findUnique({ where: { id }, include: { setor: true } });
  if (!lab) { res.status(404).json({ error: 'Laboratório não encontrado' }); return; }
  res.json(lab);
});

configuracoesRouter.patch('/labs/:id', async (req, res) => {
  const id = parseInt(req.params['id'] ?? '');
  const patchSchema = labSchema.partial().required({ actorUsername: true });
  const parse = patchSchema.safeParse(req.body);
  if (!parse.success) { res.status(400).json({ error: parse.error.errors[0]?.message }); return; }
  const { actorUsername: _, ...data } = parse.data;
  const lab = await db.lab.update({ where: { id }, data });
  res.json(lab);
});

configuracoesRouter.delete('/labs/:id', async (req, res) => {
  const id = parseInt(req.params['id'] ?? '');
  await db.lab.delete({ where: { id } });
  res.status(204).end();
});

configuracoesRouter.get('/usuarios', async (_req, res) => {
  const users = await db.user.findMany({ orderBy: { name: 'asc' } });
  res.json(users.map(({ passwordHash: _, ...u }) => u));
});

configuracoesRouter.patch('/usuarios/:username', async (req, res) => {
  const { username } = req.params;
  const parse = z.object({ actorUsername: z.string(), active: z.boolean() }).safeParse(req.body);
  if (!parse.success) { res.status(400).json({ error: parse.error.errors[0]?.message }); return; }
  const user = await db.user.update({ where: { username }, data: { active: parse.data.active } });
  const { passwordHash: _, ...userSafe } = user;
  res.json(userSafe);
});
