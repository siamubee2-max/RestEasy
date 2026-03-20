import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// ─── Auth helpers ───────────────────────────────────────────────────────────

export async function signInAnonymously() {
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return data;
}

export async function signUpWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// ─── Sleep entries ───────────────────────────────────────────────────────────

export interface SleepEntryInsert {
  entry_date: string;
  bedtime: string;
  sleep_onset_minutes: number;
  wake_count: number;
  waso_minutes: number;
  wake_time: string;
  out_of_bed_time: string;
  program_week: number;
}

export async function insertSleepEntry(entry: SleepEntryInsert) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('sleep_entries')
    .upsert({ ...entry, user_id: user.id }, { onConflict: 'user_id,entry_date' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getSleepEntries(week?: number) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  let query = supabase
    .from('sleep_entries')
    .select('*')
    .eq('user_id', user.id)
    .order('entry_date', { ascending: false });

  if (week !== undefined) {
    query = query.eq('program_week', week);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

// ─── Profile ─────────────────────────────────────────────────────────────────

export async function getProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) throw error;
  return data;
}

export async function updateProfile(updates: {
  display_name?: string;
  locale?: string;
  timezone?: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── Sleep window ─────────────────────────────────────────────────────────────

export async function getSleepWindow(week: number) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('sleep_windows')
    .select('*')
    .eq('user_id', user.id)
    .eq('program_week', week)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

// ─── Night mode sessions ──────────────────────────────────────────────────────

export async function logNightModeSession(action: 'breathing' | 'get_up' | 'relaxation' | 'dismissed') {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const now = new Date();
  const { error } = await supabase
    .from('night_mode_sessions')
    .insert({
      user_id: user.id,
      session_date: now.toISOString().split('T')[0],
      started_at: now.toISOString(),
      action_taken: action,
    });

  if (error) throw error;
}
