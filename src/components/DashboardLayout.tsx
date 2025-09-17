import { TodoWidget } from "@/components/TodoWidget";
import { WeatherWidget } from "@/components/WeatherWidget";
import { FocusWidget } from "@/components/FocusWidget";
import { HabitWidget } from "@/components/HabitWidget";
import { MoodWidget } from "@/components/MoodWidget";
import { NotesWidget } from "@/components/NotesWidget";
import { Settings, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import HeaderAuth from "@/components/HeaderAuth";
import useSupabaseAuth from "@/lib/useSupabaseAuth";
import useProfile from "@/lib/useProfile";
import { Link } from "react-router-dom";
import SettingsDialog from "@/components/SettingsDialog";
import { useState } from "react";

export const DashboardLayout = () => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { user } = useSupabaseAuth()
  const { profile } = useProfile()
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

  const hours = currentDate.getHours()
  const timeGreeting = hours < 12 ? 'Good morning' : hours < 18 ? 'Good afternoon' : 'Good evening'
  const displayName = profile?.display_name || (user as any)?.user_metadata?.name || (user as any)?.email?.split('@')[0] || ''

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary">
      {/* Header with Liquid Glass */}
      <header className="header-liquid sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="fade-in-liquid">
              <h1 className="text-2xl font-bold text-gradient">Zoned</h1>
              <p className="text-sm text-muted-foreground">Your personal command center</p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right fade-in-liquid" style={{ animationDelay: "0.2s" }}>
                <p className="text-sm font-medium text-foreground">{timeString}</p>
                <p className="text-xs text-muted-foreground">{dateString}</p>
              </div>
              
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <Link to="/calendar" className="btn-liquid rounded-md px-3 py-2 text-sm inline-flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  Calendar
                </Link>
                <Button variant="ghost" size="sm" className="btn-liquid" onClick={() => setSettingsOpen(true)}>
                  <Settings className="h-4 w-4" />
                </Button>

                <HeaderAuth />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Dashboard */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8 fade-in-liquid" style={{ animationDelay: "0.1s" }}>
          <h2 className="text-3xl font-bold text-foreground mb-2">
            {timeGreeting}{displayName ? `, ${displayName}` : ''}! ✨
          </h2>
          <p className="text-lg text-muted-foreground">
            Ready to make today amazing? Here's your dashboard.
          </p>
        </div>

        {/* Widget Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-fr">
          {/* Todo Widget - Spans 2 columns on larger screens */}
          <div className="lg:col-span-2 slide-up-liquid min-w-0" style={{ animationDelay: "0.2s" }}>
            <TodoWidget />
          </div>

          {/* Weather Widget */}
          <div className="slide-up-liquid min-w-0" style={{ animationDelay: "0.3s" }}>
            <WeatherWidget />
          </div>

          {/* Focus Widget */}
          <div className="slide-up-liquid min-w-0" style={{ animationDelay: "0.4s" }}>
            <FocusWidget />
          </div>

          {/* Habit Widget (stretches to match Mood row height) */}
          <div className="lg:col-span-2 slide-up-liquid min-w-0" style={{ animationDelay: "0.5s" }}>
            <HabitWidget />
          </div>

          {/* Mood Widget - span to right side */}
          <div className="slide-up-liquid lg:col-span-2 lg:col-start-2 xl:col-start-3 xl:col-span-2 min-w-0" style={{ animationDelay: "0.6s" }}>
            <MoodWidget />
          </div>

          {/* Notes Widget - full width row on large screens */}
          <div className="slide-up-liquid lg:col-span-3 xl:col-span-4 min-w-0" style={{ animationDelay: "0.7s" }}>
            <NotesWidget />
          </div>
        </div>

        {/* Bottom Section with Enhanced Liquid Glass */}
        <div className="mt-12 text-center fade-in-liquid" style={{ animationDelay: "0.8s" }}>
          <div className="widget-card p-8 shimmer-effect">
            <h3 className="text-xl font-semibold text-foreground mb-2">
              You're doing great! 🎉
            </h3>
            <p className="text-muted-foreground mb-4">
              Keep up the momentum and finish strong today.
            </p>
            <Button className="btn-gradient-liquid">
              View Full Analytics
            </Button>
          </div>
        </div>
      </main>
  <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />

      {/* Footer with Liquid Glass */}
      <footer className="footer-liquid mt-16">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              © 2024 Zoned. Made with ❤️ for productivity.
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="widget-interactive px-2 py-1">Privacy</span>
              <span className="widget-interactive px-2 py-1">Terms</span>
              <span className="widget-interactive px-2 py-1">Support</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};