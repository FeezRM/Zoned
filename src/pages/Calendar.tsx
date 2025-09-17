import { useEffect, useMemo, useState } from "react";
import { Calendar as CalendarIcon, Clock, Plus, Trash2, X, Edit2, ChevronLeft, ChevronRight, Settings as Gear, ArrowLeft } from "lucide-react";
import { addDays, endOfDay, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, isToday, startOfDay, startOfMonth, startOfWeek } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { insertEvent, deleteEvent, updateEvent, listEventsInRange } from "@/lib/events";
import type { DbEvent } from "@/types/data";
import { refreshReminders } from "@/lib/reminders";
import { ensureGoogleAuth, isGoogleAuthed, isGoogleConfigured, listCalendars, getSelectedCalendarId, setSelectedCalendarId, signOutGoogle, gcalListEventsInRange, gcalInsertEvent, gcalUpdateEvent, gcalDeleteEvent } from "@/lib/googleCalendar";
import { getSettings, saveSettings, subscribeSettings, type Settings } from "@/lib/settings";
import { Link } from "react-router-dom";

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

export default function CalendarPage() {
  const [settings, setSettings] = useState<Settings>(getSettings());
  useEffect(() => {
    const unsub = subscribeSettings((s) => setSettings(s));
    return () => unsub();
  }, []);

  const [selected, setSelected] = useState<Date>(new Date());
  const [anchor, setAnchor] = useState<Date>(new Date());
  const [view, setView] = useState<"month" | "week" | "day">(settings.calendar.defaultView);
  useEffect(() => { setView(settings.calendar.defaultView); }, [settings.calendar.defaultView]);

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

  const [reloadKey, setReloadKey] = useState(0);
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

  // page layout
  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      {/* Page header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Link 
            to="/" 
            className="liquid-surface liquid-border rounded-lg p-2 hover:bg-accent/50 transition-colors backdrop-blur-sm"
            aria-label="Back to Dashboard"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <CalendarIcon className="h-5 w-5" />
          <h1 className="text-xl font-semibold">Calendar</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        {/* Left sidebar */}
        <div className="space-y-3">
          <div className="liquid-surface liquid-border rounded-xl p-6 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Selected date</p>
                <p className="text-base font-medium">{format(selected, "EEEE, MMMM d, yyyy")}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setSelected(new Date()); setAnchor(new Date()); }}>Today</Button>
              </div>
            </div>
          </div>

          <div className="liquid-surface liquid-border rounded-xl p-2 backdrop-blur-xl">
            <Calendar mode="single" selected={selected} onSelect={(d) => { if (d) { setSelected(d); setAnchor(d); } }} />
          </div>

          {/* Compact Calendar Settings on page */}
          <div className="liquid-surface liquid-border rounded-xl p-6 space-y-4 backdrop-blur-xl liquid-highlight">
            <div className="flex items-center gap-2">
              <Gear className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Calendar settings</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <label className="text-xs text-muted-foreground col-span-1 space-y-2">Week starts on
                <select className="mt-1 w-full liquid-surface border rounded-lg px-3 py-2 bg-background backdrop-blur-sm" value={settings.calendar.weekStart}
                  onChange={(e) => saveSettings({ calendar: { ...settings.calendar, weekStart: Number(e.target.value) as any } })}>
                  <option value={0}>Sunday</option>
                  <option value={1}>Monday</option>
                </select>
              </label>
              <label className="text-xs text-muted-foreground col-span-1 space-y-2">Time slot minutes
                <select className="mt-1 w-full liquid-surface border rounded-lg px-3 py-2 bg-background backdrop-blur-sm" value={settings.calendar.timeSlotMinutes}
                  onChange={(e) => saveSettings({ calendar: { ...settings.calendar, timeSlotMinutes: Number(e.target.value) as any } })}>
                  <option value={15}>15</option>
                  <option value={30}>30</option>
                  <option value={60}>60</option>
                </select>
              </label>
              <label className="text-xs text-muted-foreground col-span-1 space-y-2">Default event length
                <select className="mt-1 w-full liquid-surface border rounded-lg px-3 py-2 bg-background backdrop-blur-sm" value={settings.calendar.defaultEventLengthMin}
                  onChange={(e) => saveSettings({ calendar: { ...settings.calendar, defaultEventLengthMin: Number(e.target.value) as any } })}>
                  <option value={30}>30 min</option>
                  <option value={45}>45 min</option>
                  <option value={60}>60 min</option>
                  <option value={90}>90 min</option>
                </select>
              </label>
              <label className="text-xs text-muted-foreground col-span-1 flex items-center gap-3">Show current time line
                <input className="h-4 w-4 accent-primary" type="checkbox" checked={settings.calendar.showCurrentTimeLine}
                  onChange={(e) => saveSettings({ calendar: { ...settings.calendar, showCurrentTimeLine: e.target.checked } })} />
              </label>
              <div className="col-span-2 flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-32">Working hours</span>
                <Input className="w-24 liquid-surface border rounded-lg px-3 py-2" type="number" min={0} max={23} value={settings.calendar.workingHours.startHour}
                  onChange={(e) => saveSettings({ calendar: { ...settings.calendar, workingHours: { ...settings.calendar.workingHours, startHour: Number(e.target.value) } } })} />
                <span className="text-xs">to</span>
                <Input className="w-24 liquid-surface border rounded-lg px-3 py-2" type="number" min={1} max={24} value={settings.calendar.workingHours.endHour}
                  onChange={(e) => saveSettings({ calendar: { ...settings.calendar, workingHours: { ...settings.calendar.workingHours, endHour: Number(e.target.value) } } })} />
              </div>
            </div>
          </div>

          <div className="liquid-surface liquid-border rounded-xl p-6 backdrop-blur-xl">
            <h3 className="text-sm font-semibold mb-4">Create Event</h3>
            <CreateEventForm defaultDate={selected} onCreate={onCreated} presetStart={draftStart ?? undefined} presetEnd={draftEnd ?? undefined} onClearPreset={() => { setDraftStart(null); setDraftEnd(null); }} settings={settings} />
          </div>
        </div>

        {/* Right content */}
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
              <Tabs value={view} onValueChange={(v) => { setView(v as any); saveSettings({ calendar: { ...settings.calendar, defaultView: v as any } }); }}>
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
              <TimeGrid days={[anchor]} events={events} settings={settings} onSlotClick={(d) => { setDraftStart(d); setDraftEnd(addDays(d, 0)); setSelected(d); }} onUpdate={onUpdated} onDelete={onDeleted} />
            </TabsContent>
            <TabsContent value="week">
              <TimeGrid days={[...Array(7)].map((_, i) => addDays(rangeStart, i))} events={events} settings={settings} onSlotClick={(d) => { setDraftStart(d); setDraftEnd(addDays(d, 0)); setSelected(d); }} onUpdate={onUpdated} onDelete={onDeleted} />
            </TabsContent>
            <TabsContent value="month">
              <MonthGrid monthAnchor={anchor} events={events} onDayClick={(d) => { setSelected(d); setAnchor(d); }} onCreateQuick={(start) => { setDraftStart(start); setDraftEnd(new Date(start.getTime() + 60 * 60 * 1000)); setSelected(start); }} onUpdate={onUpdated} onDelete={onDeleted} />
            </TabsContent>
          </Tabs>
        </div>
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
    <div className="space-y-4">
      <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} className="liquid-surface border rounded-lg" />
      <Textarea placeholder="Description (optional)" value={desc} onChange={(e) => setDesc(e.target.value)} className="liquid-surface border rounded-lg" />
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-xs text-muted-foreground block mb-2">Date</label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="liquid-surface border rounded-lg" />
        </div>
        <div className="flex-1 flex items-end gap-2">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground block mb-2">Start</label>
            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} disabled={allDay} className="liquid-surface border rounded-lg" />
          </div>
          <div className="flex-1">
            <label className="text-xs text-muted-foreground block mb-2">End</label>
            <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} disabled={allDay} className="liquid-surface border rounded-lg" />
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <label className="text-sm inline-flex items-center gap-3">
          <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} className="h-4 w-4 accent-primary" /> 
          All-day
        </label>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">Reminder</span>
          <select className="text-sm liquid-surface border rounded-lg px-3 py-2 bg-background backdrop-blur-sm" value={String(reminder)} onChange={(e) => setReminder(e.target.value as any)}>
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
      <div className="pt-3">
        <Button size="sm" onClick={submit} className="liquid-surface liquid-border backdrop-blur-sm">
          <Plus className="h-4 w-4 mr-2" /> Add Event
        </Button>
      </div>
    </div>
  );
}

// ===== Time Grid and Month Grid (copied and adapted) =====

const HOUR_BASE_HEIGHT = 48;
function getMinutePx() { return HOUR_BASE_HEIGHT / 60; }

function layoutDay(events: DbEvent[], day: Date, minutePx: number) {
  const start = startOfDay(day).getTime();
  const end = endOfDay(day).getTime();
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
  type L = { e: DbEvent; s: number; ee: number; top: number; height: number; col: number; cols: number };
  const laid: L[] = [];
  let active: L[] = [];
  for (const item of dayEvents) {
    active = active.filter((x) => x.ee > item.s);
    const used = new Set(active.map((x) => x.col));
    let col = 0;
    while (used.has(col)) col++;
    const node: L = { ...(item as any), col, cols: 1 } as L;
    active.push(node); laid.push(node);
    const maxCol = Math.max(...active.map((x) => x.col));
    active.forEach((x) => (x.cols = Math.max(x.cols, maxCol + 1)));
  }
  return laid.map((x) => ({ event: x.e, top: x.top, height: x.height, leftPct: (x.col / x.cols) * 100, widthPct: (1 / x.cols) * 100 - 1 }));
}

function TimeGrid({ days, events, settings, onSlotClick, onUpdate, onDelete }: { days: Date[]; events: DbEvent[]; settings: Settings; onSlotClick: (start: Date) => void; onUpdate: (id: string, patch: any) => void; onDelete: (id: string) => void }) {
  const hours = [...Array(24)].map((_, h) => h);
  const MINUTE_PX = getMinutePx();
  const allDayByDay = useMemo(() => {
    return days.map((d) => ({ day: d, events: events.filter((e) => e.all_day && isSameDay(new Date(e.start_iso), d)) }));
  }, [days.map((d) => d.toDateString()).join("|"), events.map((e) => e.id + e.start_iso + e.end_iso).join("|")]);

  const laidByDay = useMemo(() => {
    return days.map((d) => layoutDay(events, d, MINUTE_PX));
  }, [days.map((d) => d.toDateString()).join("|"), events.map((e) => e.id + e.start_iso + e.end_iso).join("|"), MINUTE_PX]);

  const handleSlot = (day: Date, hour: number, yWithin?: number) => {
    const start = new Date(day);
    const minutes = yWithin ? Math.round(yWithin / MINUTE_PX) : 0;
    const snap = settings.calendar.timeSlotMinutes;
    const snapped = Math.round(minutes / snap) * snap;
    start.setHours(hour, snapped, 0, 0);
    onSlotClick(start);
  };

  const now = new Date();
  const nowByDay = days.map((d) => {
    if (!isSameDay(d, now)) return null;
    const start = startOfDay(d).getTime();
    const minutes = Math.max(0, Math.min(24 * 60, Math.floor((now.getTime() - start) / 60000)));
    return minutes * MINUTE_PX;
  });

  return (
    <div className="liquid-surface liquid-border rounded-xl overflow-auto backdrop-blur-xl" style={{ height: "70vh" }}>
      <div className="grid" style={{ gridTemplateColumns: `64px repeat(${days.length}, minmax(0, 1fr))` }}>
        <div className="border-b p-2 text-xs text-muted-foreground" />
        {days.map((d) => (
          <div key={d.toDateString()} className="border-b p-2 text-xs">
            <div className={`font-medium ${isToday(d) ? 'text-primary' : ''}`}>{format(d, "EEE d")}</div>
          </div>
        ))}
      </div>
      <div className="grid" style={{ gridTemplateColumns: `64px repeat(${days.length}, minmax(0, 1fr))` }}>
        <div className="border-b p-2 text-xs text-muted-foreground">All-day</div>
        {allDayByDay.map(({ day, events }) => (
          <div key={day.toDateString()} className="border-b p-2 min-h-[40px]">
            <div className="flex flex-wrap gap-1">
              {events.map((e) => (<EventChip key={e.id} e={e} onUpdate={onUpdate} onDelete={onDelete} />))}
            </div>
          </div>
        ))}
      </div>
      <div className="grid" style={{ gridTemplateColumns: `64px repeat(${days.length}, minmax(0, 1fr))` }}>
        <div className="relative">
          {hours.map((h) => (
            <div key={h} className="h-12 border-b border-border/50 text-[10px] text-muted-foreground pr-1 flex items-start justify-end">
              <span className="-mt-2">{format(new Date().setHours(h, 0, 0, 0), "ha").toLowerCase()}</span>
            </div>
          ))}
        </div>
        {days.map((d, idx) => (
          <div key={idx} className="relative border-l">
            <div className="absolute inset-0">
              {hours.map((h) => (<div key={h} className="h-12 border-b border-border/50" />))}
              {settings.calendar.showCurrentTimeLine && nowByDay[idx] != null && (
                <div className="absolute left-0 right-0 h-px bg-red-500" style={{ top: nowByDay[idx]! }} />
              )}
            </div>
            <div className="relative" style={{ height: `${24 * HOUR_BASE_HEIGHT}px` }}
              onDoubleClick={(e) => {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                const y = e.clientY - rect.top;
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
    <div className="absolute rounded-md bg-primary/20 border border-primary/30 p-1 text-xs overflow-hidden cursor-pointer hover:bg-primary/30" style={{ top: pos.top, height: pos.height, left: `${pos.leftPct}%`, width: `${pos.widthPct}%` }} onClick={() => setEditing(true)}>
      <div className="font-medium truncate">{event.title}</div>
      {!event.all_day && (<div className="text-[10px] text-muted-foreground truncate">{format(new Date(event.start_iso), "p")} – {format(new Date(event.end_iso), "p")}</div>)}
      {editing && (
        <EditEventDialog event={event} onClose={() => setEditing(false)} onSave={(patch) => onUpdate(event.id, patch)} onDelete={() => onDelete(event.id)} />
      )}
    </div>
  );
}

function MonthGrid({ monthAnchor, events, onDayClick, onCreateQuick, onUpdate, onDelete }: { monthAnchor: Date; events: DbEvent[]; onDayClick: (d: Date) => void; onCreateQuick: (start: Date) => void; onUpdate: (id: string, patch: any) => void; onDelete: (id: string) => void }) {
  const start = startOfWeek(startOfMonth(monthAnchor), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(monthAnchor), { weekStartsOn: 0 });
  const days: Date[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(new Date(d));
  const weeks = Math.ceil(days.length / 7);
  return (
    <div className="liquid-surface liquid-border rounded-xl overflow-auto backdrop-blur-xl" style={{ height: "70vh" }}>
      <div className="grid" style={{ gridTemplateColumns: `repeat(7, minmax(0, 1fr))` }}>
        {[...Array(7)].map((_, i) => (
          <div key={i} className="border-b p-2 text-xs text-muted-foreground">{format(addDays(start, i), "EEE")}</div>
        ))}
      </div>
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
                {shown.map((e) => (<EventChip key={e.id} e={e} onUpdate={onUpdate} onDelete={onDelete} />))}
                {extra > 0 && <div className="text-[11px] text-muted-foreground">+{extra} more</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
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
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative liquid-surface liquid-border rounded-xl p-6 w-[400px] shadow-xl backdrop-blur-xl liquid-highlight">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold">Edit Event</h4>
          <button className="text-muted-foreground hover:text-foreground transition-colors" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="liquid-surface border rounded-lg" />
          <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} className="liquid-surface border rounded-lg" />
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground block mb-2">Date</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="liquid-surface border rounded-lg" />
            </div>
            <div className="flex-1 flex items-end gap-2">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground block mb-2">Start</label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} disabled={allDay} className="liquid-surface border rounded-lg" />
              </div>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground block mb-2">End</label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} disabled={allDay} className="liquid-surface border rounded-lg" />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm inline-flex items-center gap-3">
              <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} className="h-4 w-4 accent-primary" /> 
              All-day
            </label>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">Reminder</span>
              <select className="text-sm liquid-surface border rounded-lg px-3 py-2 bg-background backdrop-blur-sm" value={String(reminder)} onChange={(e) => setReminder(e.target.value)}>
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
          <div className="flex gap-3 pt-4">
            <Button size="sm" onClick={submit} className="liquid-surface liquid-border backdrop-blur-sm">
              Save Changes
            </Button>
            <Button size="sm" variant="destructive" onClick={() => { onDelete(); onClose(); }} className="liquid-surface liquid-border backdrop-blur-sm">
              <Trash2 className="h-4 w-4 mr-2" />Delete
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

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
        {calendars.map((c) => (<option key={c.id} value={c.id}>{c.summary}</option>))}
      </select>
      <Button size="sm" variant="ghost" onClick={disconnect}>Sign out</Button>
    </div>
  );
}
