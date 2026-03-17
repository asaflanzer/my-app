# my-app

Full-stack monorepo with React (web) + Expo (native), PostgreSQL, OAuth (Google / Facebook / Apple).

## Stack

| Layer | Choice |
|-------|--------|
| Monorepo | Turborepo + pnpm workspaces |
| Web | React 18 + Vite + Tailwind CSS + shadcn/ui |
| Native | Expo SDK 51 + NativeWind + React Native Reusables |
| Database | PostgreSQL + Drizzle ORM |
| Auth | Better Auth (Google, Facebook, Apple) |
| API | tRPC v11 |
| Web hosting | Vercel |
| Native builds | EAS Build + Submit |

## Getting Started

### Prerequisites

- Node.js 24 (`nvm use` to switch automatically)
- pnpm >= 10
- PostgreSQL (or use Docker: `docker compose -f infra/docker-compose.yml up -d`)

### Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Copy env file and fill in values
cp .env.example .env

# 3. Push database schema
pnpm db:push

# 4. Start web dev server
pnpm --filter web dev

# 5. Start native dev server (separate terminal)
pnpm --filter native dev
```

## Project Structure

```
apps/
  web/        React (Vite) + shadcn/ui
  native/     Expo + NativeWind + RN Reusables
packages/
  db/         Drizzle schema + client
  auth/       Better Auth config
  api/        tRPC router
  ui/         Shared design tokens
  config/
    tailwind/ Shared Tailwind preset
    eslint/   Shared ESLint configs
    typescript/ Shared tsconfig bases
infra/
  docker-compose.yml  Local PostgreSQL
```

## Scripts

```bash
pnpm build          # Build all packages + apps
pnpm dev            # Start all dev servers
pnpm lint           # Lint all packages
pnpm typecheck      # TypeScript check all packages
pnpm db:push        # Push schema to DB (no migrations)
pnpm db:migrate     # Run pending migrations
pnpm db:generate    # Generate migration files
pnpm db:studio      # Open Drizzle Studio
```

## Environment Variables

See `.env.example` for required variables. Never commit `.env` files.
