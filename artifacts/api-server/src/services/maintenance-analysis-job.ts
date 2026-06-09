import cron from 'node-cron';
import { db } from '../db.js';
import { listEventsInRange } from './calendar-service.js';
import { sendMaintenanceAnalysisNotification } from './teams-notifier.js';
import { logger } from '../logger.js';

// --- helpers de data ---

function toDayKey(date: Date): string {
  return date.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }); // "YYYY-MM-DD"
}

function startOfDay(date: Date): Date {
  const d = new Date(date.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }));
  return d;
}

function endOfTomorrow(date: Date): Date {
  const d = startOfDay(date);
  d.setDate(d.getDate() + 2);
  return d;
}

// --- deduplicação via banco ---

async function alreadySent(labId: number, eventId: string, targetDay: string): Promise<boolean> {
  const sentDate = toDayKey(new Date());
  const existing = await db.maintenanceNotificationLog.findUnique({
    where: { labId_eventId_targetDay_sentDate: { labId, eventId, targetDay, sentDate } },
  });
  return existing !== null;
}

async function markSent(labId: number, eventId: string, targetDay: string): Promise<void> {
  const sentDate = toDayKey(new Date());
  await db.maintenanceNotificationLog.upsert({
    where: { labId_eventId_targetDay_sentDate: { labId, eventId, targetDay, sentDate } },
    create: { labId, eventId, targetDay, sentDate },
    update: {},
  });
}

// --- análise de um lab ---

export async function analyzeLabMaintenance(
  labId: number,
  labName: string,
  forceSkipDedup = false,
): Promise<{ todayCount: number; tomorrowCount: number; notificationsSent: number }> {
  const now = new Date();
  const timeMin = startOfDay(now).toISOString();
  const timeMax = endOfTomorrow(now).toISOString();

  const allEvents = await listEventsInRange({ labId, timeMin, timeMax });
  const events = allEvents.filter((e) => e.status === 'agendado' || e.status === 'em_andamento');

  const todayKey = toDayKey(now);
  const tomorrowKey = toDayKey(new Date(now.getTime() + 86400000));

  const tomorrowEvents = events.filter((e) => toDayKey(new Date(e.start)) === tomorrowKey);
  const todayEvents = events.filter((e) => toDayKey(new Date(e.start)) === todayKey);

  let notificationsSent = 0;

  // Passo 1 — amanhã
  for (const event of tomorrowEvents) {
    if (!forceSkipDedup && await alreadySent(labId, event.id, 'amanha')) continue;
    await sendMaintenanceAnalysisNotification({
      labId,
      targetDay: 'amanha',
      event: { id: event.id, summary: event.summary, start: new Date(event.start), maintenanceType: event.maintenanceType },
      labName,
    });
    if (!forceSkipDedup) await markSent(labId, event.id, 'amanha');
    notificationsSent++;
  }

  // Passo 2 — hoje
  for (const event of todayEvents) {
    if (!forceSkipDedup && await alreadySent(labId, event.id, 'hoje')) continue;
    await sendMaintenanceAnalysisNotification({
      labId,
      targetDay: 'hoje',
      event: { id: event.id, summary: event.summary, start: new Date(event.start), maintenanceType: event.maintenanceType },
      labName,
    });
    if (!forceSkipDedup) await markSent(labId, event.id, 'hoje');
    notificationsSent++;
  }

  return { todayCount: todayEvents.length, tomorrowCount: tomorrowEvents.length, notificationsSent };
}

// --- análise de todos os labs ---

export async function analyzeAllLabs(): Promise<void> {
  try {
    const labs = await db.lab.findMany({ select: { id: true, name: true } });
    for (const lab of labs) {
      await analyzeLabMaintenance(lab.id, lab.name).catch((err: unknown) =>
        logger.error({ err, labId: lab.id }, 'Falha na analise de manutencao do lab'),
      );
    }
  } catch (err) {
    logger.error({ err }, 'Falha no job de analise de manutencao');
  }
}

// --- cron ---

export function startMaintenanceAnalysisJob(): void {
  cron.schedule('0 6 * * *', async () => {
    logger.info('Iniciando analise de manutencao (cron 06:00)');
    await analyzeAllLabs();
  });
}
