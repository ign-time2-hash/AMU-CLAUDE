import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { actor } from '../middleware/actor.js';
import { requireRole } from '../middleware/require-role.js';
import { requirePlannerAdmin } from '../middleware/require-planner-admin.js';
import { isWorkflowsUrl, postRaw } from '../services/teams-notifier.js';
import { listEvents } from '../services/calendar-service.js';

export const webhooksRouter = Router();

webhooksRouter.use(actor);
webhooksRouter.use(requireRole('planejador'));
webhooksRouter.use(requirePlannerAdmin());

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
      res.status(400).json({ error: 'Laboratorio nao encontrado' });
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
    lastSentAt: z.string().datetime().optional(),
  });
  const parse = patchSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0]?.message });
    return;
  }
  const { actorUsername: _, lastSentAt, ...rest } = parse.data;
  const webhook = await db.webhook.update({
    where: { id },
    data: { ...rest, ...(lastSentAt ? { lastSentAt: new Date(lastSentAt) } : {}) },
  });
  res.json(webhook);
});

webhooksRouter.delete('/:id', async (req, res) => {
  const id = parseInt(req.params['id'] ?? '');
  await db.webhook.delete({ where: { id } });
  res.status(204).end();
});

webhooksRouter.post('/:id/test', async (req, res) => {
  const id = parseInt(req.params['id'] ?? '');
  const webhook = await db.webhook.findUnique({ where: { id }, include: { lab: true } });
  if (!webhook) { res.status(404).json({ error: 'Webhook não encontrado' }); return; }

  // Busca o primeiro evento do calendário para o lab vinculado
  const events = webhook.labId ? await listEvents(webhook.labId) : [];
  const event = events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())[0];

  const setorName = webhook.lab?.name ?? 'Laboratório não vinculado';
  const equipamento = event?.summary ?? 'Equipamento de teste';
  const maintenanceType = event ? (event.maintenanceType === 'preventiva' ? 'Preventiva' : 'Corretiva') : 'Preventiva';
  const eventDate = event ? new Date(event.start) : new Date();
  const dateStr = eventDate.toLocaleDateString('pt-BR');
  const hourStr = eventDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const messageLines = `📍 Setor: ${setorName}\n🔧 Manutenção ${maintenanceType} - ${equipamento}\n📅 Data: ${dateStr}\n🕐 Horário: ${hourStr}`;

  const payload = isWorkflowsUrl(webhook.url)
    ? {
        type: 'message',
        attachments: [{
          contentType: 'application/vnd.microsoft.card.adaptive',
          content: {
            $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
            type: 'AdaptiveCard',
            version: '1.4',
            body: [
              { type: 'TextBlock', text: 'AMU', weight: 'Bolder', size: 'Medium' },
              { type: 'TextBlock', text: messageLines, wrap: true },
            ],
          },
        }],
      }
    : {
        '@type': 'MessageCard',
        '@context': 'http://schema.org/extensions',
        themeColor: '3F7D3A',
        title: 'AMU',
        summary: 'Teste de webhook AMU',
        text: messageLines.replace(/\n/g, '\n\n'),
      };

  try {
    await postRaw(webhook.url, payload);
  } catch (err) {
    const status = (err as { status?: number }).status;
    const details = ((err as { details?: string }).details ?? '').slice(0, 500);
    if (status === 403 || status === 401) {
      res.status(502).json({
        error: `O Teams rejeitou a URL (${status}). A URL provavelmente expirou ou foi revogada. Gere uma nova no Teams pelo app Workflows (Fluxos).`,
        status,
        details,
      });
    } else if (status === 429) {
      res.status(502).json({
        error: 'O Teams limitou os envios (429). Aguarde alguns minutos e tente novamente.',
        status,
        details,
      });
    } else {
      res.status(502).json({
        error: 'O Teams recusou a mensagem. Verifique a URL do webhook.',
        status,
        details,
      });
    }
    return;
  }

  const updated = await db.webhook.update({
    where: { id },
    data: { lastSentAt: new Date() },
    include: { lab: true },
  });
  res.json(updated);
});
