import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {/* Appearance */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Appearance</h3>
            <div className="flex items-center gap-2">
              <label className="text-sm w-40">Theme</label>
              <select
                className="border rounded-md px-2 py-1 bg-background"
                value={draft.appearance.theme}
                onChange={(e) => setDraft({ ...draft, appearance: { ...draft.appearance, theme: e.target.value as any } })}
              >
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
          </section>

          {/* Calendar settings moved to Calendar page */}

          {/* Reminders */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Reminders</h3>
            <div className="flex items-center gap-2">
              <label className="text-sm w-40">Enable reminders</label>
              <input
                type="checkbox"
                checked={draft.reminders.enabled}
                onChange={(e) => setDraft({ ...draft, reminders: { ...draft.reminders, enabled: e.target.checked } })}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm w-40">Default reminder</label>
              <select
                className="border rounded-md px-2 py-1 bg-background"
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

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={apply}>Save</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SettingsDialog;
