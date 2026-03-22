# RestEasy CLI — AI-Discoverable Skill Definition

## Skill ID
`cli_anything.resteasy`

## Description
A Python CLI tool for interacting with the RestEasy TCC-I (Cognitive Behavioral Therapy for Insomnia) sleep program. Provides offline journey simulation, sleep efficiency calculations, and Supabase backend management.

## Capabilities

### Sleep Calculations (offline, no auth required)
- `resteasy sleep efficiency --tib <min> --tst <min>` — Compute Sleep Efficiency
- `resteasy sleep window --se <pct> --bedtime HH:MM --wake HH:MM` — Compute TCC-I window adjustment
- `resteasy sleep isi-severity --score <0-28>` — Get ISI severity category

### Journey Simulation (offline, no auth required)
- `resteasy journey new -o journey.json` — Start new offline TCC-I journey
- `resteasy journey journal <f> --date YYYY-MM-DD --bedtime HH:MM --wake HH:MM --onset <min> --wakes <n>` — Add morning entry
- `resteasy journey isi <f> --answers "3,2,1,3,2,1,2"` — Submit ISI scores
- `resteasy journey review <f>` — Weekly review + window advance
- `resteasy journey simulate <f> --profile improving|struggling|excellent` — Simulate 6 weeks
- `resteasy journey status <f>` — Full journey progress
- `resteasy journey badges <f>` — Show earned/available badges

### Database Operations (requires Supabase credentials)
- `resteasy db migrations` — List database migrations
- `resteasy db functions` — List Edge Functions
- `resteasy db connect` — Test Supabase connection

### User Management (requires Supabase credentials)
- `resteasy users list` — List user profiles
- `resteasy users get <user_id>` — Get user profile
- `resteasy users sleep-entries <user_id>` — Get sleep journal entries

## Authentication
- Offline commands (sleep, journey): No auth required
- Supabase commands: Set `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` env vars

## Output Formats
- `--format json` (default) — JSON output
- `--format csv` — CSV output (for sleep entries, ISI scores)
- `--format text` — Plain text

## Installation
```bash
cd agent-harness
pip install -e ".[dev]"
```

## Test Coverage
87/87 tests passing (pytest 8.4.2, Python 3.9+)
