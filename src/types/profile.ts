export interface Profile {
  id: string
  display_name?: string | null
  avatar_url?: string | null
  goals?: string[] | null
  focus_areas?: string[] | null
  preferences?: {
    productivity_style?: 'maker' | 'manager' | 'balanced'
    chronotype?: 'morning' | 'evening' | 'neutral'
    block_length_min?: number
    notifications?: boolean
    daily_reflection?: boolean
    timezone?: string
  preferred_city?: string
  weather_unit?: 'c' | 'f'
    burnout_risk?: number // 1-5
  } | null
  onboarding_completed?: boolean
  updated_at?: string
}
