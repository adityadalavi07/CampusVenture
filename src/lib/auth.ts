import { supabase } from "./supabase";
import type { Profile, UserRole } from "@/types/database";

/**
 * Returns the currently authenticated Supabase user
 */
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

/**
 * Fetches the user profile from the profiles table
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("Error fetching profile from Supabase:", error.message);
    return null;
  }
  return data as Profile;
}

/**
 * Signs up a new user with metadata and saves to Supabase Auth
 */
export async function signUpUser(
  email: string,
  password: string,
  name: string,
  role: UserRole,
  org?: string
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        role,
        org: org || "",
      },
    },
  });

  if (error) throw error;

  // Attempt to insert/upsert into public.profiles
  if (data.user) {
    await (supabase as any).from("profiles").upsert({
      id: data.user.id,
      email: data.user.email || email,
      name,
      role,
      org: org || null,
      updated_at: new Date().toISOString(),
    });
  }

  return data;
}

/**
 * Signs in a user with email and password
 */
export async function signInUser(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

/**
 * Signs out the current user session
 */
export async function signOutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Helper to check role authorization
 */
export function hasRole(profile: Profile | null, allowedRoles: UserRole[]): boolean {
  if (!profile) return false;
  return allowedRoles.includes(profile.role);
}

/**
 * Subscribes to auth state changes
 */
export function onAuthStateChange(callback: (event: string, session: any) => void) {
  return supabase.auth.onAuthStateChange(callback);
}
