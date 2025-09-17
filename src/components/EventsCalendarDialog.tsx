import { useEffect, useMemo, useState } from "react";
import { Calendar as CalendarIcon, Clock, Plus, Trash2, X, Edit2, ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, endOfDay, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, isToday, startOfDay, startOfMonth, startOfWeek } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  insertEvent, 
  deleteEvent, 
  updateEvent, 
  listEventsInRange 
} from "@/lib/events";
import type { DbEvent } from "@/types/data";
import { refreshReminders } from "@/lib/reminders";
import { ensureGoogleAuth, isGoogleAuthed, isGoogleConfigured, listCalendars, getSelectedCalendarId, setSelectedCalendarId, signOutGoogle, gcalListEventsInRange, gcalInsertEvent, gcalUpdateEvent, gcalDeleteEvent } from "@/lib/googleCalendar";
import { getSettings, subscribeSettings, type Settings } from "@/lib/settings";

function toDateInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toTimeInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parseDateTime(dateStr: string, timeStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0);
}

function useRangeEvents(start: Date, end: Date, reloadKey = 0) {
  const [events, setEvents] = useState<DbEvent[]>([]);
  useEffect(() => {
    const s = start.toISOString();
    const e = end.toISOString();
    const useGoogle = isGoogleConfigured() && isGoogleAuthed();
    const load = async () => {
      if (useGoogle) {
        const { data } = await gcalListEventsInRange(s, e);
        setEvents(data ?? []);
      } else {
        const { data } = await listEventsInRange(s, e);
        setEvents(data ?? []);
      }
    };
    load();
  }, [start.toISOString(), end.toISOString(), reloadKey, isGoogleConfigured(), isGoogleAuthed()]);
  return { events, setEvents };
}

export function EventsCalendarDialogButton() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="btn-liquid" aria-label="Open calendar">
          <CalendarIcon className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>Calendar</DialogTitle>
        </DialogHeader>
        <CalendarBody onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function CalendarBody({ onClose }: { onClose?: () => void }) {
  const [selected, setSelected] = useState<Date>(new Date());
  const [anchor, setAnchor] = useState<Date>(new Date()); // visible range anchor
  const [settings, setSettings] = useState<Settings>(getSettings());
  useEffect(() => {
    const unsub = subscribeSettings((s) => setSettings(s));
    return () => unsub();
  }, []);
  const [view, setView] = useState<"month" | "week" | "day">(settings.calendar.defaultView);
  useEffect(() => { setView(settings.calendar.defaultView); }, [settings.calendar.defaultView]);
  const [reloadKey, setReloadKey] = useState(0);

  const rangeStart = useMemo(() => {
    if (view === "day") return startOfDay(anchor);
    if (view === "week") return startOfWeek(anchor, { weekStartsOn: settings.calendar.weekStart });
    return startOfMonth(anchor);
  }, [anchor, view, settings.calendar.weekStart]);
  const rangeEnd = useMemo(() => {
    if (view === "day") return endOfDay(anchor);
    if (view === "week") return endOfWeek(anchor, { weekStartsOn: settings.calendar.weekStart });
    return endOfMonth(anchor);
  }, [anchor, view, settings.calendar.weekStart]);

  const { events, setEvents } = useRangeEvents(rangeStart, rangeEnd, reloadKey);

  // Quick create draft from grid clicks
  const [draftStart, setDraftStart] = useState<Date | null>(null);
  const [draftEnd, setDraftEnd] = useState<Date | null>(null);

  const onCreated = async (payload: { title: string; description?: string; start: Date; end: Date; allDay: boolean; reminder: number | null }) => {
    let data: any = null;
    if (isGoogleConfigured() && isGoogleAuthed()) {
      const res = await gcalInsertEvent({
        title: payload.title,
        description: payload.description,
        start_iso: payload.start.toISOString(),
        end_iso: payload.end.toISOString(),
        all_day: payload.allDay,
        reminder_minutes: payload.reminder,
      });
      data = res.data;
    } else {
      const res = await insertEvent({
      title: payload.title,
      description: payload.description,
      start_iso: payload.start.toISOString(),
      end_iso: payload.end.toISOString(),
      all_day: payload.allDay,
      reminder_minutes: payload.reminder,
      });
      data = res.data;
    }
    if (data) setEvents((p) => [...p, data].sort((a, b) => a.start_iso.localeCompare(b.start_iso)) as any);
    refreshReminders();
  };

  const onUpdated = async (id: string, patch: Partial<{ title: string; description: string; start: Date; end: Date; allDay: boolean; reminder: number | null }>) => {
    const p: any = { ...patch };
    if (p.start) p.start_iso = (p.start as Date).toISOString();
    if (p.end) p.end_iso = (p.end as Date).toISOString();
    delete p.start; delete p.end; delete p.reminder;
    if (patch.reminder !== undefined) p.reminder_minutes = patch.reminder;
    let data: any = null;
    if (isGoogleConfigured() && isGoogleAuthed()) {
      const res = await gcalUpdateEvent(id, {
        title: p.title,
        description: p.description,
        start_iso: p.start_iso,
        end_iso: p.end_iso,
        all_day: p.all_day,
        reminder_minutes: p.reminder_minutes,
      });
      data = res.data;
    } else {
      const res = await updateEvent(id, p);
      data = res.data;
    }
    if (data) setEvents((prev) => prev.map((e) => (e.id === id ? (data as DbEvent) : e)));
    refreshReminders();
  };

  const onDeleted = async (id: string) => {
    if (isGoogleConfigured() && isGoogleAuthed()) {
      await gcalDeleteEvent(id);
    } else {
      await deleteEvent(id);
    }
    setEvents((p) => p.filter((e) => e.id !== id));
    refreshReminders();
  };

  const goPrev = () => {
    if (view === "day") setAnchor(addDays(anchor, -1));
    else if (view === "week") setAnchor(addDays(anchor, -7));
    else setAnchor(addDays(startOfMonth(anchor), -1));
  };
  const goNext = () => {
    if (view === "day") setAnchor(addDays(anchor, 1));
    else if (view === "week") setAnchor(addDays(anchor, 7));
    else setAnchor(addDays(endOfMonth(anchor), 1));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Selected date</p>
            <p className="text-base font-medium">{format(selected, "EEEE, MMMM d, yyyy")}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setSelected(new Date()); setAnchor(new Date()); }}>Today</Button>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
            )}
          </div>
        </div>

        <div className="rounded-lg border p-2">
          <Calendar mode="single" selected={selected} onSelect={(d) => { if (d) { setSelected(d); setAnchor(d); } }} />
        </div>

        <div className="rounded-lg border p-4">
          <h3 className="text-sm font-semibold mb-3">Create Event</h3>
          <CreateEventForm defaultDate={selected} onCreate={onCreated} presetStart={draftStart ?? undefined} presetEnd={draftEnd ?? undefined} onClearPreset={() => { setDraftStart(null); setDraftEnd(null); }} settings={settings} />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={goPrev} aria-label="Previous"><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" onClick={goNext} aria-label="Next"><ChevronRight className="h-4 w-4" /></Button>
            <div className="ml-2 text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="h-4 w-4" /> {format(rangeStart, view === "month" ? "MMMM yyyy" : "MMM d")} {view !== "month" ? `– ${format(rangeEnd, "MMM d")}` : ""}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <GoogleConnect onChanged={() => setReloadKey((k) => k + 1)} />
            <Tabs value={view} onValueChange={(v) => setView(v as any)}>
            <TabsList>
              <TabsTrigger value="day">Day</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
            </TabsList>
            </Tabs>
          </div>
        </div>

        <Tabs value={view}>
          <TabsContent value="day">
            <TimeGrid
              days={[anchor]}
              events={events}
              settings={settings}
              onSlotClick={(d) => { setDraftStart(d); setDraftEnd(addDays(d, 0)); setSelected(d); }}
              onUpdate={onUpdated}
              onDelete={onDeleted}
            />
          </TabsContent>
          <TabsContent value="week">
            <TimeGrid
              days={[...Array(7)].map((_, i) => addDays(rangeStart, i))}
              events={events}
              settings={settings}
              onSlotClick={(d) => { setDraftStart(d); setDraftEnd(addDays(d, 0)); setSelected(d); }}
              onUpdate={onUpdated}
              onDelete={onDeleted}
            />
          </TabsContent>
          <TabsContent value="month">
            <MonthGrid
              monthAnchor={anchor}
              events={events}
              onDayClick={(d) => { setSelected(d); setAnchor(d); }}
              onCreateQuick={(start) => { setDraftStart(start); setDraftEnd(new Date(start.getTime() + 60 * 60 * 1000)); setSelected(start); }}
              onUpdate={onUpdated}
              onDelete={onDeleted}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function CreateEventForm({ defaultDate, onCreate, presetStart, presetEnd, onClearPreset, settings }: { defaultDate: Date; onCreate: (data: { title: string; description?: string; start: Date; end: Date; allDay: boolean; reminder: number | null }) => void; presetStart?: Date; presetEnd?: Date; onClearPreset?: () => void; settings: Settings }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [date, setDate] = useState(toDateInputValue(defaultDate));
  const defaultLen = settings.calendar.defaultEventLengthMin;
  const [startTime, setStartTime] = useState("09:00");
  const addToTime = (hhmm: string, minutes: number) => {
    const [hh, mm] = hhmm.split(":").map(Number);
    const total = hh * 60 + mm + minutes;
    const nh = Math.floor(((total % (24 * 60)) + (24 * 60)) % (24 * 60) / 60);
    const nm = ((total % 60) + 60) % 60;
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(nh)}:${pad(nm)}`;
  };
  const [endTime, setEndTime] = useState(addToTime("09:00", defaultLen));
  const [reminder, setReminder] = useState<number | "none">(
    settings.reminders.defaultMinutes == null ? "none" : Number(settings.reminders.defaultMinutes)
  );

  useEffect(() => {
    setDate(toDateInputValue(defaultDate));
  }, [defaultDate]);

  useEffect(() => {
    if (presetStart) {
      setDate(toDateInputValue(presetStart));
      setStartTime(toTimeInputValue(presetStart));
    }
    if (presetEnd) {
      setEndTime(toTimeInputValue(presetEnd));
    }
  }, [presetStart?.getTime?.(), presetEnd?.getTime?.()]);

  const submit = () => {
    const start = allDay ? startOfDay(new Date(date)) : parseDateTime(date, startTime);
    const end = allDay ? endOfDay(new Date(date)) : parseDateTime(date, endTime);
    if (!title.trim()) return;
  onCreate({ title: title.trim(), description: desc.trim() || undefined, start, end, allDay, reminder: reminder === "none" ? null : Number(reminder) });
  setTitle(""); setDesc(""); setAllDay(false); setStartTime("09:00"); setEndTime(addToTime("09:00", defaultLen)); setReminder(settings.reminders.defaultMinutes == null ? "none" : Number(settings.reminders.defaultMinutes));
  onClearPreset?.();
  };

  return (
    <div className="space-y-2">
      <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <Textarea placeholder="Description (optional)" value={desc} onChange={(e) => setDesc(e.target.value)} />
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-xs text-muted-foreground">Date</label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="flex-1 flex items-end gap-2">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground">Start</label>
            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} disabled={allDay} />
          </div>
          <div className="flex-1">
            <label className="text-xs text-muted-foreground">End</label>
            <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} disabled={allDay} />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm inline-flex items-center gap-2"><input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} /> All-day</label>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Reminder</span>
          <select className="text-sm border rounded-md px-2 py-1 bg-background" value={String(reminder)} onChange={(e) => setReminder(e.target.value as any)}>
            <option value="none">None</option>
            <option value="5">5 min</option>
            <option value="10">10 min</option>
            <option value="15">15 min</option>
            <option value="30">30 min</option>
            <option value="60">1 hr</option>
            <option value="120">2 hr</option>
            <option value="1440">1 day</option>
          </select>
        </div>
      </div>
      <div className="pt-2">
        <Button size="sm" onClick={submit}><Plus className="h-4 w-4 mr-1" /> Add</Button>
      </div>
    </div>
  );
}

// ===== Google Calendar-like Time Grid =====

const HOUR_BASE_HEIGHT = 48; // px per hour
function getMinutePx(slot: 15 | 30 | 60) {
  // keep hour visual size consistent, but granular clicks are aligned to slot minutes
  return HOUR_BASE_HEIGHT / 60;
}

function layoutDay(events: DbEvent[], day: Date, minutePx: number) {
  const start = startOfDay(day).getTime();
  const end = endOfDay(day).getTime();
  // Filter timed events in this day
  const dayEvents = events
    .filter((e) => !e.all_day && new Date(e.end_iso).getTime() > start && new Date(e.start_iso).getTime() < end)
    .map((e) => {
      const s = Math.max(new Date(e.start_iso).getTime(), start);
      const ee = Math.min(new Date(e.end_iso).getTime(), end);
  const top = (s - start) / 60000 * minutePx;
  const height = Math.max(20, (ee - s) / 60000 * minutePx);
      return { e, s, ee, top, height };
    })
    .sort((a, b) => a.s - b.s || a.ee - b.ee);

  // Overlap grouping and column assignment
  type L = { e: DbEvent; s: number; ee: number; top: number; height: number; col: number; cols: number };
  const laid: L[] = [];
  let active: L[] = [];
  for (const item of dayEvents) {
    active = active.filter((x) => x.ee > item.s);
    const used = new Set(active.map((x) => x.col));
    let col = 0;
    while (used.has(col)) col++;
    const node: L = { ...item, col, cols: 1 } as L;
    active.push(node);
    laid.push(node);
    // update cols for all overlapping in active
    const maxCol = Math.max(...active.map((x) => x.col));
    active.forEach((x) => (x.cols = Math.max(x.cols, maxCol + 1)));
  }
  return laid.map((x) => ({
    event: x.e,
    top: x.top,
    height: x.height,
    leftPct: (x.col / x.cols) * 100,
    widthPct: (1 / x.cols) * 100 - 1, // small gap
  }));
}

function TimeGrid({ days, events, settings, onSlotClick, onUpdate, onDelete }: { days: Date[]; events: DbEvent[]; settings: Settings; onSlotClick: (start: Date) => void; onUpdate: (id: string, patch: any) => void; onDelete: (id: string) => void }) {
  const hours = [...Array(24)].map((_, h) => h);
  const MINUTE_PX = getMinutePx(settings.calendar.timeSlotMinutes);
  const allDayByDay = useMemo(() => {
    return days.map((d) => ({
      day: d,
      events: events.filter((e) => e.all_day && isSameDay(new Date(e.start_iso), d)),
    }));
  }, [days.map((d) => d.toDateString()).join("|"), events.map((e) => e.id + e.start_iso + e.end_iso).join("|")]);

  const laidByDay = useMemo(() => {
    return days.map((d) => layoutDay(events, d, MINUTE_PX));
  }, [days.map((d) => d.toDateString()).join("|"), events.map((e) => e.id + e.start_iso + e.end_iso).join("|"), MINUTE_PX]);

  const handleSlot = (day: Date, hour: number, yWithin?: number) => {
    const start = new Date(day);
    const minutes = yWithin ? Math.round(yWithin / MINUTE_PX) : 0;
    // snap to configured granularity
    const snap = settings.calendar.timeSlotMinutes;
    const snapped = Math.round(minutes / snap) * snap;
    start.setHours(hour, snapped, 0, 0);
    onSlotClick(start);
  };

  // current time indicator positions per day
  const now = new Date();
  const nowByDay = days.map((d) => {
    if (!isSameDay(d, now)) return null;
    const start = startOfDay(d).getTime();
    const minutes = Math.max(0, Math.min(24 * 60, Math.floor((now.getTime() - start) / 60000)));
    return minutes * MINUTE_PX; // px from top
  });

  return (
  <div className="rounded-lg border overflow-auto" style={{ height: "70vh" }}>
      {/* Header row with day names */}
      <div className="grid" style={{ gridTemplateColumns: `64px repeat(${days.length}, minmax(0, 1fr))` }}>
        <div className="border-b p-2 text-xs text-muted-foreground" />
        {days.map((d) => (
          <div key={d.toDateString()} className="border-b p-2 text-xs">
            <div className={`font-medium ${isToday(d) ? 'text-primary' : ''}`}>{format(d, "EEE d")}</div>
          </div>
        ))}
      </div>

      {/* All-day row */}
      <div className="grid" style={{ gridTemplateColumns: `64px repeat(${days.length}, minmax(0, 1fr))` }}>
        <div className="border-b p-2 text-xs text-muted-foreground">All-day</div>
        {allDayByDay.map(({ day, events }) => (
          <div key={day.toDateString()} className="border-b p-2 min-h-[40px]">
            <div className="flex flex-wrap gap-1">
              {events.map((e) => (
                <EventChip key={e.id} e={e} onUpdate={onUpdate} onDelete={onDelete} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Time grid */}
      <div className="grid" style={{ gridTemplateColumns: `64px repeat(${days.length}, minmax(0, 1fr))` }}>
        {/* Time gutter */}
        <div className="relative">
          {hours.map((h) => (
            <div key={h} className="h-12 border-b border-border/50 text-[10px] text-muted-foreground pr-1 flex items-start justify-end">
              <span className="-mt-2">{format(new Date().setHours(h, 0, 0, 0), "ha").toLowerCase()}</span>
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map((d, idx) => (
          <div key={idx} className="relative border-l">
            {/* hour lines */}
            <div className="absolute inset-0">
              {hours.map((h) => (
                <div key={h} className="h-12 border-b border-border/50" />
              ))}
              {settings.calendar.showCurrentTimeLine && nowByDay[idx] != null && (
                <div
                  className="absolute left-0 right-0 h-px bg-red-500"
                  style={{ top: nowByDay[idx]! }}
                />
              )}
            </div>
            {/* click surface */}
            <div
              className="relative"
              style={{ height: `${24 * HOUR_BASE_HEIGHT}px` }}
              onDoubleClick={(e) => {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                const y = e.clientY - rect.top; // px from top
                const minutesFromTop = y / MINUTE_PX;
                const hour = Math.floor(minutesFromTop / 60);
                handleSlot(d, hour, minutesFromTop - hour * 60);
              }}
            >
              {laidByDay[idx].map((pos, i) => (
                <EventBlock key={pos.event.id + i} pos={pos} onUpdate={onUpdate} onDelete={onDelete} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EventChip({ e, onUpdate, onDelete }: { e: DbEvent; onUpdate: (id: string, patch: any) => void; onDelete: (id: string) => void }) {
  const [editing, setEditing] = useState(false);
  return (
    <div className="text-xs px-2 py-1 rounded-md bg-primary/10 text-primary border border-primary/20 cursor-pointer" onClick={() => setEditing(true)}>
      {e.title}
      {editing && (
        <EditEventDialog event={e} onClose={() => setEditing(false)} onSave={(patch) => onUpdate(e.id, patch)} onDelete={() => onDelete(e.id)} />
      )}
    </div>
  );
}

function EventBlock({ pos, onUpdate, onDelete }: { pos: { event: DbEvent; top: number; height: number; leftPct: number; widthPct: number }; onUpdate: (id: string, patch: any) => void; onDelete: (id: string) => void }) {
  const [editing, setEditing] = useState(false);
  const { event } = pos;
  return (
    <div
      className="absolute rounded-md bg-primary/20 border border-primary/30 p-1 text-xs overflow-hidden cursor-pointer hover:bg-primary/30"
      style={{ top: pos.top, height: pos.height, left: `${pos.leftPct}%`, width: `${pos.widthPct}%` }}
      onClick={() => setEditing(true)}
    >
      <div className="font-medium truncate">{event.title}</div>
      {!event.all_day && (
        <div className="text-[10px] text-muted-foreground truncate">{format(new Date(event.start_iso), "p")} – {format(new Date(event.end_iso), "p")}</div>
      )}
      {editing && (
        <EditEventDialog event={event} onClose={() => setEditing(false)} onSave={(patch) => onUpdate(event.id, patch)} onDelete={() => onDelete(event.id)} />
      )}
    </div>
  );
}

// ===== Month grid =====

function MonthGrid({ monthAnchor, events, onDayClick, onCreateQuick, onUpdate, onDelete }: { monthAnchor: Date; events: DbEvent[]; onDayClick: (d: Date) => void; onCreateQuick: (start: Date) => void; onUpdate: (id: string, patch: any) => void; onDelete: (id: string) => void }) {
  const start = startOfWeek(startOfMonth(monthAnchor), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(monthAnchor), { weekStartsOn: 0 });
  const days: Date[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(new Date(d));
  const weeks = Math.ceil(days.length / 7);
  return (
    <div className="rounded-lg border overflow-auto" style={{ height: "70vh" }}>
      {/* day headers */}
      <div className="grid" style={{ gridTemplateColumns: `repeat(7, minmax(0, 1fr))` }}>
        {[...Array(7)].map((_, i) => (
          <div key={i} className="border-b p-2 text-xs text-muted-foreground">{format(addDays(start, i), "EEE")}</div>
        ))}
      </div>
      {/* grid */}
      <div className="grid" style={{ gridTemplateColumns: `repeat(7, minmax(0, 1fr))`, gridTemplateRows: `repeat(${weeks}, minmax(120px, auto))` }}>
        {days.map((d) => {
          const dayEvents = events.filter((e) => isSameDay(new Date(e.start_iso), d));
          const shown = dayEvents.slice(0, 3);
          const extra = Math.max(0, dayEvents.length - shown.length);
          return (
            <div key={d.toDateString()} className={`border p-2 hover:bg-accent/30 transition-colors ${!isSameMonth(d, monthAnchor) ? 'opacity-50' : ''}`} onDoubleClick={() => onCreateQuick(new Date(d))}>
              <div className="flex items-center justify-between mb-1">
                <button className={`text-xs ${isToday(d) ? 'text-primary font-semibold' : 'text-muted-foreground'}`} onClick={() => onDayClick(d)}>{format(d, "d")}</button>
              </div>
              <div className="space-y-1">
                {shown.map((e) => (
                  <EventChip key={e.id} e={e} onUpdate={onUpdate} onDelete={onDelete} />
                ))}
                {extra > 0 && <div className="text-[11px] text-muted-foreground">+{extra} more</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EventRow({ event, onUpdate, onDelete, compact }: { event: DbEvent; onUpdate: (id: string, patch: any) => void; onDelete: (id: string) => void; compact?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(event.title);
  const [desc, setDesc] = useState(event.description);
  const [allDay, setAllDay] = useState(event.all_day);
  const s = new Date(event.start_iso);
  const e = new Date(event.end_iso);
  const [date, setDate] = useState(toDateInputValue(s));
  const [startTime, setStartTime] = useState(toTimeInputValue(s));
  const [endTime, setEndTime] = useState(toTimeInputValue(e));
  const [reminder, setReminder] = useState<string>(event.reminder_minutes == null ? "none" : String(event.reminder_minutes));

  const save = () => {
    const start = allDay ? startOfDay(new Date(date)) : parseDateTime(date, startTime);
    const end = allDay ? endOfDay(new Date(date)) : parseDateTime(date, endTime);
    onUpdate(event.id, {
      title: title.trim(),
      description: desc.trim(),
      start,
      end,
      allDay,
      reminder: reminder === "none" ? null : Number(reminder),
    });
    setEditing(false);
  };

  if (compact && !editing) {
    return (
      <li className="p-2 rounded-md border bg-accent/30 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm truncate">{event.title}</p>
          {!event.all_day && (
            <p className="text-[11px] text-muted-foreground">{format(new Date(event.start_iso), "p")} – {format(new Date(event.end_iso), "p")}</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" onClick={() => setEditing(true)} aria-label="Edit"><Edit2 className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" onClick={() => onDelete(event.id)} aria-label="Delete"><Trash2 className="h-4 w-4" /></Button>
        </div>
      </li>
    );
  }

  return (
    <li className="p-2 rounded-md border bg-accent/30">
      {!editing ? (
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{event.title}</p>
            <p className="text-xs text-muted-foreground truncate">{event.description}</p>
            <div className="text-[11px] text-muted-foreground">
              {event.all_day ? "All-day" : `${format(new Date(event.start_iso), "PP p")} – ${format(new Date(event.end_iso), "p")}`}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" onClick={() => setEditing(true)} aria-label="Edit"><Edit2 className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" onClick={() => onDelete(event.id)} aria-label="Delete"><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea placeholder="Description" value={desc} onChange={(e) => setDesc(e.target.value)} />
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">Date</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="flex-1 flex items-end gap-2">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground">Start</label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} disabled={allDay} />
              </div>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground">End</label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} disabled={allDay} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm inline-flex items-center gap-2"><input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} /> All-day</label>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Reminder</span>
              <select className="text-sm border rounded-md px-2 py-1 bg-background" value={String(reminder)} onChange={(e) => setReminder(e.target.value)}>
                <option value="none">None</option>
                <option value="5">5 min</option>
                <option value="10">10 min</option>
                <option value="15">15 min</option>
                <option value="30">30 min</option>
                <option value="60">1 hr</option>
                <option value="120">2 hr</option>
                <option value="1440">1 day</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={save}>Save</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}><X className="h-4 w-4 mr-1" />Cancel</Button>
          </div>
        </div>
      )}
    </li>
  );
}

function EditEventDialog({ event, onClose, onSave, onDelete }: { event: DbEvent; onClose: () => void; onSave: (patch: any) => void; onDelete: () => void }) {
  const [title, setTitle] = useState(event.title);
  const [desc, setDesc] = useState(event.description);
  const [allDay, setAllDay] = useState(event.all_day);
  const s = new Date(event.start_iso);
  const e = new Date(event.end_iso);
  const [date, setDate] = useState(toDateInputValue(s));
  const [startTime, setStartTime] = useState(toTimeInputValue(s));
  const [endTime, setEndTime] = useState(toTimeInputValue(e));
  const [reminder, setReminder] = useState<string>(event.reminder_minutes == null ? "none" : String(event.reminder_minutes));

  const submit = () => {
    const start = allDay ? startOfDay(new Date(date)) : parseDateTime(date, startTime);
    const end = allDay ? endOfDay(new Date(date)) : parseDateTime(date, endTime);
    onSave({ title: title.trim(), description: desc.trim(), start, end, allDay, reminder: reminder === 'none' ? null : Number(reminder) });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-background border rounded-md p-4 w-[360px] shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold">Edit Event</h4>
          <button className="text-muted-foreground" onClick={onClose}><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-2">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} />
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">Date</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="flex-1 flex items-end gap-2">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground">Start</label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} disabled={allDay} />
              </div>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground">End</label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} disabled={allDay} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm inline-flex items-center gap-2"><input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} /> All-day</label>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Reminder</span>
              <select className="text-sm border rounded-md px-2 py-1 bg-background" value={String(reminder)} onChange={(e) => setReminder(e.target.value)}>
                <option value="none">None</option>
                <option value="5">5 min</option>
                <option value="10">10 min</option>
                <option value="15">15 min</option>
                <option value="30">30 min</option>
                <option value="60">1 hr</option>
                <option value="120">2 hr</option>
                <option value="1440">1 day</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button size="sm" onClick={submit}>Save</Button>
            <Button size="sm" variant="destructive" onClick={() => { onDelete(); onClose(); }}><Trash2 className="h-4 w-4 mr-1" />Delete</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EventsCalendarDialogButton;

// --- Google connect small control
function GoogleConnect({ onChanged }: { onChanged?: () => void }) {
  const configured = isGoogleConfigured();
  const [authed, setAuthed] = useState<boolean>(configured && isGoogleAuthed());
  const [busy, setBusy] = useState(false);
  const [calendars, setCalendars] = useState<Array<{ id: string; summary: string }>>([]);
  const [selectedId, setSelectedId] = useState<string | null>(getSelectedCalendarId());

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      if (!configured || !isGoogleAuthed()) return;
      try {
        const list = await listCalendars();
        if (!mounted) return;
        const options = list.map((c) => ({ id: c.id!, summary: c.summary || c.id! }));
        setCalendars(options);
        if (!selectedId && options.length) {
          setSelectedCalendarId(options[0].id);
          setSelectedId(options[0].id);
        }
      } catch {}
    };
    init();
    return () => { mounted = false; };
  }, [configured, authed]);

  const connect = async () => {
    if (!configured) return;
    setBusy(true);
    try {
      await ensureGoogleAuth();
      setAuthed(true);
      onChanged?.();
      const list = await listCalendars();
      const options = list.map((c) => ({ id: c.id!, summary: c.summary || c.id! }));
      setCalendars(options);
      if (!getSelectedCalendarId() && options[0]) {
        setSelectedCalendarId(options[0].id);
        setSelectedId(options[0].id);
      }
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    try { await signOutGoogle(); } catch {}
    setAuthed(false);
    onChanged?.();
  };

  const onSelect = (id: string) => {
    setSelectedCalendarId(id);
    setSelectedId(id);
    onChanged?.();
  };

  if (!configured) {
    return <Button size="sm" variant="outline" disabled title="VITE_GOOGLE_CLIENT_ID not set">Google not configured</Button>;
  }
  if (!authed) {
    return <Button size="sm" variant="outline" onClick={connect} disabled={busy}>Connect Google Calendar</Button>;
  }
  return (
    <div className="flex items-center gap-2">
      <select className="text-sm border rounded-md px-2 py-1 bg-background" value={selectedId ?? ""} onChange={(e) => onSelect(e.target.value)}>
        {calendars.map((c) => (
          <option key={c.id} value={c.id}>{c.summary}</option>
        ))}
      </select>
      <Button size="sm" variant="ghost" onClick={disconnect}>Sign out</Button>
    </div>
  );
}
