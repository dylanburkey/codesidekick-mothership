<script lang="ts">
	import { connectedCount } from '$lib/stores/projects';
	import { formatRelative } from '$lib/utils';

	// Placeholder data — will be replaced by live agent fetches
	const summary = {
		projects: 2,
		connected: 1,
		activeTasks: 7,
		openIssues: 3,
	};

	const activity = [
		{ project: 'CCS', color: 'var(--color-ccs)',   event: 'Phase 2 complete — awaiting approval', time: new Date(Date.now() - 12 * 60000).toISOString() },
		{ project: 'Forge', color: 'var(--color-forge)', event: 'Invoice list component merged', time: new Date(Date.now() - 3 * 3600000).toISOString() },
		{ project: 'CCS', color: 'var(--color-ccs)',   event: 'Multi-model review finished (4 files)', time: new Date(Date.now() - 5 * 3600000).toISOString() },
		{ project: 'WalletWatch', color: 'var(--color-wallet)', event: 'Dust filter threshold updated', time: new Date(Date.now() - 86400000).toISOString() },
	];

	const projects = [
		{
			id: 'ccs',
			label: 'Claude Code Sidekick',
			accent: 'var(--color-ccs)',
			href: '/ccs',
			status: 'active',
			phase: 'Phase 2 / 5',
			progress: 40,
			tasks: { done: 8, total: 20 },
		},
		{
			id: 'forge',
			label: 'Forge',
			accent: 'var(--color-forge)',
			href: '/forge',
			status: 'active',
			phase: 'Invoice module',
			progress: 70,
			tasks: { done: 14, total: 20 },
		},
		{
			id: 'walletwatch',
			label: 'WalletWatch',
			accent: 'var(--color-wallet)',
			href: '/walletwatch',
			status: 'idle',
			phase: 'Deployed',
			progress: 100,
			tasks: { done: 20, total: 20 },
		},
	];
</script>

<div class="page">
	<header class="page-header">
		<div>
			<h1 class="page-title">Overview</h1>
			<p class="page-sub">All projects at a glance</p>
		</div>
		<div class="header-meta">
			<span class="badge badge-active">{summary.connected} agent online</span>
		</div>
	</header>

	<!-- Stat row -->
	<div class="stat-row">
		<div class="stat-card">
			<div class="label">Projects</div>
			<div class="value">{summary.projects}</div>
		</div>
		<div class="stat-card">
			<div class="label">Active Tasks</div>
			<div class="value">{summary.activeTasks}</div>
		</div>
		<div class="stat-card">
			<div class="label">Open Issues</div>
			<div class="value" style="color: #f87171">{summary.openIssues}</div>
		</div>
		<div class="stat-card">
			<div class="label">Agents Connected</div>
			<div class="value" style="color: #10b981">{summary.connected}</div>
		</div>
	</div>

	<!-- Project cards -->
	<section class="section">
		<h2 class="section-title">Projects</h2>
		<div class="project-grid">
			{#each projects as p}
				<a href={p.href} class="project-card" style="--accent: {p.accent}">
					<div class="project-card-top">
						<div class="project-name">{p.label}</div>
						<span class="badge badge-{p.status}">{p.status}</span>
					</div>
					<div class="project-phase dim">{p.phase}</div>
					<div class="progress-track" style="margin-top: 1rem">
						<div class="progress-fill" style="width: {p.progress}%; background: {p.accent}"></div>
					</div>
					<div class="project-tasks dim">
						{p.tasks.done} / {p.tasks.total} tasks
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

	/* Project cards */
	.project-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 1rem;
	}

	.project-card {
		display: block;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: 1.25rem 1.5rem;
		transition: border-color 0.2s, background 0.2s;
		border-left: 3px solid var(--accent);
	}

	.project-card:hover {
		background: var(--color-surface-2);
		border-color: var(--accent);
	}

	.project-card-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.35rem;
	}

	.project-name {
		font-weight: 600;
		font-size: 0.95rem;
	}

	.project-phase {
		font-size: 0.8rem;
		margin-top: 0.2rem;
	}

	.project-tasks {
		font-size: 0.75rem;
		margin-top: 0.5rem;
		font-family: var(--font-mono);
	}

	/* Feed */
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
</style>
