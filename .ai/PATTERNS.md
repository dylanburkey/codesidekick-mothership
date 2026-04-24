# Patterns — Codesidekick Mothership

Last updated: 2026-04-24

## 1. Manifest-Driven Projects

All projects are declared once in `src/lib/config/projects.ts`. No database, no CMS.

```typescript
// Pattern: add a project to projectManifest[]
{
  id: 'my-project',        // URL-safe slug — used in /projects/[slug]
  name: 'My Project',
  kind: 'shopify',         // ccs | forge | shopify | defi | ai | infra | generic
  status: 'active',        // active | idle | paused | complete | archived
  accent: '--color-forge', // CSS custom property in app.css
  client: 'ACME Corp',
  asana: { workspaceId: '$ASANA_WORKSPACE_ID', projectId: '$ASANA_PROJECT_MY' },
  shopify: { storeDomain: '$SHOPIFY_DOMAIN_MY' },
  agent: { url: 'http://macbook.tail.ts.net:4244' },
  chatUrl: 'https://ccs-chat.pages.dev/projects/my-project/chat',
}
```

The dynamic route `src/routes/projects/[slug]/+page.server.ts` reads the manifest to decide which integrations to fetch. No other files need changes.

## 2. SvelteKit Page Pattern (Svelte 5 Runes)

Server load + client page — always split data fetching from rendering.

```typescript
// +page.server.ts
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = async ({ params, platform }) => {
  const project = getProject(params.slug);
  if (!project) error(404);
  // fetch integrations based on manifest flags
  return { project, asanaData, shopifyData };
};

// +page.svelte (Svelte 5)
<script lang="ts">
  let { data } = $props();
  let count = $state(0);
  let doubled = $derived(count * 2);
</script>
```

## 3. Integration Adapter Pattern

Each integration lives in `src/lib/integrations/` as a server-only module.

```typescript
// Pattern: integration module exports typed async function
export async function fetchAsanaProject(
  projectId: string,
  pat: string
): Promise<AsanaProjectSummary> {
  try {
    // ... fetch + normalize ...
    return { projectId, name, tasks, completedCount, totalCount, progressPct };
  } catch (err) {
    // Always return typed error shape, never throw to page.server.ts
    return { ..., error: err instanceof Error ? err.message : String(err) };
  }
}
```

Always return a typed result with an optional `error` field. Never let integration errors bubble up as uncaught exceptions.

## 4. Cloudflare KV Storage Pattern

Used for invoice persistence. KV_INVOICES binding in wrangler.toml.

```typescript
// Key structure:
// invoice:{projectId}:{invoiceId}  → Invoice JSON
// invoices:{projectId}            → string[] of invoice IDs (index)

// Pattern: always pass platform from +page.server.ts
export async function saveInvoice(
  platform: App.Platform | undefined,
  invoice: Invoice
): Promise<void> {
  const kv = getKV(platform);  // returns KVNamespace or null
  await kvPut(kv, invoiceKey(invoice.projectId, invoice.id), invoice);
  // update index separately
}

// Local dev fallback — in-memory Map replaces KV automatically
const memStore = new Map<string, string>();
function getKV(platform) {
  return platform?.env?.KV_INVOICES ?? null;  // null triggers memStore path
}
```

## 5. Settings Store Pattern

Persisted Svelte store backed by localStorage. Version-controlled for migrations.

```typescript
// Reading (reactive — in Svelte component)
$settings.ai.anthropicApiKey

// Writing (merges patch)
update({ ai: { ollamaModel: 'llama3' } });

// Snapshot (non-reactive — in event handlers)
const current = snapshot();

// Export / import
const json = exportSettings();      // string
const ok   = importSettings(json);  // boolean
```

Settings auto-persist on every change via `settings.subscribe(save)`.

## 6. Ollama Integration Pattern

Local LLM for cheap/private tasks. Always provide system prompt + focused prompt.

```typescript
import { generate, OllamaError } from '$lib/integrations/ollama';

const result = await generate({
  prompt: 'Write a 3-sentence summary of...',
  system: 'You are a focused daily-briefing writer...',
  temperature: 0.4,   // lower = more deterministic
  maxTokens: 400,
  baseUrl: ollamaBaseUrl,  // from user settings
  model: ollamaModel,
});

// Error handling
try {
  const result = await generate(opts);
  return json({ briefing: result.text, meta: { model: result.model } });
} catch (err) {
  if (err instanceof OllamaError) {
    return json({ error: 'Local LLM unavailable', detail: err.message }, { status: 502 });
  }
  return json({ error: 'Unexpected error' }, { status: 500 });
}
```

## 7. Anthropic CORS Proxy Pattern

Browsers cannot call `api.anthropic.com` directly. Always proxy through a server endpoint.

```typescript
// Client-side code (settings page testing Anthropic key)
const res = await fetch('/api/anthropic/test', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    apiKey: $settings.ai.anthropicApiKey || undefined,
    model: $settings.ai.anthropicModel,
  }),
});

// Server endpoint (/api/anthropic/test/+server.ts)
// Key resolution: body.apiKey → env.ANTHROPIC_API_KEY → error
const key = (body.apiKey || env.ANTHROPIC_API_KEY || '').trim();
```

BYOK keys are accepted in request body, used once, never logged.

## 8. API Route Structure

```typescript
// SvelteKit API handler pattern
import { json, type RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request, platform }) => {
  let body: ExpectedType;
  try { body = await request.json(); }
  catch { return json({ error: 'Invalid JSON body' }, { status: 400 }); }

  // validate required fields
  if (!body.requiredField) return json({ error: 'requiredField required' }, { status: 400 });

  // do work ...
  return json(result, { status: 201 });
};
```

## 9. Multi-Step Form with AI Generation

The project intake form (`/projects/new`) uses a 4-step Svelte wizard with form actions:

- Step 1: Project basics (name, slug, kind, client, repo)
- Step 2: Tech stack (frontend, backend, infra, database)
- Step 3: Goals, deliverables, timeline, constraints
- Step 4: Integration flags (Asana, Shopify, agent)

On submit, the server action calls Anthropic to generate: `{ brief, tasks[], ccsConfig }`.
The prompt instructs Claude to return **only valid JSON** — no markdown fences, no commentary.

## 10. CSS Accent Color Pattern

Each project has a CSS custom property for its accent color.

```css
/* app.css */
--color-ccs:      #...;
--color-forge:    #...;
--color-athena:   #...;
--color-northcoast: #...;
--color-wallet:   #...;
--color-infra:    #...;
```

Referenced in `ProjectManifest.accent` and applied dynamically in project cards.

## 11. Settings Flash Message Pattern

```typescript
let savedFlash = $state<string>('');

function flashSaved(msg = 'Saved') {
  savedFlash = msg;
  setTimeout(() => (savedFlash = ''), 1800);  // auto-clear after 1.8s
}
```

Used throughout the settings page for non-blocking user feedback.

## 12. Key Masking Pattern

```typescript
function maskKey(key: string): string {
  if (!key) return '';
  if (key.length < 12) return '•'.repeat(key.length);
  return key.slice(0, 7) + '•'.repeat(key.length - 11) + key.slice(-4);
}
// Input:  sk-ant-api03-abc123def456xyz789...WXYZ
// Output: sk-ant-a••••••••••••••••••••••WXYZ
```

Applied to all API key display fields in the settings page.
