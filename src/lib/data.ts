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
  return supabase.from('habit_entries').delete().eq('habit_id', habit_id).eq('for_date', forDate)
}
export async function listHabitEntriesSince(habit_id: string, sinceDate: string) {
  return supabase.from('habit_entries').select('for_date').eq('habit_id', habit_id).gte('for_date', sinceDate).order('for_date', { ascending: false })
}

function addDays(date: Date, delta: number) {
  const d = new Date(date); d.setDate(d.getDate() + delta); return d
}
function toYmd(d: Date) { return d.toISOString().slice(0,10) }

export async function toggleHabitForToday(habit_id: string) {
  const today = toYmd(new Date())
  const existing = await getHabitEntry(habit_id, today)
  const since = toYmd(addDays(new Date(), -365))
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
    await deleteHabitEntry(habit_id, today)
    dates.delete(today)
    const yDay = toYmd(addDays(new Date(today), -1))
    const streak = consecutiveUpTo(yDay, dates)
    await updateHabitRow(habit_id, { streak, completed: false })
    return { completed: false, streak }
  } else {
    // complete today
    await insertHabitEntry(habit_id, today)
    dates.add(today)
    const streak = consecutiveUpTo(today, dates)
    await updateHabitRow(habit_id, { streak, completed: true })
    return { completed: true, streak }
  }
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
