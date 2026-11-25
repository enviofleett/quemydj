import { createClient, SupabaseClient } from '@supabase/supabase-js';

let cachedAnonClientKey: string | null = null;
let cachedAnonClient: SupabaseClient | null = null;

let cachedServiceClientKey: string | null = null;
let cachedServiceClient: SupabaseClient | null = null;

const PLACEHOLDER_MARKERS = ['placeholder', 'your-project-id', 'your_project_id', 'example.supabase.co'];

export function isValidSupabaseCredential(value: string | undefined): value is string {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  return !PLACEHOLDER_MARKERS.some((marker) => lower.includes(marker));
}

export function isValidSupabaseUrl(url: string | undefined): url is string {
  if (!isValidSupabaseCredential(url)) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

export function isSupabaseConfigured(): boolean {
  return (
    isValidSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    isValidSupabaseCredential(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}

export function isSupabaseServiceConfigured(): boolean {
  return (
    isValidSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    isValidSupabaseCredential(process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

export function getSupabaseConfigStatus() {
  const configured = isSupabaseConfigured();
  const serviceRoleConfigured = isSupabaseServiceConfigured();
  return {
    configured,
    serviceRoleConfigured,
    mode: configured || serviceRoleConfigured ? ('supabase' as const) : ('local_fallback' as const),
  };
}

/**
 * Returns a configured Supabase client if valid credentials are present in the environment.
 * If credentials are not configured yet, returns null gracefully so the app can fallback to local BroadcastChannel/localStorage.
 */
export function getSupabaseClient(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!isValidSupabaseUrl(supabaseUrl) || !isValidSupabaseCredential(supabaseAnonKey)) {
    return null;
  }

  const cacheKey = `${supabaseUrl}::${supabaseAnonKey}`;
  if (cachedAnonClient && cachedAnonClientKey === cacheKey) {
    return cachedAnonClient;
  }

  try {
    cachedAnonClient = createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
    cachedAnonClientKey = cacheKey;
    return cachedAnonClient;
  } catch (err) {
    console.warn('[Supabase] Failed to initialize client:', err);
    return null;
  }
}

/**
 * Server-side service role client for privileged database operations (e.g., webhooks, settlement, arbitration).
 * Returns null gracefully when Supabase credentials are absent or invalid.
 */
export function getSupabaseServiceClient(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!isValidSupabaseUrl(supabaseUrl) || !isValidSupabaseCredential(serviceKey)) {
    return null;
  }

  const cacheKey = `${supabaseUrl}::${serviceKey}`;
  if (cachedServiceClient && cachedServiceClientKey === cacheKey) {
    return cachedServiceClient;
  }

  try {
    cachedServiceClient = createClient(supabaseUrl, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    cachedServiceClientKey = cacheKey;
    return cachedServiceClient;
  } catch (err) {
    console.warn('[Supabase] Failed to initialize service client:', err);
    return null;
  }
}
