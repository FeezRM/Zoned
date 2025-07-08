import { useState } from "react";
import { Plus, Edit3, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Note {
  id: string;
  content: string;
  timestamp: Date;
}

export const NotesWidget = () => {
  const [notes, setNotes] = useState<Note[]>([
    {
      id: "1",
      content: "Remember to follow up with the client about the project timeline. They mentioned wanting to see wireframes by Friday.",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    },
    {
      id: "2",
      content: "Great idea for improving the user onboarding flow - add tooltips to guide new users through key features.",
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    },
  ]);
  
  const [isAdding, setIsAdding] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const addNote = () => {
    if (newNote.trim()) {
      const note: Note = {
        id: Date.now().toString(),
        content: newNote,
        timestamp: new Date(),
      };
      setNotes([note, ...notes]);
      setNewNote("");
      setIsAdding(false);
    }
  };

  const startEdit = (note: Note) => {
    setEditingId(note.id);
    setEditContent(note.content);
  };

  const saveEdit = () => {
    setNotes(notes.map(note => 
      note.id === editingId ? { ...note, content: editContent } : note
    ));
    setEditingId(null);
    setEditContent("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent("");
  };

  const deleteNote = (id: string) => {
    setNotes(notes.filter(note => note.id !== id));
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    return "Just now";
  };

  return (
    <div className="widget-card h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Quick Notes</h3>
          <p className="text-sm text-muted-foreground">{notes.length} notes</p>
        </div>
        <Button
          onClick={() => setIsAdding(true)}
          variant="ghost"
          size="sm"
          className="text-primary hover:bg-primary/10"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Add new note */}
      {isAdding && (
        <div className="mb-4 slide-up">
          <Textarea
            placeholder="Jot down your thoughts..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className="mb-2 min-h-[80px] resize-none"
            autoFocus
          />
          <div className="flex gap-2">
            <Button onClick={addNote} size="sm" className="btn-gradient">
              <Save className="h-3 w-3 mr-1" />
              Save
            </Button>
            <Button onClick={() => setIsAdding(false)} variant="ghost" size="sm">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Notes list */}
      <div className="flex-1 space-y-3 overflow-y-auto">
        {notes.map((note, index) => (
          <div 
            key={note.id}
            className="bg-accent/30 border border-border rounded-lg p-4 fade-in hover:bg-accent/50 transition-colors group"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            {editingId === note.id ? (
              <div className="space-y-2">
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="min-h-[60px] resize-none"
                />
                <div className="flex gap-2">
                  <Button onClick={saveEdit} size="sm" variant="ghost">
                    <Save className="h-3 w-3" />
                  </Button>
                  <Button onClick={cancelEdit} size="sm" variant="ghost">
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-foreground leading-relaxed flex-1">
                    {note.content}
                  </p>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      onClick={() => startEdit(note)}
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                    >
                      <Edit3 className="h-3 w-3" />
                    </Button>
                    <Button
                      onClick={() => deleteNote(note.id)}
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {formatTime(note.timestamp)}
                </p>
              </>
            )}
          </div>
        ))}
      </div>

      {notes.length === 0 && !isAdding && (
        <div className="flex-1 flex items-center justify-center text-center py-8">
          <div className="text-muted-foreground">
            <Edit3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No notes yet</p>
            <p className="text-xs">Click + to add your first note</p>
          </div>
        </div>
      )}
    </div>
  );
};