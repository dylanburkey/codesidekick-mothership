/**
 * Settings store — persisted to localStorage, typed, versioned.
 *
 * Security note: localStorage is readable by any script on this origin and by
 * anyone with browser access. It is fine for a personal single-user dashboard
 * but NOT appropriate if this app is ever shared. For multi-user, move secrets
 * to a server-side encrypted store.
 */

import { writable, get, type Writable } from 'svelte/store';
import { browser } from '$app/environment';

/**
 * Bump this when the shape changes. `load()` applies migrations for older
 * shapes so existing users don't lose their data.
 */
const SETTINGS_VERSION = 1;
const STORAGE_KEY = 'mothership.settings.v1';

// ── Types ─────────────────────────────────────────────────────────

export interface AIProvidersSettings {
	/** User's own Anthropic API key. Takes precedence over the server's key. */
	anthropicApiKey: string;
	/** Preferred Claude model for expensive operations. */
	anthropicModel: string;
	/** Ollama base URL — override default 10.0.0.45:11434 if needed. */
	ollamaBaseUrl: string;
	/** Default Ollama model for cheap/local operations. */
	ollamaModel: string;
	/**
	 * Routing preference for LLM calls:
	 * - 'auto'   — use Anthropic when available, fall back to Ollama
	 * - 'anthropic' — always use Anthropic (fail if unavailable)
	 * - 'ollama' — always use Ollama (free, private, lower quality)
	 */
	routing: 'auto' | 'anthropic' | 'ollama';
}

export interface IntegrationsSettings {
	asana: { enabled: boolean; pat: string; workspaceId: string };
	shopify: { enabled: boolean; adminToken: string; storeDomain: string };
	github: { enabled: boolean; token: string; username: string };
}

export interface AppearanceSettings {
	/** Color theme. 'system' follows OS preference. */
	theme: 'light' | 'dark' | 'system';
	/** UI density. Affects padding and spacing across the app. */
	density: 'comfortable' | 'compact';
	/** Reduce animations for motion-sensitive users. */
	reduceMotion: boolean;
}

export interface AppSettings {
	version: number;
	ai: AIProvidersSettings;
	integrations: IntegrationsSettings;
	appearance: AppearanceSettings;
}

// ── Defaults ──────────────────────────────────────────────────────

export const defaultSettings: AppSettings = {
	version: SETTINGS_VERSION,
	ai: {
		anthropicApiKey: '',
		anthropicModel: 'claude-sonnet-4-5',
		ollamaBaseUrl: 'http://10.0.0.45:11434',
		ollamaModel: 'phi3',
		routing: 'auto',
	},
	integrations: {
		asana:   { enabled: false, pat: '',         workspaceId: '' },
		shopify: { enabled: false, adminToken: '',  storeDomain: '' },
		github:  { enabled: false, token: '',       username: '' },
	},
	appearance: {
		theme: 'dark',
		density: 'comfortable',
		reduceMotion: false,
	},
};

// ── Load / save ───────────────────────────────────────────────────

function load(): AppSettings {
	if (!browser) return structuredClone(defaultSettings);

	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return structuredClone(defaultSettings);

		const parsed = JSON.parse(raw) as Partial<AppSettings>;

		// Migration point — when bumping SETTINGS_VERSION, handle old shapes here
		// if (parsed.version === 0) { ... upgrade to v1 ... }

		// Merge against defaults so new fields get sane values
		return {
			version: SETTINGS_VERSION,
			ai:          { ...defaultSettings.ai,          ...parsed.ai },
			integrations: {
				asana:   { ...defaultSettings.integrations.asana,   ...parsed.integrations?.asana },
				shopify: { ...defaultSettings.integrations.shopify, ...parsed.integrations?.shopify },
				github:  { ...defaultSettings.integrations.github,  ...parsed.integrations?.github },
			},
			appearance:  { ...defaultSettings.appearance,  ...parsed.appearance },
		};
	} catch (err) {
		console.warn('[settings] failed to parse stored settings, using defaults', err);
		return structuredClone(defaultSettings);
	}
}

function save(s: AppSettings) {
	if (!browser) return;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
	} catch (err) {
		console.error('[settings] failed to persist settings', err);
	}
}

// ── Store ─────────────────────────────────────────────────────────

export const settings: Writable<AppSettings> = writable(load());

// Auto-persist on any change
if (browser) {
	settings.subscribe((value) => save(value));
}

// ── Helpers ───────────────────────────────────────────────────────

/**
 * Synchronously snapshot current settings. Use inside handlers where you
 * don't want to subscribe.
 */
export function snapshot(): AppSettings {
	return get(settings);
}

/** Merge a partial update into settings. */
export function update(patch: Partial<AppSettings>): void {
	settings.update((s) => ({
		...s,
		...patch,
		ai:           { ...s.ai,           ...(patch.ai ?? {}) },
		integrations: { ...s.integrations, ...(patch.integrations ?? {}) },
		appearance:   { ...s.appearance,   ...(patch.appearance ?? {}) },
	}));
}

/** Reset everything to defaults. Does not clear projects or other stores. */
export function resetToDefaults(): void {
	settings.set(structuredClone(defaultSettings));
}

/**
 * Export all settings as a JSON-safe object for backup.
 * Excludes nothing — so downloads will include keys. Warn the user.
 */
export function exportSettings(): string {
	return JSON.stringify(snapshot(), null, 2);
}

/**
 * Import a previously-exported settings JSON string.
 * Returns true on success, false if the JSON is invalid.
 */
export function importSettings(raw: string): boolean {
	try {
		const parsed = JSON.parse(raw);
		if (typeof parsed !== 'object' || parsed === null) return false;
		settings.set({
			version: SETTINGS_VERSION,
			ai:          { ...defaultSettings.ai,          ...parsed.ai },
			integrations: {
				asana:   { ...defaultSettings.integrations.asana,   ...parsed.integrations?.asana },
				shopify: { ...defaultSettings.integrations.shopify, ...parsed.integrations?.shopify },
				github:  { ...defaultSettings.integrations.github,  ...parsed.integrations?.github },
			},
			appearance:  { ...defaultSettings.appearance,  ...parsed.appearance },
		});
		return true;
	} catch {
		return false;
	}
}
