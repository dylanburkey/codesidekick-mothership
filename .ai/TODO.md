# TODO — Codesidekick Mothership

Last updated: 2026-04-24

## In Progress

_Nothing actively in progress — last sprint complete (BYOK + Ollama + Invoice + Settings)_

## Next Up

- [ ] **GitHub commit feed** — wire GITHUB_TOKEN to fetch recent commits per project; display in project detail page activity tab. Token is optional (public repos work without it).
- [ ] **AI routing in chat** — /api/chat currently hardcodes Anthropic. Respect `settings.ai.routing` to allow Ollama fallback when user sets routing to 'auto' or 'ollama'.
- [ ] **Activity feed** — surface real activity data (Asana tasks completed, Shopify orders, git commits) to the daily briefing and dashboard home.

## Backlog

- [ ] **Shopify orders widget** — display recent 30-day order count + revenue on project detail page (data already fetched in shopify.ts)
- [ ] **Invoice PDF export** — generate printable PDF from invoice detail page
- [ ] **Invoice email** — send invoice PDF to client email via a mail provider
- [ ] **Settings migration** — bump SETTINGS_VERSION to 2 when new fields are added; implement migration in load() for v1 → v2
- [ ] **R2 attachment support** — allow file attachments to invoices or project notes (R2 bucket binding placeholder in app.d.ts)
- [ ] **CCS agent live status** — poll agent URL health endpoint and display online/offline badge in sidebar
- [ ] **Webhook receiver** — accept Asana or Shopify webhooks to trigger real-time activity feed updates
- [ ] **Project archiving** — UI to change project status to 'archived' and hide from active view
- [ ] **WalletWatch integration** — on-chain wallet monitoring page is scaffolded; needs real blockchain data source

## Completed (Recent)

- [x] Settings page with BYOK (Anthropic API key), AI routing, integrations (Asana/Shopify/GitHub), appearance, data export/import (commit: ed29177)
- [x] Ollama integration for daily briefing and activity summaries via local phi3 model (commit: 40ef42b)
- [x] Dockerfile for Coolify self-hosted deployment (commit: 3641497)
- [x] Cloudflare KV namespace IDs wired + Pages project created (commit: abed554)
- [x] Invoice builder with KV storage — full CRUD, line items, tax, statuses (commit: 2f006f8)
- [x] CCS Chat wired into sidebar via chatUrl manifest field (commit: aad46de)
- [x] Manifest-driven project system + API integrations (Asana, Shopify) (commit: f34b02d)
- [x] Initial SvelteKit mothership dashboard (commit: 93e6cd8)

## Known Issues

- `/api/chat` hardcodes `claude-sonnet-4-5` — should read from `settings.ai.anthropicModel`
- Project intake form (`/projects/new`) generates ccsConfig JSON but doesn't auto-add to manifest — manual step required
- Ollama daily briefing uses static activity placeholder until real activity feed is wired
