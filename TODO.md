# RestEasy v3 — Todo

## Phase 1 — Audio guidé ElevenLabs
- [ ] src/lib/audio.ts — client ElevenLabs TTS
- [ ] src/hooks/useAudio.ts — hook lecture audio
- [ ] src/screens/NightModeScreen.tsx — intégrer audio respiration
- [ ] src/screens/TherapyScreen.tsx — audio par module
- [ ] supabase/functions/generate-audio/index.ts — Edge Function TTS cache

## Phase 2 — ISI + Graphiques
- [ ] src/screens/ISIScreen.tsx — questionnaire 7 questions
- [ ] src/screens/ProgressScreen.tsx — graphiques 6 semaines
- [ ] src/components/SleepChart.tsx — courbe de tendance
- [ ] supabase/migrations/20250301_add_isi_scores.sql

## Phase 3 — Notifications personnalisées
- [ ] src/lib/notifications.ts — Expo Notifications
- [ ] src/hooks/usePushToken.ts
- [ ] supabase/functions/push-notification/index.ts — par heure utilisateur

## Phase 4 — Streak & Gamification
- [ ] src/lib/streak.ts — calcul streak
- [ ] src/components/StreakBadge.tsx
- [ ] src/screens/HomeScreen.tsx — afficher streak

## Phase 5 — A/B Test Paywall
- [ ] src/screens/PaywallScreen.tsx — variante B (prix 39,99€)
- [ ] src/lib/revenuecat.ts — RevenueCat Experiments
- [ ] Essai gratuit 7 jours

## Phase 6 — Offline-first
- [ ] src/lib/storage.ts — MMKV local storage
- [ ] src/hooks/useSleepData.ts — offline queue
- [ ] src/lib/sync.ts — synchronisation Supabase

## Phase 7 — Chiffrement
- [ ] src/lib/crypto.ts — chiffrement AES-256
- [ ] src/lib/supabase.ts — données chiffrées avant envoi

## Phase 8 — Tests unitaires
- [ ] jest.config.js
- [ ] src/__tests__/useSleepData.test.ts
- [ ] src/__tests__/useProgramState.test.ts
- [ ] src/__tests__/crypto.test.ts

## Phase 9 — Feature flags + Prescripteur
- [ ] src/lib/featureFlags.ts — PostHog feature flags
- [ ] src/screens/PrescripteurScreen.tsx
- [ ] src/navigation/TabNavigator.tsx — mode prescripteur

## Phase 10 — Apple Health / Google Fit
- [ ] src/lib/healthKit.ts — iOS HealthKit
- [ ] src/lib/googleFit.ts — Android Google Fit
- [ ] src/hooks/useHealthData.ts

## Phase 11 — Traductions complètes
- [ ] src/i18n/locales/es.json — modules thérapeutiques ES
- [ ] src/i18n/locales/de.json — modules thérapeutiques DE
- [ ] src/i18n/locales/pt.json — modules thérapeutiques PT
- [ ] src/i18n/locales/it.json — modules thérapeutiques IT
