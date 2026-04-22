/**
 * POST /api/ollama/summarize
 * Summarize a list of activity events into a short paragraph using the
 * local Ollama phi3 model.
 *
 * Body: { events: ActivityEvent[], style?: 'brief' | 'detailed' }
 */

import { json, type RequestHandler } from '@sveltejs/kit';
import { generate, OllamaError } from '$lib/integrations/ollama';

export interface ActivityEvent {
  project: string;
  event: string;
  time: string | Date;
}

interface RequestBody {
  events: ActivityEvent[];
  style?: 'brief' | 'detailed';
  /** Optional Ollama overrides from user settings. */
  ollamaBaseUrl?: string;
  ollamaModel?: string;
}

function formatEventsForPrompt(events: ActivityEvent[]): string {
  return events
    .map((e) => {
      const t = typeof e.time === 'string' ? e.time : e.time.toISOString();
      return `- [${e.project}] ${e.event} (${t})`;
    })
    .join('\n');
}

export const POST: RequestHandler = async ({ request }) => {
  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { events, style = 'brief', ollamaBaseUrl, ollamaModel } = body;

  if (!Array.isArray(events) || events.length === 0) {
    return json({ error: 'events array is required' }, { status: 400 });
  }

  const sentenceGuidance =
    style === 'detailed'
      ? 'Write 3-4 sentences covering the most notable progress across projects.'
      : 'Write 2 tight sentences covering the most notable progress.';

  const system = [
    'You are a concise project summarizer.',
    'Given a list of recent activity events across multiple projects, produce a short natural-language summary.',
    'Do not list every event. Group related items. Lead with the most impactful.',
    'Never add commentary about the summary itself. Just write the summary.',
  ].join(' ');

  const prompt = [
    'Recent activity across projects:',
    formatEventsForPrompt(events),
    '',
    sentenceGuidance,
  ].join('\n');

  try {
    const result = await generate({
      prompt,
      system,
      temperature: 0.3,
      maxTokens: 200,
      baseUrl: ollamaBaseUrl,
      model: ollamaModel,
    });

    return json({
      summary: result.text,
      meta: {
        model: result.model,
        durationMs: result.durationMs,
        eventsSummarized: events.length,
      },
    });
  } catch (err) {
    if (err instanceof OllamaError) {
      console.error('[ollama/summarize]', err.message);
      return json(
        { error: 'Local LLM unavailable', detail: err.message },
        { status: 502 }
      );
    }
    console.error('[ollama/summarize] unexpected', err);
    return json({ error: 'Unexpected error generating summary' }, { status: 500 });
  }
};
