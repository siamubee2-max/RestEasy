/**
 * RestEasy — useAnalytics
 * Wraps PostHog for easy use in screens.
 * Automatically tracks screen views when used with useEffect.
 */
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { Analytics } from '../lib/posthog';

/**
 * Track a screen view on mount.
 * Usage: useScreenTracking('HomeScreen')
 */
export function useScreenTracking(screenName: string) {
  useEffect(() => {
    Analytics.screenViewed(screenName);
  }, [screenName]);
}

/**
 * Track app foreground/background transitions.
 * Place once in App.tsx.
 */
export function useAppStateTracking() {
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    Analytics.appOpened('cold_start');

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        Analytics.appOpened('background');
      }
      if (nextState.match(/inactive|background/)) {
        Analytics.flush();
      }
      appState.current = nextState;
    });

    return () => subscription.remove();
  }, []);
}

/**
 * Measure time spent on a screen.
 * Returns elapsed seconds when called.
 */
export function useScreenTimer(): () => number {
  const startTime = useRef(Date.now());
  return () => Math.round((Date.now() - startTime.current) / 1000);
}
