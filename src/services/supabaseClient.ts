import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let clientInstance: SupabaseClient | null = null;

/**
 * Returns a configured Supabase client if valid credentials are present in the environment.
 * If credentials are not configured yet, returns null gracefully so the app can fallback to local BroadcastChannel/localStorage.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (clientInstance) return clientInstance;

  if (
    supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('placeholder') &&
    !supabaseAnonKey.includes('placeholder') &&
    supabaseUrl.startsWith('https://')
  ) {
    try {
      clientInstance = createClient(supabaseUrl, supabaseAnonKey, {
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
      });
      return clientInstance;
    } catch (err) {
      console.warn('[Supabase] Failed to initialize client:', err);
      return null;
    }
  }

  return null;
}

/**
 * Server-side service role client for privileged database operations (e.g., in webhooks)
 */
export function getSupabaseServiceClient(): SupabaseClient | null {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (
    supabaseUrl &&
    serviceKey &&
    !supabaseUrl.includes('placeholder') &&
    !serviceKey.includes('placeholder') &&
    supabaseUrl.startsWith('https://')
  ) {
    try {
      return createClient(supabaseUrl, serviceKey);
    } catch {
      return null;
    }
  }
  return null;
}
