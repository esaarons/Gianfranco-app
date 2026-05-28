import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Server-side client uses service role key — bypasses RLS, never exposed to browser
export async function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
