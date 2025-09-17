import { useState } from "react";
import { useEffect } from "react";
import { Plus, Edit3, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { listNotes, insertNote, updateNote, deleteNoteRow } from '@/lib/data'
import useSupabaseAuth from '@/lib/useSupabaseAuth'

interface Note {
  id: string;
  content: string;
  timestamp: Date;
}

export const NotesWidget = () => {
  const { user } = useSupabaseAuth()
  const [notes, setNotes] = useState<Note[]>([]);
  
  const [isAdding, setIsAdding] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  useEffect(() => {
    if (!user) { setNotes([]); return }
    listNotes().then(({ data }) => {
      if (data) setNotes(data.map((n) => ({ id: n.id, content: n.content, timestamp: new Date(n.created_at) })))
    })
  }, [user])

  const addNote = () => {
    const content = newNote.trim()
    if (!content) return
    const tempId = crypto.randomUUID()
    const note: Note = { id: tempId, content, timestamp: new Date() }
    setNotes((prev) => [note, ...prev])
    setNewNote(""); setIsAdding(false)
    insertNote(content).then(({ data, error }) => {
      if (error || !data) {
        setNotes((prev) => prev.filter((n) => n.id !== tempId))
        return
      }
      setNotes((prev) => prev.map((n) => n.id === tempId ? { id: data.id, content: data.content, timestamp: new Date(data.created_at) } : n))
    })
  };

  const startEdit = (note: Note) => {
    setEditingId(note.id);
    setEditContent(note.content);
  };

  const saveEdit = () => {
    const id = editingId
    if (!id) return
    const old = notes.find((n) => n.id === id)?.content
    setNotes((prev) => prev.map(note => note.id === id ? { ...note, content: editContent } : note))
    updateNote(id, editContent).then(({ error }) => {
      if (error) setNotes((prev) => prev.map(note => note.id === id ? { ...note, content: old ?? note.content } : note))
    })
    setEditingId(null)
    setEditContent("")
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent("");
  };

  const deleteNote = (id: string) => {
    const prev = notes
    setNotes(prev.filter(note => note.id !== id))
    deleteNoteRow(id).then(({ error }) => { if (error) setNotes(prev) })
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
    <div className="widget-card h-full flex flex-col container-safe p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Quick Notes</h3>
          <p className="text-sm text-muted-foreground">{notes.length} notes</p>
        </div>
        <Button
          onClick={() => setIsAdding(true)}
          variant="ghost"
          size="sm"
          className="btn-liquid text-primary hover:bg-primary/10"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Add new note */}
      {isAdding && (
        <div className="mb-4 slide-up-liquid">
          <Textarea
            placeholder="Jot down your thoughts..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className="mb-2 min-h-[80px] resize-none liquid-surface liquid-border"
            autoFocus
          />
          <div className="flex gap-2">
            <Button onClick={addNote} size="sm" className="btn-gradient-liquid">
              <Save className="h-3 w-3 mr-1" />
              Save
            </Button>
            <Button onClick={() => setIsAdding(false)} variant="ghost" size="sm" className="btn-liquid">
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
            className="liquid-surface liquid-border rounded-lg p-4 fade-in-liquid liquid-highlight widget-interactive transition-colors group"
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
                      className="h-6 w-6 p-0 btn-liquid"
                    >
                      <Edit3 className="h-3 w-3" />
                    </Button>
                    <Button
                      onClick={() => deleteNote(note.id)}
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 btn-liquid text-red-500 hover:text-red-600"
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