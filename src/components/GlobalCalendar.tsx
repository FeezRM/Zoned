import { useEffect, useMemo, useState } from "react";
import { Calendar as CalendarIcon, Check, Plus, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import useSupabaseAuth from "@/lib/useSupabaseAuth";
import {
  listTodos,
  insertTodo,
  updateTodo,
  listHabits,
  listHabitEntriesForDate,
  getHabitEntry,
  insertHabitEntry,
  deleteHabitEntry,
  toggleHabitForToday,
  getDailyFocus,
  setDailyFocus,
  updateDailyFocus,
} from "@/lib/data";

type Priority = "low" | "medium" | "high";

function toYmd(d: Date) {
  return new Date(d).toISOString().slice(0, 10);
}

function sameDay(a?: string | null, ymd?: string) {
  if (!a || !ymd) return false;
  return new Date(a).toISOString().slice(0, 10) === ymd;
}

export function GlobalCalendarButton() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="btn-glass" aria-label="Open calendar">
          <CalendarIcon className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Calendar</DialogTitle>
        </DialogHeader>
        <CalendarBody onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function CalendarBody({ onClose }: { onClose?: () => void }) {
  const { user } = useSupabaseAuth();
  const [selected, setSelected] = useState<Date>(new Date());
  const ymd = useMemo(() => toYmd(selected), [selected]);

  // Todos
  const [todos, setTodos] = useState<any[]>([]);
  const [newTodo, setNewTodo] = useState("");

  // Habits + entries for selected date
  const [habits, setHabits] = useState<any[]>([]);
  const [habitDoneSet, setHabitDoneSet] = useState<Set<string>>(new Set());

  // Daily Focus for selected date
  const [focus, setFocusText] = useState("");
  const [editingFocus, setEditingFocus] = useState(false);
  const [focusDraft, setFocusDraft] = useState("");
  const [progress, setProgress] = useState(0);
  const [completed, setCompleted] = useState(false);

  const todayYmd = toYmd(new Date());

  // Initial loads
  useEffect(() => {
    if (!user) return;
    listTodos().then(({ data }) => setTodos(data ?? []));
    listHabits().then(({ data }) => setHabits(data ?? []));
  }, [user]);

  // Load per-date info
  useEffect(() => {
    if (!user) return;
    // Habits entries for date
    listHabitEntriesForDate(ymd).then(({ data }) => {
      const set = new Set<string>();
      (data ?? []).forEach((row: any) => set.add(row.habit_id));
      setHabitDoneSet(set);
    });
    // Daily Focus
    getDailyFocus(ymd).then(({ data }) => {
      setFocusText(data?.text ?? "");
      setFocusDraft(data?.text ?? "");
      setProgress(typeof data?.progress === "number" ? Math.max(0, Math.min(100, data!.progress!)) : 0);
      setCompleted(!!data?.completed);
    });
  }, [user, ymd]);

  const dateTodos = useMemo(() => {
    const list = (todos ?? []).filter((t) => sameDay(t.deadline, ymd));
    // Sort: incomplete first, then by time
    return list.sort((a, b) => Number(a.completed) - Number(b.completed) || new Date(a.deadline ?? 0).getTime() - new Date(b.deadline ?? 0).getTime());
  }, [todos, ymd]);

  const toggleTodo = async (id: string) => {
    const old = todos.find((t) => t.id === id);
    if (!old) return;
    const nowCompleted = !old.completed;
    setTodos((p) => p.map((t) => (t.id === id ? { ...t, completed: nowCompleted } : t)));
    const { error } = await updateTodo(id, { completed: nowCompleted } as any);
    if (error) setTodos((p) => p.map((t) => (t.id === id ? { ...t, completed: !nowCompleted } : t)));
  };

  const addTodo = async () => {
    const text = newTodo.trim();
    if (!text) return;
    const tempId = crypto.randomUUID();
    const deadline = new Date(selected);
    deadline.setHours(17, 0, 0, 0);
    const optimistic = {
      id: tempId,
      text,
      completed: false,
      priority: "medium" as Priority,
      tags: [],
      subtasks: [],
      deadline: deadline.toISOString(),
      recurring: "none",
      created_at: new Date().toISOString(),
    };
    setTodos((p) => [optimistic, ...p]);
    setNewTodo("");
    const { data, error } = await insertTodo({
      text,
      completed: false,
      priority: "medium" as Priority,
      tags: [],
      subtasks: [],
      deadline: optimistic.deadline,
      recurring: "none",
    } as any);
    if (error || !data) {
      setTodos((p) => p.filter((t) => t.id !== tempId));
    } else {
      setTodos((p) => p.map((t) => (t.id === tempId ? { ...t, id: data.id, created_at: data.created_at } : t)));
    }
  };

  const toggleHabitForDate = async (habit_id: string) => {
    if (ymd === todayYmd) {
      // Use provided helper that also updates streak and "completed" today
      const prevDone = habitDoneSet.has(habit_id);
      await toggleHabitForToday(habit_id);
      const next = new Set(habitDoneSet);
      if (prevDone) next.delete(habit_id); else next.add(habit_id);
      setHabitDoneSet(next);
      return;
    }
    // Historical/future date: just add/remove entry
    const { data } = await getHabitEntry(habit_id, ymd);
    const next = new Set(habitDoneSet);
    if (data) {
      await deleteHabitEntry(habit_id, ymd);
      next.delete(habit_id);
    } else {
      await insertHabitEntry(habit_id, ymd);
      next.add(habit_id);
    }
    setHabitDoneSet(next);
  };

  const saveFocus = async () => {
    setFocusText(focusDraft);
    setEditingFocus(false);
    await setDailyFocus(ymd, focusDraft);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Selected date</p>
            <p className="text-base font-medium">{new Date(ymd).toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelected(new Date())}>Today</Button>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        </div>

        <div className="rounded-lg border p-2">
          <Calendar mode="single" selected={selected} onSelect={(d) => d && setSelected(d)} />
        </div>
      </div>

      <div className="space-y-6">
        {/* Daily Focus */}
        <section className="rounded-lg border p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">Daily Focus</h3>
            {!editingFocus ? (
              <Button variant="ghost" size="sm" onClick={() => { setEditingFocus(true); setFocusDraft(focus); }}>Edit</Button>
            ) : null}
          </div>
          {editingFocus ? (
            <div className="space-y-3">
              <Input value={focusDraft} onChange={(e) => setFocusDraft(e.target.value)} placeholder="What's the focus for this day?" />
              <div className="flex gap-2">
                <Button size="sm" onClick={saveFocus}><Check className="h-4 w-4 mr-1" />Save</Button>
                <Button size="sm" variant="ghost" onClick={() => { setEditingFocus(false); setFocusDraft(focus); }}><X className="h-4 w-4 mr-1" />Cancel</Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-foreground min-h-5">{focus || "No focus set for this day."}</p>
          )}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Progress</span>
              <button
                className={`text-xs inline-flex items-center gap-1 px-2 py-1 rounded-md ${completed ? 'text-primary' : 'text-muted-foreground'} btn-glass`}
                onClick={() => {
                  const next = !completed; setCompleted(next); updateDailyFocus(ymd, { completed: next } as any);
                }}
              >
                <Check className="h-3 w-3" /> {completed ? 'Done' : 'Mark done'}
              </button>
            </div>
            <Slider
              value={[progress]}
              onValueChange={(v) => setProgress(Math.max(0, Math.min(100, v[0] ?? 0)))}
              onValueCommit={(v) => updateDailyFocus(ymd, { progress: Math.max(0, Math.min(100, v[0] ?? 0)) } as any)}
              max={100}
              step={5}
            />
            <p className="text-right text-xs text-muted-foreground">{progress}%</p>
          </div>
        </section>

        {/* Todos for date */}
        <section className="rounded-lg border p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Todos on this day</h3>
            <span className="text-xs text-muted-foreground">{dateTodos.length}</span>
          </div>
          <div className="flex gap-2 mb-3">
            <Input
              placeholder="Quick add a todo for this date"
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addTodo(); }}
            />
            <Button variant="secondary" onClick={addTodo} disabled={!newTodo.trim()}><Plus className="h-4 w-4" /></Button>
          </div>
          {dateTodos.length ? (
            <ul className="space-y-2 max-h-56 overflow-auto pr-1">
              {dateTodos.map((t) => (
                <li key={t.id} className={`flex items-center gap-2 p-2 rounded-md border ${t.completed ? 'bg-green-500/10 border-green-500/30' : 'bg-accent/30 border-border'}`}>
                  <button
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${t.completed ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'}`}
                    onClick={() => toggleTodo(t.id)}
                    aria-label={t.completed ? 'Mark incomplete' : 'Mark complete'}
                  >
                    {t.completed && <Check className="h-3 w-3" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${t.completed ? 'line-through text-muted-foreground' : ''}`}>{t.text}</p>
                    {t.deadline && (
                      <p className="text-[11px] text-muted-foreground">{new Date(t.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No todos scheduled for this day.</p>
          )}
        </section>

        {/* Habits for date */}
        <section className="rounded-lg border p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Habits</h3>
            <span className="text-xs text-muted-foreground">{habits.length}</span>
          </div>
          {habits.length ? (
            <ul className="space-y-2 max-h-56 overflow-auto pr-1">
              {habits.map((h) => {
                const done = habitDoneSet.has(h.id);
                return (
                  <li key={h.id} className={`flex items-center gap-3 p-2 rounded-md border ${done ? 'bg-green-500/10 border-green-500/30' : 'bg-accent/30 border-border'}`}>
                    <button
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${done ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'}`}
                      onClick={() => toggleHabitForDate(h.id)}
                      aria-label={done ? 'Uncheck' : 'Check'}
                    >
                      {done && <Check className="h-3 w-3" />}
                    </button>
                    <span className="text-lg" aria-hidden>{h.icon}</span>
                    <p className="text-sm">{h.name}</p>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No habits yet.</p>
          )}
        </section>
      </div>
    </div>
  );
}

export default GlobalCalendarButton;
