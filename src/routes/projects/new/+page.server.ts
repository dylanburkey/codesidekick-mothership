import { fail } from '@sveltejs/kit';
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

// ── Prompt builder ─────────────────────────────────────────────────

function buildPrompt(f: IntakeForm): string {
  return `You are a senior engineering project lead. A developer is starting a new project and needs structured output in three sections.

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
- Key Deliverables: ${f.deliverables}
- Timeline: ${f.timeline || 'Not specified'}
- Constraints: ${f.constraints || 'None stated'}
- Asana integration: ${f.hasAsana}
- Shopify integration: ${f.hasShopify}${f.shopifyDomain ? ` (${f.shopifyDomain})` : ''}
- Local agent: ${f.hasAgent}

Respond with ONLY valid JSON in exactly this structure — no markdown fences, no commentary:

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

// ── Action ─────────────────────────────────────────────────────────

export const actions: Actions = {
  generate: async ({ request, platform }) => {
    const data = await request.formData();

    const form: IntakeForm = {
      name:          data.get('name') as string,
      slug:          data.get('slug') as string,
      kind:          data.get('kind') as string,
      client:        data.get('client') as string,
      repo:          data.get('repo') as string,
      frontend:      data.get('frontend') as string,
      backend:       data.get('backend') as string,
      infra:         data.get('infra') as string,
      database:      data.get('database') as string,
      goal:          data.get('goal') as string,
      deliverables:  data.get('deliverables') as string,
      timeline:      data.get('timeline') as string,
      constraints:   data.get('constraints') as string,
      hasAsana:      data.get('hasAsana') === 'on',
      hasShopify:    data.get('hasShopify') === 'on',
      shopifyDomain: data.get('shopifyDomain') as string,
      hasAgent:      data.get('hasAgent') === 'on',
    };

    if (!form.name || !form.goal) {
      return fail(400, { error: 'Project name and goal are required.' });
    }

    const ai = platform?.env?.AI;
    if (!ai) {
      return fail(503, { error: 'Cloudflare AI binding not available. Check wrangler.toml and deployment.' });
    }

    try {
      const response = await ai.run('@hf/mistral/mistral-7b-instruct-v0.2', {
        messages: [
          {
            role: 'user',
            content: buildPrompt(form),
          },
        ],
        max_tokens: 2048,
        temperature: 0.3,
      });

      const raw: string = response?.response ?? '';

      // Strip any accidental markdown fences
      const cleaned = raw
        .replace(/^```(?:json)?\s*/m, '')
        .replace(/\s*```$/m, '')
        .trim();

      let parsed: {
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
      };

      try {
        parsed = JSON.parse(cleaned);
      } catch {
        return fail(422, {
          error: 'AI returned invalid JSON. Try again — the model occasionally misbehaves on first attempt.',
          raw,
        });
      }

      return {
        success: true,
        form,
        brief: parsed.brief,
        tasks: parsed.tasks,
        ccsConfig: parsed.ccsConfig,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return fail(500, { error: `Workers AI error: ${message}` });
    }
  },
};
