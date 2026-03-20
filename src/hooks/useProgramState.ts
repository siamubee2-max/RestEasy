/**
 * RestEasy — useProgramState
 * Manages the user's current week, sleep window, and module progress.
 * Reads from Supabase profile + sleep_windows tables.
 * Exposes helpers to advance the week after a successful weekly review.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface ProgramState {
  currentWeek: number;
  programStartedAt: string | null;
  sleepWindowStart: string;   // "23:30"
  sleepWindowEnd: string;     // "06:00"
  completedModules: string[];
  isPremium: boolean;
}

const DEFAULT_STATE: ProgramState = {
  currentWeek: 1,
  programStartedAt: null,
  sleepWindowStart: '23:30',
  sleepWindowEnd: '06:00',
  completedModules: [],
  isPremium: false,
};

export function useProgramState() {
  const [state, setState] = useState<ProgramState>(DEFAULT_STATE);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('program_week, program_started_at, is_premium')
        .eq('id', user.id)
        .single();

      const week = profile?.program_week ?? 1;

      // Load sleep window for current week
      const { data: window } = await supabase
        .from('sleep_windows')
        .select('prescribed_bedtime, prescribed_wake_time')
        .eq('user_id', user.id)
        .eq('program_week', week)
        .single();

      // Load completed modules
      const { data: modules } = await supabase
        .from('module_progress')
        .select('module_id')
        .eq('user_id', user.id)
        .eq('status', 'completed');

      setState({
        currentWeek: week,
        programStartedAt: profile?.program_started_at ?? null,
        sleepWindowStart: window?.prescribed_bedtime?.slice(0, 5) ?? '23:30',
        sleepWindowEnd: window?.prescribed_wake_time?.slice(0, 5) ?? '06:00',
        completedModules: modules?.map(m => m.module_id) ?? [],
        isPremium: profile?.is_premium ?? false,
      });
    } catch (e) {
      console.error('useProgramState load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /**
   * Advance to the next week after a successful weekly review.
   * Also updates the sleep window based on average efficiency.
   */
  const advanceWeek = useCallback(async (avgEfficiency: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const nextWeek = Math.min(state.currentWeek + 1, 6);

    // Update profile week
    await supabase
      .from('profiles')
      .update({ program_week: nextWeek })
      .eq('id', user.id);

    // Compute new sleep window based on efficiency
    // TCC-I rule: if efficiency >= 85%, extend window by 15 min
    //             if efficiency < 80%, reduce window by 15 min
    //             otherwise keep the same
    const [startH, startM] = state.sleepWindowStart.split(':').map(Number);
    const [endH, endM] = state.sleepWindowEnd.split(':').map(Number);

    let newBedtimeMinutes = startH * 60 + startM;
    let newWakeMinutes = endH * 60 + endM;

    if (avgEfficiency >= 85) {
      // Extend: delay bedtime by 15 min (or advance wake time)
      newBedtimeMinutes = (newBedtimeMinutes - 15 + 1440) % 1440;
    } else if (avgEfficiency < 80) {
      // Restrict: advance bedtime by 15 min
      newBedtimeMinutes = (newBedtimeMinutes + 15) % 1440;
    }

    const formatTime = (minutes: number) => {
      const h = Math.floor(minutes / 60) % 24;
      const m = minutes % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    // Create new sleep window for next week
    await supabase
      .from('sleep_windows')
      .upsert({
        user_id: user.id,
        program_week: nextWeek,
        prescribed_bedtime: formatTime(newBedtimeMinutes),
        prescribed_wake_time: formatTime(newWakeMinutes),
        avg_sleep_efficiency: avgEfficiency,
      }, { onConflict: 'user_id,program_week' });

    await load();
  }, [state, load]);

  /**
   * Mark a cognitive module as completed.
   */
  const completeModule = useCallback(async (moduleId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('module_progress')
      .upsert({
        user_id: user.id,
        module_id: moduleId,
        status: 'completed',
        completed_at: new Date().toISOString(),
      }, { onConflict: 'user_id,module_id' });

    setState(prev => ({
      ...prev,
      completedModules: [...prev.completedModules, moduleId],
    }));
  }, []);

  return { ...state, loading, advanceWeek, completeModule, refresh: load };
}
