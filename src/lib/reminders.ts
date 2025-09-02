import { listUpcomingEvents } from "./events";
import { isGoogleAuthed, isGoogleConfigured, gcalListUpcomingEvents } from "./googleCalendar";

type Timer = { id: string; handle: number };
const registry = new Map<string, Timer>();
let pollingHandle: number | null = null;

async function ensurePermission() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  try {
    const res = await Notification.requestPermission();
    return res === "granted";
  } catch {
    return false;
  }
}

function scheduleAt(ts: number, id: string, title: string, body?: string) {
  const delay = Math.max(0, ts - Date.now());
  const handle = window.setTimeout(() => {
    try {
      new Notification(title, { body });
    } catch {}
    registry.delete(id);
  }, delay);
  registry.set(id, { id, handle });
}

export async function refreshReminders() {
  const ok = await ensurePermission();
  if (!ok) return;
  // clear existing timers
  registry.forEach((t) => clearTimeout(t.handle));
  registry.clear();
  let data: any[] | null = null;
  if (isGoogleConfigured() && isGoogleAuthed()) {
    const res = await gcalListUpcomingEvents(72);
    data = res.data ?? [];
  } else {
    const res = await listUpcomingEvents(72);
    data = res.data ?? [];
  }
  (data ?? []).forEach((e) => {
    if (e.reminder_minutes == null) return;
    const when = new Date(e.start_iso).getTime() - e.reminder_minutes * 60000;
    if (when <= Date.now()) return; // skip past reminders
    scheduleAt(when, e.id, e.title, e.description);
  });
}

export function startReminderPolling(intervalMs = 10 * 60 * 1000) {
  if (pollingHandle != null) return;
  // initial load
  refreshReminders();
  pollingHandle = window.setInterval(() => refreshReminders(), intervalMs);
}

export function stopReminderPolling() {
  if (pollingHandle != null) {
    clearInterval(pollingHandle);
    pollingHandle = null;
  }
  registry.forEach((t) => clearTimeout(t.handle));
  registry.clear();
}
