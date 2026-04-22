/**
 * POST /api/anthropic/test
 * Validates an Anthropic API key with a minimal-cost request.
 *
 * Body: { apiKey?: string, model?: string }
 *   - apiKey: user-supplied key to test. If omitted, falls back to server env.
 *   - model:  model string to test against.
 *
 * This proxy exists because browsers cannot call api.anthropic.com directly
 * (CORS). Keys submitted here are forwarded once and never logged.
 */

import { json, type RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

interface TestBody {
	apiKey?: string;
	model?: string;
}

export const POST: RequestHandler = async ({ request }) => {
	let body: TestBody;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const key = (body.apiKey || env.ANTHROPIC_API_KEY || '').trim();
	if (!key) {
		return json(
			{ error: 'No API key provided and no server key configured' },
			{ status: 400 }
		);
	}

	const model = body.model || 'claude-sonnet-4-5';

	try {
		// Minimal request — 1 token in, 1 token out, costs a fraction of a cent.
		const res = await fetch('https://api.anthropic.com/v1/messages', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				'x-api-key': key,
				'anthropic-version': '2023-06-01',
			},
			body: JSON.stringify({
				model,
				max_tokens: 1,
				messages: [{ role: 'user', content: 'hi' }],
			}),
		});

		if (res.status === 401) {
			return json({ error: 'Invalid API key' }, { status: 401 });
		}
		if (res.status === 404) {
			return json({ error: `Model "${model}" not found for this key` }, { status: 404 });
		}
		if (!res.ok) {
			const text = await res.text().catch(() => '');
			return json(
				{ error: `HTTP ${res.status}${text ? `: ${text.slice(0, 120)}` : ''}` },
				{ status: 502 }
			);
		}

		const data = await res.json();
		return json({
			ok: true,
			msg: `Connected · model "${data.model ?? model}" responded`,
		});
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Network error';
		return json({ error: msg }, { status: 500 });
	}
};
