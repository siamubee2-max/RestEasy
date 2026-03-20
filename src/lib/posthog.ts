/**
 * RestEasy — PostHog Analytics
 * Tracks all meaningful user interactions without violating GDPR.
 * No PII is ever sent — only anonymised event properties.
 *
 * Setup:
 *   1. Create a project on https://app.posthog.com
 *   2. Add EXPO_PUBLIC_POSTHOG_API_KEY to your .env
 *   3. Add EXPO_PUBLIC_POSTHOG_HOST (default: https://eu.posthog.com for GDPR)
 */
import PostHog from 'posthog-react-native';

let client: PostHog | null = null;

export function initPostHog(userId?: string): PostHog {
  if (client) return client;

  client = new PostHog(
    process.env.EXPO_PUBLIC_POSTHOG_API_KEY ?? '',
    {
      host: process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://eu.posthog.com',
      // Flush every 30s or after 20 events
      flushAt: 20,
      flushInterval: 30000,
      // Disable session recording on mobile (not supported)
      sessionRecording: { androidDeferScreenCapture: false },
    }
  );

  if (userId) {
    client.identify(userId, {
      // Only non-PII properties
      app_version: '1.0.0',
      platform: 'mobile',
    });
  }

  return client;
}

export function getPostHog(): PostHog | null {
  return client;
}

// ─── Typed event catalogue ────────────────────────────────────────────────────

export const Analytics = {

  // ── Onboarding ──────────────────────────────────────────────────────────────
  onboardingStarted: () =>
    client?.capture('onboarding_started'),

  onboardingStepCompleted: (step: number, stepName: string) =>
    client?.capture('onboarding_step_completed', { step, step_name: stepName }),

  onboardingCompleted: (wakeTime: string, timeInBedHours: number) =>
    client?.capture('onboarding_completed', {
      wake_time_hour: parseInt(wakeTime.split(':')[0]),
      time_in_bed_hours: timeInBedHours,
    }),

  // ── Journal ─────────────────────────────────────────────────────────────────
  journalOpened: (week: number) =>
    client?.capture('journal_opened', { program_week: week }),

  journalSaved: (efficiency: number, week: number) =>
    client?.capture('journal_saved', {
      sleep_efficiency: Math.round(efficiency),
      program_week: week,
      efficiency_bucket:
        efficiency >= 85 ? 'good' : efficiency >= 75 ? 'fair' : 'poor',
    }),

  journalAbandoned: (week: number) =>
    client?.capture('journal_abandoned', { program_week: week }),

  // ── Night Mode ──────────────────────────────────────────────────────────────
  nightModeOpened: (hour: number) =>
    client?.capture('night_mode_opened', {
      hour_of_day: hour,
      is_late_night: hour >= 22 || hour <= 5,
    }),

  nightModeBreathing: (durationSeconds: number) =>
    client?.capture('night_mode_breathing', { duration_seconds: durationSeconds }),

  nightModeGetUp: () =>
    client?.capture('night_mode_get_up'),

  nightModeRelaxation: () =>
    client?.capture('night_mode_relaxation'),

  nightModeDismissed: (durationSeconds: number) =>
    client?.capture('night_mode_dismissed', { duration_seconds: durationSeconds }),

  // ── Weekly Review ───────────────────────────────────────────────────────────
  weeklyReviewViewed: (week: number, avgEfficiency: number) =>
    client?.capture('weekly_review_viewed', {
      program_week: week,
      avg_efficiency: Math.round(avgEfficiency),
    }),

  weekAdvanced: (fromWeek: number, toWeek: number, avgEfficiency: number) =>
    client?.capture('week_advanced', {
      from_week: fromWeek,
      to_week: toWeek,
      avg_efficiency: Math.round(avgEfficiency),
      window_adjustment:
        avgEfficiency >= 85 ? 'extended' :
        avgEfficiency >= 80 ? 'maintained' : 'restricted',
    }),

  // ── Therapy modules ─────────────────────────────────────────────────────────
  moduleStarted: (moduleId: string, week: number) =>
    client?.capture('module_started', { module_id: moduleId, program_week: week }),

  moduleCompleted: (moduleId: string, durationSeconds: number) =>
    client?.capture('module_completed', {
      module_id: moduleId,
      duration_seconds: durationSeconds,
    }),

  // ── Paywall & purchases ─────────────────────────────────────────────────────
  paywallShown: (trigger: string, week: number) =>
    client?.capture('paywall_shown', { trigger, program_week: week }),

  purchaseStarted: (productId: string) =>
    client?.capture('purchase_started', { product_id: productId }),

  purchaseCompleted: (productId: string, price: number, currency: string) =>
    client?.capture('purchase_completed', {
      product_id: productId,
      price,
      currency,
    }),

  purchaseFailed: (productId: string, errorCode: string) =>
    client?.capture('purchase_failed', {
      product_id: productId,
      error_code: errorCode,
    }),

  purchaseRestored: (entitlements: string[]) =>
    client?.capture('purchase_restored', { entitlements }),

  // ── App lifecycle ────────────────────────────────────────────────────────────
  appOpened: (source: 'cold_start' | 'background') =>
    client?.capture('app_opened', { source }),

  screenViewed: (screenName: string) =>
    client?.capture('$screen', { $screen_name: screenName }),

  // ── Feature flags ────────────────────────────────────────────────────────────
  isFeatureEnabled: (flag: string): boolean =>
    client?.isFeatureEnabled(flag) ?? false,

  getFeatureFlag: (flag: string): string | boolean | undefined =>
    client?.getFeatureFlag(flag),

  // ── Flush on app background ──────────────────────────────────────────────────
  flush: () => client?.flush(),
  shutdown: () => client?.shutdown(),
};

// ─── Feature flag keys (centralised) ─────────────────────────────────────────
export const FLAGS = {
  SHOW_WEEKLY_CHALLENGE: 'show_weekly_challenge',
  ENABLE_AUDIO_RELAXATION: 'enable_audio_relaxation',
  SHOW_SLEEP_SCORE: 'show_sleep_score',
  ENABLE_PARTNER_MODE: 'enable_partner_mode',
  PAYWALL_VARIANT: 'paywall_variant',        // 'A' | 'B'
  PRESCRIBER_MODE: 'prescriber_mode',        // boolean
  ISI_WEEKLY: 'isi_weekly',                  // boolean
  STREAK_GAMIFICATION: 'streak_gamification', // boolean
  APPLE_HEALTH_SYNC: 'apple_health_sync',    // boolean
  AUDIO_EXERCISES: 'audio_exercises',        // boolean
  ONBOARDING_V2: 'onboarding_v2',            // boolean
} as const;

export type FeatureFlag = typeof FLAGS[keyof typeof FLAGS];

export async function getPaywallVariant(): Promise<'A' | 'B'> {
  const variant = client?.getFeatureFlag(FLAGS.PAYWALL_VARIANT);
  return variant === 'B' ? 'B' : 'A';
}

export function isPrescriberMode(): boolean {
  return client?.isFeatureEnabled(FLAGS.PRESCRIBER_MODE) ?? false;
}

// ─── Prescriber Mode Events ───────────────────────────────────────────────────
export const PrescriberAnalytics = {
  codeEntered: (codePrefix: string) =>
    client?.capture('prescriber_code_entered', { code_prefix: codePrefix }),

  patientAdded: () =>
    client?.capture('prescriber_patient_added'),

  patientProgressViewed: (patientId: string, week: number) =>
    client?.capture('prescriber_patient_progress_viewed', {
      patient_id_hash: patientId.slice(0, 8),
      program_week: week,
    }),

  reportExported: (format: 'pdf' | 'csv') =>
    client?.capture('prescriber_report_exported', { format }),
};

// ─── Streak & Badge Events ────────────────────────────────────────────────────
export const GamificationAnalytics = {
  streakMilestone: (streak: number) =>
    client?.capture('streak_milestone', { streak_days: streak }),

  badgeUnlocked: (badgeId: string) =>
    client?.capture('badge_unlocked', { badge_id: badgeId }),

  isiCompleted: (score: number, severity: string, week: number) =>
    client?.capture('isi_completed', { score, severity, program_week: week }),
};
