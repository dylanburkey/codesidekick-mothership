/**
 * POST /api/chat
 * Project-aware AI chat endpoint — Claude primary, streams-friendly.
 *
 * Body: { messages: ChatMessage[], projectContext: string }
 */

import { json, type RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface RequestBody {
  messages: ChatMessage[];
  projectContext?: string;
}

export const POST: RequestHandler = async ({ request }) => {
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 503 });
  }

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { messages, projectContext } = body;

  if (!messages?.length) {
    return json({ error: 'messages array is required' }, { status: 400 });
  }

  const systemPrompt = [
    'You are an expert full-stack developer assistant embedded in a project management dashboard.',
    projectContext
      ? `\nThe developer is currently working on this project:\n${projectContext}`
      : '',
    '\nBe concise and practical. Lead with code when relevant.',
    'Format code in fenced blocks with language tags.',
    'Never mention that you are Claude or reference Anthropic unless directly asked.',
  ].join('');

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 2048,
        system: systemPrompt,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[chat] Anthropic error:', res.status, errText);
      return json({ error: `AI provider error (${res.status})` }, { status: 502 });
    }

    const data = await res.json();
    const content = data?.content?.[0]?.text ?? '';
    return json({ content });
  } catch (err) {
    console.error('[chat] fetch error:', err);
    return json({ error: 'Failed to reach AI provider' }, { status: 502 });
  }
};
