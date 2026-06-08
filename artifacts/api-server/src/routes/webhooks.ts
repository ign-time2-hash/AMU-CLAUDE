import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { actor } from '../middleware/actor.js';
import { requireRole } from '../middleware/require-role.js';
import { sendWebhook } from '../services/teams-notifier.js';

export const webhooksRouter = Router();

webhooksRouter.use(actor);
webhooksRouter.use(requireRole('planejador'));

const webhookSchema = z.object({
  actorUsername: z.string(),
  name: z.string().min(1),
  url: z.string().url(),
  labId: z.number().int().positive().nullable().optional(),
  enabled: z.boolean().optional(),
});

webhooksRouter.get('/', async (_req, res) => {
  const webhooks = await db.webhook.findMany({ include: { lab: true }, orderBy: { createdAt: 'desc' } });
  res.json(webhooks);
});

webhooksRouter.post('/', async (req, res) => {
  const parse = webhookSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0]?.message });
    return;
  }
  const { actorUsername: _, labId, ...data } = parse.data;

  if (labId) {
    const lab = await db.lab.findUnique({ where: { id: labId } });
    if (!lab) {
      res.status(400).json({ error: 'Laboratório não encontrado' });
      return;
    }
  }

  const webhook = await db.webhook.create({ data: { ...data, labId: labId ?? null } });
  res.status(201).json(webhook);
});

webhooksRouter.get('/:id', async (req, res) => {
  const id = parseInt(req.params['id'] ?? '');
  const webhook = await db.webhook.findUnique({ where: { id }, include: { lab: true } });
  if (!webhook) { res.status(404).json({ error: 'Webhook não encontrado' }); return; }
  res.json(webhook);
});

webhooksRouter.patch('/:id', async (req, res) => {
  const id = parseInt(req.params['id'] ?? '');
  const patchSchema = z.object({
    actorUsername: z.string(),
    name: z.string().optional(),
    url: z.string().url().optional(),
    labId: z.number().int().positive().nullable().optional(),
    enabled: z.boolean().optional(),
  });
  const parse = patchSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0]?.message });
    return;
  }
  const { actorUsername: _, ...data } = parse.data;
  const webhook = await db.webhook.update({ where: { id }, data });
  res.json(webhook);
});

webhooksRouter.delete('/:id', async (req, res) => {
  const id = parseInt(req.params['id'] ?? '');
  await db.webhook.delete({ where: { id } });
  res.status(204).end();
});

webhooksRouter.post('/:id/test', async (req, res) => {
  const id = parseInt(req.params['id'] ?? '');
  const webhook = await db.webhook.findUnique({ where: { id } });
  if (!webhook) { res.status(404).json({ error: 'Webhook não encontrado' }); return; }

  try {
    await sendWebhook(webhook.url, 'Teste de webhook AMU/Kronus - conexão OK');
    res.json({ ok: true, message: 'Mensagem enviada com sucesso' });
  } catch {
    res.status(502).json({ error: 'Falha ao enviar mensagem para o Teams' });
  }
});
