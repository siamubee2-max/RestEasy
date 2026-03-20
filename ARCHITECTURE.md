# RestEasy — Architecture Technique

## Vue d'ensemble

```
┌─────────────────────────────────────────────────────────┐
│                    REACT NATIVE APP                      │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │
│  │ Welcome  │  │Onboarding│  │   Home   │  │Journal │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────┘  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │
│  │  Weekly  │  │  Night   │  │ Therapy  │  │Profile │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────┘  │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │              Navigation Layer                    │    │
│  │  Stack Navigator → Tab Navigator + Night Modal  │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   useAuth    │  │useProgramState│  │ useSleepData │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└──────────────────────┬──────────────────────────────────┘
                       │
          ┌────────────┴────────────┐
          │                         │
   ┌──────▼──────┐         ┌────────▼────────┐
   │  SUPABASE   │         │   REVENUECAT    │
   │             │         │                 │
   │ • Auth      │         │ • Entitlements  │
   │ • profiles  │         │ • Purchases     │
   │ • sleep_    │         │ • Restore       │
   │   entries   │         └─────────────────┘
   │ • sleep_    │
   │   windows   │
   │ • night_    │
   │   mode_     │
   │   sessions  │
   │ • module_   │
   │   progress  │
   └─────────────┘
```

## Flux d'authentification

```
App Launch
    │
    ├─ No session ──────────────► WelcomeScreen
    │                                  │
    │                           Anonymous sign-in
    │                                  │
    ├─ Session + no name ──────► OnboardingScreen (3 steps)
    │                                  │
    │                           Profile saved
    │                                  │
    └─ Session + name ──────────► MainApp (TabNavigator)
```

## Algorithme TCC-I — Ajustement de la fenêtre de sommeil

```
Fin de semaine → Calcul efficacité moyenne
    │
    ├─ Efficacité ≥ 85% ──► Étendre fenêtre (+15 min bedtime)
    │
    ├─ Efficacité 80-84% ─► Maintenir fenêtre
    │
    └─ Efficacité < 80% ──► Restreindre fenêtre (-15 min bedtime)
```

## Calcul de l'efficacité du sommeil

```
Efficacité = (Temps total de sommeil / Temps total au lit) × 100

Temps total de sommeil = Temps au lit - Latence d'endormissement - WASO
Temps total au lit = Heure de lever - Heure de coucher
WASO = Nombre de réveils × Durée estimée par réveil
```

## Modèle de données Supabase

```
auth.users
    │
    ├── profiles (1:1)
    │       display_name, locale, program_week, is_premium
    │
    ├── sleep_windows (1:N par semaine)
    │       program_week, prescribed_bedtime, prescribed_wake_time
    │
    ├── sleep_entries (1:N par jour)
    │       entry_date, bedtime, sleep_onset_minutes, wake_count,
    │       waso_minutes, wake_time, out_of_bed_time
    │       [computed: time_in_bed, total_sleep, sleep_efficiency]
    │
    ├── night_mode_sessions (1:N)
    │       session_date, action_taken, duration_sec
    │
    └── module_progress (1:N par module)
            module_id, status, started_at, completed_at
```

## Produits RevenueCat

| ID | Prix | Description |
|---|---|---|
| `program_full` | 49,99€ | Programme complet 6 semaines |
| `tools_pack` | 19,99€ | Pack outils post-programme |
| `booster` | 14,99€ | Programme booster 2 semaines |

Entitlement : `pro` → donne accès à tout le programme.
