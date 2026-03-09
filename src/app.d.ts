// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

declare global {
	/** Minimal KV binding shape — matches Cloudflare's KVNamespace */
	interface KVNamespace {
	  get(key: string): Promise<string | null>;
	  get<T>(key: string, type: 'json'): Promise<T | null>;
	  get(key: string, type: 'text'): Promise<string | null>;
	  put(key: string, value: string): Promise<void>;
	  delete(key: string): Promise<void>;
	  list(options?: { prefix?: string; limit?: number }): Promise<{ keys: { name: string }[] }>;
	}
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		interface Platform {
			env: {
				AI: {
					run(model: string, options: {
						messages: Array<{ role: string; content: string }>;
						max_tokens?: number;
						temperature?: number;
					}): Promise<{ response: string }>;
				};
				// Cloudflare KV namespace for invoice persistence
				KV_INVOICES?: KVNamespace;
				// Additional bindings as needed (R2, D1…)
			};
			context: ExecutionContext;
			caches: CacheStorage & { default: Cache };
		}
	}
}

export {};
