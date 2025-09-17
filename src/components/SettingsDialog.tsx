import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { getSettings, saveSettings, type Settings } from "@/lib/settings";

export function SettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [draft, setDraft] = useState<Settings>(getSettings());

  useEffect(() => {
    if (open) setDraft(getSettings());
  }, [open]);

  const apply = () => {
    saveSettings(draft);
    onOpenChange(false);
  };

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
          />
          
          {/* Dialog */}
          <div className="relative max-w-2xl w-full mx-4 liquid-surface liquid-border backdrop-blur-xl rounded-xl shadow-xl animate-in fade-in-50 scale-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border/50">
              <h2 className="text-lg font-semibold text-foreground">Settings</h2>
              <button 
                onClick={() => onOpenChange(false)}
                className="liquid-surface liquid-border backdrop-blur-sm hover:bg-accent/50 rounded-lg p-2 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Appearance */}
              <section className="space-y-4 liquid-surface liquid-border rounded-xl p-6 liquid-highlight">
                <h3 className="text-sm font-semibold text-foreground">Appearance</h3>
                <div className="flex items-center gap-3">
                  <label className="text-sm w-40 text-muted-foreground">Theme</label>
                  <select
                    className="liquid-surface liquid-border rounded-lg px-3 py-2 text-sm bg-background backdrop-blur-sm flex-1"
                    value={draft.appearance.theme}
                    onChange={(e) => setDraft({ ...draft, appearance: { ...draft.appearance, theme: e.target.value as any } })}
                  >
                    <option value="system">System</option>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </div>
              </section>

              {/* Reminders */}
              <section className="space-y-4 liquid-surface liquid-border rounded-xl p-6 liquid-highlight">
                <h3 className="text-sm font-semibold text-foreground">Reminders</h3>
                <div className="flex items-center gap-3">
                  <label className="text-sm w-40 text-muted-foreground">Enable reminders</label>
                  <input
                    type="checkbox"
                    checked={draft.reminders.enabled}
                    onChange={(e) => setDraft({ ...draft, reminders: { ...draft.reminders, enabled: e.target.checked } })}
                    className="h-4 w-4 accent-primary rounded"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm w-40 text-muted-foreground">Default reminder</label>
                  <select
                    className="liquid-surface liquid-border rounded-lg px-3 py-2 text-sm bg-background backdrop-blur-sm flex-1"
                    value={String(draft.reminders.defaultMinutes)}
                    onChange={(e) => setDraft({ ...draft, reminders: { ...draft.reminders, defaultMinutes: e.target.value === "null" ? null : Number(e.target.value) } })}
                  >
                    <option value="null">None</option>
                    <option value="5">5 min</option>
                    <option value="10">10 min</option>
                    <option value="15">15 min</option>
                    <option value="30">30 min</option>
                    <option value="60">1 hr</option>
                  </select>
                </div>
              </section>

              {/* Footer Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
                <button 
                  onClick={() => onOpenChange(false)}
                  className="liquid-surface liquid-border backdrop-blur-sm rounded-lg px-4 py-2 text-sm hover:bg-accent/50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={apply}
                  className="liquid-surface liquid-border backdrop-blur-sm bg-primary/20 hover:bg-primary/30 rounded-lg px-4 py-2 text-sm transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
