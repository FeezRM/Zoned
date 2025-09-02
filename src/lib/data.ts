import supabase from '@/helper/supabaseClient'
import type { DbTodo, DbHabit, DbNote, DbDailyFocus, DbMoodEntry, DbHabitEntry } from '@/types/data'

// Utilities
const nowIso = () => new Date().toISOString()
async function getUserId() {
  const { data } = await supabase.auth.getUser()
  return data.user?.id as string | undefined
}

// Todos
export async function listTodos() {
  // Order by created_at (client will apply custom order if present)
  return supabase.from('todos').select('*').order('created_at', { ascending: false })
}
export async function insertTodo(row: Omit<DbTodo, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
  const user_id = await getUserId()
  const payload = { ...row, user_id, created_at: nowIso() }
  return supabase.from('todos').insert(payload as any).select().single()
}
export async function updateTodo(id: string, patch: Partial<DbTodo>) {
  return supabase.from('todos').update({ ...patch, updated_at: nowIso() }).eq('id', id).select().single()
}
export async function deleteTodoRow(id: string) {
  return supabase.from('todos').delete().eq('id', id)
}

// Habits
export async function listHabits() {
  return supabase.from('habits').select('*').order('created_at', { ascending: true })
}
export async function upsertHabit(row: Partial<DbHabit>) {
  const user_id = await getUserId()
  return supabase.from('habits').upsert({ ...row, user_id, updated_at: nowIso() } as any).select().single()
}
export async function toggleHabitCompleted(id: string, completed: boolean, streak?: number) {
  const patch: any = { completed, updated_at: nowIso() }
  if (typeof streak === 'number') patch.streak = streak
  return supabase.from('habits').update(patch).eq('id', id).select().single()
}
export async function insertHabit(name: string, icon: string) {
  const user_id = await getUserId()
  return supabase.from('habits').insert({ user_id, name, icon, streak: 0, completed: false, created_at: nowIso() } as any).select().single()
}
export async function updateHabitRow(id: string, patch: Partial<DbHabit>) {
  return supabase.from('habits').update({ ...patch, updated_at: nowIso() }).eq('id', id).select().single()
}
export async function deleteHabitRow(id: string) {
  return supabase.from('habits').delete().eq('id', id)
}

// Bulk reorder helpers
export async function reorderTodos(updates: { id: string; order_index: number }[]) {
  if (!updates.length) return { error: null }
  const user_id = await getUserId()
  const payload = updates.map(u => ({ id: u.id, user_id, order_index: u.order_index, updated_at: nowIso() })) as any
  return supabase.from('todos').upsert(payload, { onConflict: 'id' })
}

export async function reorderHabits(updates: { id: string; order_index: number }[]) {
  if (!updates.length) return { error: null }
  const user_id = await getUserId()
  const payload = updates.map(u => ({ id: u.id, user_id, order_index: u.order_index, updated_at: nowIso() })) as any
  return supabase.from('habits').upsert(payload, { onConflict: 'id' })
}

// Habit entries (per-day completion)
export async function listHabitEntriesForDate(forDate: string) {
  return supabase.from('habit_entries').select('*').eq('for_date', forDate)
}
export async function getHabitEntry(habit_id: string, forDate: string) {
  return supabase.from('habit_entries').select('*').eq('habit_id', habit_id).eq('for_date', forDate).maybeSingle()
}
export async function insertHabitEntry(habit_id: string, forDate: string) {
  const user_id = await getUserId()
  return supabase.from('habit_entries').insert({ user_id, habit_id, for_date: forDate, completed_at: nowIso() } as any).select().single()
}
export async function deleteHabitEntry(habit_id: string, forDate: string) {
  const user_id = await getUserId()
  return supabase
    .from('habit_entries')
    .delete()
    .eq('habit_id', habit_id)
    .eq('for_date', forDate)
    .eq('user_id', user_id)
}
export async function listHabitEntriesSince(habit_id: string, sinceDate: string) {
  return supabase.from('habit_entries').select('for_date').eq('habit_id', habit_id).gte('for_date', sinceDate).order('for_date', { ascending: false })
}

// All habit entries for the current user since a date (for all-habits streak calc)
export async function listAllHabitEntriesSince(sinceDate: string, habitIds?: string[]) {
  let q = supabase
    .from('habit_entries')
    .select('habit_id, for_date')
    .gte('for_date', sinceDate)
    .order('for_date', { ascending: false })
  if (habitIds && habitIds.length) {
    q = q.in('habit_id', habitIds as any)
  }
  return q
}

function addDays(date: Date, delta: number) {
  const d = new Date(date); d.setDate(d.getDate() + delta); return d
}
function toYmd(d: Date) { return d.toISOString().slice(0,10) }

export async function toggleHabitForToday(habit_id: string) {
  const today = toYmd(new Date())
  const existing = await getHabitEntry(habit_id, today)
  const since = toYmd(addDays(new Date(), -366))
  const { data: rows } = await listHabitEntriesSince(habit_id, since)
  const dates = new Set<string>((rows ?? []).map((r: any) => r.for_date))

  const consecutiveUpTo = (end: string, set: Set<string>) => {
    let count = 0
    let cur = new Date(end)
    for (let i = 0; i < 400; i++) {
      const ymd = toYmd(cur)
      if (set.has(ymd)) { count++; cur = addDays(cur, -1) } else break
    }
    return count
  }

  if (existing.data) {
    // uncomplete today
    const { error: delErr } = await deleteHabitEntry(habit_id, today)
    if (delErr) throw delErr
    dates.delete(today)
    const yDay = toYmd(addDays(new Date(today), -1))
    const streak = consecutiveUpTo(yDay, dates)
    const { error: updErr } = await updateHabitRow(habit_id, { streak, completed: false })
    if (updErr) {
      // Try a lighter update path if RLS blocks updateHabitRow
      const { error: upd2 } = await toggleHabitCompleted(habit_id, false, streak)
      if (upd2) throw updErr
    }
    return { completed: false, streak }
  } else {
    // complete today
    const { error: insErr } = await insertHabitEntry(habit_id, today)
    if (insErr) throw insErr
    dates.add(today)
    const streak = consecutiveUpTo(today, dates)
    const { error: updErr } = await updateHabitRow(habit_id, { streak, completed: true })
    if (updErr) {
      const { error: upd2 } = await toggleHabitCompleted(habit_id, true, streak)
      if (upd2) throw updErr
    }
    return { completed: true, streak }
  }
}

// ---- Daily rollover: recompute 'completed' for today and update streak for all habits ----
export async function runHabitDailyRollover() {
  // Avoid repeated runs per day in this session using localStorage guard
  const key = 'habits.lastRolloverYmd'
  const today = toYmd(new Date())
  try {
    const last = localStorage.getItem(key)
    if (last === today) return { skipped: true }
  } catch {}

  const { data: habits } = await listHabits()
  if (!habits || !habits.length) {
    try { localStorage.setItem(key, today) } catch {}
    return { updated: 0 }
  }
  const since = toYmd(addDays(new Date(), -366))
  const yDay = toYmd(addDays(new Date(), -1))

  let updated = 0
  for (const h of habits as any as DbHabit[]) {
    const { data: rows } = await listHabitEntriesSince(h.id, since)
    const dates = new Set<string>((rows ?? []).map((r: any) => r.for_date))
    const completedToday = dates.has(today)
    // streak counts consecutive days up to today if completed today; otherwise up to yesterday
    let count = 0
    const end = completedToday ? new Date(today) : new Date(yDay)
    for (let i = 0; i < 400; i++) {
      const ymd = toYmd(addDays(end, -i))
      if (dates.has(ymd)) count++; else break
    }
    // Only write if there's a change to reduce writes
    if (h.completed !== completedToday || h.streak !== count) {
      await updateHabitRow(h.id, { completed: completedToday, streak: count })
      updated++
    }
  }
  try { localStorage.setItem(key, today) } catch {}
  try {
    window.dispatchEvent(new CustomEvent('habits:rollover', { detail: { updated } }))
  } catch {}
  return { updated }
}

export function scheduleHabitDailyRollover() {
  // Run immediately on startup
  runHabitDailyRollover()
  // Schedule at next local midnight + small buffer (00:05)
  const now = new Date()
  const next = new Date(now)
  next.setHours(24, 5, 0, 0) // today 24:05 -> effectively next day 00:05
  const delay = Math.max(1000, next.getTime() - now.getTime())
  setTimeout(() => {
    runHabitDailyRollover()
    // Every 24h thereafter
    setInterval(() => runHabitDailyRollover(), 24 * 60 * 60 * 1000)
  }, delay)
}

// ---- All-habits streak (consecutive days where every habit has an entry) ----
export async function getAllHabitsStreak() {
  const user_id = await getUserId()
  if (!user_id) return 0
  const d = new Date()
  const todayLocal = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  const { data, error } = await supabase.rpc('all_habits_streak', {
    p_user_id: user_id,
    p_today: todayLocal,
    p_max_days: 365,
  })
  if (error) return 0
  return (data as number | null) ?? 0
}

// Notes
export async function listNotes() {
  return supabase.from('notes').select('*').order('created_at', { ascending: false })
}
export async function insertNote(content: string) {
  const user_id = await getUserId()
  return supabase.from('notes').insert({ user_id, content, created_at: nowIso() } as any).select().single()
}
export async function updateNote(id: string, content: string) {
  return supabase.from('notes').update({ content, updated_at: nowIso() }).eq('id', id).select().single()
}
export async function deleteNoteRow(id: string) {
  return supabase.from('notes').delete().eq('id', id)
}

// Daily Focus
export async function getDailyFocus(forDate: string) {
  return supabase.from('daily_focus').select('*').eq('for_date', forDate).single()
}
export async function setDailyFocus(forDate: string, text: string) {
  const user_id = await getUserId()
  return supabase.from('daily_focus').upsert({ user_id, for_date: forDate, text, updated_at: nowIso() } as any, { onConflict: 'user_id,for_date' }).select().single()
}
export async function updateDailyFocus(forDate: string, patch: Partial<DbDailyFocus>) {
  // upsert patch fields by (user_id, for_date)
  const user_id = await getUserId()
  return supabase
    .from('daily_focus')
    .upsert({ user_id, for_date: forDate, ...patch, updated_at: nowIso() } as any, { onConflict: 'user_id,for_date' })
    .select()
    .single()
}
export async function listDailyFocus(fromDate: string, toDate: string) {
  return supabase.from('daily_focus').select('*').gte('for_date', fromDate).lte('for_date', toDate).order('for_date', { ascending: true })
}

// Mood
export async function listMoodEntries(sinceIso?: string) {
  const q = supabase.from('mood_entries').select('*').order('created_at', { ascending: false })
  return sinceIso ? q.gte('created_at', sinceIso) : q
}
export async function insertMoodEntry(value: number, label: string, emoji: string) {
  const user_id = await getUserId()
  return supabase.from('mood_entries').insert({ user_id, value, label, emoji, created_at: nowIso() } as any).select().single()
}
