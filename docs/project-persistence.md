# Project Persistence — Scope & Plan

**Status:** Planning  
**Owner:** Dylan  
**Last updated:** 2026-04-22

Currently, the mothership's project list is hardcoded in `src/lib/config/projects.ts`. The intake form generates briefs but does not persist them — new projects never appear in the sidebar or grid. This doc scopes the migration to Postgres-backed persistence.

## Current state

### What works
- Intake form collects project metadata
- Server calls Claude API, gets back brief + tasks + CCS config
- Browser renders the result on the three tabs (Brief / Tasks / Config)

### What's missing
- No persistence layer. Generated projects vanish on navigation away.
- Sidebar and project grid read from the static `projectManifest` array in `src/lib/config/projects.ts`
- To add a project today, you manually edit that file, commit, push, redeploy

## Target state

Projects live in Postgres. Intake form writes to the DB. Sidebar/grid read from the DB. The hardcoded manifest becomes a seed for initial data only.

## Infrastructure (already in place)

`dev-postgres` container is running on the server with port 5432 exposed, username `dev`, password `dev`. It's a dev-shared DB so the mothership should create its own database within that server, not share `postgres`:

```
Host:     10.0.0.45  (or dev-postgres from within Docker network)
Port:     5432
User:     dev
Password: dev
Database: mothership  (to be created)
```

From the mothership container (running under Coolify), we'll need to either:
- Join the same Docker network as `dev-postgres`, OR  
- Connect via `10.0.0.45:5432` from inside the container

Test both and use whichever Coolify handles cleanly.

## Schema (first pass)

```sql
CREATE TABLE projects (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  description   TEXT,
  kind          TEXT NOT NULL,               -- 'ccs' | 'forge' | 'shopify' | 'defi' | 'ai' | 'infra' | 'generic'
  status        TEXT NOT NULL DEFAULT 'active', -- 'active' | 'idle' | 'paused' | 'complete' | 'archived'
  accent        TEXT NOT NULL DEFAULT '--color-accent',
  client        TEXT,
  repo          TEXT,
  chat_url      TEXT,

  -- Integration config — nullable, small enough to stay denormalized for now
  asana_workspace_id  TEXT,
  asana_project_id    TEXT,
  shopify_store       TEXT,
  shopify_theme       TEXT,
  agent_url           TEXT,

  -- Brief + tasks + config from intake
  brief_json    JSONB,
  tasks_json    JSONB,
  config_json   JSONB,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_kind ON projects(kind);
```

Keep this schema minimal. Resist the urge to normalize tasks into their own table on the first pass — projects/tasks/briefs live or die together, JSONB is fine for v1. Add tables later if we need to query inside them.

## Stack choice — drizzle vs prisma

**Go with Drizzle.** Reasons:
- Lighter, no codegen step, works naturally with SvelteKit
- TypeScript-first schema definitions match the existing codebase style
- Raw SQL escape hatch is clean when we need it
- No migration daemon spin-up time on every deploy

Prisma is fine but heavier; it adds a build step the rest of the stack doesn't need.

## Files to create

```
src/lib/db/
├── schema.ts              # Drizzle table definitions (the SQL above, in TS)
├── client.ts              # Postgres client factory, uses env vars
├── projects.ts            # CRUD helpers: listProjects, getProject, createProject, updateProject
└── migrations/
    └── 0001_init.sql      # Generated from drizzle-kit

src/routes/api/projects/
├── +server.ts             # GET = list, POST = create
└── [id]/+server.ts        # GET = one, PATCH = update, DELETE = archive
```

## Files to modify

- `src/lib/config/projects.ts` — keep the file, retitle it as a **seed** source. Export `seedProjects` instead of `projectManifest`. Add a one-time seed script that reads this and inserts into DB if table is empty.
- `src/routes/+layout.server.ts` (create if missing) — load projects from DB instead of static import
- `src/routes/+page.svelte` — same, data flows through `$props.data`
- `src/routes/projects/new/+page.server.ts` — after successful Claude response, insert into DB and return the new ID. Redirect to `/projects/<new-slug>` on success.
- `src/routes/projects/[slug]/+page.server.ts` (if exists) — load from DB
- `package.json` — add `drizzle-orm`, `postgres`, dev-dep `drizzle-kit`

## Environment variables

Add to `.env` and Coolify:

```
DATABASE_URL=postgres://dev:dev@10.0.0.45:5432/mothership
```

Consider a separate DB user for the mothership with its own password later, not `dev`/`dev`. Not critical for v1 since this is LAN-only.

## Migration path

1. **Create database on the server**
   ```bash
   docker exec -it dev-postgres psql -U dev -d postgres -c "CREATE DATABASE mothership;"
   ```

2. **Build schema + client locally**, commit, push

3. **Seed on first deploy** — check if `projects` table is empty, if so insert the seven seed projects from `config/projects.ts` so the sidebar doesn't go blank

4. **Switch reads to DB** — layout/page loaders pull from DB

5. **Wire intake form to write** — `+page.server.ts` inserts after Claude returns

6. **Deploy and verify:**
   - Existing seven projects still appear
   - Creating a new project from the intake form shows up immediately in the sidebar
   - Refresh persists it

## Risk & rollback

Low risk overall. The seed preserves the current seven projects. If DB connection fails at boot, have the loader fall back to the seed array with a console warning — that way the app still renders even if Postgres is down.

Rollback: revert the layout loader changes and the app is back to static. The DB stays in place for next attempt.

## Out of scope (future sessions)

- Multi-user / auth (mothership is single-user for now)
- Project edit UI (creation is the important first step)
- Migration tooling for schema changes (drizzle-kit handles it, just be disciplined)
- Tasks-as-relational-rows (stay denormalized until we need to query inside)
- Activity feed persistence (separate concern, currently hardcoded)

## Estimated effort

~2 hours focused work. Breakdown:
- 20 min: create DB, install drizzle, write schema
- 30 min: build client + CRUD helpers + API routes
- 30 min: refactor layout/page loaders to use DB
- 20 min: wire intake form to insert
- 20 min: seed script + deploy + verify

## When coming back to this

Start fresh. Re-read this doc. Do the steps in order. Don't try to do multi-user auth or activity feeds in the same pass — they'll bloat scope and you'll end up with nothing working.
