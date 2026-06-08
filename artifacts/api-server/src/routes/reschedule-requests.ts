import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { actor } from '../middleware/actor.js';
import { requireRole } from '../middleware/require-role.js';
import { listEvents, updateEvent } from '../services/calendar-service.js';
import { sendRescheduleDecisionNotification } from '../services/teams-notifier.js';

export const rescheduleRouter = Router();

rescheduleRouter.use(actor);

const createSchema = z.object({
  actorUsername: z.string(),
  eventId: z.string().min(1),
  calendarId: z.string().default('mock'),
  labId: z.number().int().positive().optional(),
  requestedByName: z.string().min(1),
  reason: z.string().min(1),
  suggestedStart: z.string().optional(),
  suggestedEnd: z.string().optional(),
});

rescheduleRouter.get('/', async (req, res) => {
  const { role, username } = req.actor!;
  const where = role === 'cliente' ? { requestedByName: username } : {};
  const requests = await db.rescheduleRequest.findMany({
    where,
    include: { lab: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(requests);
});

rescheduleRouter.post('/', requireRole('cliente', 'planejador'), async (req, res) => {
  const parse = createSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0]?.message });
    return;
  }
  const { actorUsername: _, suggestedStart, suggestedEnd, ...data } = parse.data;
  const request = await db.rescheduleRequest.create({
    data: {
      ...data,
      suggestedStart: suggestedStart ? new Date(suggestedStart) : undefined,
      suggestedEnd: suggestedEnd ? new Date(suggestedEnd) : undefined,
    },
  });
  res.status(201).json(request);
});

rescheduleRouter.get('/by-event/:eventId', async (req, res) => {
  const { eventId } = req.params as { eventId: string };
  const requests = await db.rescheduleRequest.findMany({
    where: { eventId },
    include: { lab: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(requests);
});

rescheduleRouter.get('/:id', async (req, res) => {
  const id = parseInt(req.params['id'] ?? '');
  const request = await db.rescheduleRequest.findUnique({ where: { id }, include: { lab: true } });
  if (!request) {
    res.status(404).json({ error: 'Solicitação não encontrada' });
    return;
  }
  res.json(request);
});

rescheduleRouter.patch('/:id', requireRole('planejador'), async (req, res) => {
  const id = parseInt(req.params['id'] ?? '');
  const request = await db.rescheduleRequest.update({ where: { id }, data: req.body as Record<string, unknown> });
  res.json(request);
});

rescheduleRouter.delete('/:id', requireRole('planejador'), async (req, res) => {
  const id = parseInt(req.params['id'] ?? '');
  await db.rescheduleRequest.delete({ where: { id } });
  res.status(204).end();
});

rescheduleRouter.post('/:id/approve', requireRole('planejador'), async (req, res) => {
  const id = parseInt(req.params['id'] ?? '');
  const body = req.body as { decisionReason?: string; newStart?: string; newEnd?: string };

  try {
    const result = await db.$transaction(async (tx) => {
      const request = await tx.$queryRaw<Array<{ id: number; status: string; event_id: string; calendar_id: string; lab_id: number | null }>>`
        SELECT id, status, event_id, calendar_id, lab_id FROM reschedule_requests WHERE id = ${id} FOR UPDATE
      `;

      const req_ = request[0];
      if (!req_) throw { code: 'NOT_FOUND' };
      if (req_.status !== 'pendente') throw { code: 'CONFLICT' };

      const newStart = body.newStart ? new Date(body.newStart) : undefined;
      const newEnd = body.newEnd ? new Date(body.newEnd) : undefined;

      if (newStart && newEnd) {
        await updateEvent(req_.event_id, {
          start: newStart.toISOString(),
          end: newEnd.toISOString(),
        });
      }

      return await tx.rescheduleRequest.update({
        where: { id },
        data: {
          status: 'aprovado',
          decisionReason: body.decisionReason,
          newStart,
          newEnd,
          decidedByUsername: req.actor!.username,
          decidedAt: new Date(),
        },
        include: { lab: true },
      });
    });

    const events = await listEvents(result.labId ?? undefined);
    const event = events.find((e) => e.id === result.eventId);
    const maintenanceType = event?.maintenanceType === 'corretiva' ? 'Corretiva' : 'Preventiva';
    const equipamento = event?.summary ?? result.eventId;

    void sendRescheduleDecisionNotification(result.labId, 'aprovado', {
      labName: result.lab?.name ?? 'Lab',
      maintenanceType,
      equipamento,
      motivo: result.reason,
      newStart: result.newStart ?? undefined,
      newEnd: result.newEnd ?? undefined,
    });

    res.json(result);
  } catch (err) {
    const e = err as { code?: string };
    if (e.code === 'NOT_FOUND') { res.status(404).json({ error: 'Solicitação não encontrada' }); return; }
    if (e.code === 'CONFLICT') { res.status(409).json({ error: 'Solicitação não está pendente' }); return; }
    res.status(502).json({ error: 'Falha ao atualizar calendário' });
  }
});

rescheduleRouter.post('/:id/reject', requireRole('planejador'), async (req, res) => {
  const id = parseInt(req.params['id'] ?? '');
  const { decisionReason } = req.body as { decisionReason?: string };

  const current = await db.rescheduleRequest.findUnique({ where: { id } });
  if (!current) { res.status(404).json({ error: 'Solicitação não encontrada' }); return; }
  if (current.status !== 'pendente') { res.status(409).json({ error: 'Solicitação não está pendente' }); return; }

  const result = await db.rescheduleRequest.update({
    where: { id },
    data: {
      status: 'recusado',
      decisionReason,
      decidedByUsername: req.actor!.username,
      decidedAt: new Date(),
    },
    include: { lab: true },
  });

  const events = await listEvents(result.labId ?? undefined);
  const event = events.find((e) => e.id === result.eventId);
  const maintenanceType = event?.maintenanceType === 'corretiva' ? 'Corretiva' : 'Preventiva';
  const equipamento = event?.summary ?? result.eventId;

  void sendRescheduleDecisionNotification(result.labId, 'recusado', {
    labName: result.lab?.name ?? 'Lab',
    maintenanceType,
    equipamento,
    motivo: result.reason,
    decisionReason,
  });

  res.json(result);
});
