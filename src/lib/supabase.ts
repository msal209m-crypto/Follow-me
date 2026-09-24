import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Resolve configured Supabase URL & Key from environment or active project credentials
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || 'https://vwpnpgticeehgypfmwnw.supabase.co').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_1dW3yCQhJnbLoBvMt5GghQ_UapielpI').trim();

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export default supabase;
