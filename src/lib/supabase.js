import { createClient } from '@supabase/supabase-js'

// These are the public project URL and publishable key.
// They are safe for browser use. Never put a service-role key here.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ocnqjlchjwutwkdbywke.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_Ex43daRZNY3pewA4DKuunA_VUfAwtHU'

export const supabase = createClient(supabaseUrl, supabaseKey)