import './load-env.js';
import express from 'express';
import cors from 'cors';
import pinoHttp from 'pino-http';
import { logger } from './logger.js';
import { db } from './db.js';
import { runBootstrap } from './bootstrap.js';
import { startDailySummaryJob } from './services/daily-summary-job.js';
import { authRouter } from './routes/auth.js';
import { chamadosRouter } from './routes/chamados.js';
import { calendarRouter } from './routes/calendar.js';
import { rescheduleRouter } from './routes/reschedule-requests.js';
import { inventarioRouter } from './routes/inventario.js';
import { webhooksRouter } from './routes/webhooks.js';
import { teamsRouter } from './routes/teams.js';
import { setoresRouter } from './routes/setores.js';
import { mapasRouter } from './routes/mapas.js';
import { configuracoesRouter } from './routes/configuracoes.js';
import { systemRouter } from './routes/system.js';

const PORT = parseInt(process.env['PORT'] ?? '3001');

async function main(): Promise<void> {
  await runBootstrap();

  const app = express();

  app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
  app.use(express.json());
  app.use(pinoHttp({ logger }));

  app.use('/api', systemRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/chamados', chamadosRouter);
  app.use('/api/calendar', calendarRouter);
  app.use('/api/reschedule-requests', rescheduleRouter);
  app.use('/api/inventario', inventarioRouter);
  app.use('/api/webhooks', webhooksRouter);
  app.use('/api/teams', teamsRouter);
  app.use('/api/setores', setoresRouter);
  app.use('/api/mapas', mapasRouter);
  app.use('/api/configuracoes', configuracoesRouter);

  startDailySummaryJob();

  app.listen(PORT, () => {
    logger.info(`API AMU/Kronus rodando em http://localhost:${PORT}`);
  });
}

main().catch((err: unknown) => {
  logger.error({ err }, 'Erro fatal ao iniciar servidor');
  db.$disconnect().finally(() => process.exit(1));
});
