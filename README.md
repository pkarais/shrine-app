# Shrine Ops

Operational dashboard and workflow platform for shrine staff, built with Next.js, TypeScript, Tailwind, and Supabase.

## Overview

Shrine Ops supports day-to-day operations across staffing, scheduling, messaging, incidents, maintenance tickets, and manager workflows.

## Tech Stack

- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- Supabase (Auth, Postgres, Storage)
- Vitest + Testing Library

## Features

- Role-focused dashboards (operations, manager, council)
- Clock in and shift tracking with geofence support
- Calendar and event scheduling workflows
- Team messaging and communication panels
- Incident and maintenance ticket submission
- Manager staffing, overtime, and optimization tools

## Project Structure

- `app/`: Next.js app routes and API routes
- `components/`: UI building blocks and feature components
- `lib/`: business logic, domain helpers, and server actions
- `utils/supabase/`: Supabase clients for server and browser
- `supabase/`: SQL schema and seed scripts
- `docs/`: implementation notes and setup references

## Getting Started

### 1) Install dependencies

```bash
npm install
```

### 2) Create environment file

Copy `.env.example` values into `.env.local` and provide real credentials.

### 3) Run development server

```bash
npm run dev
```

Open http://localhost:3000.

## Scripts

- `npm run dev`: start local development server
- `npm run build`: production build
- `npm run start`: run production server
- `npm run lint`: run linting
- `npm run test`: run tests

## Database Setup

Supabase SQL files are in `supabase/`.

- Core schema: `supabase/schema.sql`
- Optional alternatives: `supabase/schema-safe.sql`, `supabase/schema-simple.sql`, `supabase/schema-minimal.sql`
- Seeds: `supabase/seed.sql`, `supabase/seed-events.sql`

See `docs/SUPABASE_SETUP.md` for setup guidance.

## Contributing

Please read `CONTRIBUTING.md` before submitting pull requests.

## Security

If you discover a vulnerability, follow `SECURITY.md`.

## License

This project is licensed under the MIT License. See `LICENSE`.