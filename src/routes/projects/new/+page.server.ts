import { fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { Actions } from './$types';

// ── Types ──────────────────────────────────────────────────────────

interface IntakeForm {
  // Step 1 — basics
  name: string;
  slug: string;
  kind: string;
  client: string;
  repo: string;

  // Step 2 — stack
  frontend: string;
  backend: string;
  infra: string;
  database: string;

  // Step 3 — goals
  goal: string;
  deliverables: string;
  timeline: string;
  constraints: string;

  // Step 4 — integrations
  hasAsana: boolean;
  hasShopify: boolean;
  shopifyDomain: string;
  hasAgent: boolean;
}

interface GeneratedOutput {
  brief: {
    summary: string;
    goals: string[];
    deliverables: string[];
    risks: string[];
    successCriteria: string[];
    techNotes: string;
  };
  tasks: Array<{
    name: string;
    section: string;
    priority: string;
    notes: string;
  }>;
  ccsConfig: Record<string, unknown>;
}

// ── Prompt builder ─────────────────────────────────────────────────

function buildPrompt(f: IntakeForm): string {
  return `You are a senior engineering project lead. A developer is starting a new project and needs structured output.

PROJECT INTAKE:
- Name: ${f.name}
- Type: ${f.kind}
- Client: ${f.client || 'Internal'}
- Repository: ${f.repo || 'TBD'}
- Frontend: ${f.frontend || 'TBD'}
- Backend: ${f.backend || 'TBD'}
- Infrastructure: ${f.infra || 'TBD'}
- Database: ${f.database || 'TBD'}
- Goal: ${f.goal}
- Key Deliverables: ${f.deliverables || 'Not specified'}
- Timeline: ${f.timeline || 'Not specified'}
- Constraints: ${f.constraints || 'None stated'}
- Asana integration: ${f.hasAsana}
- Shopify integration: ${f.hasShopify}${f.shopifyDomain ? ` (${f.shopifyDomain})` : ''}
- Local agent: ${f.hasAgent}

Respond with ONLY valid JSON in exactly this structure — no markdown fences, no commentary before or after:

{
  "brief": {
    "summary": "2-3 sentence executive summary of the project",
    "goals": ["goal 1", "goal 2", "goal 3"],
    "deliverables": ["deliverable 1", "deliverable 2"],
    "risks": ["risk 1", "risk 2"],
    "successCriteria": ["criterion 1", "criterion 2"],
    "techNotes": "1-2 sentences on technical approach and key decisions"
  },
  "tasks": [
    { "name": "task name", "section": "Setup|Development|Testing|Deployment|Launch", "priority": "high|medium|low", "notes": "brief note or empty string" }
  ],
  "ccsConfig": {
    "id": "${f.slug || f.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}",
    "name": "${f.name}",
    "kind": "${f.kind}",
    "stack": {
      "frontend": "${f.frontend}",
      "backend": "${f.backend}",
      "infra": "${f.infra}",
      "database": "${f.database}"
    },
    "integrations": {
      "asana": ${f.hasAsana},
      "shopify": ${f.hasShopify},
      "agent": ${f.hasAgent}
    },
    "agents": [],
    "phases": [
      { "name": "Phase 1", "description": "Initial setup and foundations" },
      { "name": "Phase 2", "description": "Core feature development" },
      { "name": "Phase 3", "description": "Testing and hardening" },
      { "name": "Phase 4", "description": "Deployment and launch" }
    ]
  }
}

Generate 8-12 realistic tasks spread across the sections. Be specific to this project's actual stack and goals.`;
}

// ── Helpers ────────────────────────────────────────────────────────

/**
 * Claude sometimes wraps JSON in prose or markdown despite instructions.
 * This extracts the first valid JSON object from a response string.
 */
function extractJson(raw: string): string {
  // Strip accidental markdown fences
  let cleaned = raw
    .replace(/^```(?:json)?\s*/m, '')
    .replace(/\s*```\s*$/m, '')
    .trim();

  // If there's leading prose, find the first `{` and trim everything before it
  const firstBrace = cleaned.indexOf('{');
  if (firstBrace > 0) cleaned = cleaned.slice(firstBrace);

  // If there's trailing prose, find the last `}` and trim everything after it
  const lastBrace = cleaned.lastIndexOf('}');
  if (lastBrace !== -1 && lastBrace < cleaned.length - 1) {
    cleaned = cleaned.slice(0, lastBrace + 1);
  }

  return cleaned;
}

// ── Action ─────────────────────────────────────────────────────────

export const actions: Actions = {
  generate: async ({ request }) => {
    const data = await request.formData();

    const form: IntakeForm = {
      name:          (data.get('name')          as string ?? '').trim(),
      slug:          (data.get('slug')          as string ?? '').trim(),
      kind:          (data.get('kind')          as string ?? '').trim(),
      client:        (data.get('client')        as string ?? '').trim(),
      repo:          (data.get('repo')          as string ?? '').trim(),
      frontend:      (data.get('frontend')      as string ?? '').trim(),
      backend:       (data.get('backend')       as string ?? '').trim(),
      infra:         (data.get('infra')         as string ?? '').trim(),
      database:      (data.get('database')      as string ?? '').trim(),
      goal:          (data.get('goal')          as string ?? '').trim(),
      deliverables:  (data.get('deliverables')  as string ?? '').trim(),
      timeline:      (data.get('timeline')      as string ?? '').trim(),
      constraints:   (data.get('constraints')   as string ?? '').trim(),
      hasAsana:      data.get('hasAsana')      === 'on',
      hasShopify:    data.get('hasShopify')    === 'on',
      shopifyDomain: (data.get('shopifyDomain') as string ?? '').trim(),
      hasAgent:      data.get('hasAgent')      === 'on',
    };

    if (!form.name || !form.goal) {
      return fail(400, { form, error: 'Project name and goal are required.' });
    }

    // Prefer user-supplied key (from settings) over server env key.
    const userKey = ((data.get('userApiKey') as string) ?? '').trim();
    const userModel = ((data.get('userModel') as string) ?? '').trim();
    const apiKey = userKey || env.ANTHROPIC_API_KEY;
    const model = userModel || 'claude-sonnet-4-5';

    if (!apiKey) {
      return fail(503, {
        form,
        error: 'No Anthropic API key available. Add one in Settings → AI Providers, or configure ANTHROPIC_API_KEY on the server.',
      });
    }

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          temperature: 0.3,
          system:
            'You are a senior engineering project lead. You return only valid JSON — no markdown fences, no prose before or after. Your JSON exactly matches the schema requested by the user.',
          messages: [
            { role: 'user', content: buildPrompt(form) },
          ],
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        console.error('[intake] Anthropic error:', res.status, errText);
        return fail(502, {
          form,
          error: `AI provider error (${res.status}). Check your API key and try again.`,
        });
      }

      const data = await res.json();
      const raw: string = data?.content?.[0]?.text ?? '';

      if (!raw) {
        return fail(502, { form, error: 'AI returned an empty response.' });
      }

      let parsed: GeneratedOutput;
      try {
        parsed = JSON.parse(extractJson(raw));
      } catch {
        return fail(422, {
          form,
          error: 'AI returned invalid JSON. This is a transient issue — try regenerating.',
          raw,
        });
      }

      return {
        success: true as const,
        form,
        brief: parsed.brief,
        tasks: parsed.tasks,
        ccsConfig: parsed.ccsConfig,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[intake] unexpected error:', err);
      return fail(500, { form, error: `Request failed: ${message}` });
    }
  },
};
