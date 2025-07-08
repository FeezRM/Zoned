import { useState } from "react";
import { Target, Edit3, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const FocusWidget = () => {
  const [focus, setFocus] = useState("Launch The Daily Hub MVP");
  const [isEditing, setIsEditing] = useState(false);
  const [tempFocus, setTempFocus] = useState(focus);

  const handleSave = () => {
    setFocus(tempFocus);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempFocus(focus);
    setIsEditing(false);
  };

  return (
    <div className="widget-card widget-focus h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-[hsl(var(--accent-orange))]" />
          <h3 className="text-lg font-semibold text-foreground">Today's Focus</h3>
        </div>
        {!isEditing && (
          <Button
            onClick={() => setIsEditing(true)}
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-[hsl(var(--accent-orange))]"
          >
            <Edit3 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="text-center py-6">
        <div className="mb-4">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center shadow-lg">
            <Target className="h-8 w-8 text-white" />
          </div>
        </div>

        {isEditing ? (
          <div className="space-y-4 slide-up">
            <Input
              value={tempFocus}
              onChange={(e) => setTempFocus(e.target.value)}
              placeholder="What's your main focus today?"
              className="text-center text-lg font-medium"
              autoFocus
            />
            <div className="flex gap-2 justify-center">
              <Button onClick={handleSave} size="sm" className="btn-gradient">
                <Check className="h-4 w-4 mr-1" />
                Save
              </Button>
              <Button onClick={handleCancel} variant="ghost" size="sm">
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="fade-in">
            <h4 className="text-xl font-bold text-foreground mb-2 leading-tight">
              {focus}
            </h4>
            <p className="text-sm text-muted-foreground">
              Stay focused on what matters most today
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-white/20">
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-2">Progress</p>
          <div className="w-full bg-white/20 rounded-full h-2">
            <div className="bg-gradient-to-r from-orange-400 to-orange-600 h-2 rounded-full w-3/4 transition-all duration-500" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">75% complete</p>
        </div>
      </div>
    </div>
  );
};