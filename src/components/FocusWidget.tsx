import { useEffect, useMemo, useState } from "react";
import { Target, Edit3, Check, Calendar as CalendarIcon, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getDailyFocus, setDailyFocus, updateDailyFocus } from '@/lib/data'
import useSupabaseAuth from '@/lib/useSupabaseAuth'

export const FocusWidget = () => {
  const { user } = useSupabaseAuth()
  const today = new Date().toISOString().slice(0,10)
  const [date, setDate] = useState<Date>(new Date())
  const ymd = useMemo(() => date.toISOString().slice(0,10), [date])
  const [focus, setFocus] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [tempFocus, setTempFocus] = useState("");
  const [progress, setProgress] = useState(0)
  const [completed, setCompleted] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    getDailyFocus(ymd).then(({ data }) => {
      setFocus(data?.text ?? "")
      setTempFocus(data?.text ?? "")
      setProgress(typeof data?.progress === 'number' ? Math.max(0, Math.min(100, data!.progress!)) : 0)
      setCompleted(!!data?.completed)
      setLoading(false)
    })
  }, [user, ymd])

  const handleSave = () => {
    const next = tempFocus.trim()
    setFocus(next)
    setIsEditing(false)
    if (!user) return
    setDailyFocus(ymd, next)
  };

  const handleCancel = () => {
    setTempFocus(focus);
    setIsEditing(false);
  };

  return (
    <div className="widget-card widget-focus h-full container-safe p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-[hsl(var(--accent-orange))]" />
          <h3 className="text-lg font-semibold text-foreground">Daily Focus</h3>
        </div>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="btn-liquid text-muted-foreground hover:text-[hsl(var(--accent-orange))]">
                <CalendarIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0" align="end">
              <Calendar mode="single" selected={date} onSelect={(d)=> d && setDate(d)} />
            </PopoverContent>
          </Popover>
          {!isEditing && (
            <Button onClick={() => setIsEditing(true)} variant="ghost" size="sm" className="btn-liquid text-muted-foreground hover:text-[hsl(var(--accent-orange))]">
              <Edit3 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="text-center py-6">
        <div className="mb-4">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center shadow-lg">
            <Target className="h-8 w-8 text-white" />
          </div>
        </div>

        {loading ? (
          <div className="text-muted-foreground">Loading…</div>
        ) : isEditing ? (
          <div className="space-y-4 slide-up-liquid">
            <Input
              value={tempFocus}
              onChange={(e) => setTempFocus(e.target.value)}
              placeholder="What's your main focus today?"
              className="text-center text-lg font-medium liquid-surface liquid-border"
              autoFocus
            />
            <div className="flex gap-2 justify-center">
              <Button onClick={handleSave} size="sm" className="btn-gradient-liquid">
                <Check className="h-4 w-4 mr-1" />
                Save
              </Button>
              <Button onClick={handleCancel} variant="ghost" size="sm" className="btn-liquid">
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="fade-in-liquid">
            <h4 className="text-xl font-bold text-foreground mb-2 leading-tight text-break-safe">
              {focus}
            </h4>
            <p className="text-sm text-muted-foreground">
              Stay focused on what matters most today
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-white/20">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Progress</p>
            <button
              className={`text-xs inline-flex items-center gap-1 px-2 py-1 rounded-md btn-liquid ${completed ? 'text-[hsl(var(--accent-orange))]' : 'text-muted-foreground'}`}
              onClick={() => {
                const next = !completed
                setCompleted(next)
                updateDailyFocus(ymd, { completed: next })
              }}
            >
              <CheckCircle2 className="h-3 w-3" /> {completed ? 'Done' : 'Mark done'}
            </button>
          </div>
          <Slider
            value={[progress]}
            onValueChange={(v)=> {
              const val = Math.max(0, Math.min(100, v[0] ?? 0))
              setProgress(val)
            }}
            onValueCommit={(v)=> {
              const val = Math.max(0, Math.min(100, v[0] ?? 0))
              updateDailyFocus(ymd, { progress: val })
            }}
            max={100}
            step={5}
          />
          <p className="text-xs text-muted-foreground text-right">{progress}% complete</p>
        </div>
      </div>
    </div>
  );
};