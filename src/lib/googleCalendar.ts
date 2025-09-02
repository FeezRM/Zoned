// Lightweight Google Calendar client using Google Identity Services (GIS)
// Requires env: VITE_GOOGLE_CLIENT_ID

import type { DbEvent } from "@/types/data";

const GIS_SRC = "https://accounts.google.com/gsi/client";
const CAL_BASE = "https://www.googleapis.com/calendar/v3";
const SCOPE = "https://www.googleapis.com/auth/calendar";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

let scriptLoaded: Promise<void> | null = null;
let tokenClient: any = null;
let accessToken: string | null = null;
let tokenExpTs = 0;

function loadGis(): Promise<void> {
  if (scriptLoaded) return scriptLoaded;
  scriptLoaded = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = GIS_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return scriptLoaded;
}

export function isGoogleConfigured() {
  return !!CLIENT_ID;
}

export function isGoogleAuthed() {
  return !!accessToken && Date.now() < tokenExpTs - 30_000; // 30s skew
}

export async function ensureGoogleAuth(interactive = true): Promise<boolean> {
  if (!CLIENT_ID) return false;
  await loadGis();
  if (isGoogleAuthed()) return true;
  if (!tokenClient) {
    // @ts-ignore
    tokenClient = window.google?.accounts?.oauth2?.initTokenClient?.({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: (resp: any) => {
        accessToken = resp?.access_token || null;
        tokenExpTs = Date.now() + (resp?.expires_in ? resp.expires_in * 1000 : 50 * 60 * 1000);
      },
      prompt: "consent",
    });
  }
  return new Promise<boolean>((resolve) => {
    tokenClient.requestAccessToken({
      prompt: interactive ? "consent" : "none",
      scope: SCOPE,
      hint: undefined,
      include_granted_scopes: true,
      callback: (resp: any) => {
        accessToken = resp?.access_token || null;
        tokenExpTs = Date.now() + (resp?.expires_in ? resp.expires_in * 1000 : 50 * 60 * 1000);
        resolve(!!accessToken);
      },
      error_callback: () => resolve(false),
    });
  });
}

export function signOutGoogle() {
  accessToken = null;
  tokenExpTs = 0;
}

async function authedFetch(url: string, init?: RequestInit) {
  const ok = await ensureGoogleAuth(true);
  if (!ok || !accessToken) throw new Error("Google auth failed");
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  headers.set("Content-Type", "application/json");
  return fetch(url, { ...init, headers });
}

export type GCalListItem = { id: string; summary: string };

export async function listCalendars(): Promise<GCalListItem[]> {
  const res = await authedFetch(`${CAL_BASE}/users/me/calendarList`);
  const json = await res.json();
  return (json.items ?? []).map((c: any) => ({ id: c.id, summary: c.summary })) as GCalListItem[];
}

const LS_CAL = "gcal.calendarId";
export function getSelectedCalendarId(): string {
  return localStorage.getItem(LS_CAL) || "primary";
}
export function setSelectedCalendarId(id: string) {
  localStorage.setItem(LS_CAL, id);
}

function toYmd(d: Date) {
  return new Date(d).toISOString().slice(0, 10);
}

function mapGToDb(e: any): DbEvent {
  const isAllDay = !!e.start?.date && !e.start?.dateTime;
  const start_iso = isAllDay ? new Date(`${e.start.date}T00:00:00`).toISOString() : new Date(e.start.dateTime).toISOString();
  const end_iso = isAllDay ? new Date(`${e.end.date}T00:00:00`).toISOString() : new Date(e.end.dateTime).toISOString();
  let reminder: number | null = null;
  if (e.reminders?.overrides?.length) {
    const popup = e.reminders.overrides.find((o: any) => o.method === "popup");
    reminder = popup?.minutes ?? null;
  }
  return {
    id: e.id,
    user_id: "google",
    title: e.summary || "(no title)",
    description: e.description || "",
    start_iso,
    end_iso,
    all_day: isAllDay,
    reminder_minutes: reminder,
    created_at: e.created || new Date().toISOString(),
    updated_at: e.updated,
  };
}

function mapDbToG(input: Partial<DbEvent>) {
  const body: any = {};
  if (input.title !== undefined) body.summary = input.title;
  if (input.description !== undefined) body.description = input.description;
  if (input.all_day || (!input.start_iso && !input.end_iso && input.all_day)) {
    // if all_day true and start/end provided, use date
  }
  if (input.all_day && input.start_iso) {
    const d = new Date(input.start_iso);
    const end = new Date(d.getTime() + 24 * 3600 * 1000);
    body.start = { date: toYmd(d), timeZone: TZ };
    body.end = { date: toYmd(end), timeZone: TZ };
  } else if (input.start_iso && input.end_iso) {
    body.start = { dateTime: new Date(input.start_iso).toISOString(), timeZone: TZ };
    body.end = { dateTime: new Date(input.end_iso).toISOString(), timeZone: TZ };
  }
  if (input.reminder_minutes !== undefined) {
    if (input.reminder_minutes == null) {
      body.reminders = { useDefault: false };
    } else {
      body.reminders = { useDefault: false, overrides: [{ method: "popup", minutes: input.reminder_minutes }] };
    }
  }
  return body;
}

export async function gcalListEventsInRange(startIso: string, endIso: string) {
  const calId = encodeURIComponent(getSelectedCalendarId());
  const url = `${CAL_BASE}/calendars/${calId}/events?timeMin=${encodeURIComponent(startIso)}&timeMax=${encodeURIComponent(endIso)}&singleEvents=true&orderBy=startTime&showDeleted=false`;
  const res = await authedFetch(url);
  const json = await res.json();
  const items = (json.items ?? []).map(mapGToDb) as DbEvent[];
  return { data: items, error: null as any } as const;
}

export async function gcalListUpcomingEvents(hours = 48) {
  const now = new Date();
  const end = new Date(now.getTime() + hours * 3600 * 1000);
  return gcalListEventsInRange(now.toISOString(), end.toISOString());
}

export async function gcalInsertEvent(input: { title: string; description?: string; start_iso: string; end_iso: string; all_day?: boolean; reminder_minutes?: number | null; }) {
  const calId = encodeURIComponent(getSelectedCalendarId());
  const body = mapDbToG({
    title: input.title,
    description: input.description ?? "",
    start_iso: input.start_iso,
    end_iso: input.end_iso,
    all_day: !!input.all_day,
    reminder_minutes: input.reminder_minutes ?? null,
  });
  const res = await authedFetch(`${CAL_BASE}/calendars/${calId}/events`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) return { data: null, error: json } as const;
  return { data: mapGToDb(json), error: null } as const;
}

export async function gcalUpdateEvent(id: string, patch: Partial<{ title: string; description: string; start_iso: string; end_iso: string; all_day: boolean; reminder_minutes: number | null }>) {
  const calId = encodeURIComponent(getSelectedCalendarId());
  const body = mapDbToG({
    title: patch.title,
    description: patch.description,
    start_iso: patch.start_iso as any,
    end_iso: patch.end_iso as any,
    all_day: patch.all_day,
    reminder_minutes: patch.reminder_minutes,
  });
  const res = await authedFetch(`${CAL_BASE}/calendars/${calId}/events/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) return { data: null, error: json } as const;
  return { data: mapGToDb(json), error: null } as const;
}

export async function gcalDeleteEvent(id: string) {
  const calId = encodeURIComponent(getSelectedCalendarId());
  const res = await authedFetch(`${CAL_BASE}/calendars/${calId}/events/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!res.ok) return { error: await res.json() } as const;
  return { error: null } as const;
}
