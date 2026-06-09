import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { actor } from '../middleware/actor.js';
import { requireRole } from '../middleware/require-role.js';

export const inventarioRouter = Router();

inventarioRouter.use(actor);

inventarioRouter.get('/tree', async (req, res) => {
  const { role } = req.actor!;

  const labIdStr = req.query['idLab'] as string | undefined;
  const cenpesFilter = req.query['cenpes'] as string | undefined;
  const setorIdStr = req.query['idSetor'] as string | undefined;
  const q = req.query['q'] as string | undefined;

  if (role === 'cliente' && !labIdStr) {
    res.status(400).json({ error: 'Parâmetro idLab obrigatório para cliente' });
    return;
  }

  const labId = labIdStr ? parseInt(labIdStr) : undefined;
  const setorId = setorIdStr ? parseInt(setorIdStr) : undefined;

  const setores = await db.setor.findMany({
    where: {
      ...(cenpesFilter ? { cenpes: cenpesFilter as 'cenpes_1' | 'cenpes_2' } : {}),
      ...(setorId ? { id: setorId } : {}),
    },
    include: {
      labs: {
        where: labId ? { id: labId } : {},
        include: {
          equipamentos: {
            where: q
              ? { name: { contains: q, mode: 'insensitive' } }
              : {},
            orderBy: { name: 'asc' },
          },
        },
        orderBy: { name: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  });

  res.json(setores);
});

inventarioRouter.get('/labs-allowed', async (_req, res) => {
  const labs = await db.lab.findMany({ orderBy: { name: 'asc' } });
  res.json(labs);
});

const equipamentoSchema = z.object({
  actorUsername: z.string(),
  name: z.string().min(1).max(120),
  idLab: z.number().int().positive(),
  criticidade: z.enum(['baixa', 'normal', 'alta']).default('normal'),
  localInstalacao: z.string().max(120).optional(),
  gerencia: z.string().max(120).optional(),
});

inventarioRouter.post('/equipamentos', requireRole('planejador'), async (req, res) => {
  const parse = equipamentoSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0]?.message });
    return;
  }
  const { actorUsername: _, idLab, ...data } = parse.data;

  const lab = await db.lab.findUnique({ where: { id: idLab } });
  if (!lab) {
    res.status(400).json({ error: 'Laboratório não encontrado' });
    return;
  }

  const equipamento = await db.equipamento.create({
    data: { ...data, idLab, createdByUsername: req.actor!.username },
  });
  res.status(201).json(equipamento);
});
