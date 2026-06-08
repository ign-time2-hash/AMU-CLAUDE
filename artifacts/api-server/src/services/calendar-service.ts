import { logger } from '../logger.js';

export interface CalendarEvent {
  id: string;
  calendarId: string;
  summary: string;
  description?: string;
  start: string;
  end: string;
  labId?: number;
  maintenanceType: 'preventiva' | 'corretiva';
  status: 'agendado' | 'em_andamento' | 'concluido';
}

const mockEvents: CalendarEvent[] = [
  {
    id: 'mock-evt-1',
    calendarId: 'mock',
    summary: 'Lab de Sensores - Manutenção Preventiva',
    description: 'Revisão geral dos sensores',
    start: new Date(Date.now() + 2 * 86400000).toISOString(),
    end: new Date(Date.now() + 2 * 86400000 + 3600000).toISOString(),
    labId: 1,
    maintenanceType: 'preventiva',
    status: 'agendado',
  },
  {
    id: 'mock-evt-2',
    calendarId: 'mock',
    summary: 'Lab de CLP - Manutenção Corretiva',
    description: 'Reparo no CLP Siemens',
    start: new Date(Date.now() + 5 * 86400000).toISOString(),
    end: new Date(Date.now() + 5 * 86400000 + 7200000).toISOString(),
    labId: 3,
    maintenanceType: 'corretiva',
    status: 'agendado',
  },
  {
    id: 'mock-evt-3',
    calendarId: 'mock',
    summary: 'Lab de Análise Química - Manutenção Preventiva',
    description: 'Calibração do cromatógrafo',
    start: new Date(Date.now() + 7 * 86400000).toISOString(),
    end: new Date(Date.now() + 7 * 86400000 + 5400000).toISOString(),
    labId: 5,
    maintenanceType: 'preventiva',
    status: 'agendado',
  },
];

let eventsStore: CalendarEvent[] = [...mockEvents];

function hasCredentials(): boolean {
  return !!(
    process.env['GOOGLE_CALENDAR_CLIENT_ID'] &&
    process.env['GOOGLE_CALENDAR_CLIENT_SECRET'] &&
    process.env['GOOGLE_CALENDAR_REFRESH_TOKEN']
  );
}

export async function listEvents(labId?: number): Promise<CalendarEvent[]> {
  if (hasCredentials()) {
    logger.info('Google Calendar: usando credenciais reais (não implementado neste scaffold)');
  }
  return labId != null ? eventsStore.filter((e) => e.labId === labId) : eventsStore;
}

export async function createEvent(data: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent> {
  const event: CalendarEvent = { ...data, id: `mock-${Date.now()}` };
  eventsStore.push(event);
  return event;
}

export async function updateEvent(eventId: string, data: Partial<CalendarEvent>): Promise<CalendarEvent> {
  const idx = eventsStore.findIndex((e) => e.id === eventId);
  if (idx === -1) throw new Error('Evento não encontrado');
  eventsStore[idx] = { ...eventsStore[idx]!, ...data, id: eventId };
  return eventsStore[idx]!;
}

export async function deleteEvent(eventId: string): Promise<void> {
  eventsStore = eventsStore.filter((e) => e.id !== eventId);
}
