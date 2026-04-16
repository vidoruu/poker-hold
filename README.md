# Holdem Arena (Multiplayer Texas Hold'em)

Modern multiplayer poker web app built with Next.js App Router + Supabase Realtime.

## Features

- Real-time room sync for all players
- Room code based multiplayer join flow
- Full table lifecycle: preflop, flop, turn, river, showdown
- Core actions: ready, start hand, fold, check, call, raise, all-in
- Responsive UI/UX optimized for desktop + mobile
- Vercel compatible deployment

## Tech Stack

- Next.js 16 (App Router, TypeScript)
- Tailwind CSS 4
- Supabase Postgres + Realtime

## 1) Install dependencies

```bash
npm install
```

## 2) Configure Supabase

Create a new Supabase project, then run [supabase-schema.sql](supabase-schema.sql).

This creates the `poker_tables` table and enables read policy for realtime subscriptions.

## 3) Environment variables

Copy [.env.example](.env.example) to `.env.local` and fill values:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## 4) Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## 5) Deploy on Vercel

1. Push this repo to GitHub.
2. Import project in Vercel.
3. Add the same environment variables in Vercel Project Settings.
4. Deploy.

## Notes

- Game state is stored in Supabase `jsonb`.
- Server-side action validation runs in Next.js API routes.
- Current version focuses on core multiplayer gameplay and UX.
- Side-pot splitting is not yet implemented.
