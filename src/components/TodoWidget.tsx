import { useEffect, useMemo, useState } from "react";
import { Plus, Check, X, Clock, ChevronDown, ChevronUp, Tag, Calendar, Repeat, Pencil, Trash2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listTodos, insertTodo, updateTodo, deleteTodoRow, reorderTodos } from '@/lib/data'
import useSupabaseAuth from '@/lib/useSupabaseAuth'

type Recurring = "none" | "daily" | "weekly" | "monthly";
type Priority = "low" | "medium" | "high";

interface Subtask { id: string; text: string; completed: boolean }

interface Todo {
  id: string
  text: string
  completed: boolean
  priority: Priority
  tags: string[]
  subtasks: Subtask[]
  deadline: string | null
  recurring: Recurring
  createdAt: number
}

const isoToLocalDT = (iso: string) => {
  // convert ISO -> yyyy-MM-ddTHH:mm for <input type="datetime-local">
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
};

const localDTToIso = (local: string) => {
  // treat user-local datetime as local and convert to ISO UTC
  const dt = new Date(local);
  return dt.toISOString();
};

const bumpDeadline = (iso: string | null, recurring: Recurring) => {
  if (!iso) return null;
  const d = new Date(iso);
  switch (recurring) {
    case "daily":
      d.setDate(d.getDate() + 1);
      break;
    case "weekly":
      d.setDate(d.getDate() + 7);
      break;
    case "monthly":
      d.setMonth(d.getMonth() + 1);
      break;
    default:
      return null;
  }
  return d.toISOString();
};

const getPriorityColor = (p: Priority) =>
  ({
    high: "bg-red-500",
    medium: "bg-yellow-500",
    low: "bg-green-500",
  }[p] || "bg-muted");

export const TodoWidget = () => {
  const { user } = useSupabaseAuth()
  const [loading, setLoading] = useState(true)
  const [todos, setTodos] = useState<Todo[]>([])

  const [newTodo, setNewTodo] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [filterTag, setFilterTag] = useState<string>("");
  const [showCompleted, setShowCompleted] = useState(true);
  const [sortBy, setSortBy] = useState<"default" | "deadline" | "priority">("default");
  const [dragId, setDragId] = useState<string | null>(null)

  // --- Load from Supabase ---
  useEffect(() => {
    if (!user) { setTodos([]); setLoading(false); return }
    setLoading(true)
    listTodos().then(({ data, error }) => {
      if (!error && data) {
        setTodos(
          data.map((r) => ({
            id: r.id,
            text: r.text,
            completed: r.completed,
            priority: r.priority,
            tags: r.tags ?? [],
            subtasks: r.subtasks ?? [],
            deadline: r.deadline,
            recurring: r.recurring,
            createdAt: new Date(r.created_at).getTime(),
          }))
        )
      }
      setLoading(false)
    })
  }, [user])

  // --- Helpers ---
  const addTodo = () => {
    const txt = newTodo.trim();
    if (!txt) return;
    // optimistic add
    const tempId = crypto.randomUUID()
    const optimistic: Todo = { id: tempId, text: txt, completed: false, priority: 'medium', tags: [], subtasks: [], deadline: null, recurring: 'none', createdAt: Date.now() }
    setTodos((prev) => [optimistic, ...prev])
    setNewTodo(""); setIsAdding(false)
    insertTodo({ text: txt, completed: false, priority: 'medium', tags: [], subtasks: [], deadline: null, recurring: 'none' })
      .then(({ data, error }) => {
        if (error || !data) {
          // revert
          setTodos((prev) => prev.filter((t) => t.id !== tempId))
          return
        }
        setTodos((prev) => prev.map((t) => t.id === tempId ? {
          ...t,
          id: data.id,
          createdAt: new Date(data.created_at).getTime()
        } : t))
      })
  };

  const toggleTodo = (id: string) => {
    const target = todos.find((t) => t.id === id)
    if (!target) return
    const nowCompleted = !target.completed

    // optimistic
    setTodos((prev) => prev.map((t) => t.id === id ? { ...t, completed: nowCompleted } : t))
    // recurring spawn handled after server update succeeds
    updateTodo(id, { completed: nowCompleted }).then(({ data, error }) => {
      if (error) {
        // revert
        setTodos((prev) => prev.map((t) => t.id === id ? { ...t, completed: !nowCompleted } : t))
        return
      }
      if (nowCompleted && target.recurring !== 'none') {
        const nextDeadline = bumpDeadline(target.deadline, target.recurring)
        insertTodo({
          text: target.text,
          completed: false,
          priority: target.priority,
          tags: target.tags,
          subtasks: target.subtasks.map((s) => ({ ...s, completed: false })),
          deadline: nextDeadline,
          recurring: target.recurring,
        }).then(({ data }) => {
          if (data) {
            setTodos((prev) => [
              ...prev,
              {
                id: data.id,
                text: data.text,
                completed: data.completed,
                priority: data.priority,
                tags: data.tags ?? [],
                subtasks: data.subtasks ?? [],
                deadline: data.deadline,
                recurring: data.recurring,
                createdAt: new Date(data.created_at).getTime(),
              },
            ])
          }
        })
      }
    })
  }

  const deleteTodo = (id: string) => {
    const prev = todos
    setTodos((p) => p.filter((t) => t.id !== id))
    deleteTodoRow(id).then(({ error }) => {
      if (error) setTodos(prev)
    })
  }

  const editTodoText = (id: string, text: string) => {
    const old = todos.find((t) => t.id === id)?.text
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, text } : t)))
    updateTodo(id, { text }).then(({ error }) => {
      if (error) setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, text: old ?? t.text } : t)))
    })
  }

  const setPriority = (id: string, priority: Priority) => {
    const old = todos.find((t) => t.id === id)?.priority
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, priority } : t)))
    updateTodo(id, { priority }).then(({ error }) => {
      if (error) setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, priority: (old as any) } : t)))
    })
  }

  const toggleSubtask = (todoId: string, subtaskId: string) => {
    const prev = todos
    setTodos((p) => p.map((t) => t.id === todoId ? { ...t, subtasks: t.subtasks.map((s) => s.id === subtaskId ? { ...s, completed: !s.completed } : s) } : t))
    const current = prev.find((t) => t.id === todoId)
    if (!current) return
    updateTodo(todoId, { subtasks: (current.subtasks.map((s) => s.id === subtaskId ? { ...s, completed: !s.completed } : s)) as any })
      .then(({ error }) => { if (error) setTodos(prev) })
  }

  const addSubtask = (todoId: string, text: string) => {
    const id = crypto.randomUUID()
    const prev = todos
    setTodos((p) => p.map((t) => t.id === todoId ? { ...t, subtasks: [...t.subtasks, { id, text, completed: false }] } : t))
    const current = prev.find((t) => t.id === todoId)
    if (!current) return
    updateTodo(todoId, { subtasks: [...current.subtasks, { id, text, completed: false }] as any })
      .then(({ error }) => { if (error) setTodos(prev) })
  }

  const deleteSubtask = (todoId: string, subtaskId: string) => {
    const prev = todos
    setTodos((p) => p.map((t) => t.id === todoId ? { ...t, subtasks: t.subtasks.filter((s) => s.id !== subtaskId) } : t))
    const current = prev.find((t) => t.id === todoId)
    if (!current) return
    updateTodo(todoId, { subtasks: current.subtasks.filter((s) => s.id !== subtaskId) as any })
      .then(({ error }) => { if (error) setTodos(prev) })
  }

  const addTag = (todoId: string, tag: string) => {
    const clean = tag.trim().toLowerCase();
    if (!clean) return;
    const prev = todos
    const nextTags = [...new Set([...(prev.find((t) => t.id === todoId)?.tags ?? []), clean])]
    setTodos((p) => p.map((t) => (t.id === todoId ? { ...t, tags: nextTags } : t)))
    updateTodo(todoId, { tags: nextTags as any }).then(({ error }) => { if (error) setTodos(prev) })
  };

  const removeTag = (todoId: string, tag: string) => {
    const prev = todos
    const nextTags = (prev.find((t) => t.id === todoId)?.tags ?? []).filter((x) => x !== tag)
    setTodos((p) => p.map((t) => (t.id === todoId ? { ...t, tags: nextTags } : t)))
    updateTodo(todoId, { tags: nextTags as any }).then(({ error }) => { if (error) setTodos(prev) })
  }

  const setDeadline = (todoId: string, isoOrNull: string | null) => {
    const prev = todos
    setTodos((p) => p.map((t) => (t.id === todoId ? { ...t, deadline: isoOrNull } : t)))
    updateTodo(todoId, { deadline: isoOrNull }).then(({ error }) => { if (error) setTodos(prev) })
  }

  const setRecurring = (todoId: string, recurring: Recurring) => {
    const prev = todos
    setTodos((p) => p.map((t) => (t.id === todoId ? { ...t, recurring } : t)))
    updateTodo(todoId, { recurring }).then(({ error }) => { if (error) setTodos(prev) })
  }

  const allTags = useMemo(
    () => Array.from(new Set(todos.flatMap((t) => t.tags))).sort(),
    [todos]
  );

  // --- Derived + sorting/filtering ---
  const visibleTodos = useMemo(() => {
    let list = [...todos];

    if (!showCompleted) list = list.filter((t) => !t.completed);
    if (filterTag) list = list.filter((t) => t.tags.includes(filterTag));

    if (sortBy === "deadline") {
      list.sort((a, b) => {
        if (!a.deadline && !b.deadline) return b.createdAt - a.createdAt;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      });
    } else if (sortBy === "priority") {
      const order: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
      list.sort((a, b) => order[a.priority] - order[b.priority] || b.createdAt - a.createdAt);
    } else {
      // default newest first
      list.sort((a, b) => b.createdAt - a.createdAt);
    }
    return list;
  }, [todos, filterTag, showCompleted, sortBy]);

  const completedCount = todos.filter((t) => t.completed).length;
  const totalCount = todos.length;

  // --- UI ---
  return (
    <div className="widget-card h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Today's Tasks</h3>
          <p className="text-sm text-muted-foreground">
            {completedCount} of {totalCount} completed
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter */}
          <div className="hidden sm:flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              className="text-sm bg-transparent border rounded-md px-2 py-1"
              aria-label="Filter by tag"
            >
              <option value="">All</option>
              {allTags.map((t) => (
                <option key={t} value={t}>
                  #{t}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-sm bg-transparent border rounded-md px-2 py-1"
              aria-label="Sort"
            >
              <option value="default">Newest</option>
              <option value="deadline">Deadline</option>
              <option value="priority">Priority</option>
            </select>

            <button
              type="button"
              role="switch"
              aria-checked={showCompleted}
              onClick={() => setShowCompleted((v) => !v)}
              className={`text-xs inline-flex items-center gap-2 border rounded-full px-2 py-1 transition-colors ${
                showCompleted ? "bg-primary/10 border-primary/30 text-primary" : "bg-transparent border-border text-muted-foreground"
              }`}
            >
              <span className="relative inline-flex h-4 w-7 rounded-full bg-secondary">
                <span
                  className={`absolute top-0.5 h-3 w-3 rounded-full bg-background shadow transition-transform ${
                    showCompleted ? "translate-x-4" : "translate-x-0.5"
                  }`}
                />
              </span>
              show completed
            </button>
          </div>

          <Button
            onClick={() => setIsAdding(true)}
            variant="ghost"
            size="sm"
            className="text-primary hover:bg-primary/10"
            aria-label="Add task"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-secondary rounded-full h-2 mb-4">
        <div
          className="bg-gradient-to-r from-primary to-primary-glow h-2 rounded-full transition-all duration-500"
          style={{ width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : "0%" }}
        />
      </div>

      {/* Add new todo */}
      {isAdding && (
        <div className="flex gap-2 mb-3">
          <Input
            placeholder="Add a new task..."
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addTodo();
              if (e.key === "Escape") setIsAdding(false);
            }}
            className="flex-1"
            autoFocus
          />
          <Button onClick={addTodo} variant="ghost" size="sm" aria-label="Confirm add">
            <Check className="h-4 w-4" />
          </Button>
          <Button onClick={() => setIsAdding(false)} variant="ghost" size="sm" aria-label="Cancel add">
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* List */}
      <div className="space-y-3 overflow-y-auto max-h-[420px] pr-1">
        {loading ? (
          <div className="text-center py-10 text-muted-foreground">Loading tasks…</div>
        ) : visibleTodos.map((todo, index) => (
          <TodoRow
            key={todo.id}
            todo={todo}
            idx={index}
            draggable
            onDragStart={() => setDragId(todo.id)}
            onDragOver={(e)=>{
              e.preventDefault();
              if (!dragId || dragId===todo.id) return;
              if (sortBy !== 'default' || filterTag) return;
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
              const before = e.clientY < rect.top + rect.height/2;
              const order = [...visibleTodos]
              const from = order.findIndex(t=>t.id===dragId)
              const to = order.findIndex(t=>t.id===todo.id)
              if (from<0||to<0) return
              let target = before ? to : to + 1
              if (from < target) target--
              if (from === target) return
              const [m] = order.splice(from,1)
              order.splice(target,0,m)
              const newTodos = order.concat(todos.filter(t=>!order.find(o=>o.id===t.id)))
              setTodos(newTodos)
            }}
            onDrop={async ()=>{
              if (!dragId || dragId===todo.id) return
              // Only allow reordering when default sort and no active filters for consistency
              if (sortBy !== 'default' || filterTag) return
              const newTodos = [...todos]
              await reorderTodos(newTodos.map((t,i)=>({ id: t.id, order_index: i })))
              setDragId(null)
            }}
            onDragEnd={()=> setDragId(null)}
            onToggle={() => toggleTodo(todo.id)}
            onDelete={() => deleteTodo(todo.id)}
            onEditText={(txt) => editTodoText(todo.id, txt)}
            onPriority={(p) => setPriority(todo.id, p)}
            onAddTag={(t) => addTag(todo.id, t)}
            onRemoveTag={(t) => removeTag(todo.id, t)}
            onDeadline={(iso) => setDeadline(todo.id, iso)}
            onRecurring={(r) => setRecurring(todo.id, r)}
            onToggleSubtask={(sid) => toggleSubtask(todo.id, sid)}
            onAddSubtask={(txt) => addSubtask(todo.id, txt)}
            onDeleteSubtask={(sid) => deleteSubtask(todo.id, sid)}
          />
        ))}
        {visibleTodos.length === 0 && (
          <div className="text-center py-10 text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No tasks match your filters</p>
          </div>
        )}
      </div>

      {/* Empty state when truly no tasks */}
      {todos.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No tasks for today</p>
          <p className="text-xs">Click + to add your first task</p>
        </div>
      )}
    </div>
  );
};

/* ---------- Row Component ---------- */
const TodoRow = ({
  todo,
  idx,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onToggle,
  onDelete,
  onEditText,
  onPriority,
  onAddTag,
  onRemoveTag,
  onDeadline,
  onRecurring,
  onToggleSubtask,
  onAddSubtask,
  onDeleteSubtask,
}: {
  todo: Todo;
  idx: number;
  draggable?: boolean;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: () => void;
  onDragEnd?: () => void;
  onToggle: () => void;
  onDelete: () => void;
  onEditText: (text: string) => void;
  onPriority: (p: Priority) => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  onDeadline: (iso: string | null) => void;
  onRecurring: (r: Recurring) => void;
  onToggleSubtask: (sid: string) => void;
  onAddSubtask: (text: string) => void;
  onDeleteSubtask: (sid: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(todo.text);
  const [tagDraft, setTagDraft] = useState("");
  const [subtaskDraft, setSubtaskDraft] = useState("");

  const overdue =
    !!todo.deadline && !todo.completed && new Date(todo.deadline).getTime() < Date.now();

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`flex flex-col gap-2 p-3 rounded-lg border transition-all duration-150 fade-in cursor-grab active:cursor-grabbing ${
        todo.completed
          ? "bg-green-500/20 border-green-500/30"
          : "bg-accent/30 border-border hover:bg-accent/50"
      }`}
      style={{ animationDelay: `${idx * 0.05}s` }}
    >
      <div className="flex items-center gap-3">
        {/* Toggle */}
        <button
          onClick={onToggle}
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${
            todo.completed ? "bg-green-500 border-green-500 text-white" : "border-gray-300"
          }`}
          aria-label={todo.completed ? "Mark as incomplete" : "Mark as complete"}
        >
          {todo.completed && <Check className="h-3 w-3" />}
        </button>

        {/* Text / Edit */}
        <div className="flex-1 min-w-0">
          {editing ? (
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onEditText(draft.trim() || todo.text);
                  setEditing(false);
                }
                if (e.key === "Escape") {
                  setDraft(todo.text);
                  setEditing(false);
                }
              }}
              onBlur={() => {
                onEditText(draft.trim() || todo.text);
                setEditing(false);
              }}
              autoFocus
              className="text-sm"
            />
          ) : (
            <p
              className={`text-sm truncate ${todo.completed ? "line-through text-muted-foreground" : "text-foreground"}`}
              title={todo.text}
            >
              {todo.text}
            </p>
          )}

          <div className="flex items-center flex-wrap gap-2 mt-1">
            <span className={`w-2 h-2 rounded-full ${getPriorityColor(todo.priority)}`} />
            {todo.deadline && (
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  overdue ? "bg-red-500/15 text-red-600" : "bg-primary/10 text-primary"
                }`}
                title={new Date(todo.deadline).toLocaleString()}
              >
                <Calendar className="h-3 w-3" />
                {new Date(todo.deadline).toLocaleString()}
              </span>
            )}
            {todo.recurring !== "none" && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-secondary/60 text-foreground/80 flex items-center gap-1">
                <Repeat className="h-3 w-3" />
                {todo.recurring}
              </span>
            )}
            {todo.tags.map((tag) => (
              <span key={tag} className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-1">
                <Tag className="h-3 w-3" /> {tag}
                <button
                  className="ml-1 opacity-70 hover:opacity-100"
                  onClick={() => onRemoveTag(tag)}
                  aria-label={`remove ${tag}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Row actions */}
        <div className="flex items-center gap-1">
          <Button
            onClick={() => setEditing((s) => !s)}
            variant="ghost"
            size="icon"
            aria-label="Edit task"
            className="h-7 w-7"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            onClick={onDelete}
            variant="ghost"
            size="icon"
            aria-label="Delete task"
            className="h-7 w-7 text-red-500 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => {
              if (!open) setOpen(true);
              // focus the tag input after panel opens
              setTimeout(() => {
                const el = document.getElementById(`tag-input-${todo.id}`) as HTMLInputElement | null;
                el?.focus();
              }, 0);
            }}
            variant="ghost"
            size="icon"
            aria-label="Add tag"
            className="h-7 w-7"
          >
            <Tag className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => setOpen((s) => !s)}
            variant="ghost"
            size="icon"
            aria-label={open ? "Hide details" : "Show details"}
            className="h-7 w-7"
          >
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Details */}
      {open && (
        <div className="rounded-md border bg-background p-3 space-y-3">
          {/* Priority / Recurring */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 auto-rows-min">
            <div className="flex items-center gap-2 min-w-0">
              <label className="text-xs text-muted-foreground w-20">Priority</label>
              <select
                value={todo.priority}
                onChange={(e) => onPriority(e.target.value as Priority)}
                className="text-sm bg-transparent border rounded-md px-2 py-1 w-full"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div className="flex items-center gap-2 min-w-0">
              <label className="text-xs text-muted-foreground w-20">Recurring</label>
              <select
                value={todo.recurring}
                onChange={(e) => onRecurring(e.target.value as Recurring)}
                className="text-sm bg-transparent border rounded-md px-2 py-1 w-full"
              >
                <option value="none">None</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            <div className="flex items-center gap-2 min-w-0">
              <label className="text-xs text-muted-foreground w-20">Deadline</label>
              <input
                type="datetime-local"
                value={todo.deadline ? isoToLocalDT(todo.deadline) : ""}
                onChange={(e) =>
                  onDeadline(e.target.value ? localDTToIso(e.target.value) : null)
                }
                className="text-sm bg-transparent border rounded-md px-2 py-1 w-full min-w-0"
              />
              {todo.deadline && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => onDeadline(null)}
                  aria-label="Clear deadline"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="text-xs text-muted-foreground">Add tag</label>
            <div className="flex gap-2 mt-1">
              <Input
                id={`tag-input-${todo.id}`}
                placeholder="e.g. work, errands"
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const items = tagDraft
                      .split(",")
                      .map((x) => x.trim().toLowerCase())
                      .filter(Boolean);
                    items.forEach((t) => onAddTag(t));
                    setTagDraft("");
                  }
                }}
                className="flex-1"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const items = tagDraft
                    .split(",")
                    .map((x) => x.trim().toLowerCase())
                    .filter(Boolean);
                  items.forEach((t) => onAddTag(t));
                  setTagDraft("");
                }}
              >
                Add
              </Button>
            </div>
          </div>

          {/* Subtasks */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground">Subtasks</label>
            </div>
            <div className="space-y-2 mt-1 max-h-40 overflow-auto pr-1">
              {todo.subtasks.map((s) => (
                <div key={s.id} className="flex items-center gap-2">
                  <button
                    onClick={() => onToggleSubtask(s.id)}
                    className={`w-4 h-4 rounded border flex items-center justify-center ${
                      s.completed ? "bg-green-500 border-green-500 text-white" : "border-gray-300"
                    }`}
                    aria-label={s.completed ? "Uncheck subtask" : "Check subtask"}
                  >
                    {s.completed && <Check className="h-3 w-3" />}
                  </button>
                  <p className={`text-sm flex-1 ${s.completed ? "line-through text-muted-foreground" : ""}`}>
                    {s.text}
                  </p>
                  <button
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    onClick={() => onDeleteSubtask(s.id)}
                    aria-label="Delete subtask"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  placeholder="Add a subtask..."
                  value={subtaskDraft}
                  onChange={(e) => setSubtaskDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const txt = subtaskDraft.trim();
                      if (txt) onAddSubtask(txt);
                      setSubtaskDraft("");
                    }
                  }}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const txt = subtaskDraft.trim();
                    if (txt) onAddSubtask(txt);
                    setSubtaskDraft("");
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};