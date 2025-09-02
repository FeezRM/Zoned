export type Recurring = 'none' | 'daily' | 'weekly' | 'monthly'
export type Priority = 'low' | 'medium' | 'high'

export interface Subtask {
  id: string
  text: string
  completed: boolean
}

export interface DbTodo {
  id: string
  user_id: string
  text: string
  completed: boolean
  priority: Priority
  tags: string[]
  subtasks: Subtask[]
  deadline: string | null // ISO
  recurring: Recurring
  order_index?: number
  created_at: string // ISO
  updated_at?: string // ISO
}

export interface DbHabit {
  id: string
  user_id: string
  name: string
  icon: string
  streak: number
  completed: boolean
  order_index?: number
  created_at: string
  updated_at?: string
}

export interface DbHabitEntry {
  id: string
  user_id: string
  habit_id: string
  for_date: string // YYYY-MM-DD
  completed_at: string // ISO
}

export interface DbNote {
  id: string
  user_id: string
  content: string
  created_at: string
  updated_at?: string
}

export interface DbDailyFocus {
  id: string
  user_id: string
  for_date: string // YYYY-MM-DD
  text: string
  progress?: number // 0-100
  completed?: boolean
  created_at: string
  updated_at?: string
}

export interface DbMoodEntry {
  id: string
  user_id: string
  value: number // 1-5
  label: string
  emoji: string
  created_at: string
}

// Calendar Events (MVP: single calendar, no recurrence)
export interface DbEvent {
  id: string
  user_id: string
  title: string
  description: string
  start_iso: string // ISO datetime
  end_iso: string   // ISO datetime
  all_day: boolean
  reminder_minutes: number | null // minutes before start to notify
  created_at: string
  updated_at?: string
}
