import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

// Verify if URL is a valid HTTP/HTTPS URL
function isValidUrl(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseAnonKey && isValidUrl(supabaseUrl)
);

let realClient: SupabaseClient | null = null;

if (isSupabaseConfigured) {
  try {
    realClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  } catch (err) {
    console.warn('Failed to initialize Supabase client with provided credentials:', err);
  }
}

/**
 * Proxy-wrapped Supabase client.
 * If real credentials are provided in env (VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY),
 * it executes calls directly on Supabase.
 * If credentials are not yet configured, it logs a clear warning and returns a safe response,
 * preventing any crashes.
 */
export const supabase: SupabaseClient = new Proxy(
  (realClient || {}) as SupabaseClient,
  {
    get(target, prop: string | symbol) {
      if (realClient && prop in realClient) {
        const val = (realClient as any)[prop];
        return typeof val === 'function' ? val.bind(realClient) : val;
      }

      // Safe fallback when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not configured
      if (prop === 'from') {
        return (table: string) => ({
          insert: async (records: any | any[]) => {
            console.warn(
              `[Supabase] Note: supabase.from('${table}').insert(...) called. VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not yet configured in environment.`,
              records
            );
            return {
              data: Array.isArray(records) ? records : [records],
              error: null,
            };
          },
          select: (columns = '*') => {
            console.warn(
              `[Supabase] Note: supabase.from('${table}').select('${columns}') called without active Supabase credentials.`
            );
            const chainable: any = {
              order: () => chainable,
              eq: () => chainable,
              maybeSingle: async () => ({ data: null, error: null }),
              single: async () => ({ data: null, error: null }),
              then: (resolve: any) => resolve({ data: [], error: null }),
            };
            return chainable;
          },
          update: (values: any) => {
            console.warn(`[Supabase] Note: supabase.from('${table}').update() called:`, values);
            const chainable: any = {
              eq: () => chainable,
              then: (resolve: any) => resolve({ data: [values], error: null }),
            };
            return chainable;
          },
          delete: () => {
            console.warn(`[Supabase] Note: supabase.from('${table}').delete() called`);
            const chainable: any = {
              eq: () => chainable,
              then: (resolve: any) => resolve({ data: [], error: null }),
            };
            return chainable;
          },
        });
      }

      return (target as any)[prop];
    },
  }
);

export default supabase;
