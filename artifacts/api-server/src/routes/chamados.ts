import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { actor } from '../middleware/actor.js';
import { requireRole } from '../middleware/require-role.js';
import { sendChamadoNotification } from '../services/teams-notifier.js';

export const chamadosRouter = Router();

chamadosRouter.use(actor);

const createSchema = z.object({
  actorUsername: z.string(),
  labId: z.number().int().positive(),
  machineName: z.string().min(1).max(200),
  description: z.string().min(1),
  priority: z.enum(['baixa', 'normal', 'alta']).optional(),
});

const commentSchema = z.object({
  actorUsername: z.string(),
  body: z.string().min(1),
});

chamadosRouter.get('/', async (req, res) => {
  const { role, username } = req.actor!;
  const labId = req.query['labId'] ? parseInt(req.query['labId'] as string) : undefined;

  const where =
    role === 'cliente'
      ? { openedBy: username, ...(labId ? { labId } : {}) }
      : role === 'tecnico_externo'
      ? { status: { in: ['em_espera', 'em_progresso'] as const }, ...(labId ? { labId } : {}) }
      : labId ? { labId } : {};

  const chamados = await db.chamado.findMany({
    where,
    include: { lab: { include: { setor: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(chamados);
});

chamadosRouter.post('/', requireRole('cliente', 'planejador'), async (req, res) => {
  const parse = createSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0]?.message });
    return;
  }
  const { labId, machineName, description, priority } = parse.data;

  const lab = await db.lab.findUnique({ where: { id: labId } });
  if (!lab) {
    res.status(400).json({ error: 'Laboratório não encontrado' });
    return;
  }

  const chamado = await db.chamado.create({
    data: { labId, openedBy: req.actor!.username, machineName, description, priority: priority ?? 'normal' },
    include: { lab: true },
  });

  void sendChamadoNotification({
    labId: chamado.labId,
    chamadoId: chamado.id,
    description: chamado.description,
    status: chamado.status,
    openedBy: chamado.openedBy,
  });

  res.status(201).json(chamado);
});

chamadosRouter.get('/:id', async (req, res) => {
  const id = parseInt(req.params['id'] ?? '');
  const chamado = await db.chamado.findUnique({
    where: { id },
    include: { lab: { include: { setor: true } }, comments: { orderBy: { createdAt: 'asc' } } },
  });
  if (!chamado) {
    res.status(404).json({ error: 'Chamado não encontrado' });
    return;
  }
  res.json(chamado);
});

chamadosRouter.patch('/:id', requireRole('planejador', 'tecnico_externo'), async (req, res) => {
  const id = parseInt(req.params['id'] ?? '');
  const patchSchema = z.object({
    actorUsername: z.string(),
    description: z.string().optional(),
    priority: z.enum(['baixa', 'normal', 'alta']).optional(),
    assignedToUsername: z.string().nullable().optional(),
  });
  const parse = patchSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0]?.message });
    return;
  }
  const { actorUsername: _, ...data } = parse.data;
  const chamado = await db.chamado.update({ where: { id }, data });
  res.json(chamado);
});

chamadosRouter.delete('/:id', requireRole('planejador'), async (req, res) => {
  const id = parseInt(req.params['id'] ?? '');
  await db.chamado.delete({ where: { id } });
  res.status(204).end();
});

chamadosRouter.post('/:id/accept', requireRole('tecnico_externo', 'planejador'), async (req, res) => {
  const id = parseInt(req.params['id'] ?? '');
  const updated = await db.chamado.updateMany({
    where: { id, status: 'em_espera' },
    data: { status: 'em_progresso', assignedToUsername: req.actor!.username },
  });
  if (updated.count === 0) {
    res.status(409).json({ error: 'Chamado não está em espera ou não encontrado' });
    return;
  }
  const chamado = await db.chamado.findUnique({ where: { id } });
  if (chamado) {
    void sendChamadoNotification({
      labId: chamado.labId,
      chamadoId: chamado.id,
      description: chamado.description,
      status: chamado.status,
      openedBy: chamado.openedBy,
    });
  }
  res.json({ ok: true });
});

chamadosRouter.post('/:id/reject', requireRole('tecnico_externo', 'planejador'), async (req, res) => {
  const id = parseInt(req.params['id'] ?? '');
  const { rejectionReason } = req.body as { rejectionReason?: string };
  const updated = await db.chamado.updateMany({
    where: { id, status: 'em_espera' },
    data: { status: 'recusado', rejectionReason: rejectionReason ?? 'Sem motivo informado' },
  });
  if (updated.count === 0) {
    res.status(409).json({ error: 'Chamado não está em espera ou não encontrado' });
    return;
  }
  const chamado = await db.chamado.findUnique({ where: { id } });
  if (chamado) {
    void sendChamadoNotification({
      labId: chamado.labId,
      chamadoId: chamado.id,
      description: chamado.description,
      status: chamado.status,
      openedBy: chamado.openedBy,
    });
  }
  res.json({ ok: true });
});

chamadosRouter.post('/:id/complete', requireRole('tecnico_externo', 'planejador'), async (req, res) => {
  const id = parseInt(req.params['id'] ?? '');
  const updated = await db.chamado.updateMany({
    where: { id, status: 'em_progresso' },
    data: { status: 'concluido' },
  });
  if (updated.count === 0) {
    res.status(409).json({ error: 'Chamado não está em progresso ou não encontrado' });
    return;
  }
  const chamado = await db.chamado.findUnique({ where: { id } });
  if (chamado) {
    void sendChamadoNotification({
      labId: chamado.labId,
      chamadoId: chamado.id,
      description: chamado.description,
      status: chamado.status,
      openedBy: chamado.openedBy,
    });
  }
  res.json({ ok: true });
});

chamadosRouter.get('/:id/comments', async (req, res) => {
  const id = parseInt(req.params['id'] ?? '');
  const comments = await db.chamadoComment.findMany({
    where: { chamadoId: id },
    orderBy: { createdAt: 'asc' },
  });
  res.json(comments);
});

chamadosRouter.post('/:id/comments', async (req, res) => {
  const id = parseInt(req.params['id'] ?? '');
  const parse = commentSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0]?.message });
    return;
  }
  const comment = await db.chamadoComment.create({
    data: {
      chamadoId: id,
      authorUsername: req.actor!.username,
      authorName: req.actor!.name,
      body: parse.data.body,
    },
  });
  res.status(201).json(comment);
});

chamadosRouter.get('/:id/history', async (req, res) => {
  const id = parseInt(req.params['id'] ?? '');
  const chamado = await db.chamado.findUnique({
    where: { id },
    include: { comments: { orderBy: { createdAt: 'asc' } } },
  });
  if (!chamado) {
    res.status(404).json({ error: 'Chamado não encontrado' });
    return;
  }
  res.json(chamado.comments);
});
