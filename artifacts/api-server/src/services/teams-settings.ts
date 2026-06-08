let dailySummaryEnabled = true;
let dailySummaryWebhookUrl: string | null = null;
let dailySummaryTime = '07:00';

export function getDailySummaryEnabled(): boolean {
  return dailySummaryEnabled;
}

export function setDailySummaryEnabled(enabled: boolean): void {
  dailySummaryEnabled = enabled;
}

export function getDailySummaryWebhookUrl(): string | null {
  return dailySummaryWebhookUrl;
}

export function setDailySummaryWebhookUrl(url: string | null): void {
  dailySummaryWebhookUrl = url;
}

export function getDailySummaryTime(): string {
  return dailySummaryTime;
}

export function setDailySummaryTime(time: string): void {
  dailySummaryTime = time;
}
