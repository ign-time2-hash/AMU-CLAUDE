import cron from 'node-cron';
import { db } from '../db.js';
import { sendDailySummaryNotification } from './teams-notifier.js';
import { getDailySummaryEnabled, getDailySummaryTime } from './teams-settings.js';
import { logger } from '../logger.js';

let currentTask: cron.ScheduledTask | null = null;

function timeToCron(time: string): string {
  const [h = '7', m = '0'] = time.split(':');
  return `${parseInt(m)} ${parseInt(h)} * * *`;
}

async function runSummary(): Promise<void> {
  if (!getDailySummaryEnabled()) return;
  try {
    const [chamadosAbertos, remarcacoesPendentes] = await Promise.all([
      db.chamado.count({ where: { status: 'em_espera' } }),
      db.rescheduleRequest.count({ where: { status: 'pendente' } }),
    ]);
    await sendDailySummaryNotification({ chamadosAbertos, remarcacoesPendentes });
  } catch (err) {
    logger.error({ err }, 'Falha ao gerar resumo diário');
  }
}

export function startDailySummaryJob(): void {
  const expr = timeToCron(getDailySummaryTime());
  currentTask = cron.schedule(expr, runSummary);
  logger.info(`Resumo diário agendado para ${getDailySummaryTime()} (cron: ${expr})`);
}

export function restartDailySummaryJob(): void {
  if (currentTask) {
    currentTask.stop();
    currentTask = null;
  }
  startDailySummaryJob();
}
