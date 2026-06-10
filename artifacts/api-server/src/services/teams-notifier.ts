import { db } from '../db.js';
import { logger } from '../logger.js';
import { getDailySummaryWebhookUrl } from './teams-settings.js';

// --- helpers internos ---

export function isWorkflowsUrl(url: string): boolean {
  return /logic\.azure\.com|powerplatform|workflows/i.test(url);
}

async function resolveWebhookUrls(labId?: number | null): Promise<string[]> {
  if (labId != null) {
    const dedicated = await db.webhook.findMany({ where: { labId, enabled: true }, select: { url: true } });
    if (dedicated.length > 0) return dedicated.map((w) => w.url);
  }

  const all = await db.webhook.findMany({ where: { enabled: true }, select: { url: true } });
  if (all.length > 0) return all.map((w) => w.url);

  const urls: string[] = [];
  if (process.env['TEAMS_WEBHOOK_URL']) urls.push(process.env['TEAMS_WEBHOOK_URL']);
  if (process.env['TEAMS_WEBHOOK_URL_2']) urls.push(process.env['TEAMS_WEBHOOK_URL_2']);
  return urls;
}

async function postAdaptiveCard(
  url: string,
  payload: { title: string; subtitle: string; facts: { title: string; value: string }[] },
): Promise<void> {
  const body = JSON.stringify({
    type: 'message',
    attachments: [{
      contentType: 'application/vnd.microsoft.card.adaptive',
      content: {
        $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
        type: 'AdaptiveCard',
        version: '1.4',
        body: [
          { type: 'TextBlock', text: payload.title, weight: 'Bolder', size: 'Medium' },
          { type: 'TextBlock', text: payload.subtitle, wrap: true, isSubtle: true },
          { type: 'FactSet', facts: payload.facts },
        ],
      },
    }],
  });
  const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
  if (!resp.ok) throw new Error(`Teams ${resp.status}`);
}

export async function postRaw(url: string, payload: unknown): Promise<void> {
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) throw new Error(`Teams ${resp.status}`);
}

export function formatFullDatePtBr(date: Date): string {
  return date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatHourPtBr(date: Date): string {
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// --- API pública ---

export async function sendChamadoNotification(params: {
  labId: number | null;
  chamadoId: number;
  description: string;
  status: string;
  openedBy: string;
}): Promise<void> {
  const statusLabel: Record<string, string> = {
    em_espera: 'Em espera',
    em_progresso: 'Em progresso',
    concluido: 'Concluído',
    recusado: 'Recusado',
  };
  try {
    const urls = await resolveWebhookUrls(params.labId);
    for (const url of urls) {
      await postAdaptiveCard(url, {
        title: 'Atualizacao de chamado',
        subtitle: params.description,
        facts: [
          { title: 'Chamado', value: String(params.chamadoId) },
          { title: 'Status', value: statusLabel[params.status] ?? params.status },
          { title: 'Solicitante', value: params.openedBy },
        ],
      }).catch((err: unknown) => logger.error({ err, url }, 'Falha ao enviar notificação de chamado'));
    }
  } catch (err) {
    logger.error({ err }, 'Falha ao resolver webhooks para chamado');
  }
}

function formatDateStringPtBr(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y!, m! - 1, d!).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export async function sendRescheduleCreatedNotification(
  labId: number | null | undefined,
  payload: {
    labName: string;
    requestedByName: string;
    reason: string;
    suggestedDate?: string;
  },
): Promise<void> {
  try {
    const urls = await resolveWebhookUrls(labId);
    for (const url of urls) {
      try {
        const facts: { title: string; value: string }[] = [
          { title: '📍 Setor', value: payload.labName },
          { title: '👤 Solicitante', value: payload.requestedByName },
          { title: 'Motivo', value: payload.reason },
        ];
        if (payload.suggestedDate) {
          facts.push({ title: '📅 Data sugerida pelo cliente', value: formatDateStringPtBr(payload.suggestedDate) });
        }
        if (isWorkflowsUrl(url)) {
          await postRaw(url, {
            type: 'message',
            attachments: [{
              contentType: 'application/vnd.microsoft.card.adaptive',
              content: {
                $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
                type: 'AdaptiveCard',
                version: '1.4',
                body: [{
                  type: 'Container',
                  style: 'warning',
                  items: [
                    { type: 'TextBlock', text: '🔄 Novo pedido de reagendamento', weight: 'Bolder', size: 'Medium' },
                    { type: 'TextBlock', text: 'Um cliente solicitou o reagendamento de uma manutenção.', wrap: true },
                    { type: 'FactSet', facts },
                  ],
                }],
              },
            }],
          });
        } else {
          let text = `Novo pedido de reagendamento.\n\n📍 Setor: ${payload.labName}\n\n👤 Solicitante: ${payload.requestedByName}\n\nMotivo: ${payload.reason}`;
          if (payload.suggestedDate) {
            text += `\n\n📅 Data sugerida pelo cliente: ${formatDateStringPtBr(payload.suggestedDate)}`;
          }
          await postRaw(url, {
            '@type': 'MessageCard',
            '@context': 'http://schema.org/extensions',
            summary: 'Novo pedido de reagendamento',
            themeColor: 'EAB308',
            title: '🔄 Novo pedido de reagendamento',
            text,
          });
        }
      } catch (err) {
        logger.error({ err, url }, 'Falha ao enviar notificação de criação de reagendamento');
      }
    }
  } catch (err) {
    logger.error({ err }, 'Falha ao resolver webhooks para criação de reagendamento');
  }
}

export async function sendRescheduleDecisionNotification(
  labId: number | null | undefined,
  decision: 'aprovado' | 'recusado',
  payload: {
    labName: string;
    maintenanceType: string;
    equipamento: string;
    motivo: string;
    decisionReason?: string;
    counterSuggestedDate?: string;
    newStart?: Date;
    newEnd?: Date;
  },
): Promise<void> {
  const isApproved = decision === 'aprovado';
  try {
    const urls = await resolveWebhookUrls(labId);
    for (const url of urls) {
      try {
        if (isWorkflowsUrl(url)) {
          const facts: { title: string; value: string }[] = [
            { title: '📍 Setor', value: payload.labName },
            { title: '🔧 Manutenção', value: `${payload.maintenanceType} - ${payload.equipamento}` },
            { title: 'Motivo', value: payload.motivo },
          ];
          if (isApproved && payload.newStart) {
            facts.push({ title: '📅 Data', value: formatFullDatePtBr(payload.newStart) });
            const endSuffix = payload.newEnd ? ` às ${formatHourPtBr(payload.newEnd)}` : '';
            facts.push({ title: '🕐 Horário', value: formatHourPtBr(payload.newStart) + endSuffix });
          }
          if (!isApproved) {
            facts.push({ title: '⚠️ Motivo da recusa', value: payload.decisionReason ?? '' });
            if (payload.counterSuggestedDate) {
              facts.push({ title: '📅 Data alternativa sugerida', value: formatDateStringPtBr(payload.counterSuggestedDate) });
            }
          }
          await postRaw(url, {
            type: 'message',
            attachments: [{
              contentType: 'application/vnd.microsoft.card.adaptive',
              content: {
                $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
                type: 'AdaptiveCard',
                version: '1.4',
                body: [{
                  type: 'Container',
                  style: isApproved ? 'good' : 'attention',
                  items: [
                    { type: 'TextBlock', text: isApproved ? '✅ Remarcação aprovada' : '❌ Remarcação recusada', weight: 'Bolder', size: 'Medium' },
                    { type: 'TextBlock', text: isApproved ? 'Um pedido de remarcação foi aprovado.' : 'Um pedido de remarcação foi recusado.', wrap: true },
                    { type: 'FactSet', facts },
                  ],
                }],
              },
            }],
          });
        } else {
          // MessageCard para URLs clássicas (webhook.office.com)
          let text = isApproved
            ? `Um pedido de remarcação foi aprovado.\n\n📍 Setor: ${payload.labName}\n\n🔧 Manutenção ${payload.maintenanceType} - ${payload.equipamento}\n\nMotivo: ${payload.motivo}`
            : `Um pedido de remarcação foi recusado.\n\n📍 Setor: ${payload.labName}\n\n🔧 Manutenção ${payload.maintenanceType} - ${payload.equipamento}\n\nMotivo: ${payload.motivo}`;
          if (isApproved && payload.newStart) {
            const endSuffix = payload.newEnd ? ` às ${formatHourPtBr(payload.newEnd)}` : '';
            text += `\n\n📅 Data: ${formatFullDatePtBr(payload.newStart)}\n\n🕐 Horário: ${formatHourPtBr(payload.newStart)}${endSuffix}`;
          }
          if (!isApproved) {
            text += `\n\n⚠️ Motivo da recusa: ${payload.decisionReason ?? ''}`;
            if (payload.counterSuggestedDate) {
              text += `\n\n📅 Data alternativa sugerida: ${formatDateStringPtBr(payload.counterSuggestedDate)}`;
            }
          }
          await postRaw(url, {
            '@type': 'MessageCard',
            '@context': 'http://schema.org/extensions',
            summary: isApproved ? 'Remarcação aprovada' : 'Remarcação recusada',
            themeColor: isApproved ? '2DA44E' : 'D13438',
            title: isApproved ? '✅ Remarcação aprovada' : '❌ Remarcação recusada',
            text,
          });
        }
      } catch (err) {
        logger.error({ err, url }, 'Falha ao enviar notificação de remarcação');
      }
    }
  } catch (err) {
    logger.error({ err }, 'Falha ao resolver webhooks para remarcação');
  }
}

export async function sendDailySummaryNotification(params: {
  chamadosAbertos: number;
  remarcacoesPendentes: number;
}): Promise<void> {
  try {
    const specificUrl = getDailySummaryWebhookUrl();
    const urls = specificUrl ? [specificUrl] : await resolveWebhookUrls();
    for (const url of urls) {
      await postAdaptiveCard(url, {
        title: 'Resumo diario da manutencao',
        subtitle: 'Atualizacao automatica das 07:00',
        facts: [
          { title: 'Chamados abertos', value: String(params.chamadosAbertos) },
          { title: 'Remarcacoes pendentes', value: String(params.remarcacoesPendentes) },
        ],
      }).catch((err: unknown) => logger.error({ err, url }, 'Falha ao enviar resumo diário'));
    }
  } catch (err) {
    logger.error({ err }, 'Falha ao enviar resumo diário');
  }
}

export async function sendMaintenanceAnalysisNotification(params: {
  labId: number;
  targetDay: 'hoje' | 'amanha';
  event: { id: string; summary: string; start: Date; maintenanceType?: 'preventiva' | 'corretiva' };
  labName: string;
}): Promise<void> {
  const isTomorrow = params.targetDay === 'amanha';
  const headerText = isTomorrow ? 'Manutenção prevista amanhã' : 'Manutenção programada para hoje';
  const maintenanceLabel = params.event.maintenanceType === 'corretiva' ? 'Corretiva' : 'Preventiva';
  const containerStyle = isTomorrow ? 'warning' : 'attention';
  const themeColor = isTomorrow ? 'EAB308' : 'D13438';

  const facts = [
    { title: '📍 Setor', value: params.labName },
    { title: '🔧 Manutenção', value: `${maintenanceLabel} - ${params.event.summary}` },
    { title: '📅 Data', value: formatFullDatePtBr(params.event.start) },
    { title: '🕐 Horário', value: formatHourPtBr(params.event.start) },
  ];

  const messageText = [
    `📍 Setor: ${params.labName}`,
    `🔧 Manutenção ${maintenanceLabel} - ${params.event.summary}`,
    `📅 Data: ${formatFullDatePtBr(params.event.start)}`,
    `🕐 Horário: ${formatHourPtBr(params.event.start)}`,
  ].join('\n');

  try {
    const urls = await resolveWebhookUrls(params.labId);
    if (urls.length === 0) {
      logger.warn({ labId: params.labId }, 'Nenhum webhook para analise de manutencao');
      return;
    }
    for (const url of urls) {
      try {
        if (isWorkflowsUrl(url)) {
          await postRaw(url, {
            type: 'message',
            attachments: [{
              contentType: 'application/vnd.microsoft.card.adaptive',
              content: {
                $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
                type: 'AdaptiveCard',
                version: '1.4',
                body: [{
                  type: 'Container',
                  style: containerStyle,
                  items: [
                    { type: 'TextBlock', text: headerText, weight: 'Bolder', size: 'Medium' },
                    { type: 'FactSet', facts },
                  ],
                }],
              },
            }],
          });
        } else {
          await postRaw(url, {
            '@type': 'MessageCard',
            '@context': 'http://schema.org/extensions',
            summary: headerText,
            themeColor,
            title: headerText,
            text: messageText.replace(/\n/g, '\n\n'),
          });
        }
      } catch (err) {
        logger.error({ err, url, labId: params.labId }, 'Erro ao enviar analise de manutencao Teams');
      }
    }
  } catch (err) {
    logger.error({ err }, 'Falha ao resolver webhooks para analise de manutencao');
  }
}

// sendWebhook mantido para uso inline no endpoint de teste (webhooks.ts)
export async function sendWebhook(url: string, message: string): Promise<void> {
  const body = isWorkflowsUrl(url)
    ? JSON.stringify({
        type: 'message',
        attachments: [{
          contentType: 'application/vnd.microsoft.card.adaptive',
          content: {
            $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
            type: 'AdaptiveCard',
            version: '1.4',
            body: [
              { type: 'TextBlock', text: 'AMU', weight: 'Bolder', size: 'Medium' },
              { type: 'TextBlock', text: message, wrap: true },
            ],
          },
        }],
      })
    : JSON.stringify({
        '@type': 'MessageCard',
        '@context': 'http://schema.org/extensions',
        themeColor: '3F7D3A',
        title: 'AMU',
        summary: message,
        text: message,
      });

  const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw Object.assign(new Error(`Teams ${resp.status}`), { status: resp.status, details: text.slice(0, 500) });
  }
}
