export type CalendarView = "day" | "week" | "month";

export interface Settings {
  appearance: {
    theme: "system" | "light" | "dark";
  };
  calendar: {
    defaultView: CalendarView;
    weekStart: 0 | 1; // 0=Sun, 1=Mon
    showCurrentTimeLine: boolean;
    timeSlotMinutes: 15 | 30 | 60;
    defaultEventLengthMin: 30 | 45 | 60 | 90;
    workingHours: { startHour: number; endHour: number }; // 0-24
  };
  reminders: {
    enabled: boolean;
    defaultMinutes: number | null; // null=no default
  };
}

const STORAGE_KEY = "settings.v1";

const defaults: Settings = {
  appearance: { theme: "system" },
  calendar: {
    defaultView: "week",
    weekStart: 0,
    showCurrentTimeLine: true,
    timeSlotMinutes: 30,
    defaultEventLengthMin: 60,
    workingHours: { startHour: 9, endHour: 17 },
  },
  reminders: { enabled: true, defaultMinutes: null },
};

export function getSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    return deepMerge(defaults, parsed);
  } catch {
    return defaults;
  }
}

export function saveSettings(patch: Partial<Settings>) {
  const next = deepMerge(getSettings(), patch);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {}
  // notify listeners
  window.dispatchEvent(new CustomEvent("settings:changed", { detail: next }));
}

export function subscribeSettings(cb: (s: Settings) => void) {
  const handler = (e: Event) => {
    const detail = (e as CustomEvent).detail as Settings | undefined;
    cb(detail ?? getSettings());
  };
  window.addEventListener("settings:changed", handler as any);
  return () => window.removeEventListener("settings:changed", handler as any);
}

function isObject(x: any) {
  return x && typeof x === "object" && !Array.isArray(x);
}

function deepMerge<T>(base: T, patch: any): T {
  if (!isObject(base) || !isObject(patch)) return (patch ?? base) as T;
  const out: any = Array.isArray(base) ? [...(base as any)] : { ...(base as any) };
  for (const k of Object.keys(patch)) {
    const v = (patch as any)[k];
    if (v === undefined) continue;
    out[k] = isObject(out[k]) && isObject(v) ? deepMerge(out[k], v) : v;
  }
  return out as T;
}
