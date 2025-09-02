import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle, Circle, Flame, Plus, Pencil, Trash2, Save, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import useSupabaseAuth from '@/lib/useSupabaseAuth'
import { listHabits, insertHabit, updateHabitRow, deleteHabitRow, toggleHabitForToday, reorderHabits, listHabitEntriesForDate, getAllHabitsStreak } from '@/lib/data'
import { toast } from "@/components/ui/use-toast";

interface Habit {
  id: string;
  name: string;
  completed: boolean;
  streak: number;
  icon: string;
}

export const HabitWidget = () => {
  const { user } = useSupabaseAuth()
  const [habits, setHabits] = useState<Habit[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState("")
  const [newIcon, setNewIcon] = useState("✅")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editIcon, setEditIcon] = useState("✅")
  const [pendingToggleIds, setPendingToggleIds] = useState<Set<string>>(new Set())
  const [dragId, setDragId] = useState<string | null>(null)
  const [allStreak, setAllStreak] = useState(0)
  const allStreakReqId = useRef(0)
  const allStreakTimer = useRef<number | null>(null)
  const habitsRef = useRef<Habit[]>([])
  useEffect(()=>{ habitsRef.current = habits }, [habits])

  const refreshAllStreak = async () => {
    const id = ++allStreakReqId.current
    const s = await getAllHabitsStreak()
    if (id !== allStreakReqId.current) return
    const allDoneLocal = habitsRef.current.length>0 && habitsRef.current.every(h=>h.completed)
    if (allDoneLocal && s === 0) {
      // Floor at 1 if UI shows all done; schedule a follow-up reconcile to pick up server entry
      setAllStreak(prev => Math.max(prev, 1))
      window.setTimeout(async () => {
        const sid = ++allStreakReqId.current
        const s2 = await getAllHabitsStreak()
        if (sid === allStreakReqId.current) setAllStreak(s2)
      }, 1000)
    } else {
      setAllStreak(s)
    }
  }

  const EMOJI_CHOICES = [
    '✅','📚','🏃‍♂️','🚶‍♂️','💧','🧘‍♂️','🛏️','🍎','🧠','📝','🎧','☀️','🌙','💪','🧹','🧺','🧑‍🍳','🧑‍💻','📖','✍️'
  ]

  useEffect(() => {
    if (!user) { setHabits([]); setLoading(false); return }
    const load = async () => {
      setLoading(true)
      const { data } = await listHabits()
      if (!data) { setHabits([]); setLoading(false); return }
  // Derive today's completion from entries to avoid stale 'completed'
      const today = new Date().toISOString().slice(0,10)
      const { data: entries } = await listHabitEntriesForDate(today)
      const done = new Set((entries ?? []).map(e => e.habit_id))
  const nextHabits = data.map((h) => ({ id: h.id, name: h.name, completed: done.has(h.id) ? true : h.completed, streak: h.streak, icon: h.icon }))
  setHabits(nextHabits)
  // Compute all-habits streak locally for day 1 as a floor to avoid immediate flip to 0
  const allDoneLocal = nextHabits.length>0 && nextHabits.every(h=>h.completed)
  if (allDoneLocal) setAllStreak((prev)=> Math.max(prev, 1))
  // Now reconcile with server value
  await refreshAllStreak()
      setLoading(false)
    }
    load()
    // Listen for rollover events to refresh
    const onRollover = () => load()
    window.addEventListener('habits:rollover', onRollover as any)
    return () => {
      window.removeEventListener('habits:rollover', onRollover as any)
      if (allStreakTimer.current) { clearTimeout(allStreakTimer.current); allStreakTimer.current = null }
    }
  }, [user])

  const toggleHabit = async (id: string) => {
    if (pendingToggleIds.has(id)) return
    setPendingToggleIds((s)=>new Set(s).add(id))
  const prev = habits
  // Optimistic: flip the UI immediately
  setHabits((p)=> p.map(h=> h.id===id ? { ...h, completed: !h.completed } : h))
    try {
  const { completed, streak } = await toggleHabitForToday(id)
      setHabits((p) => p.map((h) => h.id === id ? { ...h, completed, streak } : h))
      // Optimistic local all-habits streak: if after this toggle all are completed today, floor at 1 immediately
      const after = (()=>{
        const map = new Map(habits.map(x=>[x.id, x.completed]))
        map.set(id, completed)
        return habits.map(x=>({ ...x, completed: map.get(x.id)! }))
      })()
      if (after.length>0 && after.every(h=>h.completed)) setAllStreak((prev)=> Math.max(prev, 1))
  // refresh all-habits streak after toggles (debounced to avoid races)
      if (allStreakTimer.current) clearTimeout(allStreakTimer.current)
      allStreakTimer.current = window.setTimeout(() => { refreshAllStreak() }, 250)
    } catch (err: any) {
      console.error('Habit toggle failed', err)
      toast({ title: 'Could not update habit', description: err?.message || 'Please try again.', variant: 'destructive' as any })
  // Revert optimistic update
  setHabits(prev)
    } finally {
      setPendingToggleIds((s)=>{ const n = new Set(s); n.delete(id); return n })
    }
  }

  const addHabit = () => {
    const name = newName.trim()
    if (!name) return
    const tempId = crypto.randomUUID()
    const optimistic: Habit = { id: tempId, name, icon: newIcon || '✅', completed: false, streak: 0 }
    setHabits((p) => [optimistic, ...p]); setAdding(false); setNewName(""); setNewIcon('✅')
    insertHabit(name, optimistic.icon).then(({ data, error }) => {
      if (error || !data) return setHabits((p) => p.filter((h) => h.id !== tempId))
      setHabits((p) => p.map((h) => h.id === tempId ? { ...h, id: data.id } : h))
    })
  }

  const startEdit = (h: Habit) => { setEditingId(h.id); setEditName(h.name); setEditIcon(h.icon) }
  const saveEdit = () => {
    const id = editingId; if (!id) return
    const name = editName.trim(); if (!name) return
    const icon = editIcon || '✅'
    const prev = habits
    setHabits((p) => p.map((h) => h.id === id ? { ...h, name, icon } : h))
    updateHabitRow(id, { name, icon }).then(({ error }) => { if (error) setHabits(prev) })
    setEditingId(null)
  }
  const cancelEdit = () => { setEditingId(null) }
  const deleteHabit = (id: string) => {
    const prev = habits
    setHabits((p) => p.filter((h) => h.id !== id))
    deleteHabitRow(id).then(({ error }) => { if (error) setHabits(prev) })
  }

  const completedHabits = useMemo(() => habits.filter(h => h.completed).length, [habits])
  const totalHabits = habits.length
  const completionRate = totalHabits > 0 ? Math.round((completedHabits / totalHabits) * 100) : 0

  return (
    <div className="widget-card widget-habits h-full overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Daily Habits</h3>
          <p className="text-sm text-muted-foreground">
            {completedHabits} of {totalHabits} completed ({completionRate}%)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-glass text-xs px-2 py-1" onClick={() => setAdding((v) => !v)}>
            <Plus className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-1 text-[hsl(var(--accent-green))]" title="All-habits streak (days in a row all habits were completed)">
            <Flame className="h-5 w-5" />
            <span className="text-sm font-medium">{allStreak}</span>
          </div>
        </div>
      </div>

  {/* (No add form at top; progress circle comes first) */}

  {/* Progress circle */}
      <div className="flex justify-center mb-6">
        <div className="relative w-20 h-20">
          <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="8" fill="none" className="text-green-100" />
            <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="8" fill="none" strokeDasharray={`${completionRate * 2.83} 283`} className="text-[hsl(var(--accent-green))] transition-all duration-500" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-bold text-[hsl(var(--accent-green))]">{completionRate}%</span>
          </div>
        </div>
      </div>

      {/* Add new habit: below progress, with name field on its own row */}
      {adding && (
        <div className="mb-4 bg-accent/30 border border-border rounded-lg p-3">
          <div className="mb-2">
            <input
              className="w-full text-sm bg-transparent border rounded-md px-2 py-2"
              placeholder="New habit name (e.g. Read 20 pages)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="shrink-0 w-32">
              <Select value={newIcon} onValueChange={setNewIcon}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Icon" />
                </SelectTrigger>
                <SelectContent>
                  {EMOJI_CHOICES.map(e => (
                    <SelectItem key={e} value={e}>{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <button className="btn-glass text-xs px-3 py-2 shrink-0" onClick={addHabit}><Save className="h-4 w-4"/></button>
            <button className="btn-glass text-xs px-3 py-2 shrink-0" onClick={()=>{setAdding(false); setNewName(''); setNewIcon('✅')}}><X className="h-4 w-4"/></button>
          </div>
        </div>
      )}

      {/* Habits list (draggable) */}
      <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
        {loading ? (
          <div className="text-center text-muted-foreground py-8">Loading…</div>
        ) : habits.map((habit, index) => (
          <div
            key={habit.id}
            draggable
            onDragStart={() => setDragId(habit.id)}
            onDragOver={(e)=>{
              e.preventDefault();
              if (!dragId || dragId===habit.id) return;
              // Reorder live while hovering based on cursor position
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
              const before = e.clientY < rect.top + rect.height / 2;
              setHabits((prev)=>{
                const cur = [...prev]
                const from = cur.findIndex(h=>h.id===dragId)
                const to = cur.findIndex(h=>h.id===habit.id)
                if (from<0||to<0) return prev
                let targetIndex = before ? to : to + 1
                if (from < targetIndex) targetIndex--
                if (from === targetIndex) return prev
                const [moved] = cur.splice(from,1)
                cur.splice(targetIndex,0,moved)
                return cur
              })
            }}
            onDrop={async()=>{
              if (!dragId || dragId===habit.id) return
              await reorderHabits(habits.map((h, i)=>({ id: h.id, order_index: i })))
              setDragId(null)
            }}
            onDragEnd={()=> setDragId(null)}
            className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-150 fade-in cursor-grab active:cursor-grabbing ${dragId===habit.id ? 'opacity-80 scale-[0.99]' : ''} ${habit.completed ? 'bg-green-500/20 border border-green-500/30' : 'bg-accent/30 border border-border hover:bg-accent/50'}`}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <button
              className="btn-glass text-xs p-1 rounded-md shrink-0"
              onClick={(e)=>{e.preventDefault(); e.stopPropagation(); toggleHabit(habit.id)}}
              disabled={pendingToggleIds.has(habit.id)}
              aria-label={habit.completed ? 'Uncheck habit' : 'Check habit'}
              title={habit.completed ? 'Uncheck' : 'Check'}
            >
              {habit.completed ? (
                <CheckCircle className="h-5 w-5 text-[hsl(var(--accent-green))]" />
              ) : (
                <Circle className="h-5 w-5 text-gray-300" />
              )}
            </button>
            <span className="text-lg shrink-0" aria-hidden="true">{habit.icon}</span>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {editingId === habit.id ? (
                  <div className="flex items-center gap-2 w-full">
                    <input className="text-sm bg-transparent border rounded-md px-2 py-1 flex-1 min-w-0" value={editName} onChange={(e)=>setEditName(e.target.value)} />
                    <div className="w-24">
                      <Select value={editIcon} onValueChange={setEditIcon}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {EMOJI_CHOICES.map(e => (
                            <SelectItem key={e} value={e}>{e}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <button className="btn-glass text-xs px-2 py-1" onClick={(e)=>{e.stopPropagation(); saveEdit()}}><Save className="h-4 w-4"/></button>
                    <button className="btn-glass text-xs px-2 py-1" onClick={(e)=>{e.stopPropagation(); cancelEdit()}}><X className="h-4 w-4"/></button>
                  </div>
                ) : (
                  <p className={`text-sm font-medium truncate ${habit.completed ? 'text-green-700' : 'text-foreground'}`}>{habit.name}</p>
                )}
                {habit.streak > 0 && (
                  <div className="flex items-center gap-1 text-orange-500">
                    <Flame className="h-3 w-3" />
                    <span className="text-xs font-medium">{habit.streak}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-shrink-0 flex items-center gap-1">
              <button className="btn-glass text-xs px-2 py-1" onClick={(e)=>{e.stopPropagation(); setEditingId(habit.id); setEditName(habit.name); setEditIcon(habit.icon)}}><Pencil className="h-4 w-4"/></button>
              <button className="btn-glass text-xs px-2 py-1 text-red-500" onClick={(e)=>{e.stopPropagation(); deleteHabit(habit.id)}}><Trash2 className="h-4 w-4"/></button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-white/20">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Keep going! You're building great habits.</p>
        </div>
      </div>
    </div>
  );
}