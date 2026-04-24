# Quick Reference — Codesidekick Mothership

Last updated: 2026-04-24

## Development Commands

```bash
# Start dev server (Vite + SvelteKit)
pnpm dev

# Type-check
pnpm check
pnpm check:watch

# Build for production
pnpm build

# Preview production build
pnpm preview

# Run wrangler dev (Cloudflare Pages local emulation with KV bindings)
npx wrangler pages dev .svelte-kit/cloudflare

# Docker build (Coolify self-hosted deployment)
docker build -t mothership .
docker run -p 3000:3000 --env-file .env mothership
```

## Environment Setup

```bash
# Copy and fill env vars
cp .env.example .env

# Required for AI chat + project intake
ANTHROPIC_API_KEY=sk-ant-...

# Required for Asana integration
ASANA_PAT=...
ASANA_WORKSPACE_ID=...
ASANA_PROJECT_CCS=...
ASANA_PROJECT_FORGE=...

# Required for Shopify (Forge / Zebra Skimmers)
SHOPIFY_ADMIN_TOKEN=...

# Ollama — defaults work if iMac is on local network
# OLLAMA_BASE_URL=http://10.0.0.45:11434
# OLLAMA_MODEL=phi3
```

## Adding a New Project

1. Edit `src/lib/config/projects.ts` — add entry to `projectManifest[]`
2. Add env vars for project-specific keys (Asana project GID, etc.)
3. Add accent color CSS custom property to `src/app.css`
4. That's it — dynamic route `/projects/[slug]` auto-renders

```typescript
// Minimum required fields:
{
  id: 'my-project',      // used in URL: /projects/my-project
  name: 'My Project',
  kind: 'generic',       // ccs | forge | shopify | defi | ai | infra | generic
  status: 'active',
  accent: '--color-accent',
}
```

## Key API Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/chat` | POST | AI chat (Anthropic, project-aware) |
| `/api/anthropic/test` | POST | Validate Anthropic API key (CORS proxy) |
| `/api/ollama/brief` | POST | Generate daily briefing via local Ollama |
| `/api/ollama/summarize` | POST | Summarize activity events via Ollama |
| `/api/invoices` | POST | Create invoice |
| `/api/invoices` | PUT | Update invoice |
| `/api/invoices?id=&pid=` | DELETE | Delete invoice |

## Cloudflare KV

```bash
# Create KV namespace (already done — IDs in wrangler.toml)
npx wrangler kv:namespace create KV_INVOICES

# List KV keys for a project
npx wrangler kv:key list --namespace-id=1a257a6ae93f4954b291486f28e54854 --prefix="invoices:"

# Get a specific value
npx wrangler kv:key get --namespace-id=1a257a6ae93f4954b291486f28e54854 "invoice:myproject:INV-001"
```

## Settings Store

```typescript
import { settings, update, snapshot } from '$lib/stores/settings';

// Read reactive (in Svelte component)
$settings.ai.anthropicApiKey
$settings.ai.routing  // 'auto' | 'anthropic' | 'ollama'

// Write (merges partial)
update({ ai: { ollamaModel: 'llama3' } });

// Read non-reactive (in event handlers)
const s = snapshot();
```

## Invoice Operations

```typescript
import { listInvoices, saveInvoice, deleteInvoice } from '$lib/integrations/invoices';

// Always pass platform from page.server.ts
const invoices = await listInvoices(platform, projectId);
await saveInvoice(platform, invoice);
await deleteInvoice(platform, projectId, invoiceId);
```

## Ollama Calls

```typescript
import { generate, OllamaError } from '$lib/integrations/ollama';

try {
  const result = await generate({
    prompt: 'Your prompt here',
    system: 'System instructions',
    temperature: 0.3,
    maxTokens: 512,
    baseUrl: 'http://10.0.0.45:11434',  // optional override
    model: 'phi3',                        // optional override
  });
  console.log(result.text, result.model, result.durationMs);
} catch (err) {
  if (err instanceof OllamaError) { /* Ollama unreachable or error */ }
}
```

## Common Debugging

**Ollama not responding:**
- Check iMac is on — server runs at 10.0.0.45:11434
- Test connectivity: `curl http://10.0.0.45:11434/api/tags`
- Override URL via Settings > AI > Ollama Base URL
- Status shown in Settings > AI > "Test Connection"

**Anthropic key not working:**
- Test via Settings > AI > "Test Key" button (hits /api/anthropic/test)
- Check for whitespace in key — store trims it
- BYOK overrides server env key when set

**KV not persisting in local dev:**
- Local dev without `wrangler pages dev` uses in-memory Map (expected)
- Run `npx wrangler pages dev .svelte-kit/cloudflare` for real KV emulation

**Type errors in page.server.ts:**
- `platform` is `App.Platform | undefined` — always handle undefined
- KV bindings accessed via `platform?.env?.KV_INVOICES`

**Settings lost after reload:**
- Check browser console for localStorage errors (storage quota exceeded?)
- Export/import via Settings > Data tab for backup

**Project page shows no integrations:**
- Check manifest entry in `src/lib/config/projects.ts` has the right keys (asana, shopify, agent)
- Check env vars are set in `.env`

## Deployment

```bash
# Deploy to Cloudflare Pages (auto via GitHub Actions on push to main)
# Manual deploy:
npx wrangler pages deploy .svelte-kit/cloudflare --project-name=pm-arigato

# Check deployment status
npx wrangler pages deployment list --project-name=pm-arigato
```

## File Locations Quick Reference

| Need to... | File |
|---|---|
| Add a project | `src/lib/config/projects.ts` |
| Add settings field | `src/lib/stores/settings.ts` |
| Add invoice field | `src/lib/types/invoice.ts` |
| Add Asana fetch | `src/lib/integrations/asana.ts` |
| Add Shopify fetch | `src/lib/integrations/shopify.ts` |
| Change project detail page | `src/routes/projects/[slug]/+page.svelte` |
| Change invoice UI | `src/routes/projects/[slug]/invoices/` |
| Change settings UI | `src/routes/settings/+page.svelte` |
| Change nav/sidebar | `src/routes/+layout.svelte` |
| Change Ollama prompts | `src/routes/api/ollama/*/+server.ts` |
| Change KV binding | `wrangler.toml` + `src/app.d.ts` |
