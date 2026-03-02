// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
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
				// Add other bindings here as needed (KV, R2, D1…)
			};
			context: ExecutionContext;
			caches: CacheStorage & { default: Cache };
		}
	}
}

export {};
