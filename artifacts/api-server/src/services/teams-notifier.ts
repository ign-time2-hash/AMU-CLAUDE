import { db } from '../db.js';
import { logger } from '../logger.js';

export async function notifyTeams(labId: number | null | undefined, message: string): Promise<void> {
  try {
    const where = labId != null ? { labId, enabled: true } : { enabled: true };
    const webhooks = await db.webhook.findMany({ where });

    for (const webhook of webhooks) {
      await sendWebhook(webhook.url, message);
      await db.webhook.update({ where: { id: webhook.id }, data: { lastSentAt: new Date() } });
    }
  } catch (err) {
    logger.warn({ err }, 'Falha ao notificar Teams');
  }
}

export async function sendWebhook(url: string, message: string): Promise<void> {
  const isWorkflows = url.includes('logic.azure.com');

  const body = isWorkflows
    ? JSON.stringify({
        type: 'message',
        attachments: [
          {
            contentType: 'application/vnd.microsoft.card.adaptive',
            content: {
              type: 'AdaptiveCard',
              version: '1.4',
              body: [{ type: 'TextBlock', text: message, wrap: true }],
            },
          },
        ],
      })
    : JSON.stringify({
        '@type': 'MessageCard',
        '@context': 'http://schema.org/extensions',
        themeColor: '3F7D3A',
        summary: message,
        sections: [{ activityText: message }],
      });

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    if (resp.status === 403 || resp.status === 401) {
      logger.warn(`Teams webhook retornou ${resp.status}. Gere uma nova URL via app Workflows (Power Automate).`);
    } else if (resp.status === 429) {
      logger.warn('Teams webhook: rate limit atingido (429). Tente novamente mais tarde.');
    } else {
      logger.warn(`Teams webhook retornou ${resp.status}: ${text}`);
    }
    throw new Error(`Teams webhook ${resp.status}`);
  }
}

export async function sendRescheduleNotification(
  labId: number | null | undefined,
  type: 'aprovado' | 'recusado',
  payload: {
    labName: string;
    maintenanceType: string;
    equipamento: string;
    motivo: string;
    decisionReason?: string;
    newStart?: Date;
    newEnd?: Date;
  },
): Promise<void> {
  try {
    const where = labId != null ? { labId, enabled: true } : { enabled: true };
    const webhooks = await db.webhook.findMany({ where });

    for (const webhook of webhooks) {
      const message = buildRescheduleMessage(type, payload);
      await sendWebhook(webhook.url, message);
      await db.webhook.update({ where: { id: webhook.id }, data: { lastSentAt: new Date() } });
    }
  } catch (err) {
    logger.warn({ err }, 'Falha ao enviar notificação de remarcação');
  }
}

function buildRescheduleMessage(
  type: 'aprovado' | 'recusado',
  payload: {
    labName: string;
    maintenanceType: string;
    equipamento: string;
    motivo: string;
    decisionReason?: string;
    newStart?: Date;
    newEnd?: Date;
  },
): string {
  if (type === 'aprovado') {
    const dateStr = payload.newStart
      ? payload.newStart.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      : 'Data a definir';
    const startHour = payload.newStart
      ? payload.newStart.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      : '';
    const endHour = payload.newEnd
      ? payload.newEnd.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      : '';
    return `✅ Remarcação aprovada\nUm pedido de remarcação foi aprovado.\n📍 Setor: ${payload.labName}\n🔧 Manutenção ${payload.maintenanceType} - ${payload.equipamento}\nMotivo: ${payload.motivo}\n📅 Data: ${dateStr}\n🕐 Horário: ${startHour} às ${endHour}`;
  } else {
    return `❌ Remarcação recusada\nUm pedido de remarcação foi recusado.\n📍 Setor: ${payload.labName}\n🔧 Manutenção ${payload.maintenanceType} - ${payload.equipamento}\nMotivo: ${payload.motivo}\n⚠️ Recusado\nPesquisador: ${payload.decisionReason ?? ''}`;
  }
}
