<script lang="ts">
	import type { PageData } from './$types';
	import { formatRelative } from '$lib/utils';

	let { data }: { data: PageData } = $props();
	const { manifest, asana, shopify } = data;

	const accentVar = `var(${manifest.accent})`;

	const kindLabel: Record<string, string> = {
		ccs: 'Framework',
		shopify: 'Shopify',
		defi: 'DeFi',
		ai: 'AI Platform',
		infra: 'Infrastructure',
		forge: 'Theme',
		generic: 'Project',
	};
</script>

<div class="page">
	<!-- ── Header ───────────────────────────────────────────── -->
	<header class="page-header" style="--accent: {accentVar}">
		<div class="header-left">
			<div class="kind-tag">{kindLabel[manifest.kind] ?? manifest.kind}</div>
			<h1 class="page-title">{manifest.name}</h1>
			{#if manifest.description}
				<p class="page-sub">{manifest.description}</p>
			{/if}
		</div>
		<div class="header-meta">
			<span class="badge badge-{manifest.status}">{manifest.status}</span>
			{#if manifest.client}
				<span class="client-tag">Client: {manifest.client}</span>
			{/if}
		</div>
	</header>

	<!-- ── Quick links ──────────────────────────────────────── -->
	{#if manifest.repo}
		<div class="quick-links">
			<a href={manifest.repo} class="quick-link" target="_blank" rel="noopener">
				<span>⎇</span> Repository
			</a>
		</div>
	{/if}

	<!-- ── Asana ────────────────────────────────────────────── -->
	{#if asana}
		<section class="section">
			<h2 class="section-title">Asana Tasks</h2>

			{#if asana.error}
				<div class="error-banner">⚠ {asana.error}</div>
			{:else}
				<div class="progress-row">
					<div class="progress-meta">
						<span>{asana.completedCount} / {asana.totalCount} tasks</span>
						<span class="mono">{asana.progressPct}%</span>
					</div>
					<div class="progress-track">
						<div
							class="progress-fill"
							style="width: {asana.progressPct}%; background: {accentVar}"
						></div>
					</div>
				</div>

				<div class="task-list">
					{#each asana.tasks.filter(t => !t.completed).slice(0, 10) as task}
						<a href={task.permalink} class="task-row" target="_blank" rel="noopener">
							<span class="task-check" aria-hidden="true">○</span>
							<span class="task-name">{task.name}</span>
							{#if task.section}
								<span class="task-section dim">{task.section}</span>
							{/if}
							{#if task.due_on}
								<span class="task-due mono">{task.due_on}</span>
							{/if}
						</a>
					{/each}

					{#if asana.tasks.filter(t => !t.completed).length > 10}
						<div class="task-overflow dim">
							+{asana.tasks.filter(t => !t.completed).length - 10} more open tasks
						</div>
					{/if}
				</div>
			{/if}
		</section>
	{/if}

	<!-- ── Shopify ───────────────────────────────────────────── -->
	{#if shopify}
		<section class="section">
			<h2 class="section-title">Shopify</h2>

			{#if shopify.error}
				<div class="error-banner">⚠ {shopify.error}</div>
			{:else}
				<div class="stat-row">
					<div class="stat-card">
						<div class="label">Store</div>
						<div class="value truncate">{shopify.name}</div>
					</div>
					<div class="stat-card">
						<div class="label">Orders (30d)</div>
						<div class="value">{shopify.ordersLast30Days}</div>
					</div>
					<div class="stat-card">
						<div class="label">Revenue (30d)</div>
						<div class="value">
							{shopify.currency} {shopify.revenueLast30Days.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
						</div>
					</div>
					<div class="stat-card">
						<div class="label">Active Theme</div>
						<div class="value truncate">{shopify.activeTheme?.name ?? '—'}</div>
					</div>
				</div>
			{/if}
		</section>
	{/if}

	<!-- ── No integrations ──────────────────────────────────── -->
	{#if !asana && !shopify}
		<div class="empty-state">
			<p>No live integrations configured for this project.</p>
			<p class="dim">Add <code>asana</code> or <code>shopify</code> config to the manifest to enable data panels.</p>
		</div>
	{/if}
</div>

<style>
	.page {
		padding: 2rem;
		max-width: 1100px;
	}

	/* ── Header ─────────────────────────────────────────────── */
	.page-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		margin-bottom: 2rem;
		gap: 1rem;
	}

	.kind-tag {
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--accent);
		margin-bottom: 0.3rem;
	}

	.page-title {
		font-size: 1.5rem;
		font-weight: 700;
		margin: 0 0 0.25rem;
	}

	.page-sub {
		color: var(--color-muted);
		font-size: 0.875rem;
		margin: 0;
	}

	.header-meta {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.4rem;
		padding-top: 0.2rem;
	}

	.client-tag {
		font-size: 0.75rem;
		color: var(--color-muted);
	}

	/* ── Quick links ────────────────────────────────────────── */
	.quick-links {
		display: flex;
		gap: 0.75rem;
		margin-bottom: 2rem;
	}

	.quick-link {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.8rem;
		color: var(--color-text-dim);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		padding: 0.35rem 0.75rem;
		transition: border-color 0.15s, color 0.15s;
	}

	.quick-link:hover {
		color: var(--color-text);
		border-color: var(--color-text-dim);
	}

	/* ── Sections ───────────────────────────────────────────── */
	.section { margin-bottom: 2.5rem; }

	.section-title {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-muted);
		margin: 0 0 1rem;
	}

	/* ── Progress ───────────────────────────────────────────── */
	.progress-row { margin-bottom: 1rem; }

	.progress-meta {
		display: flex;
		justify-content: space-between;
		font-size: 0.8rem;
		color: var(--color-text-dim);
		margin-bottom: 0.4rem;
	}

	/* ── Tasks ──────────────────────────────────────────────── */
	.task-list {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	.task-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.7rem 1rem;
		border-bottom: 1px solid var(--color-border);
		font-size: 0.875rem;
		color: var(--color-text);
		transition: background 0.12s;
	}

	.task-row:last-child { border-bottom: none; }

	.task-row:hover { background: var(--color-surface-2); }

	.task-check { color: var(--color-muted); flex-shrink: 0; }

	.task-name { flex: 1; }

	.task-section {
		font-size: 0.72rem;
		background: var(--color-surface-2);
		border: 1px solid var(--color-border);
		border-radius: 3px;
		padding: 0.15rem 0.4rem;
		flex-shrink: 0;
	}

	.task-due {
		font-size: 0.72rem;
		color: var(--color-muted);
		flex-shrink: 0;
	}

	.task-overflow {
		padding: 0.6rem 1rem;
		font-size: 0.8rem;
	}

	/* ── Stats ──────────────────────────────────────────────── */
	.stat-row {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
		gap: 1rem;
	}

	/* ── Error ──────────────────────────────────────────────── */
	.error-banner {
		background: color-mix(in srgb, #f87171 10%, transparent);
		border: 1px solid color-mix(in srgb, #f87171 30%, transparent);
		border-radius: var(--radius);
		padding: 0.75rem 1rem;
		font-size: 0.875rem;
		color: #f87171;
	}

	/* ── Empty state ────────────────────────────────────────── */
	.empty-state {
		text-align: center;
		padding: 4rem 2rem;
		color: var(--color-muted);
		font-size: 0.9rem;
	}

	.empty-state code {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		padding: 0.1em 0.4em;
		font-family: var(--font-mono);
		font-size: 0.85em;
	}

	.mono { font-family: var(--font-mono); }
	.dim  { color: var(--color-muted); }
	.truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
