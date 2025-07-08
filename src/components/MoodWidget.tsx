import { useState } from "react";
import { Heart, TrendingUp } from "lucide-react";

interface MoodEntry {
  emoji: string;
  label: string;
  value: number;
}

export const MoodWidget = () => {
  const moods: MoodEntry[] = [
    { emoji: "😄", label: "Amazing", value: 5 },
    { emoji: "😊", label: "Happy", value: 4 },
    { emoji: "😐", label: "Neutral", value: 3 },
    { emoji: "😔", label: "Down", value: 2 },
    { emoji: "😢", label: "Sad", value: 1 },
  ];

  const [selectedMood, setSelectedMood] = useState<MoodEntry | null>(moods[1]);
  const [weeklyAverage] = useState(3.8);

  const handleMoodSelect = (mood: MoodEntry) => {
    setSelectedMood(mood);
  };

  const getMoodColor = (value: number) => {
    if (value >= 4) return "text-green-500";
    if (value >= 3) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <div className="widget-card widget-mood h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Mood Tracker</h3>
          <p className="text-sm text-muted-foreground">How are you feeling today?</p>
        </div>
        <Heart className="h-5 w-5 text-[hsl(var(--accent-blue))]" />
      </div>

      {/* Current mood display */}
      {selectedMood && (
        <div className="text-center mb-6 fade-in">
          <div className="text-6xl mb-2">{selectedMood.emoji}</div>
          <p className="text-lg font-medium text-foreground">{selectedMood.label}</p>
          <p className="text-sm text-muted-foreground">Today's mood</p>
        </div>
      )}

      {/* Mood selector */}
      <div className="mb-6">
        <p className="text-sm font-medium text-foreground mb-3">Update your mood:</p>
        <div className="flex justify-between gap-2">
          {moods.map((mood, index) => (
            <button
              key={mood.value}
              onClick={() => handleMoodSelect(mood)}
              className={`flex-1 p-3 rounded-lg transition-all duration-200 hover:scale-110 fade-in ${
                selectedMood?.value === mood.value
                  ? 'bg-[hsl(var(--accent-blue))]/20 border-2 border-[hsl(var(--accent-blue))]'
                  : 'bg-white/30 border border-white/20 hover:bg-white/50'
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
      <div className="bg-white/20 rounded-lg p-4">
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
        <div className="w-full bg-white/20 rounded-full h-2 mt-2">
          <div 
            className="bg-gradient-to-r from-[hsl(var(--accent-blue))] to-blue-400 h-2 rounded-full transition-all duration-500"
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