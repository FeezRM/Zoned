import { useState } from "react";
import { Plus, Check, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  priority: "low" | "medium" | "high";
  tag?: string;
}

export const TodoWidget = () => {
  const [todos, setTodos] = useState<Todo[]>([
    { id: "1", text: "Review project roadmap", completed: false, priority: "high", tag: "work" },
    { id: "2", text: "Morning meditation", completed: true, priority: "medium", tag: "wellness" },
    { id: "3", text: "Prepare team presentation", completed: false, priority: "high", tag: "work" },
  ]);
  const [newTodo, setNewTodo] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const addTodo = () => {
    if (newTodo.trim()) {
      const todo: Todo = {
        id: Date.now().toString(),
        text: newTodo,
        completed: false,
        priority: "medium",
      };
      setTodos([todo, ...todos]);
      setNewTodo("");
      setIsAdding(false);
    }
  };

  const toggleTodo = (id: string) => {
    setTodos(todos.map(todo => 
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const deleteTodo = (id: string) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-500";
      case "medium": return "bg-yellow-500";
      case "low": return "bg-green-500";
      default: return "bg-muted";
    }
  };

  const completedCount = todos.filter(t => t.completed).length;
  const totalCount = todos.length;

  return (
    <div className="widget-card h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Today's Tasks</h3>
          <p className="text-sm text-muted-foreground">
            {completedCount} of {totalCount} completed
          </p>
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

      {/* Progress bar */}
      <div className="w-full bg-secondary rounded-full h-2 mb-6">
        <div 
          className="bg-gradient-to-r from-primary to-primary-glow h-2 rounded-full transition-all duration-500"
          style={{ width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : '0%' }}
        />
      </div>

      {/* Add new todo */}
      {isAdding && (
        <div className="flex gap-2 mb-4 slide-up">
          <Input
            placeholder="Add a new task..."
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addTodo()}
            className="flex-1"
            autoFocus
          />
          <Button onClick={addTodo} variant="ghost" size="sm">
            <Check className="h-4 w-4" />
          </Button>
          <Button onClick={() => setIsAdding(false)} variant="ghost" size="sm">
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Todo list */}
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {todos.map((todo, index) => (
          <div 
            key={todo.id}
            className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 fade-in ${
              todo.completed 
                ? 'bg-green-500/20 border-green-500/30' 
                : 'bg-accent/30 border-border hover:bg-accent/50'
            }`}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <button
              onClick={() => toggleTodo(todo.id)}
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                todo.completed
                  ? 'bg-green-500 border-green-500 text-white'
                  : 'border-gray-300 hover:border-primary'
              }`}
            >
              {todo.completed && <Check className="h-3 w-3" />}
            </button>
            
            <div className="flex-1">
              <p className={`text-sm ${todo.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                {todo.text}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`w-2 h-2 rounded-full ${getPriorityColor(todo.priority)}`} />
                {todo.tag && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    {todo.tag}
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => deleteTodo(todo.id)}
              className="p-1 text-gray-400 hover:text-red-500 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>

      {todos.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No tasks for today</p>
          <p className="text-xs">Click + to add your first task</p>
        </div>
      )}
    </div>
  );
};