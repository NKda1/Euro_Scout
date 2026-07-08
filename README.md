# EuroScout Pro

A European American football scouting and recruitment platform built with Next.js, TypeScript, Tailwind CSS, Supabase, Daily and Stripe-ready premium infrastructure.

## Features
- Interactive Europe SVG map on homepage
- Clickable regions/countries open modal with leagues/teams
- Modular structure for future features (players, news, scouting, accounts, film review)

## Tech Stack
- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui-ready
- Framer Motion-ready
- Supabase-ready

## Getting Started

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local`
3. Add local Supabase, Daily and Stripe values
4. Run dev server: `npm run dev`
5. Validate before deploy: `npm run typecheck`, `npm run lint`, `npm run build`

## Project Structure
See `/src` for all app, API, data, types, lib, constants, and styles.

## Deployment

Use [docs/deployment-readiness.md](docs/deployment-readiness.md) before pushing to production.

Core environment variables are listed in `.env.example`.

## License
MIT
