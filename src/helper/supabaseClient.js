import { createClient } from '@supabase/supabase-js'

// Use Vite env variables (VITE_ prefix). Replace these in your .env file.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
	console.warn('Missing Supabase environment variables (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)')
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default supabase