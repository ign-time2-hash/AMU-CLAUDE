import { Router } from 'express';
import { db } from '../db.js';
import { actor } from '../middleware/actor.js';
import { requireRole } from '../middleware/require-role.js';
import { requirePlannerAdmin } from '../middleware/require-planner-admin.js';
import { sendDailySummaryNotification } from '../services/teams-notifier.js';
import {
  getDailySummaryEnabled, setDailySummaryEnabled,
  getDailySummaryWebhookUrl, setDailySummaryWebhookUrl,
  getDailySummaryTime, setDailySummaryTime,
} from '../services/teams-settings.js';
import { restartDailySummaryJob } from '../services/daily-summary-job.js';

export const teamsRouter = Router();

teamsRouter.use(actor);
teamsRouter.use(requireRole('planejador'));
teamsRouter.use(requirePlannerAdmin());

teamsRouter.get('/settings', (_req, res) => {
  res.json({
    dailySummaryEnabled: getDailySummaryEnabled(),
    dailySummaryWebhookUrl: getDailySummaryWebhookUrl(),
    dailySummaryTime: getDailySummaryTime(),
  });
});

teamsRouter.patch('/settings', (req, res) => {
  const body = req.body as {
    dailySummaryEnabled?: boolean;
    dailySummaryWebhookUrl?: string | null;
    dailySummaryTime?: string;
  };

  if (typeof body.dailySummaryEnabled === 'boolean') {
    setDailySummaryEnabled(body.dailySummaryEnabled);
  }
  if ('dailySummaryWebhookUrl' in body) {
    const url = body.dailySummaryWebhookUrl;
    setDailySummaryWebhookUrl(url && url.trim() !== '' ? url.trim() : null);
  }
  if (typeof body.dailySummaryTime === 'string' && /^\d{2}:\d{2}$/.test(body.dailySummaryTime)) {
    setDailySummaryTime(body.dailySummaryTime);
    restartDailySummaryJob();
  }

  res.json({
    dailySummaryEnabled: getDailySummaryEnabled(),
    dailySummaryWebhookUrl: getDailySummaryWebhookUrl(),
    dailySummaryTime: getDailySummaryTime(),
  });
});

teamsRouter.post('/daily-summary/test', async (_req, res) => {
  const [chamadosAbertos, remarcacoesPendentes] = await Promise.all([
    db.chamado.count({ where: { status: 'em_espera' } }),
    db.rescheduleRequest.count({ where: { status: 'pendente' } }),
  ]);

  await sendDailySummaryNotification({ chamadosAbertos, remarcacoesPendentes });
  res.json({ sent: true });
});
