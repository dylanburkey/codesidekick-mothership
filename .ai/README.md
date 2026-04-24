# Codesidekick Mothership — AI Memory System

Last updated: 2026-04-24

## What This Project Is

**Codesidekick Mothership** (`pm-arigato`) is a personal project management dashboard built with SvelteKit 2 and Svelte 5 runes. It provides a unified view of all active development projects with integrations for Asana, Shopify, invoicing, and AI tooling (Anthropic Claude + local Ollama).

Deployed to **Cloudflare Pages** as the primary target, with a **Docker/Coolify** fallback for self-hosted operation.

## Memory Files

| File | Purpose |
|---|---|
| `ARCHITECTURE.json` | Stack, deployment targets, data flows, Cloudflare bindings, AI routing strategy |
| `FILES.json` | Full file index — every source file with purpose, exports, and line counts |
| `PATTERNS.md` | 12 reusable implementation patterns with code examples |
| `BUSINESS.json` | Tracked projects, feature status, AI providers, invoice logic, env vars |
| `QUICK.md` | Dev commands, debugging guide, file location reference |
| `TODO.md` | In-progress, backlog, and completed feature tracking |
| `README.md` | This file — orientation |
| `SPRINT_UPDATE.md` | Agent update procedure |

## Project Structure at a Glance

```
src/
  lib/
    config/projects.ts     ← MANIFEST — add projects here
    integrations/          ← asana, shopify, invoices, ollama
    stores/settings.ts     ← persisted user settings (localStorage)
    types/                 ← invoice, ccs types
  routes/
    +layout.svelte         ← sidebar + nav
    +page.svelte           ← dashboard home
    settings/              ← BYOK, AI routing, appearance
    projects/[slug]/       ← dynamic project detail
      invoices/            ← invoice CRUD
    projects/new/          ← AI-powered project intake
    api/
      anthropic/test/      ← CORS proxy for key validation
      chat/                ← AI chat endpoint
      invoices/            ← invoice REST API
      ollama/brief/        ← daily briefing
      ollama/summarize/    ← activity summarization
```

## Key Architectural Decisions

1. **Manifest-driven projects** — no database for project metadata. One file to rule them all: `src/lib/config/projects.ts`.

2. **Dual AI providers** — Anthropic for reasoning-heavy tasks (chat, intake), Ollama for high-volume/private tasks (briefings, summaries). User controls routing via settings.

3. **Bring Your Own Key** — users supply their Anthropic API key via the settings page. It overrides the server env key and is never logged.

4. **KV for invoices** — Cloudflare KV (`KV_INVOICES`) with in-memory Map fallback for local dev without wrangler.

5. **Svelte 5 runes** — all client components use `$state`, `$derived`, `$effect`, `$props` — no legacy reactive syntax.

## Active Projects Tracked

| ID | Name | Kind | Status |
|---|---|---|---|
| ccs | Claude Code Sidekick | ccs | active |
| mothership | Codesidekick Mothership | infra | active |
| forge | Forge (Zebra Skimmers) | shopify | active |
| athena | Athena | defi | active |
| northcoast-ai | NorthCoast AI | ai | active |
| walletwatch | WalletWatch | defi | idle |
| home-infra | Home Infrastructure | infra | idle |

## Commit History Summary

| Commit | Feature |
|---|---|
| ed29177 | Settings page: BYOK, AI routing, integrations UI, fix intake form bug, swap to Anthropic API |
| 40ef42b | Ollama integration: daily briefing + activity summarization |
| 3641497 | Dockerfile for Coolify deployment |
| abed554 | Wire real KV namespace IDs, create Pages project |
| 2f006f8 | Invoice builder + KV storage |
| aad46de | CCS Chat sidebar integration |
| f34b02d | Manifest-driven project system + API integrations |
| 93e6cd8 | Initial SvelteKit dashboard |
