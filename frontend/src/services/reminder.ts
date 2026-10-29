import { ReminderConfig } from '../types';
import { ls, pad, todayStr } from './api';

const KEY = 'ms_reminder';
const LAST = 'ms_reminder_last';

export const getReminder = (): ReminderConfig => {
  try {
    const v = JSON.parse(ls.get(KEY) || '');
    if (v && typeof v.time === 'string') return { enabled: !!v.enabled, time: v.time };
  } catch {
    // fall through to default
  }
  return { enabled: false, time: '20:00' };
};

export const saveReminder = (c: ReminderConfig): void => ls.set(KEY, JSON.stringify(c));

/** Due when enabled, the time has passed today, it has not fired today and today's mood is not logged. */
export const reminderDue = (c: ReminderConfig, loggedToday: boolean): boolean => {
  if (!c.enabled || loggedToday) return false;
  const now = new Date();
  const hhmm = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  return hhmm >= c.time && ls.get(LAST) !== todayStr();
};

export const markReminderSent = (): void => ls.set(LAST, todayStr());

export function notify(title: string, body: string): void {
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    try {
      new Notification(title, { body });
    } catch {
      // some browsers block constructing notifications; the in-app toast still shows
    }
  }
}
