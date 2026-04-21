/**
 * POST /api/ollama/brief
 * Generate a daily briefing based on projects, recent activity, and optional
 * focus hints. Structured as a short morning-briefing paragraph.
 *
 * Body: {
 *   projects: BriefProject[],
 *   activity: BriefActivity[],
 *   focus?: string
 * }
 */

import { json, type RequestHandler } from '@sveltejs/kit';
import { generate, OllamaError } from '$lib/integrations/ollama';

export interface BriefProject {
  name: string;
  status: string;
  description?: string;
  client?: string;
}

export interface BriefActivity {
  project: string;
  event: string;
  time: string | Date;
}

interface RequestBody {
  projects: BriefProject[];
  activity: BriefActivity[];
  /** Optional user-supplied hint: "focus on shipping Forge", "prep for client call", etc. */
  focus?: string;
}

function fmt(dt: string | Date): string {
  const d = typeof dt === 'string' ? new Date(dt) : dt;
  return d.toISOString().split('T')[0];
}

export const POST: RequestHandler = async ({ request }) => {
  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { projects, activity, focus } = body;

  if (!Array.isArray(projects)) {
    return json({ error: 'projects array is required' }, { status: 400 });
  }

  const activeProjects = projects.filter((p) => p.status === 'active');
  const projectsBlock =
    activeProjects.length === 0
      ? '(no active projects)'
      : activeProjects
          .map((p) => {
            const bits = [p.name];
            if (p.client) bits.push(`for ${p.client}`);
            if (p.description) bits.push(`— ${p.description}`);
            return `- ${bits.join(' ')}`;
          })
          .join('\n');

  const activityBlock = Array.isArray(activity) && activity.length > 0
    ? activity
        .slice(0, 10)
        .map((e) => `- [${e.project}] ${e.event} (${fmt(e.time)})`)
        .join('\n')
    : '(no recent activity)';

  const system = [
    'You are a focused daily-briefing writer for a working developer.',
    'Produce a 3-paragraph briefing in a direct, unemotional tone.',
    'Paragraph 1: snapshot of active workload (1-2 sentences).',
    'Paragraph 2: what moved forward recently based on the activity log (1-2 sentences).',
    'Paragraph 3: one specific, actionable suggestion for today (1 sentence).',
    'No greetings. No sign-offs. No fluff like "Overall" or "In summary".',
  ].join(' ');

  const prompt = [
    'ACTIVE PROJECTS:',
    projectsBlock,
    '',
    'RECENT ACTIVITY (most recent first):',
    activityBlock,
    focus ? `\nUSER FOCUS FOR TODAY: ${focus}` : '',
    '',
    'Write the briefing now.',
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const result = await generate({
      prompt,
      system,
      temperature: 0.4,
      maxTokens: 400,
    });

    return json({
      briefing: result.text,
      meta: {
        model: result.model,
        durationMs: result.durationMs,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    if (err instanceof OllamaError) {
      console.error('[ollama/brief]', err.message);
      return json(
        { error: 'Local LLM unavailable', detail: err.message },
        { status: 502 }
      );
    }
    console.error('[ollama/brief] unexpected', err);
    return json({ error: 'Unexpected error generating briefing' }, { status: 500 });
  }
};
