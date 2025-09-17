import { useEffect, useMemo, useState } from "react";
import { Heart, TrendingUp } from "lucide-react";
import { listMoodEntries, insertMoodEntry } from '@/lib/data'
import useSupabaseAuth from '@/lib/useSupabaseAuth'

interface MoodEntry {
  emoji: string;
  label: string;
  value: number;
}

export const MoodWidget = () => {
  const { user } = useSupabaseAuth()
  const moods: MoodEntry[] = [
    { emoji: "😄", label: "Amazing", value: 5 },
    { emoji: "😊", label: "Happy", value: 4 },
    { emoji: "😐", label: "Neutral", value: 3 },
    { emoji: "😔", label: "Down", value: 2 },
    { emoji: "😢", label: "Sad", value: 1 },
  ];

  const [selectedMood, setSelectedMood] = useState<MoodEntry | null>(moods[1]);
  const [recent, setRecent] = useState<{ value: number }[]>([])

  useEffect(() => {
    if (!user) { setRecent([]); return }
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    listMoodEntries(sevenDaysAgo).then(({ data }) => {
      if (data) setRecent(data.map((e) => ({ value: e.value })))
    })
  }, [user])

  const weeklyAverage = useMemo(() => {
    if (!recent.length) return 0
    return recent.reduce((a, b) => a + b.value, 0) / recent.length
  }, [recent])

  const handleMoodSelect = (mood: MoodEntry) => {
    setSelectedMood(mood);
    if (!user) return
    insertMoodEntry(mood.value, mood.label, mood.emoji).then(({ data }) => {
      if (data) setRecent((prev) => [{ value: data.value }, ...prev])
    })
  };

  const getMoodColor = (value: number) => {
    if (value >= 4) return "text-green-500";
    if (value >= 3) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <div className="widget-card widget-mood h-full container-safe p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Mood Tracker</h3>
          <p className="text-sm text-muted-foreground">How are you feeling today?</p>
        </div>
        <Heart className="h-5 w-5 text-[hsl(var(--accent-blue))]" />
      </div>

      {/* Current mood display */}
      {selectedMood && (
        <div className="text-center mb-6 fade-in-liquid">
          <div className="text-6xl mb-2">{selectedMood.emoji}</div>
          <p className="text-lg font-medium text-foreground">{selectedMood.label}</p>
          <p className="text-sm text-muted-foreground">Today's mood</p>
        </div>
      )}

  {/* Mood selector */}
  <div className="mb-6 w-full">
        <p className="text-sm font-medium text-foreground mb-3">Update your mood:</p>
    <div className="grid grid-cols-5 gap-3 w-full">
          {moods.map((mood, index) => (
            <button
              key={mood.value}
              onClick={() => handleMoodSelect(mood)}
      className={`w-full p-3 rounded-lg transition-all duration-200 hover:scale-105 fade-in-liquid widget-interactive ${
                selectedMood?.value === mood.value
                  ? 'liquid-surface liquid-border-active shimmer-effect'
                  : 'liquid-surface liquid-border liquid-highlight hover:liquid-shadow'
              }`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="text-2xl mb-1">{mood.emoji}</div>
              <div className="text-xs text-muted-foreground">{mood.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Weekly trend */}
      <div className="liquid-surface liquid-border rounded-lg p-4 liquid-highlight">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">Weekly Average</span>
          <TrendingUp className="h-4 w-4 text-[hsl(var(--accent-blue))]" />
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xl font-bold ${getMoodColor(weeklyAverage)}`}>
            {weeklyAverage.toFixed(1)}
          </span>
          <span className="text-sm text-muted-foreground">/ 5.0</span>
        </div>
        <div className="w-full liquid-surface rounded-full h-2 mt-2">
          <div 
            className="bg-gradient-to-r from-[hsl(var(--accent-blue))] to-blue-400 h-2 rounded-full transition-all duration-500 shimmer-effect"
            style={{ width: `${(weeklyAverage / 5) * 100}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          You're doing great! Keep it up.
        </p>
      </div>
    </div>
  );
};