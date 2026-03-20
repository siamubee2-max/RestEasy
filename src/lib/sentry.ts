/**
 * RestEasy — Sentry Error Monitoring
 * Captures crashes, ANRs, JS errors and slow renders.
 * Integrates with GitHub for automatic issue linking.
 *
 * Setup:
 *   1. Create project on https://sentry.io
 *   2. Add EXPO_PUBLIC_SENTRY_DSN to your .env
 *   3. Add SENTRY_AUTH_TOKEN to your .env (for source maps upload)
 *   4. Run: npx @sentry/wizard@latest -i reactNative
 */
import * as Sentry from '@sentry/react-native';

export function initSentry() {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    console.warn('[Sentry] DSN not configured — skipping init');
    return;
  }

  Sentry.init({
    dsn,
    environment: __DEV__ ? 'development' : 'production',
    release: 'com.resteasy.app@1.0.0',
    dist: '1',

    // Performance monitoring
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,

    // Session replay (React Native)
    replaysSessionSampleRate: 0.05,
    replaysOnErrorSampleRate: 1.0,

    // Integrations
    integrations: [
      Sentry.mobileReplayIntegration(),
      Sentry.reactNativeTracingIntegration(),
    ],

    // Filter out known non-critical errors
    beforeSend(event) {
      // Don't send network errors in dev
      if (__DEV__ && event.exception?.values?.[0]?.type === 'NetworkError') {
        return null;
      }
      return event;
    },

    // Strip PII from breadcrumbs
    beforeBreadcrumb(breadcrumb) {
      // Remove any URL query params that might contain tokens
      if (breadcrumb.data?.url) {
        try {
          const url = new URL(breadcrumb.data.url);
          url.search = '';
          breadcrumb.data.url = url.toString();
        } catch {}
      }
      return breadcrumb;
    },
  });
}

// ─── User context ─────────────────────────────────────────────────────────────

export function setSentryUser(userId: string) {
  Sentry.setUser({ id: userId });
}

export function clearSentryUser() {
  Sentry.setUser(null);
}

// ─── Custom context ───────────────────────────────────────────────────────────

export function setSentryContext(programWeek: number, isPremium: boolean) {
  Sentry.setContext('program', {
    week: programWeek,
    is_premium: isPremium,
  });
}

// ─── Manual error capture ─────────────────────────────────────────────────────

export function captureError(error: Error, context?: Record<string, unknown>) {
  Sentry.withScope((scope) => {
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }
    Sentry.captureException(error);
  });
}

export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  Sentry.captureMessage(message, level);
}

// ─── Performance transactions ─────────────────────────────────────────────────

export function startTransaction(name: string, op: string) {
  return Sentry.startInactiveSpan({ name, op });
}

// ─── Error Boundary ───────────────────────────────────────────────────────────

export const SentryErrorBoundary = Sentry.ErrorBoundary;

// ─── HOC for screen performance tracking ─────────────────────────────────────

export const withSentryProfiler = Sentry.withProfiler;
