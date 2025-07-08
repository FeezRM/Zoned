import { TodoWidget } from "@/components/TodoWidget";
import { WeatherWidget } from "@/components/WeatherWidget";
import { FocusWidget } from "@/components/FocusWidget";
import { HabitWidget } from "@/components/HabitWidget";
import { MoodWidget } from "@/components/MoodWidget";
import { NotesWidget } from "@/components/NotesWidget";
import { Calendar, Settings, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";

export const DashboardLayout = () => {
  const currentDate = new Date();
  const dateString = currentDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  
  const timeString = currentDate.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-lg bg-white/5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="fade-in">
              <h1 className="text-2xl font-bold text-gradient">The Daily Hub</h1>
              <p className="text-sm text-muted-foreground">Your personal command center</p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right fade-in" style={{ animationDelay: "0.2s" }}>
                <p className="text-sm font-medium text-foreground">{timeString}</p>
                <p className="text-xs text-muted-foreground">{dateString}</p>
              </div>
              
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <Button variant="ghost" size="sm" className="btn-glass">
                  <Calendar className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="btn-glass">
                  <Settings className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="btn-glass">
                  <User className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Dashboard */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8 fade-in" style={{ animationDelay: "0.1s" }}>
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Good morning! ✨
          </h2>
          <p className="text-lg text-muted-foreground">
            Ready to make today amazing? Here's your dashboard.
          </p>
        </div>

        {/* Widget Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-fr">
          {/* Todo Widget - Spans 2 columns on larger screens */}
          <div className="lg:col-span-2 slide-up" style={{ animationDelay: "0.2s" }}>
            <TodoWidget />
          </div>

          {/* Weather Widget */}
          <div className="slide-up" style={{ animationDelay: "0.3s" }}>
            <WeatherWidget />
          </div>

          {/* Focus Widget */}
          <div className="slide-up" style={{ animationDelay: "0.4s" }}>
            <FocusWidget />
          </div>

          {/* Habit Widget */}
          <div className="slide-up" style={{ animationDelay: "0.5s" }}>
            <HabitWidget />
          </div>

          {/* Mood Widget */}
          <div className="slide-up" style={{ animationDelay: "0.6s" }}>
            <MoodWidget />
          </div>

          {/* Notes Widget - Spans 2 columns */}
          <div className="lg:col-span-2 slide-up" style={{ animationDelay: "0.7s" }}>
            <NotesWidget />
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-12 text-center fade-in" style={{ animationDelay: "0.8s" }}>
          <div className="bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
            <h3 className="text-xl font-semibold text-foreground mb-2">
              You're doing great! 🎉
            </h3>
            <p className="text-muted-foreground mb-4">
              Keep up the momentum and finish strong today.
            </p>
            <Button className="btn-gradient">
              View Full Analytics
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-white/5 backdrop-blur-lg mt-16">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              © 2024 The Daily Hub. Made with ❤️ for productivity.
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Privacy</span>
              <span>Terms</span>
              <span>Support</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};