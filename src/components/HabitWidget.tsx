import { useState } from "react";
import { CheckCircle, Circle, Flame } from "lucide-react";

interface Habit {
  id: string;
  name: string;
  completed: boolean;
  streak: number;
  icon: string;
}

export const HabitWidget = () => {
  const [habits, setHabits] = useState<Habit[]>([
    { id: "1", name: "Morning Meditation", completed: true, streak: 7, icon: "🧘‍♂️" },
    { id: "2", name: "Read 20 Pages", completed: true, streak: 12, icon: "📚" },
    { id: "3", name: "Exercise", completed: false, streak: 3, icon: "💪" },
    { id: "4", name: "Drink 8 Glasses Water", completed: false, streak: 5, icon: "💧" },
    { id: "5", name: "No Social Media", completed: true, streak: 2, icon: "📱" },
  ]);

  const toggleHabit = (id: string) => {
    setHabits(habits.map(habit => 
      habit.id === id 
        ? { 
            ...habit, 
            completed: !habit.completed,
            streak: !habit.completed ? habit.streak + 1 : Math.max(0, habit.streak - 1)
          } 
        : habit
    ));
  };

  const completedHabits = habits.filter(h => h.completed).length;
  const totalHabits = habits.length;
  const completionRate = Math.round((completedHabits / totalHabits) * 100);

  return (
    <div className="widget-card widget-habits h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Daily Habits</h3>
          <p className="text-sm text-muted-foreground">
            {completedHabits} of {totalHabits} completed ({completionRate}%)
          </p>
        </div>
        <div className="flex items-center gap-1 text-[hsl(var(--accent-green))]">
          <Flame className="h-5 w-5" />
          <span className="text-sm font-medium">5</span>
        </div>
      </div>

      {/* Progress circle */}
      <div className="flex justify-center mb-6">
        <div className="relative w-20 h-20">
          <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-green-100"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${completionRate * 2.83} 283`}
              className="text-[hsl(var(--accent-green))] transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-bold text-[hsl(var(--accent-green))]">
              {completionRate}%
            </span>
          </div>
        </div>
      </div>

      {/* Habits list */}
      <div className="space-y-3 max-h-48 overflow-y-auto">
        {habits.map((habit, index) => (
          <div 
            key={habit.id}
            className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 cursor-pointer fade-in ${
              habit.completed 
                ? 'bg-green-500/20 border border-green-500/30' 
                : 'bg-accent/30 border border-border hover:bg-accent/50'
            }`}
            style={{ animationDelay: `${index * 0.1}s` }}
            onClick={() => toggleHabit(habit.id)}
          >
            <span className="text-lg">{habit.icon}</span>
            
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className={`text-sm font-medium ${
                  habit.completed ? 'text-green-700' : 'text-foreground'
                }`}>
                  {habit.name}
                </p>
                {habit.streak > 0 && (
                  <div className="flex items-center gap-1 text-orange-500">
                    <Flame className="h-3 w-3" />
                    <span className="text-xs font-medium">{habit.streak}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-shrink-0">
              {habit.completed ? (
                <CheckCircle className="h-5 w-5 text-[hsl(var(--accent-green))]" />
              ) : (
                <Circle className="h-5 w-5 text-gray-300" />
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-white/20">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Keep going! You're building great habits.
          </p>
        </div>
      </div>
    </div>
  );
};