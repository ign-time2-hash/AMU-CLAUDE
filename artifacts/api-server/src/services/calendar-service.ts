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

const d = (offset: number) => new Date(Date.now() + offset * 86400000);

const mockEvents: CalendarEvent[] = [
  {
    id: 'mock-evt-today-1',
    calendarId: 'mock',
    summary: 'Lab de Sensores - Manutenção Preventiva',
    description: 'Revisão geral dos sensores',
    start: new Date(d(0).setHours(9, 0, 0, 0)).toISOString(),
    end: new Date(d(0).setHours(10, 0, 0, 0)).toISOString(),
    labId: 1,
    maintenanceType: 'preventiva',
    status: 'agendado',
  },
  {
    id: 'mock-evt-tomorrow-1',
    calendarId: 'mock',
    summary: 'Lab de CLP - Manutenção Corretiva',
    description: 'Reparo no CLP Siemens',
    start: new Date(d(1).setHours(14, 0, 0, 0)).toISOString(),
    end: new Date(d(1).setHours(16, 0, 0, 0)).toISOString(),
    labId: 3,
    maintenanceType: 'corretiva',
    status: 'agendado',
  },
  {
    id: 'mock-evt-tomorrow-2',
    calendarId: 'mock',
    summary: 'Lab de Análise Química - Manutenção Preventiva',
    description: 'Calibração do cromatógrafo',
    start: new Date(d(1).setHours(10, 30, 0, 0)).toISOString(),
    end: new Date(d(1).setHours(12, 0, 0, 0)).toISOString(),
    labId: 5,
    maintenanceType: 'preventiva',
    status: 'agendado',
  },
  {
    id: 'mock-evt-future-1',
    calendarId: 'mock',
    summary: 'Lab de Calibração - Manutenção Preventiva',
    description: 'Calibração semestral',
    start: d(5).toISOString(),
    end: new Date(d(5).getTime() + 3600000).toISOString(),
    labId: 2,
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

export async function listEventsInRange(options: {
  labId?: number;
  timeMin?: string;
  timeMax?: string;
}): Promise<CalendarEvent[]> {
  let result = [...eventsStore];
  if (options.labId != null) result = result.filter((e) => e.labId === options.labId);
  if (options.timeMin) result = result.filter((e) => new Date(e.start) >= new Date(options.timeMin!));
  if (options.timeMax) result = result.filter((e) => new Date(e.start) <= new Date(options.timeMax!));
  return result;
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
