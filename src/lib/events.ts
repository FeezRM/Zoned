import supabase from "@/helper/supabaseClient";
import type { DbEvent } from "@/types/data";

// Store abstraction: try Supabase, gracefully fall back to localStorage when unavailable

const nowIso = () => new Date().toISOString();

async function getUserId() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id as string | undefined;
}

const LS_KEY = "events_fallback_v1";

function loadLocal(): DbEvent[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as DbEvent[]) : [];
  } catch {
    return [];
  }
}

function saveLocal(events: DbEvent[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(events));
  } catch {}
}

export type EventInput = {
  title: string;
  description?: string;
  start_iso: string; // ISO string
  end_iso: string; // ISO string
  all_day?: boolean;
  reminder_minutes?: number | null;
};

function overlapsRange(e: DbEvent, startIso: string, endIso: string) {
  const s = new Date(e.start_iso).getTime();
  const eT = new Date(e.end_iso).getTime();
  const rs = new Date(startIso).getTime();
  const re = new Date(endIso).getTime();
  return s < re && eT > rs;
}

export async function listEventsInRange(startIso: string, endIso: string) {
  // Try Supabase first
  try {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .lte("start_iso", endIso)
      .gte("end_iso", startIso)
      .order("start_iso", { ascending: true });
    if (!error && Array.isArray(data)) return { data, error: null } as const;
  } catch {}
  // Fallback to local
  const list = loadLocal().filter((e) => overlapsRange(e, startIso, endIso));
  return { data: list.sort((a, b) => a.start_iso.localeCompare(b.start_iso)), error: null } as const;
}

export async function listUpcomingEvents(limitHours = 48) {
  const start = new Date();
  const end = new Date(start.getTime() + limitHours * 3600 * 1000);
  return listEventsInRange(start.toISOString(), end.toISOString());
}

export async function insertEvent(input: EventInput) {
  const user_id = await getUserId();
  // Supabase first
  try {
    const payload: Partial<DbEvent> = {
      user_id,
      title: input.title,
      description: input.description ?? "",
      start_iso: input.start_iso,
      end_iso: input.end_iso,
      all_day: !!input.all_day,
      reminder_minutes: input.reminder_minutes ?? null,
      created_at: nowIso(),
    };
    const { data, error } = await supabase.from("events").insert(payload as any).select().single();
    if (!error && data) return { data, error: null } as const;
  } catch {}
  // Fallback local
  const list = loadLocal();
  const id = crypto.randomUUID();
  const row: DbEvent = {
    id,
    user_id: user_id ?? "local",
    title: input.title,
    description: input.description ?? "",
    start_iso: input.start_iso,
    end_iso: input.end_iso,
    all_day: !!input.all_day,
    reminder_minutes: input.reminder_minutes ?? null,
    created_at: nowIso(),
    updated_at: undefined,
  };
  list.push(row);
  saveLocal(list);
  return { data: row, error: null } as const;
}

export async function updateEvent(id: string, patch: Partial<EventInput>) {
  // Supabase first
  try {
    const { data, error } = await supabase
      .from("events")
      .update({
        ...patch,
        updated_at: nowIso(),
      } as any)
      .eq("id", id)
      .select()
      .single();
    if (!error && data) return { data, error: null } as const;
  } catch {}
  // Local fallback
  const list = loadLocal();
  const idx = list.findIndex((e) => e.id === id);
  if (idx === -1) return { data: null, error: new Error("not found") } as const;
  const next = { ...list[idx], ...patch, updated_at: nowIso() } as DbEvent;
  list[idx] = next;
  saveLocal(list);
  return { data: next, error: null } as const;
}

export async function deleteEvent(id: string) {
  // Supabase first
  try {
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (!error) return { error: null } as const;
  } catch {}
  // Local fallback
  const list = loadLocal();
  saveLocal(list.filter((e) => e.id !== id));
  return { error: null } as const;
}
