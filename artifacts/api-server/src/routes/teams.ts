import { Router } from 'express';
import { db } from '../db.js';
import { actor } from '../middleware/actor.js';
import { requireRole } from '../middleware/require-role.js';
import { sendWebhook } from '../services/teams-notifier.js';
import { getDailySummaryEnabled, setDailySummaryEnabled } from '../services/teams-settings.js';

export const teamsRouter = Router();

teamsRouter.use(actor);
teamsRouter.use(requireRole('planejador'));

teamsRouter.get('/settings', (_req, res) => {
  res.json({ dailySummaryEnabled: getDailySummaryEnabled() });
});

teamsRouter.patch('/settings', (req, res) => {
  const { dailySummaryEnabled } = req.body as { dailySummaryEnabled?: boolean };
  if (typeof dailySummaryEnabled === 'boolean') {
    setDailySummaryEnabled(dailySummaryEnabled);
  }
  res.json({ dailySummaryEnabled: getDailySummaryEnabled() });
});

teamsRouter.post('/daily-summary/test', async (_req, res) => {
  const webhooks = await db.webhook.findMany({ where: { enabled: true } });
  if (webhooks.length === 0) {
    res.status(400).json({ error: 'Nenhum webhook ativo encontrado' });
    return;
  }
  try {
    for (const webhook of webhooks) {
      await sendWebhook(webhook.url, 'Teste de resumo diário AMU/Kronus');
    }
    res.json({ ok: true });
  } catch {
    res.status(502).json({ error: 'Falha ao enviar resumo de teste' });
  }
});
