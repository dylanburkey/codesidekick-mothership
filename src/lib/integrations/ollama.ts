/**
 * Ollama — local LLM client.
 *
 * Runs on the iMac server at 10.0.0.45:11434. Free, private, offline-capable.
 * Best for high-volume / low-stakes tasks: summarization, categorization,
 * formatting cleanup. For reasoning-heavy work, use the Anthropic chat endpoint.
 *
 * Override the base URL with OLLAMA_BASE_URL in .env if needed.
 */

import { env } from '$env/dynamic/private';

const DEFAULT_BASE = 'http://10.0.0.45:11434';
const DEFAULT_MODEL = 'phi3';

/** How long to wait before giving up on a generate call. */
const DEFAULT_TIMEOUT_MS = 30_000;

export interface GenerateOptions {
  /** Prompt text — keep it focused and specific. */
  prompt: string;
  /** Optional system prompt / role instructions. */
  system?: string;
  /** Override the default model (phi3). */
  model?: string;
  /** Temperature 0..1 — lower = more deterministic. Default 0.3. */
  temperature?: number;
  /** Max tokens to generate. Default 512. */
  maxTokens?: number;
  /** Per-call timeout override. */
  timeoutMs?: number;
}

export interface GenerateResult {
  /** The generated text, trimmed. */
  text: string;
  /** Total tokens evaluated (prompt + generated). */
  tokensEvaluated?: number;
  /** How long the model spent generating, in ms. */
  durationMs?: number;
  /** The model that actually produced the response. */
  model: string;
}

export class OllamaError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'OllamaError';
  }
}

/**
 * Single-shot text generation. Non-streaming — Ollama returns the full
 * response once the model is done.
 */
export async function generate(opts: GenerateOptions): Promise<GenerateResult> {
  const base = env.OLLAMA_BASE_URL || DEFAULT_BASE;
  const model = opts.model || env.OLLAMA_MODEL || DEFAULT_MODEL;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${base}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        prompt: opts.prompt,
        system: opts.system,
        stream: false,
        options: {
          temperature: opts.temperature ?? 0.3,
          num_predict: opts.maxTokens ?? 512,
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new OllamaError(
        `Ollama returned ${res.status}: ${text.slice(0, 200)}`,
        res.status
      );
    }

    const data = await res.json();

    return {
      text: (data.response ?? '').trim(),
      tokensEvaluated: data.eval_count,
      durationMs: data.eval_duration ? Math.round(data.eval_duration / 1_000_000) : undefined,
      model: data.model ?? model,
    };
  } catch (err) {
    if (err instanceof OllamaError) throw err;
    if (err instanceof Error && err.name === 'AbortError') {
      throw new OllamaError(`Ollama request timed out after ${timeoutMs}ms`);
    }
    const msg = err instanceof Error ? err.message : String(err);
    throw new OllamaError(`Ollama request failed: ${msg}`);
  } finally {
    clearTimeout(timeout);
  }
}

/** Quick health check — is the server reachable? */
export async function isReachable(timeoutMs = 3_000): Promise<boolean> {
  const base = env.OLLAMA_BASE_URL || DEFAULT_BASE;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${base}/api/tags`, { signal: controller.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
