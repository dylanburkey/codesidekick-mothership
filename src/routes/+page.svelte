<script lang="ts">
	import type { PageData } from './$types';
	import { formatRelative } from '$lib/utils';

	let { data }: { data: PageData } = $props();

	const activeProjects = $derived(data.projects.filter(p => p.status !== 'archived'));
	const activeCount = $derived(activeProjects.filter(p => p.status === 'active').length);

	// Activity feed stays local for now — will be sourced from agent websockets
	const activity = [
		{ project: 'CCS',         color: 'var(--color-ccs)',       event: 'Phase 2 complete — awaiting approval', time: new Date(Date.now() - 12 * 60000).toISOString() },
		{ project: 'Forge',       color: 'var(--color-forge)',     event: 'Invoice list component merged',        time: new Date(Date.now() - 3 * 3600000).toISOString() },
		{ project: 'Athena',      color: 'var(--color-athena)',    event: 'Signal engine deployed to DO',         time: new Date(Date.now() - 6 * 3600000).toISOString() },
		{ project: 'WalletWatch', color: 'var(--color-wallet)',    event: 'Dust filter threshold updated',        time: new Date(Date.now() - 86400000).toISOString() },
	];

	const kindIcon: Record<string, string> = {
		ccs: '◈', shopify: '◆', defi: '◉', ai: '◎', infra: '⬡', forge: '◆', generic: '○',
	};

	// ── Ollama-powered briefing & summary state ──────────────────
	let briefingText = $state<string>('');
	let briefingLoading = $state(false);
	let briefingError = $state<string>('');
	let briefingMeta = $state<{ durationMs?: number; model?: string } | null>(null);

	let summaryText = $state<string>('');
	let summaryLoading = $state(false);
	let summaryError = $state<string>('');

	async function generateBriefing() {
		briefingLoading = true;
		briefingError = '';
		briefingMeta = null;
		try {
			const res = await fetch('/api/ollama/brief', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					projects: activeProjects.map(p => ({
						name: p.name,
						status: p.status,
						description: p.description,
						client: p.client,
					})),
					activity: activity.map(a => ({
						project: a.project,
						event: a.event,
						time: a.time,
					})),
				}),
			});
			const data = await res.json();
			if (!res.ok) {
				briefingError = data.error || 'Failed to generate briefing';
				return;
			}
			briefingText = data.briefing;
			briefingMeta = data.meta;
		} catch (err) {
			briefingError = err instanceof Error ? err.message : 'Network error';
		} finally {
			briefingLoading = false;
		}
	}

	async function summarizeActivity() {
		summaryLoading = true;
		summaryError = '';
		try {
			const res = await fetch('/api/ollama/summarize', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					events: activity.map(a => ({
						project: a.project,
						event: a.event,
						time: a.time,
					})),
					style: 'brief',
				}),
			});
			const data = await res.json();
			if (!res.ok) {
				summaryError = data.error || 'Failed to summarize';
				return;
			}
			summaryText = data.summary;
		} catch (err) {
			summaryError = err instanceof Error ? err.message : 'Network error';
		} finally {
			summaryLoading = false;
		}
	}
</script>

<div class="page">
	<header class="page-header">
		<div>
			<h1 class="page-title">Overview</h1>
			<p class="page-sub">All projects at a glance</p>
		</div>
		<div class="header-meta">
			<span class="badge badge-active">{activeCount} active</span>
		</div>
	</header>

	<!-- Daily Briefing (local LLM) -->
	<section class="section briefing">
		<div class="briefing-header">
			<div>
				<h2 class="section-title briefing-title">
					<span class="briefing-badge">AI</span>
					Daily Briefing
				</h2>
				<p class="briefing-sub">Generated locally on your iMac (phi3)</p>
			</div>
			<button
				class="briefing-btn"
				onclick={generateBriefing}
				disabled={briefingLoading}
			>
				{briefingLoading ? 'Generating…' : briefingText ? 'Regenerate' : 'Generate briefing'}
			</button>
		</div>

		{#if briefingError}
			<div class="briefing-error">{briefingError}</div>
		{:else if briefingLoading}
			<div class="briefing-body skeleton">
				<div class="sk-line"></div>
				<div class="sk-line"></div>
				<div class="sk-line short"></div>
			</div>
		{:else if briefingText}
			<div class="briefing-body">
				{#each briefingText.split(/\n\n+/) as para}
					<p>{para}</p>
				{/each}
			</div>
			{#if briefingMeta}
				<div class="briefing-meta dim">
					{briefingMeta.model}
					{#if briefingMeta.durationMs}· {(briefingMeta.durationMs / 1000).toFixed(1)}s{/if}
				</div>
			{/if}
		{:else}
			<div class="briefing-empty dim">
				No briefing yet. Click "Generate briefing" to get a short daily summary
				of active projects and recent progress.
			</div>
		{/if}
	</section>

	<!-- Stat row -->
	<div class="stat-row">
		<div class="stat-card">
			<div class="label">Total Projects</div>
			<div class="value">{activeProjects.length}</div>
		</div>
		<div class="stat-card">
			<div class="label">Active</div>
			<div class="value">{activeCount}</div>
		</div>
		<div class="stat-card">
			<div class="label">Clients</div>
			<div class="value">{[...new Set(activeProjects.map(p => p.client).filter(Boolean))].length}</div>
		</div>
		<div class="stat-card">
			<div class="label">Integrations</div>
			<div class="value">{activeProjects.filter(p => p.asana || p.shopify).length}</div>
		</div>
	</div>

	<!-- Project cards -->
	<section class="section">
		<h2 class="section-title">Projects</h2>
		<div class="project-grid">
			{#each activeProjects as p}
				<a href="/projects/{p.id}" class="project-card" style="--accent: var({p.accent})">
					<div class="project-card-top">
						<div class="project-name">
							<span class="kind-icon">{kindIcon[p.kind] ?? '○'}</span>
							{p.name}
						</div>
						<span class="badge badge-{p.status}">{p.status}</span>
					</div>

					{#if p.description}
						<div class="project-desc dim">{p.description}</div>
					{/if}

					{#if p.client}
						<div class="project-client dim">↳ {p.client}</div>
					{/if}

					<div class="project-tags">
						{#if p.asana}<span class="tag">Asana</span>{/if}
						{#if p.shopify}<span class="tag">Shopify</span>{/if}
						{#if p.agent}<span class="tag">Agent</span>{/if}
					</div>
				</a>
			{/each}
		</div>
	</section>

	<!-- Activity feed -->
	<section class="section">
		<div class="activity-header">
			<h2 class="section-title">Recent Activity</h2>
			<button
				class="summarize-btn"
				onclick={summarizeActivity}
				disabled={summaryLoading}
				title="Summarize with local LLM"
			>
				{summaryLoading ? 'Summarizing…' : 'Summarize'}
			</button>
		</div>

		{#if summaryError}
			<div class="activity-summary error">{summaryError}</div>
		{:else if summaryText}
			<div class="activity-summary">
				<span class="summary-label">AI summary:</span>
				{summaryText}
			</div>
		{/if}

		<div class="feed">
			{#each activity as item}
				<div class="feed-item">
					<span class="feed-dot" style="background: {item.color}"></span>
					<div class="feed-content">
						<span class="feed-project" style="color: {item.color}">{item.project}</span>
						<span class="feed-event">{item.event}</span>
					</div>
					<time class="feed-time dim">{formatRelative(item.time)}</time>
				</div>
			{/each}
		</div>
	</section>
</div>

<style>
	.page {
		padding: 2rem;
		max-width: 1200px;
	}

	.page-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		margin-bottom: 2rem;
	}

	.page-title {
		font-size: 1.5rem;
		font-weight: 700;
		margin: 0;
	}

	.page-sub {
		color: var(--color-muted);
		font-size: 0.875rem;
		margin: 0.25rem 0 0;
	}

	.header-meta { padding-top: 0.35rem; }

	.stat-row {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1rem;
		margin-bottom: 2.5rem;
	}

	.section { margin-bottom: 2.5rem; }

	.section-title {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-muted);
		margin: 0 0 1rem;
	}

	/* ── Briefing ────────────────────────────────────────────── */
	.briefing {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-left: 3px solid var(--color-accent, #7c83ff);
		border-radius: var(--radius-lg);
		padding: 1.25rem 1.5rem 1.5rem;
	}

	.briefing-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 0.75rem;
	}

	.briefing-title {
		margin: 0;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}

	.briefing-badge {
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		background: color-mix(in srgb, var(--color-accent, #7c83ff) 15%, transparent);
		color: var(--color-accent, #7c83ff);
		border: 1px solid color-mix(in srgb, var(--color-accent, #7c83ff) 30%, transparent);
		border-radius: 3px;
		padding: 0.1rem 0.35rem;
		text-transform: none;
		letter-spacing: 0.05em;
	}

	.briefing-sub {
		font-size: 0.75rem;
		color: var(--color-muted);
		margin: 0.25rem 0 0;
	}

	.briefing-btn {
		background: var(--color-accent, #7c83ff);
		color: white;
		border: none;
		border-radius: var(--radius-md, 4px);
		padding: 0.5rem 0.9rem;
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		white-space: nowrap;
		transition: opacity 0.2s;
	}
	.briefing-btn:hover { opacity: 0.85; }
	.briefing-btn:disabled { opacity: 0.5; cursor: wait; }

	.briefing-body p {
		font-size: 0.9rem;
		line-height: 1.6;
		color: var(--color-text, #e8e8ea);
		margin: 0.5rem 0;
	}
	.briefing-body p:first-child { margin-top: 0; }
	.briefing-body p:last-child { margin-bottom: 0; }

	.briefing-empty {
		font-size: 0.85rem;
		line-height: 1.5;
		padding: 0.5rem 0;
	}

	.briefing-error {
		font-size: 0.85rem;
		color: #ff6b6b;
		padding: 0.5rem 0;
	}

	.briefing-meta {
		font-family: var(--font-mono);
		font-size: 0.7rem;
		margin-top: 0.75rem;
		padding-top: 0.75rem;
		border-top: 1px solid var(--color-border);
	}

	.skeleton .sk-line {
		height: 0.85rem;
		background: linear-gradient(
			90deg,
			var(--color-surface-2) 0%,
			color-mix(in srgb, var(--color-surface-2) 60%, white) 50%,
			var(--color-surface-2) 100%
		);
		background-size: 200% 100%;
		animation: shimmer 1.4s infinite;
		border-radius: 3px;
		margin: 0.6rem 0;
	}
	.skeleton .sk-line.short { width: 60%; }

	@keyframes shimmer {
		0% { background-position: 200% 0; }
		100% { background-position: -200% 0; }
	}

	/* ── Activity header + summarize button ─────────────────── */
	.activity-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1rem;
	}
	.activity-header .section-title { margin: 0; }

	.summarize-btn {
		background: transparent;
		border: 1px solid var(--color-border);
		color: var(--color-text-dim);
		padding: 0.35rem 0.75rem;
		border-radius: var(--radius-md, 4px);
		font-size: 0.75rem;
		font-weight: 500;
		cursor: pointer;
		transition: border-color 0.2s, color 0.2s;
	}
	.summarize-btn:hover:not(:disabled) {
		border-color: var(--color-accent, #7c83ff);
		color: var(--color-text, #e8e8ea);
	}
	.summarize-btn:disabled { opacity: 0.5; cursor: wait; }

	.activity-summary {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: 0.75rem 1rem;
		font-size: 0.85rem;
		line-height: 1.5;
		color: var(--color-text, #e8e8ea);
		margin-bottom: 0.75rem;
	}
	.activity-summary.error { color: #ff6b6b; }

	.summary-label {
		font-family: var(--font-mono);
		font-size: 0.7rem;
		color: var(--color-muted);
		text-transform: uppercase;
		letter-spacing: 0.08em;
		margin-right: 0.5rem;
	}

	/* ── Project grid ────────────────────────────────────────── */
	.project-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 1rem;
	}

	.project-card {
		display: block;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-left: 3px solid var(--accent);
		border-radius: var(--radius-lg);
		padding: 1.25rem 1.5rem;
		transition: border-color 0.2s, background 0.2s;
	}

	.project-card:hover {
		background: var(--color-surface-2);
		border-color: var(--accent);
	}

	.project-card-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.5rem;
	}

	.project-name {
		font-weight: 600;
		font-size: 0.95rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.kind-icon {
		color: var(--accent);
		font-size: 0.85rem;
	}

	.project-desc {
		font-size: 0.8rem;
		margin-bottom: 0.4rem;
		line-height: 1.4;
	}

	.project-client {
		font-size: 0.75rem;
		margin-bottom: 0.75rem;
	}

	.project-tags {
		display: flex;
		gap: 0.4rem;
		flex-wrap: wrap;
		margin-top: 0.75rem;
	}

	.tag {
		font-size: 0.68rem;
		font-weight: 600;
		letter-spacing: 0.05em;
		background: color-mix(in srgb, var(--accent) 10%, transparent);
		color: var(--accent);
		border: 1px solid color-mix(in srgb, var(--accent) 25%, transparent);
		border-radius: 3px;
		padding: 0.15rem 0.45rem;
	}

	/* ── Feed ────────────────────────────────────────────────── */
	.feed {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	.feed-item {
		display: flex;
		align-items: center;
		gap: 0.875rem;
		padding: 0.875rem 1.25rem;
		border-bottom: 1px solid var(--color-border);
	}

	.feed-item:last-child { border-bottom: none; }

	.feed-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.feed-content {
		flex: 1;
		font-size: 0.875rem;
		display: flex;
		gap: 0.5rem;
	}

	.feed-project { font-weight: 600; flex-shrink: 0; }
	.feed-event   { color: var(--color-text-dim); }

	.feed-time {
		font-size: 0.75rem;
		font-family: var(--font-mono);
		flex-shrink: 0;
	}

	.dim { color: var(--color-muted); }
</style>
