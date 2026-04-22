<script lang="ts">
	import {
		settings,
		defaultSettings,
		resetToDefaults,
		exportSettings,
		importSettings,
	} from '$lib/stores/settings';

	type Tab = 'ai' | 'integrations' | 'appearance' | 'data';
	let activeTab = $state<Tab>('ai');

	// ── Local UI state ─────────────────────────────────────────────
	let showAnthropicKey = $state(false);
	let showAsanaPat = $state(false);
	let showShopifyToken = $state(false);
	let showGithubToken = $state(false);

	let savedFlash = $state<string>('');
	let testingOllama = $state(false);
	let ollamaStatus = $state<{ ok: boolean; msg: string } | null>(null);

	let testingAnthropic = $state(false);
	let anthropicStatus = $state<{ ok: boolean; msg: string } | null>(null);

	let importError = $state<string>('');
	let confirmReset = $state(false);

	// ── Handlers ───────────────────────────────────────────────────

	function flashSaved(msg = 'Saved') {
		savedFlash = msg;
		setTimeout(() => (savedFlash = ''), 1800);
	}

	// Svelte 5: the store is reactive; binding updates auto-persist via
	// subscribe() in the store module. We just flash "Saved" on blur of inputs.

	async function testOllama() {
		testingOllama = true;
		ollamaStatus = null;
		try {
			const base = $settings.ai.ollamaBaseUrl.replace(/\/$/, '');
			const res = await fetch(`${base}/api/tags`);
			if (!res.ok) {
				ollamaStatus = { ok: false, msg: `HTTP ${res.status}` };
			} else {
				const data = await res.json();
				const modelCount = data.models?.length ?? 0;
				ollamaStatus = {
					ok: true,
					msg: `Reachable · ${modelCount} model${modelCount === 1 ? '' : 's'} installed`,
				};
			}
		} catch (err) {
			ollamaStatus = {
				ok: false,
				msg: err instanceof Error ? err.message : 'Network error',
			};
		} finally {
			testingOllama = false;
		}
	}

	async function testAnthropic() {
		testingAnthropic = true;
		anthropicStatus = null;
		try {
			// We test by hitting our own server endpoint which has the key
			// (browsers block CORS to api.anthropic.com from user-origin scripts).
			// The server endpoint accepts an optional user key in the body.
			const res = await fetch('/api/anthropic/test', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					apiKey: $settings.ai.anthropicApiKey || undefined,
					model: $settings.ai.anthropicModel,
				}),
			});
			const data = await res.json();
			anthropicStatus = res.ok
				? { ok: true, msg: data.msg ?? 'Key works' }
				: { ok: false, msg: data.error ?? `HTTP ${res.status}` };
		} catch (err) {
			anthropicStatus = {
				ok: false,
				msg: err instanceof Error ? err.message : 'Network error',
			};
		} finally {
			testingAnthropic = false;
		}
	}

	function handleExport() {
		const json = exportSettings();
		const blob = new Blob([json], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `mothership-settings-${new Date().toISOString().split('T')[0]}.json`;
		a.click();
		URL.revokeObjectURL(url);
		flashSaved('Exported');
	}

	function handleImport(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		importError = '';

		const reader = new FileReader();
		reader.onload = () => {
			const ok = importSettings(String(reader.result));
			if (ok) {
				flashSaved('Imported');
			} else {
				importError = 'File is not a valid settings export.';
			}
			input.value = '';
		};
		reader.readAsText(file);
	}

	function handleReset() {
		if (!confirmReset) {
			confirmReset = true;
			setTimeout(() => (confirmReset = false), 4000);
			return;
		}
		resetToDefaults();
		confirmReset = false;
		flashSaved('Reset to defaults');
	}

	function maskKey(key: string): string {
		if (!key) return '';
		if (key.length < 12) return '•'.repeat(key.length);
		return key.slice(0, 7) + '•'.repeat(key.length - 11) + key.slice(-4);
	}
</script>

<svelte:head>
	<title>Settings — Mothership</title>
</svelte:head>

<div class="settings">

	<!-- ── Header ────────────────────────────────────────── -->
	<header class="settings__header">
		<div>
			<h1 class="settings__title">Settings</h1>
			<p class="settings__subtitle">Configure AI providers, integrations, and appearance. All settings are stored locally in your browser.</p>
		</div>
		{#if savedFlash}
			<span class="flash" role="status">{savedFlash}</span>
		{/if}
	</header>

	<!-- ── Tabs ──────────────────────────────────────────── -->
	<nav class="settings__tabs" role="tablist">
		<button class="tab" class:tab--active={activeTab === 'ai'} onclick={() => activeTab = 'ai'} role="tab">
			<span aria-hidden="true">🤖</span> AI Providers
		</button>
		<button class="tab" class:tab--active={activeTab === 'integrations'} onclick={() => activeTab = 'integrations'} role="tab">
			<span aria-hidden="true">🔌</span> Integrations
		</button>
		<button class="tab" class:tab--active={activeTab === 'appearance'} onclick={() => activeTab = 'appearance'} role="tab">
			<span aria-hidden="true">🎨</span> Appearance
		</button>
		<button class="tab" class:tab--active={activeTab === 'data'} onclick={() => activeTab = 'data'} role="tab">
			<span aria-hidden="true">💾</span> Data
		</button>
	</nav>

	<!-- ══════════════════════════════ AI PROVIDERS ══════════════════════════════ -->
	{#if activeTab === 'ai'}
		<section class="panel">
			<div class="panel__head">
				<h2 class="panel__title">Routing</h2>
				<p class="panel__desc">How the mothership decides which LLM to use.</p>
			</div>

			<div class="field">
				<div class="radio-group">
					<label class="radio">
						<input type="radio" bind:group={$settings.ai.routing} value="auto" />
						<div>
							<strong>Auto</strong>
							<span class="radio__desc">Use Claude when available, fall back to Ollama. Recommended.</span>
						</div>
					</label>
					<label class="radio">
						<input type="radio" bind:group={$settings.ai.routing} value="anthropic" />
						<div>
							<strong>Always Anthropic</strong>
							<span class="radio__desc">Best quality. Uses paid API credits. Fails if unreachable.</span>
						</div>
					</label>
					<label class="radio">
						<input type="radio" bind:group={$settings.ai.routing} value="ollama" />
						<div>
							<strong>Always Ollama (local)</strong>
							<span class="radio__desc">Free, private, lower quality. Runs on your iMac server.</span>
						</div>
					</label>
				</div>
			</div>
		</section>

		<section class="panel">
			<div class="panel__head">
				<h2 class="panel__title">Anthropic (Claude)</h2>
				<p class="panel__desc">
					Used for the high-quality operations: project intake, chat, deep summaries.
					If you don't provide a key here, the server's shared key is used.
				</p>
			</div>

			<div class="field">
				<label for="anthropic-key">Your API key <span class="field__optional">(optional)</span></label>
				<div class="input-row">
					{#if showAnthropicKey}
						<input
							id="anthropic-key"
							type="text"
							bind:value={$settings.ai.anthropicApiKey}
							placeholder="sk-ant-api03-…"
							autocomplete="off"
							spellcheck="false"
						/>
					{:else}
						<input
							id="anthropic-key"
							type="password"
							bind:value={$settings.ai.anthropicApiKey}
							placeholder="sk-ant-api03-…"
							autocomplete="new-password"
							spellcheck="false"
						/>
					{/if}
					<button class="btn btn--ghost btn--icon" onclick={() => showAnthropicKey = !showAnthropicKey}
						aria-label={showAnthropicKey ? 'Hide key' : 'Show key'}>
						{showAnthropicKey ? '🙈' : '👁'}
					</button>
				</div>
				{#if $settings.ai.anthropicApiKey && !showAnthropicKey}
					<p class="field__hint"><code>{maskKey($settings.ai.anthropicApiKey)}</code></p>
				{/if}
				<p class="field__hint">
					Get one at <a href="https://console.anthropic.com" target="_blank" rel="noopener">console.anthropic.com</a>.
					Stored locally in your browser only.
				</p>
			</div>

			<div class="field">
				<label for="anthropic-model">Model</label>
				<select id="anthropic-model" bind:value={$settings.ai.anthropicModel}>
					<option value="claude-opus-4-7">Claude Opus 4.7 — most capable</option>
					<option value="claude-sonnet-4-5">Claude Sonnet 4.5 — balanced (recommended)</option>
					<option value="claude-haiku-4-5">Claude Haiku 4.5 — fastest, cheapest</option>
				</select>
			</div>

			<div class="field field--inline">
				<button class="btn btn--ghost" onclick={testAnthropic} disabled={testingAnthropic}>
					{testingAnthropic ? 'Testing…' : 'Test connection'}
				</button>
				{#if anthropicStatus}
					<span class="status" class:status--ok={anthropicStatus.ok} class:status--err={!anthropicStatus.ok}>
						{anthropicStatus.ok ? '✓' : '✗'} {anthropicStatus.msg}
					</span>
				{/if}
			</div>
		</section>

		<section class="panel">
			<div class="panel__head">
				<h2 class="panel__title">Ollama (Local LLM)</h2>
				<p class="panel__desc">
					Runs on your iMac server. Used for summaries, daily briefings, categorization — tasks where speed and cost matter more than nuance.
				</p>
			</div>

			<div class="field">
				<label for="ollama-url">Base URL</label>
				<input
					id="ollama-url"
					type="url"
					bind:value={$settings.ai.ollamaBaseUrl}
					placeholder="http://10.0.0.45:11434"
				/>
				<p class="field__hint">Default assumes your iMac server. Change only if you've moved Ollama.</p>
			</div>

			<div class="field">
				<label for="ollama-model">Model</label>
				<input
					id="ollama-model"
					type="text"
					bind:value={$settings.ai.ollamaModel}
					placeholder="phi3"
					list="ollama-model-suggestions"
				/>
				<datalist id="ollama-model-suggestions">
					<option value="phi3">phi3 — 3.8B, fast, light</option>
					<option value="llama3.1:8b">llama3.1:8b — 8B, better quality</option>
					<option value="mistral">mistral — 7B, balanced</option>
					<option value="qwen2.5:7b">qwen2.5:7b — 7B, strong at code</option>
				</datalist>
				<p class="field__hint">Must be a model you've pulled. SSH in and run <code>docker exec ollama ollama pull MODEL</code>.</p>
			</div>

			<div class="field field--inline">
				<button class="btn btn--ghost" onclick={testOllama} disabled={testingOllama}>
					{testingOllama ? 'Testing…' : 'Test connection'}
				</button>
				{#if ollamaStatus}
					<span class="status" class:status--ok={ollamaStatus.ok} class:status--err={!ollamaStatus.ok}>
						{ollamaStatus.ok ? '✓' : '✗'} {ollamaStatus.msg}
					</span>
				{/if}
			</div>
		</section>
	{/if}

	<!-- ══════════════════════════════ INTEGRATIONS ══════════════════════════════ -->
	{#if activeTab === 'integrations'}
		<section class="panel">
			<div class="panel__head">
				<div class="panel__head-row">
					<h2 class="panel__title">Asana</h2>
					<label class="toggle">
						<input type="checkbox" bind:checked={$settings.integrations.asana.enabled} />
						<span class="toggle__track"></span>
					</label>
				</div>
				<p class="panel__desc">Sync project tasks and status updates with Asana.</p>
			</div>

			{#if $settings.integrations.asana.enabled}
				<div class="field">
					<label for="asana-pat">Personal Access Token</label>
					<div class="input-row">
						<input
							id="asana-pat"
							type={showAsanaPat ? 'text' : 'password'}
							bind:value={$settings.integrations.asana.pat}
							placeholder="2/1234567890/…"
							autocomplete="off"
							spellcheck="false"
						/>
						<button class="btn btn--ghost btn--icon" onclick={() => showAsanaPat = !showAsanaPat}>
							{showAsanaPat ? '🙈' : '👁'}
						</button>
					</div>
					<p class="field__hint">
						<a href="https://app.asana.com/0/my-apps" target="_blank" rel="noopener">Manage tokens</a>
					</p>
				</div>

				<div class="field">
					<label for="asana-workspace">Workspace ID</label>
					<input
						id="asana-workspace"
						type="text"
						bind:value={$settings.integrations.asana.workspaceId}
						placeholder="1234567890123456"
					/>
					<p class="field__hint">Numeric workspace ID from any Asana URL.</p>
				</div>
			{/if}
		</section>

		<section class="panel">
			<div class="panel__head">
				<div class="panel__head-row">
					<h2 class="panel__title">Shopify</h2>
					<label class="toggle">
						<input type="checkbox" bind:checked={$settings.integrations.shopify.enabled} />
						<span class="toggle__track"></span>
					</label>
				</div>
				<p class="panel__desc">Admin API access for storefront, order, and inventory data.</p>
			</div>

			{#if $settings.integrations.shopify.enabled}
				<div class="field">
					<label for="shopify-domain">Store domain</label>
					<input
						id="shopify-domain"
						type="text"
						bind:value={$settings.integrations.shopify.storeDomain}
						placeholder="your-store.myshopify.com"
					/>
				</div>

				<div class="field">
					<label for="shopify-token">Admin API token</label>
					<div class="input-row">
						<input
							id="shopify-token"
							type={showShopifyToken ? 'text' : 'password'}
							bind:value={$settings.integrations.shopify.adminToken}
							placeholder="shpat_…"
							autocomplete="off"
							spellcheck="false"
						/>
						<button class="btn btn--ghost btn--icon" onclick={() => showShopifyToken = !showShopifyToken}>
							{showShopifyToken ? '🙈' : '👁'}
						</button>
					</div>
					<p class="field__hint">Create a custom app in your Shopify admin → Apps → Develop apps.</p>
				</div>
			{/if}
		</section>

		<section class="panel">
			<div class="panel__head">
				<div class="panel__head-row">
					<h2 class="panel__title">GitHub</h2>
					<label class="toggle">
						<input type="checkbox" bind:checked={$settings.integrations.github.enabled} />
						<span class="toggle__track"></span>
					</label>
				</div>
				<p class="panel__desc">Commit feeds, repo stats, and issue syncing.</p>
			</div>

			{#if $settings.integrations.github.enabled}
				<div class="field">
					<label for="github-username">Username</label>
					<input
						id="github-username"
						type="text"
						bind:value={$settings.integrations.github.username}
						placeholder="dylanburkey"
					/>
				</div>

				<div class="field">
					<label for="github-token">Personal Access Token</label>
					<div class="input-row">
						<input
							id="github-token"
							type={showGithubToken ? 'text' : 'password'}
							bind:value={$settings.integrations.github.token}
							placeholder="ghp_…"
							autocomplete="off"
							spellcheck="false"
						/>
						<button class="btn btn--ghost btn--icon" onclick={() => showGithubToken = !showGithubToken}>
							{showGithubToken ? '🙈' : '👁'}
						</button>
					</div>
					<p class="field__hint">
						<a href="https://github.com/settings/tokens" target="_blank" rel="noopener">Create fine-grained token</a>
						with Contents and Metadata read permissions.
					</p>
				</div>
			{/if}
		</section>
	{/if}

	<!-- ══════════════════════════════ APPEARANCE ══════════════════════════════ -->
	{#if activeTab === 'appearance'}
		<section class="panel">
			<div class="panel__head">
				<h2 class="panel__title">Theme</h2>
				<p class="panel__desc">Color scheme preference.</p>
			</div>

			<div class="field">
				<div class="radio-group radio-group--horizontal">
					<label class="radio-card">
						<input type="radio" bind:group={$settings.appearance.theme} value="dark" />
						<div class="radio-card__preview radio-card__preview--dark"></div>
						<span>Dark</span>
					</label>
					<label class="radio-card">
						<input type="radio" bind:group={$settings.appearance.theme} value="light" />
						<div class="radio-card__preview radio-card__preview--light"></div>
						<span>Light</span>
					</label>
					<label class="radio-card">
						<input type="radio" bind:group={$settings.appearance.theme} value="system" />
						<div class="radio-card__preview radio-card__preview--system"></div>
						<span>System</span>
					</label>
				</div>
			</div>
		</section>

		<section class="panel">
			<div class="panel__head">
				<h2 class="panel__title">Density</h2>
				<p class="panel__desc">Adjust padding and spacing across the interface.</p>
			</div>

			<div class="field">
				<div class="radio-group">
					<label class="radio">
						<input type="radio" bind:group={$settings.appearance.density} value="comfortable" />
						<div>
							<strong>Comfortable</strong>
							<span class="radio__desc">Generous padding, easier to scan. Default.</span>
						</div>
					</label>
					<label class="radio">
						<input type="radio" bind:group={$settings.appearance.density} value="compact" />
						<div>
							<strong>Compact</strong>
							<span class="radio__desc">Tighter spacing, more on screen at once.</span>
						</div>
					</label>
				</div>
			</div>
		</section>

		<section class="panel">
			<div class="panel__head">
				<h2 class="panel__title">Motion</h2>
			</div>

			<div class="field">
				<label class="toggle-row">
					<label class="toggle">
						<input type="checkbox" bind:checked={$settings.appearance.reduceMotion} />
						<span class="toggle__track"></span>
					</label>
					<div>
						<strong>Reduce motion</strong>
						<span class="toggle-row__desc">Disable non-essential animations and transitions.</span>
					</div>
				</label>
			</div>
		</section>
	{/if}

	<!-- ══════════════════════════════ DATA ══════════════════════════════ -->
	{#if activeTab === 'data'}
		<section class="panel">
			<div class="panel__head">
				<h2 class="panel__title">Backup &amp; Restore</h2>
				<p class="panel__desc">
					Export your settings as JSON to back them up or move them to another machine.
					<strong class="warn">Export files contain your API keys — treat them like passwords.</strong>
				</p>
			</div>

			<div class="field field--inline">
				<button class="btn btn--ghost" onclick={handleExport}>
					⬇ Export settings.json
				</button>

				<label class="btn btn--ghost">
					⬆ Import settings.json
					<input type="file" accept="application/json,.json" onchange={handleImport} hidden />
				</label>
			</div>

			{#if importError}
				<p class="status status--err">{importError}</p>
			{/if}
		</section>

		<section class="panel panel--danger">
			<div class="panel__head">
				<h2 class="panel__title">Reset</h2>
				<p class="panel__desc">
					Restore all settings to their defaults. Your API keys will be erased.
					Projects and activity data are stored separately and won't be affected.
				</p>
			</div>

			<div class="field field--inline">
				<button class="btn btn--danger" onclick={handleReset}>
					{confirmReset ? 'Click again to confirm reset' : 'Reset to defaults'}
				</button>
			</div>
		</section>

		<section class="panel">
			<div class="panel__head">
				<h2 class="panel__title">Storage</h2>
				<p class="panel__desc">
					Settings are stored in your browser's localStorage under
					<code>mothership.settings.v1</code>. Clearing your browser data or using a
					different browser will reset them.
				</p>
			</div>
		</section>
	{/if}

</div>

<style>
/* ── Layout ─────────────────────────────────────────────── */
.settings {
	max-width: 820px;
	margin-inline: auto;
	padding: 2rem 1.5rem 4rem;
}

.settings__header {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	gap: 1rem;
	margin-bottom: 1.5rem;
}

.settings__title {
	font-size: 1.75rem;
	font-weight: 700;
	margin: 0 0 .35rem;
	color: var(--color-text, #f1f5f9);
}

.settings__subtitle {
	color: var(--color-muted, #94a3b8);
	margin: 0;
	font-size: .9rem;
	max-width: 60ch;
	line-height: 1.5;
}

.flash {
	background: color-mix(in srgb, #22c55e 20%, transparent);
	color: #4ade80;
	border: 1px solid color-mix(in srgb, #22c55e 40%, transparent);
	padding: .3rem .6rem;
	border-radius: 4px;
	font-size: .78rem;
	font-weight: 500;
	animation: flash-in .2s ease-out;
	white-space: nowrap;
}

@keyframes flash-in {
	from { opacity: 0; transform: translateY(-4px); }
	to   { opacity: 1; transform: translateY(0); }
}

/* ── Tabs ──────────────────────────────────────────────── */
.settings__tabs {
	display: flex;
	gap: .25rem;
	border-bottom: 1px solid var(--color-border, #334155);
	margin-bottom: 2rem;
	overflow-x: auto;
}

.tab {
	background: none;
	border: none;
	padding: .7rem 1rem;
	font-size: .88rem;
	color: var(--color-muted, #64748b);
	cursor: pointer;
	border-bottom: 2px solid transparent;
	margin-bottom: -1px;
	transition: color .15s, border-color .15s;
	white-space: nowrap;
	display: inline-flex;
	align-items: center;
	gap: .4rem;
}

.tab:hover {
	color: var(--color-text-dim, #cbd5e1);
}

.tab--active {
	color: var(--color-text, #f1f5f9);
	border-bottom-color: var(--color-accent, #7c83ff);
}

/* ── Panels ────────────────────────────────────────────── */
.panel {
	background: var(--color-surface, #0f172a);
	border: 1px solid var(--color-border, #334155);
	border-radius: 10px;
	padding: 1.5rem;
	margin-bottom: 1.25rem;
}

.panel--danger {
	border-color: color-mix(in srgb, #ef4444 30%, var(--color-border, #334155));
}

.panel__head {
	margin-bottom: 1.25rem;
}

.panel__head-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 1rem;
}

.panel__title {
	font-size: 1.05rem;
	font-weight: 600;
	margin: 0;
	color: var(--color-text, #f1f5f9);
}

.panel__desc {
	font-size: .85rem;
	color: var(--color-muted, #94a3b8);
	margin: .35rem 0 0;
	line-height: 1.5;
}

.panel__desc .warn {
	display: block;
	margin-top: .5rem;
	color: #fbbf24;
	font-weight: 500;
}

/* ── Fields ────────────────────────────────────────────── */
.field {
	margin-bottom: 1.25rem;
}

.field:last-child {
	margin-bottom: 0;
}

.field--inline {
	display: flex;
	align-items: center;
	gap: .75rem;
	flex-wrap: wrap;
}

.field label {
	display: block;
	font-size: .85rem;
	font-weight: 500;
	color: var(--color-text-dim, #cbd5e1);
	margin-bottom: .4rem;
}

.field__optional {
	font-weight: 400;
	color: var(--color-muted, #64748b);
}

.field__hint {
	font-size: .78rem;
	color: var(--color-muted, #64748b);
	margin: .4rem 0 0;
	line-height: 1.5;
}

.field__hint a {
	color: var(--color-accent, #7c83ff);
	text-decoration: none;
}

.field__hint a:hover {
	text-decoration: underline;
}

.field__hint code {
	background: var(--color-surface-2, #1e293b);
	padding: .1em .35em;
	border-radius: 3px;
	font-size: .95em;
}

/* ── Inputs ────────────────────────────────────────────── */
input[type="text"],
input[type="password"],
input[type="url"],
select {
	width: 100%;
	background: var(--color-bg, #0b0f1a);
	border: 1px solid var(--color-border, #334155);
	border-radius: 6px;
	padding: .6rem .75rem;
	color: var(--color-text, #f1f5f9);
	font-size: .9rem;
	font-family: inherit;
	transition: border-color .15s;
	box-sizing: border-box;
}

input:focus,
select:focus {
	outline: none;
	border-color: var(--color-accent, #7c83ff);
	box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent, #7c83ff) 20%, transparent);
}

.input-row {
	display: flex;
	gap: .5rem;
}

.input-row input {
	flex: 1;
}

/* ── Radio groups ──────────────────────────────────────── */
.radio-group {
	display: flex;
	flex-direction: column;
	gap: .6rem;
}

.radio-group--horizontal {
	flex-direction: row;
	flex-wrap: wrap;
}

.radio {
	display: flex;
	gap: .75rem;
	padding: .75rem 1rem;
	border: 1px solid var(--color-border, #334155);
	border-radius: 8px;
	cursor: pointer;
	transition: border-color .15s, background .15s;
}

.radio:hover {
	background: var(--color-surface-2, #1e293b);
}

.radio:has(input:checked) {
	border-color: var(--color-accent, #7c83ff);
	background: color-mix(in srgb, var(--color-accent, #7c83ff) 8%, transparent);
}

.radio input {
	margin: 0;
	accent-color: var(--color-accent, #7c83ff);
}

.radio strong {
	display: block;
	color: var(--color-text, #f1f5f9);
	font-size: .9rem;
	margin-bottom: .15rem;
}

.radio__desc {
	display: block;
	color: var(--color-muted, #94a3b8);
	font-size: .8rem;
	line-height: 1.4;
}

/* ── Radio cards (theme selector) ──────────────────────── */
.radio-card {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: .5rem;
	padding: .75rem;
	border: 1px solid var(--color-border, #334155);
	border-radius: 8px;
	cursor: pointer;
	min-width: 100px;
	transition: border-color .15s;
}

.radio-card:has(input:checked) {
	border-color: var(--color-accent, #7c83ff);
}

.radio-card input {
	display: none;
}

.radio-card__preview {
	width: 60px;
	height: 40px;
	border-radius: 4px;
	border: 1px solid var(--color-border, #334155);
}

.radio-card__preview--dark  { background: linear-gradient(135deg, #0f172a, #1e293b); }
.radio-card__preview--light { background: linear-gradient(135deg, #f8fafc, #e2e8f0); }
.radio-card__preview--system {
	background: linear-gradient(135deg, #0f172a 0%, #0f172a 50%, #f8fafc 50%, #e2e8f0 100%);
}

.radio-card span {
	font-size: .82rem;
	color: var(--color-text-dim, #cbd5e1);
}

/* ── Toggle ────────────────────────────────────────────── */
.toggle {
	position: relative;
	display: inline-block;
	cursor: pointer;
	flex-shrink: 0;
}

.toggle input[type="checkbox"] {
	position: absolute;
	opacity: 0;
	width: 0;
	height: 0;
}

.toggle__track {
	display: inline-block;
	width: 40px;
	height: 22px;
	border-radius: 11px;
	background: var(--color-border, #334155);
	position: relative;
	transition: background .2s;
}

.toggle__track::after {
	content: '';
	position: absolute;
	top: 3px;
	left: 3px;
	width: 16px;
	height: 16px;
	border-radius: 50%;
	background: #fff;
	transition: transform .2s;
}

.toggle input:checked + .toggle__track {
	background: var(--color-accent, #7c83ff);
}

.toggle input:checked + .toggle__track::after {
	transform: translateX(18px);
}

.toggle-row {
	display: flex;
	gap: .75rem;
	align-items: flex-start;
}

.toggle-row strong {
	display: block;
	font-size: .9rem;
	color: var(--color-text, #f1f5f9);
	margin-bottom: .15rem;
}

.toggle-row__desc {
	display: block;
	font-size: .8rem;
	color: var(--color-muted, #94a3b8);
}

/* ── Buttons ───────────────────────────────────────────── */
.btn {
	display: inline-flex;
	align-items: center;
	gap: .4rem;
	padding: .5rem 1rem;
	border-radius: 6px;
	font-size: .85rem;
	font-weight: 500;
	cursor: pointer;
	border: 1px solid transparent;
	transition: background .15s, border-color .15s, opacity .15s;
	font-family: inherit;
}

.btn--ghost {
	background: transparent;
	color: var(--color-text-dim, #cbd5e1);
	border-color: var(--color-border, #334155);
}

.btn--ghost:hover:not(:disabled) {
	background: var(--color-surface-2, #1e293b);
	color: var(--color-text, #f1f5f9);
}

.btn--ghost:disabled {
	opacity: .5;
	cursor: wait;
}

.btn--icon {
	padding: .5rem .6rem;
}

.btn--danger {
	background: #ef4444;
	color: #fff;
	border-color: #ef4444;
}

.btn--danger:hover {
	background: #dc2626;
}

/* ── Status line ───────────────────────────────────────── */
.status {
	font-size: .82rem;
	font-weight: 500;
}

.status--ok {
	color: #4ade80;
}

.status--err {
	color: #f87171;
}
</style>
