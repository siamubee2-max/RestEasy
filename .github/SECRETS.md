# GitHub Actions — Secrets requis

Configurez ces secrets dans **Settings → Secrets and variables → Actions** de votre dépôt GitHub.

## Expo / EAS

| Secret | Description | Où le trouver |
|---|---|---|
| `EXPO_TOKEN` | Token d'accès EAS | [expo.dev/settings/access-tokens](https://expo.dev/settings/access-tokens) |

## Supabase (Production)

| Secret | Description |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | URL de votre projet Supabase production |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Clé anonyme Supabase production |

## Supabase (Staging)

| Secret | Description |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL_STAGING` | URL de votre projet Supabase staging |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY_STAGING` | Clé anonyme Supabase staging |

## RevenueCat

| Secret | Description | Où le trouver |
|---|---|---|
| `EXPO_PUBLIC_RC_API_KEY_IOS` | Clé API iOS RevenueCat | app.revenuecat.com → Project → API Keys |
| `EXPO_PUBLIC_RC_API_KEY_ANDROID` | Clé API Android RevenueCat | app.revenuecat.com → Project → API Keys |

## PostHog

| Secret | Description | Où le trouver |
|---|---|---|
| `EXPO_PUBLIC_POSTHOG_API_KEY` | Clé API PostHog | app.posthog.com → Project Settings → API Keys |
| `EXPO_PUBLIC_POSTHOG_HOST` | Host PostHog (ex: `https://eu.posthog.com`) | Votre région PostHog |

## Sentry

| Secret | Description | Où le trouver |
|---|---|---|
| `EXPO_PUBLIC_SENTRY_DSN` | DSN du projet Sentry | sentry.io → Settings → Projects → resteasy → Client Keys |
| `SENTRY_AUTH_TOKEN` | Token d'auth Sentry (pour source maps) | sentry.io → Settings → Auth Tokens |
| `SENTRY_ORG` | Slug de votre organisation Sentry | URL de votre org Sentry |
