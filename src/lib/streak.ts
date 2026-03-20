/**
 * RestEasy — Streak & Gamification System
 * Tracks consecutive journal entries and awards badges.
 *
 * Badges:
 * - first_entry: First journal entry
 * - streak_3: 3 consecutive days
 * - streak_7: 7 consecutive days (1 week)
 * - streak_14: 14 consecutive days (2 weeks)
 * - streak_21: 21 consecutive days (3 weeks)
 * - streak_42: 42 consecutive days (full program)
 * - efficiency_85: First night with SE ≥ 85%
 * - efficiency_90: First night with SE ≥ 90%
 * - week_complete: Complete a full week (7 entries)
 * - program_complete: Complete all 6 weeks
 * - night_owl: Used Night Mode 5 times
 * - early_bird: Woke up within 15 min of target 7 times
 */
import { supabase } from './supabase';
import { Analytics } from './posthog';

export type BadgeId =
  | 'first_entry'
  | 'streak_3' | 'streak_7' | 'streak_14' | 'streak_21' | 'streak_42'
  | 'efficiency_85' | 'efficiency_90'
  | 'week_complete' | 'program_complete'
  | 'night_owl' | 'early_bird';

export interface Badge {
  id: BadgeId;
  emoji: string;
  name_fr: string;
  name_en: string;
  description_fr: string;
  description_en: string;
  unlocked: boolean;
  unlocked_at?: string;
}

export const BADGE_DEFINITIONS: Record<BadgeId, Omit<Badge, 'unlocked' | 'unlocked_at'>> = {
  first_entry: {
    id: 'first_entry',
    emoji: '🌱',
    name_fr: 'Premier pas',
    name_en: 'First Step',
    description_fr: 'Première entrée dans le journal',
    description_en: 'First journal entry',
  },
  streak_3: {
    id: 'streak_3',
    emoji: '🔥',
    name_fr: '3 jours consécutifs',
    name_en: '3-Day Streak',
    description_fr: 'Journal rempli 3 jours de suite',
    description_en: 'Journal filled 3 days in a row',
  },
  streak_7: {
    id: 'streak_7',
    emoji: '⭐',
    name_fr: 'Une semaine !',
    name_en: 'One Week!',
    description_fr: 'Journal rempli 7 jours de suite',
    description_en: 'Journal filled 7 days in a row',
  },
  streak_14: {
    id: 'streak_14',
    emoji: '🌟',
    name_fr: 'Deux semaines',
    name_en: 'Two Weeks',
    description_fr: 'Journal rempli 14 jours de suite',
    description_en: 'Journal filled 14 days in a row',
  },
  streak_21: {
    id: 'streak_21',
    emoji: '💫',
    name_fr: 'Trois semaines',
    name_en: 'Three Weeks',
    description_fr: 'Journal rempli 21 jours de suite',
    description_en: 'Journal filled 21 days in a row',
  },
  streak_42: {
    id: 'streak_42',
    emoji: '🏆',
    name_fr: 'Programme complet',
    name_en: 'Full Program',
    description_fr: 'Journal rempli 42 jours de suite',
    description_en: 'Journal filled 42 days in a row',
  },
  efficiency_85: {
    id: 'efficiency_85',
    emoji: '😴',
    name_fr: 'Bonne nuit',
    name_en: 'Good Night',
    description_fr: 'Première nuit avec une efficacité ≥ 85%',
    description_en: 'First night with sleep efficiency ≥ 85%',
  },
  efficiency_90: {
    id: 'efficiency_90',
    emoji: '✨',
    name_fr: 'Excellent sommeil',
    name_en: 'Excellent Sleep',
    description_fr: 'Première nuit avec une efficacité ≥ 90%',
    description_en: 'First night with sleep efficiency ≥ 90%',
  },
  week_complete: {
    id: 'week_complete',
    emoji: '📅',
    name_fr: 'Semaine complète',
    name_en: 'Week Complete',
    description_fr: '7 entrées dans une semaine',
    description_en: '7 entries in one week',
  },
  program_complete: {
    id: 'program_complete',
    emoji: '🎓',
    name_fr: 'Diplômé TCC-I',
    name_en: 'CBT-I Graduate',
    description_fr: 'Programme de 6 semaines terminé',
    description_en: '6-week program completed',
  },
  night_owl: {
    id: 'night_owl',
    emoji: '🦉',
    name_fr: 'Hibou de nuit',
    name_en: 'Night Owl',
    description_fr: 'Mode Nuit utilisé 5 fois',
    description_en: 'Night Mode used 5 times',
  },
  early_bird: {
    id: 'early_bird',
    emoji: '🐦',
    name_fr: 'Lève-tôt',
    name_en: 'Early Bird',
    description_fr: 'Lever dans les 15 min de l\'objectif, 7 fois',
    description_en: 'Woke up within 15 min of target, 7 times',
  },
};

// ─── Streak Calculation ───────────────────────────────────────────────────────

export interface StreakData {
  current_streak: number;
  longest_streak: number;
  total_entries: number;
  last_entry_date: string | null;
}

export async function calculateStreak(userId: string): Promise<StreakData> {
  const { data: entries } = await supabase
    .from('sleep_entries')
    .select('entry_date')
    .eq('user_id', userId)
    .order('entry_date', { ascending: false });

  if (!entries || entries.length === 0) {
    return { current_streak: 0, longest_streak: 0, total_entries: 0, last_entry_date: null };
  }

  const dates = entries.map(e => e.entry_date).sort().reverse();
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 1;

  // Check if streak is still active (last entry today or yesterday)
  const isActive = dates[0] === today || dates[0] === yesterday;

  if (isActive) {
    currentStreak = 1;
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1]);
      const curr = new Date(dates[i]);
      const diff = (prev.getTime() - curr.getTime()) / 86400000;
      if (diff === 1) {
        currentStreak++;
        tempStreak++;
      } else {
        break;
      }
    }
  }

  // Calculate longest streak
  tempStreak = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const diff = (prev.getTime() - curr.getTime()) / 86400000;
    if (diff === 1) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, currentStreak, 1);

  return {
    current_streak: currentStreak,
    longest_streak: longestStreak,
    total_entries: entries.length,
    last_entry_date: dates[0],
  };
}

// ─── Badge Evaluation ─────────────────────────────────────────────────────────

export async function evaluateAndAwardBadges(userId: string): Promise<BadgeId[]> {
  const newBadges: BadgeId[] = [];

  // Get current badges
  const { data: existingBadges } = await supabase
    .from('user_badges')
    .select('badge_id')
    .eq('user_id', userId);

  const earned = new Set((existingBadges ?? []).map(b => b.badge_id));

  // Get stats
  const [streakData, entries, nightSessions] = await Promise.all([
    calculateStreak(userId),
    supabase.from('sleep_entries').select('sleep_efficiency, entry_date, program_week').eq('user_id', userId),
    supabase.from('night_mode_sessions').select('id').eq('user_id', userId),
  ]);

  const allEntries = entries.data ?? [];
  const nightCount = (nightSessions.data ?? []).length;

  // Evaluate each badge
  const checks: Array<{ id: BadgeId; condition: boolean }> = [
    { id: 'first_entry', condition: streakData.total_entries >= 1 },
    { id: 'streak_3', condition: streakData.current_streak >= 3 },
    { id: 'streak_7', condition: streakData.current_streak >= 7 },
    { id: 'streak_14', condition: streakData.current_streak >= 14 },
    { id: 'streak_21', condition: streakData.current_streak >= 21 },
    { id: 'streak_42', condition: streakData.current_streak >= 42 },
    { id: 'efficiency_85', condition: allEntries.some(e => e.sleep_efficiency >= 85) },
    { id: 'efficiency_90', condition: allEntries.some(e => e.sleep_efficiency >= 90) },
    { id: 'night_owl', condition: nightCount >= 5 },
    {
      id: 'week_complete',
      condition: (() => {
        const byWeek: Record<number, number> = {};
        allEntries.forEach(e => {
          byWeek[e.program_week] = (byWeek[e.program_week] ?? 0) + 1;
        });
        return Object.values(byWeek).some(c => c >= 7);
      })(),
    },
  ];

  for (const check of checks) {
    if (check.condition && !earned.has(check.id)) {
      newBadges.push(check.id);
    }
  }

  // Award new badges
  if (newBadges.length > 0) {
    await supabase.from('user_badges').insert(
      newBadges.map(id => ({
        user_id: userId,
        badge_id: id,
        unlocked_at: new Date().toISOString(),
      }))
    );

    for (const badge of newBadges) {
      Analytics.track('badge_unlocked', { badge_id: badge });
    }
  }

  return newBadges;
}

// ─── Get User Badges ──────────────────────────────────────────────────────────

export async function getUserBadges(userId: string): Promise<Badge[]> {
  const { data } = await supabase
    .from('user_badges')
    .select('badge_id, unlocked_at')
    .eq('user_id', userId);

  const unlockedMap = new Map((data ?? []).map(b => [b.badge_id, b.unlocked_at]));

  return Object.values(BADGE_DEFINITIONS).map(def => ({
    ...def,
    unlocked: unlockedMap.has(def.id),
    unlocked_at: unlockedMap.get(def.id),
  }));
}
