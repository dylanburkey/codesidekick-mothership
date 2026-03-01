<script lang="ts">
	import type { PageData } from './$types';
	import { formatRelative } from '$lib/utils';

	let { data }: { data: PageData } = $props();

	const activeProjects = data.projects.filter(p => p.status !== 'archived');
	const activeCount = activeProjects.filter(p => p.status === 'active').length;

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
		<h2 class="section-title">Recent Activity</h2>
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
