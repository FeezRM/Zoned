<div align="center">

# The Daily Hub

Your joyful productivity OS — a place to gamify the day, romanticize the small wins, and make consistency feel good.

</div>

Status: Work in progress. Expect changes, polish passes, and new widgets landing frequently.

## Vision

Craft a life you’re proud of—without burning out. The Daily Hub helps you:

- Enjoy the process instead of deferring happiness to some distant result
- Build purpose and discipline sustainably (no “robot mode” required)
- Stay productive and organized while honoring your energy and emotions

In short: be wildly effective, but still feel human.

## Features (current)

- Authentication and onboarding (Supabase)
  - Magic link or email/password
  - Onboarding survey (name, avatar, preferences)
- Profile and avatar storage (Supabase Storage)
- Today’s Tasks (Todos)
  - Add, edit, delete, complete
  - Priorities, deadlines, tags, recurring tasks, subtasks
  - Filter/sort and drag‑and‑drop reordering (persisted)
- Daily Habits
  - Create habits with emoji icons
  - Per‑day completion tracking and streaks
  - Drag‑and‑drop reordering (persisted)
- Daily Focus
  - Focus text, progress slider, and done/undone toggle
  - Date selector to review or edit other days
- Mood Tracker
  - Quick 1–5 mood scale with emoji
  - Weekly average
- Weather
  - Geolocation‑based weather using OpenWeather
  - °C/°F toggle
- Quick Notes
  - Simple notes with inline edit/delete
- Theming and polish
  - Tailwind + shadcn‑ui components
  - Nice animations, gradients, and dark mode

## Tech Stack

- React + TypeScript + Vite
- Tailwind CSS + shadcn‑ui (Radix UI under the hood)
- Supabase (Auth, Postgres, Storage)
- OpenWeather API (geolocation only)

## Repository layout

- `src/components/` – dashboard widgets and UI primitives
- `src/pages/` – routed pages (index, 404)
- `src/lib/` – data layer (Supabase queries, helpers)
- `src/hooks/` – reusable hooks (weather, profile)
- `public/` – static assets

## Getting started

Prerequisites

- Node.js 18+ (LTS recommended)
- A Supabase project (URL + anon key)
- An OpenWeather API key

1. Clone and install

```bash
git clone <your_repo_url>
cd daily-hub
npm i
```

2. Configure environment

Create a `.env` file in the project root with:

```bash
VITE_SUPABASE_URL="<your_supabase_url>"
VITE_SUPABASE_ANON_KEY="<your_supabase_anon_key>"
VITE_OPEN_WEATHER_API_KEY="<your_openweather_api_key>"
```

Notes:

- Never expose your Supabase service role key in the client.
- After editing `.env`, restart the dev server (Vite only reads env on startup).

3. Run in development

```bash
npm run dev
```

Open http://localhost:5173

4. Build and preview

```bash
npm run build
npm run preview
```

## Supabase schema (cheat sheet)

Tables (one row per `user_id` unless noted):

- `profiles`
  - `id uuid` (PK, equals auth user ID)
  - `display_name text`
  - `avatar_url text`
  - `preferences jsonb` (e.g., `{ "weather_unit": "c" }`)
- `todos`
  - `id uuid` PK, `user_id uuid`
  - `text text`, `completed boolean default false`
  - `priority text`, `tags jsonb[]`, `subtasks jsonb[]`
  - `deadline timestamptz null`, `recurring text`
  - `order_index int null`
  - `created_at timestamptz default now()`, `updated_at timestamptz`
- `habits`
  - `id uuid` PK, `user_id uuid`
  - `name text`, `icon text`
  - `streak int default 0`, `completed boolean default false`
  - `order_index int null`
  - `created_at timestamptz default now()`, `updated_at timestamptz`
- `habit_entries` (many rows per habit)
  - `id uuid` PK, `user_id uuid`, `habit_id uuid`
  - `for_date date`, `completed_at timestamptz`
- `notes`
  - `id uuid` PK, `user_id uuid`, `content text`
  - `created_at timestamptz default now()`, `updated_at timestamptz`
- `daily_focus`
  - `id uuid` PK, `user_id uuid`, `for_date date`
  - `text text`, `progress int`, `completed boolean`
  - `created_at timestamptz default now()`, `updated_at timestamptz`
- `mood_entries`
  - `id uuid` PK, `user_id uuid`, `value int`, `label text`, `emoji text`
  - `created_at timestamptz default now()`

Reordering columns (if missing):

```sql
alter table if exists public.todos add column if not exists order_index int;
alter table if exists public.habits add column if not exists order_index int;
```

Row Level Security (minimum viable policies):

```sql
alter table public.profiles     enable row level security;
alter table public.todos        enable row level security;
alter table public.habits       enable row level security;
alter table public.habit_entries enable row level security;
alter table public.notes        enable row level security;
alter table public.daily_focus  enable row level security;
alter table public.mood_entries enable row level security;

create policy if not exists "profiles read/write own"
	on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());

create policy if not exists "todos read/write own"
	on public.todos for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy if not exists "habits read/write own"
	on public.habits for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy if not exists "habit_entries read/write own"
	on public.habit_entries for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy if not exists "notes read/write own"
	on public.notes for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy if not exists "daily_focus read/write own"
	on public.daily_focus for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy if not exists "mood_entries read/write own"
	on public.mood_entries for all using (user_id = auth.uid()) with check (user_id = auth.uid());
```

Storage (avatars): create a bucket (e.g., `avatars`) and add a policy to allow users to read and write only their own files, or use a signed upload approach.

## Weather provider

- Source: [OpenWeather](https://openweathermap.org/)
- Access: browser geolocation only (no manual city input)
- Env: `VITE_OPEN_WEATHER_API_KEY`
- Common issues: location permission denied, ad‑blockers, or missing env var. Restart dev server after changing `.env`.

## Scripts

- `npm run dev` – start in dev mode (Vite)
- `npm run build` – production build
- `npm run preview` – preview built app
- `npm run lint` – lint the project

## Roadmap

- Deeper analytics and streak insights
- Calendar view and history for focus/habits/mood
- Better offline behavior and optimistic syncing where safe
- Accessibility polish and keyboard ergonomics
- Tests (unit + integration)

## Contributing

Issues and PRs are welcome while this is in active development. Please keep changes scoped and include a short before/after note or screenshot where applicable.

## License

TBD (personal project, WIP). If you plan to fork/ship this, open an issue so we can clarify licensing.
