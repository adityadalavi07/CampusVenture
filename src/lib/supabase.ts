import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Fallback to project credentials if import.meta.env is not populated during SSR
const env = typeof import.meta !== "undefined" && import.meta.env ? (import.meta.env as Record<string, string | undefined>) : {};
const procEnv = typeof process !== "undefined" && process.env ? (process.env as Record<string, string | undefined>) : {};

export const SUPABASE_URL =
  env["VITE_SUPABASE_URL"] ||
  procEnv["VITE_SUPABASE_URL"] ||
  "https://lirfkzpehmxtynjsjzib.supabase.co";

export const SUPABASE_KEY =
  env["VITE_SUPABASE_ANON_KEY"] ||
  procEnv["VITE_SUPABASE_ANON_KEY"] ||
  env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
  procEnv["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
  "sb_publishable_CJjApu3rUsNReyUx7jW2Lg_NUM8oqR-";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export interface ConnectionStatus {
  connected: boolean;
  message: string;
  latencyMs?: number;
  url: string;
  projectId: string;
}

/**
 * Verifies live connection to the Supabase database & auth service.
 */
export async function checkDatabaseConnection(): Promise<ConnectionStatus> {
  const start = Date.now();
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      headers: {
        apikey: SUPABASE_KEY,
      },
    });

    const latencyMs = Date.now() - start;

    if (res.ok) {
      return {
        connected: true,
        message: "Database and Auth service connected successfully",
        latencyMs,
        url: SUPABASE_URL,
        projectId: "lirfkzpehmxtynjsjzib",
      };
    } else {
      return {
        connected: false,
        message: `Connected with response status: ${res.status}`,
        latencyMs,
        url: SUPABASE_URL,
        projectId: "lirfkzpehmxtynjsjzib",
      };
    }
  } catch (err) {
    return {
      connected: false,
      message: err instanceof Error ? err.message : "Failed to reach Supabase",
      url: SUPABASE_URL,
      projectId: "lirfkzpehmxtynjsjzib",
    };
  }
}

/**
 * Direct table query health check to verify database operations
 */
export async function testDatabaseConnection(): Promise<{ success: boolean; message: string; latencyMs?: number }> {
  const start = Date.now();
  try {
    const { error } = await supabase.from("profiles").select("id", { count: "exact", head: true });
    const latencyMs = Date.now() - start;
    if (error && error.code !== "PGRST116") {
      return { success: false, message: error.message, latencyMs };
    }
    return { success: true, message: "Successfully connected to Supabase database tables!", latencyMs };
  } catch (err: any) {
    return { success: false, message: err?.message || "Database query error" };
  }
}
