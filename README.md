# RestEasy — L'Application Anti-Insomnie (TCC-I)

> Programme cliniquement fondé sur la Thérapie Cognitive et Comportementale pour l'Insomnie

**Version 3.0** — React Native (Expo) · iOS & Android

---

## Vue d'ensemble

RestEasy est une application mobile complète basée sur la TCC-I (Thérapie Cognitive et Comportementale pour l'Insomnie), le traitement de première ligne recommandé par toutes les grandes sociétés de médecine du sommeil. Elle guide l'utilisateur à travers un programme structuré de 6 semaines pour retrouver un sommeil naturel et durable.

---

## Stack Technique

| Couche | Technologie |
|---|---|
| Framework | React Native + Expo SDK 51 |
| Navigation | React Navigation v6 (Stack + Bottom Tabs) |
| Backend | Supabase (PostgreSQL + Auth + Storage + Edge Functions) |
| Paiements | RevenueCat (iOS + Android) |
| Analytics | PostHog (events + feature flags + A/B tests) |
| Monitoring | Sentry (crashs + performance) |
| Stockage local | MMKV (offline-first) |
| Audio | ElevenLabs TTS via Supabase Edge Function |
| Santé | Apple HealthKit (iOS) + Health Connect (Android) |
| Tests | Jest + React Native Testing Library |
| Tests E2E | Maestro |
| CI/CD | GitHub Actions + EAS Build |
| i18n | i18next (FR, EN, ES, DE, PT) |
| Chiffrement | expo-secure-store + AES-256 (HIPAA-ready) |

---

## Fonctionnalités

### Programme TCC-I — 6 semaines
- **Restriction du sommeil** — Fenêtre de sommeil personnalisée ajustée chaque semaine selon l'efficacité
- **Contrôle des stimuli** — Reconditionnement de l'association lit/sommeil
- **Restructuration cognitive** — Identification et transformation des pensées négatives
- **6 modules thérapeutiques** débloqués progressivement, traduits en 5 langues

### Journal du matin
- Saisie rapide (< 60 secondes) : heure de coucher, latence, réveils, lever
- Calcul automatique de l'efficacité du sommeil (SE = TST/TIB × 100)
- Stockage local MMKV avec synchronisation Supabase offline-first

### Mode Nuit
- Animation de respiration guidée (cycle 4-2-6)
- **Audio guidé ElevenLabs** — voix de relaxation générée par IA, cachée dans Supabase Storage
- Protocole "Se lever" conforme à la TCC-I
- Exercice de relaxation musculaire progressive

### Bilan hebdomadaire
- Graphique d'efficacité du sommeil sur 7 jours
- Ajustement automatique de la fenêtre de sommeil
- Déverrouillage du module cognitif de la semaine suivante
- Score ISI hebdomadaire (Insomnia Severity Index)

### Questionnaire ISI
- 7 questions standardisées (score 0-28)
- Suivi de l'évolution clinique semaine par semaine
- Catégorisation : aucun / sous-seuil / modéré / sévère

### Streak & Gamification
- Compteur de jours consécutifs
- 9 badges débloquables
- Animations de célébration

### Mode Prescripteur
- Tableau de bord patients pour médecins et thérapeutes
- Suivi de l'efficacité et du score ISI par patient
- Accès via code prescripteur
- Contrôlé par feature flag PostHog

### Intégration Santé
- **Apple HealthKit** — import automatique des données de sommeil iOS
- **Health Connect** — import automatique des données de sommeil Android
- Pré-remplissage du journal à partir des données du capteur

---

## Structure du projet

```
resteasy-rn/
├── src/
│   ├── screens/
│   │   ├── WelcomeScreen.tsx        # Écran d'accueil
│   │   ├── OnboardingScreen.tsx     # Configuration initiale (3 étapes)
│   │   ├── HomeScreen.tsx           # Dashboard (anneau de progression)
│   │   ├── JournalScreen.tsx        # Journal du matin
│   │   ├── WeeklyReviewScreen.tsx   # Bilan hebdomadaire + graphiques
│   │   ├── NightModeScreen.tsx      # Mode nuit + respiration animée
│   │   ├── TherapyScreen.tsx        # 6 modules cognitifs TCC-I
│   │   ├── ISIScreen.tsx            # Questionnaire ISI (7 questions)
│   │   ├── ProgressScreen.tsx       # Graphiques 6 semaines
│   │   ├── PaywallScreen.tsx        # Paywall multilingue (A/B test)
│   │   ├── PrescriberScreen.tsx     # Mode prescripteur
│   │   └── ProfileScreen.tsx        # Profil + paramètres
│   ├── components/
│   │   ├── ProgressRing.tsx         # Anneau SVG animé
│   │   ├── PeachButton.tsx          # Bouton principal (Warm Peach)
│   │   ├── TimePickerCard.tsx       # Sélecteur d'heure
│   │   ├── StreakBadge.tsx          # Badge de streak
│   │   └── ErrorBoundary.tsx        # Gestion d'erreurs globale (Sentry)
│   ├── navigation/
│   │   └── TabNavigator.tsx         # Navigation principale
│   ├── hooks/
│   │   ├── useAuth.ts               # Authentification Supabase
│   │   ├── useSleepData.ts          # Données de sommeil
│   │   ├── useProgramState.ts       # État du programme TCC-I
│   │   ├── useAnalytics.ts          # Screen tracking PostHog
│   │   ├── useAudio.ts              # Lecture audio ElevenLabs
│   │   └── usePushToken.ts          # Notifications push
│   ├── lib/
│   │   ├── supabase.ts              # Client Supabase
│   │   ├── revenuecat.ts            # RevenueCat + A/B test + essai gratuit 7j
│   │   ├── posthog.ts               # Analytics + feature flags
│   │   ├── sentry.ts                # Monitoring erreurs
│   │   ├── audio.ts                 # ElevenLabs TTS
│   │   ├── notifications.ts         # Push notifications personnalisées
│   │   ├── streak.ts                # Système de streak et badges
│   │   ├── storage.ts               # MMKV offline-first
│   │   ├── sync.ts                  # Synchronisation Supabase
│   │   ├── encryption.ts            # Chiffrement HIPAA-ready
│   │   └── healthKit.ts             # Apple Health + Google Fit
│   ├── theme/
│   │   ├── colors.ts                # Palette RestEasy
│   │   └── typography.ts            # Système typographique
│   ├── i18n/locales/
│   │   ├── fr.json                  # Français (complet + modules)
│   │   ├── en.json                  # Anglais (complet + modules)
│   │   ├── es.json                  # Espagnol (complet + modules)
│   │   ├── de.json                  # Allemand (complet + modules)
│   │   └── pt.json                  # Portugais (complet + modules)
│   └── utils/
│       └── i18n.ts                  # Configuration i18next (5 langues)
├── supabase/
│   ├── migrations/                  # 7 migrations versionnées
│   │   ├── 20250101000000_initial_schema.sql
│   │   ├── 20250115000000_add_computed_sleep_columns.sql
│   │   ├── 20250201000000_add_cron_jobs.sql
│   │   ├── 20250301000000_add_isi_scores.sql
│   │   ├── 20250310000000_add_badges_streak.sql
│   │   └── 20250315000000_hipaa_audit_log.sql
│   ├── functions/
│   │   ├── weekly-review/           # Algorithme TCC-I automatique
│   │   ├── push-notification/       # Rappels multilingues
│   │   ├── generate-audio/          # Cache audio ElevenLabs
│   │   └── delete-account/          # Suppression RGPD
│   └── config.toml
├── .maestro/flows/                  # 4 tests E2E Maestro
│   ├── 01_onboarding.yaml
│   ├── 02_morning_journal.yaml
│   ├── 03_night_mode.yaml
│   └── 04_paywall.yaml
├── .github/workflows/               # 3 pipelines CI/CD
│   ├── ci.yml                       # TypeScript + ESLint + Jest
│   ├── cd-preview.yml               # Build APK + Maestro
│   └── cd-production.yml            # Build iOS + Android + Sentry
├── src/__tests__/                   # Tests unitaires Jest
│   ├── lib/sleepCalculations.test.ts
│   ├── lib/streak.test.ts
│   └── lib/storage.test.ts
└── .env.example
```

---

## Installation

### Prérequis
- Node.js 18+
- Expo CLI : `npm install -g expo-cli`
- EAS CLI : `npm install -g eas-cli`
- Supabase CLI : `brew install supabase/tap/supabase`
- Maestro : `curl -Ls "https://get.maestro.mobile.dev" | bash`

### 1. Installer les dépendances

```bash
cd resteasy-rn
npm install
```

### 2. Variables d'environnement

```bash
cp .env.example .env
```

Remplissez le fichier `.env` avec vos clés (voir `ENV_SETUP.md` et `.github/SECRETS.md`).

### 3. Base de données Supabase

```bash
# Appliquer toutes les migrations
supabase db push

# Déployer les Edge Functions
supabase functions deploy weekly-review
supabase functions deploy push-notification
supabase functions deploy generate-audio
supabase functions deploy delete-account
```

### 4. Lancer l'application

```bash
npx expo start --ios      # iOS
npx expo start --android  # Android
```

---

## Variables d'environnement

| Variable | Service | Description |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase | URL du projet |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase | Clé publique |
| `EXPO_PUBLIC_RC_IOS_KEY` | RevenueCat | Clé iOS |
| `EXPO_PUBLIC_RC_ANDROID_KEY` | RevenueCat | Clé Android |
| `EXPO_PUBLIC_POSTHOG_API_KEY` | PostHog | Clé API |
| `EXPO_PUBLIC_POSTHOG_HOST` | PostHog | Host EU (RGPD) |
| `ELEVENLABS_API_KEY` | ElevenLabs | Clé API (côté serveur) |
| `SENTRY_DSN` | Sentry | DSN du projet |
| `SENTRY_AUTH_TOKEN` | Sentry | Token pour source maps |

---

## Tests

```bash
npm test                    # Tests unitaires
npm run test:coverage       # Avec couverture
npm run maestro:onboarding  # Test E2E onboarding
npm run maestro:all         # Tous les tests E2E
```

---

## Algorithme TCC-I

### Calcul de l'efficacité du sommeil
```
TIB (Temps au Lit)          = heure_lever − heure_coucher
WASO (Éveils nocturnes)     = nb_réveils × 15 min
TST (Temps Total de Sommeil) = TIB − latence − WASO
SE (Sleep Efficiency)        = (TST / TIB) × 100
```

### Ajustement de la fenêtre de sommeil
| Efficacité | Ajustement |
|---|---|
| ≥ 90% | +15 min (coucher plus tôt) |
| 85–89% | Maintien |
| < 85% | −15 min (coucher plus tard, min. 5h) |

---

## Langues supportées

| Langue | Interface | Modules thérapeutiques | Notifications |
|---|---|---|---|
| 🇫🇷 Français | ✅ | ✅ | ✅ |
| 🇬🇧 Anglais | ✅ | ✅ | ✅ |
| 🇪🇸 Espagnol | ✅ | ✅ | ✅ |
| 🇩🇪 Allemand | ✅ | ✅ | ✅ |
| 🇧🇷 Portugais | ✅ | ✅ | ✅ |

---

## Palette de couleurs

| Couleur | Hex | Usage |
|---|---|---|
| Deep Navy | `#0B1D3A` | Fond principal |
| Navy Mid | `#2D3A6E` | Cards, containers |
| Soft Lavender | `#B8A9C9` | Anneaux, graphiques, texte secondaire |
| Warm Peach | `#F5C7A9` | CTAs, sliders actifs, highlights |
| Muted Sage | `#A8C5B8` | Indicateurs positifs, succès |
| Cream | `#F5F0E8` | Texte principal, titres |

---

## Conformité & Sécurité

- **RGPD** : Données hébergées en Europe (Supabase EU), droit à l'effacement via Edge Function
- **HIPAA-ready** : Chiffrement AES-256 côté client pour les données PHI, audit log 7 ans
- **Pas de trackers** : Aucun score de sommeil affiché, conformément à la philosophie TCC-I
- **Données minimales** : Seules les données nécessaires au programme sont collectées

---

## Licence

Propriétaire — Tous droits réservés © 2025 RestEasy
