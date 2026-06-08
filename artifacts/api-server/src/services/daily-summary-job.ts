import cron from 'node-cron';
import { db } from '../db.js';
import { sendWebhook } from './teams-notifier.js';
import { getDailySummaryEnabled } from './teams-settings.js';
import { logger } from '../logger.js';

export function startDailySummaryJob(): void {
  cron.schedule('0 7 * * *', async () => {
    if (!getDailySummaryEnabled()) return;

    try {
      const [chamadosAbertos, chamadosEmProgresso] = await Promise.all([
        db.chamado.count({ where: { status: 'em_espera' } }),
        db.chamado.count({ where: { status: 'em_progresso' } }),
      ]);

      const message = `Resumo diário AMU/Kronus\nChamados em espera: ${chamadosAbertos}\nChamados em progresso: ${chamadosEmProgresso}`;

      const webhooks = await db.webhook.findMany({ where: { enabled: true } });
      for (const webhook of webhooks) {
        await sendWebhook(webhook.url, message).catch((err: unknown) =>
          logger.warn({ err }, `Falha no resumo diário para webhook ${webhook.id}`),
        );
      }
    } catch (err) {
      logger.error({ err }, 'Falha ao gerar resumo diário');
    }
  });
}
