import { Router } from 'express';
import { z } from 'zod';
import { actor } from '../middleware/actor.js';
import { requireRole } from '../middleware/require-role.js';
import { listEvents, createEvent, updateEvent, deleteEvent } from '../services/calendar-service.js';

export const calendarRouter = Router();

calendarRouter.use(actor);

const createSchema = z.object({
  actorUsername: z.string(),
  calendarId: z.string().default('mock'),
  summary: z.string().min(1),
  description: z.string().optional(),
  start: z.string(),
  end: z.string(),
  labId: z.number().int().positive().optional(),
  maintenanceType: z.enum(['preventiva', 'corretiva']).default('preventiva'),
  status: z.enum(['agendado', 'em_andamento', 'concluido']).default('agendado'),
});

calendarRouter.get('/events', async (req, res) => {
  const labId = req.query['labId'] ? parseInt(req.query['labId'] as string) : undefined;
  const events = await listEvents(labId);
  res.json(events);
});

calendarRouter.post('/events', requireRole('planejador'), async (req, res) => {
  const parse = createSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0]?.message });
    return;
  }
  const { actorUsername: _, ...data } = parse.data;
  const event = await createEvent(data);
  res.status(201).json(event);
});

calendarRouter.patch('/events/:eventId', requireRole('planejador'), async (req, res) => {
  const { eventId } = req.params as { eventId: string };
  try {
    const event = await updateEvent(eventId, req.body as Record<string, unknown>);
    res.json(event);
  } catch {
    res.status(404).json({ error: 'Evento não encontrado' });
  }
});

calendarRouter.delete('/events/:eventId', requireRole('planejador'), async (req, res) => {
  const { eventId } = req.params as { eventId: string };
  await deleteEvent(eventId);
  res.status(204).end();
});
