<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import { getActiveProjects } from '$lib/config/projects';

	let { children } = $props();

	const projects = getActiveProjects();

	const kindIcon: Record<string, string> = {
		ccs:     '◈',
		shopify: '◆',
		forge:   '◆',
		defi:    '◉',
		ai:      '◎',
		infra:   '⬡',
		generic: '○',
	};

	function isActive(href: string, pathname: string) {
		if (href === '/') return pathname === '/';
		return pathname.startsWith(href);
	}
</script>

<div class="shell">
	<aside class="sidebar">
		<div class="sidebar-brand">
			<span class="brand-mark">⬡</span>
			<span class="brand-name">codesidekick</span>
		</div>

		<nav class="sidebar-nav">
			<!-- Top-level overview -->
			<a
				href="/"
				class="nav-item"
				class:active={isActive('/', $page.url.pathname)}
			>
				<span class="nav-icon">⬡</span>
				<span class="nav-label">Overview</span>
			</a>

			<div class="nav-section-label">Projects</div>

			<!-- New project shortcut -->
			<a
				href="/projects/new"
				class="nav-item nav-item--new"
				class:active={isActive('/projects/new', $page.url.pathname)}
			>
				<span class="nav-icon">＋</span>
				<span class="nav-label">New Project</span>
			</a>

			<!-- Dynamic project list from manifest -->
			{#each projects as project}
				<a
					href="/projects/{project.id}"
					class="nav-item"
					class:active={isActive(`/projects/${project.id}`, $page.url.pathname)}
					style="--item-accent: var({project.accent})"
				>
					<span class="nav-icon">{kindIcon[project.kind] ?? '○'}</span>
					<span class="nav-label">{project.name}</span>
					{#if project.status === 'active'}
						<span class="nav-status" aria-label="active"></span>
					{/if}
				</a>
				{#if project.chatUrl}
					<a
						href={project.chatUrl}
						target="_blank"
						rel="noopener noreferrer"
						class="nav-item nav-item--chat"
						style="--item-accent: var({project.accent})"
						aria-label="Open AI chat for {project.name}"
					>
						<span class="nav-icon" aria-hidden="true">◇</span>
						<span class="nav-label">AI Chat</span>
						<span class="nav-external" aria-hidden="true">↗</span>
					</a>
				{/if}
			{/each}
		</nav>

		<div class="sidebar-footer">
			<a
				href="/settings"
				class="nav-item"
				class:active={isActive('/settings', $page.url.pathname)}
			>
				<span class="nav-icon">⚙</span>
				<span class="nav-label">Settings</span>
			</a>
		</div>
	</aside>

	<main class="main">
		{@render children()}
	</main>
</div>

<style>
	.shell {
		display: grid;
		grid-template-columns: 220px 1fr;
		min-height: 100vh;
	}

	/* ── Sidebar ─────────────────────────────────────────────── */
	.sidebar {
		background: var(--color-surface);
		border-right: 1px solid var(--color-border);
		display: flex;
		flex-direction: column;
		position: sticky;
		top: 0;
		height: 100vh;
		overflow-y: auto;
	}

	.sidebar-brand {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 1.25rem 1rem;
		border-bottom: 1px solid var(--color-border);
		flex-shrink: 0;
	}

	.brand-mark {
		font-size: 1.4rem;
		color: var(--color-accent);
		line-height: 1;
	}

	.brand-name {
		font-size: 0.85rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		color: var(--color-text);
	}

	.sidebar-nav {
		flex: 1;
		padding: 0.75rem 0.5rem;
		display: flex;
		flex-direction: column;
		gap: 2px;
		overflow-y: auto;
	}

	.nav-section-label {
		font-size: 0.65rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--color-muted);
		padding: 0.75rem 0.75rem 0.3rem;
	}

	.sidebar-footer {
		padding: 0.5rem;
		border-top: 1px solid var(--color-border);
		flex-shrink: 0;
	}

	.nav-item {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		padding: 0.5rem 0.75rem;
		border-radius: var(--radius);
		color: var(--color-text-dim);
		font-size: 0.825rem;
		transition: background 0.15s, color 0.15s;
		--item-accent: var(--color-accent);
	}

	.nav-item:hover {
		background: var(--color-surface-2);
		color: var(--color-text);
	}

	.nav-item.active {
		background: color-mix(in srgb, var(--item-accent) 12%, transparent);
		color: var(--item-accent);
	}

	.nav-icon {
		font-size: 0.9rem;
		width: 1.1rem;
		text-align: center;
		flex-shrink: 0;
	}

	.nav-label {
		font-weight: 500;
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.nav-status {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #10b981;
		flex-shrink: 0;
	}

	/* ── Main ────────────────────────────────────────────────── */
	.main {
		background: var(--color-bg);
		overflow-y: auto;
	}

	.nav-item--new {
		border: 1px dashed var(--color-border, #334155);
		border-radius: 6px;
		margin-bottom: .25rem;
		opacity: .7;
		transition: opacity .15s, border-color .15s;
	}

	.nav-item--new:hover,
	.nav-item--new.active {
		opacity: 1;
		border-color: var(--color-ccs, #6366f1);
	}

	.nav-item--chat {
		margin-top: -2px;
		margin-left: 1.5rem;
		padding-top: 0.35rem;
		padding-bottom: 0.35rem;
		font-size: 0.75rem;
		color: var(--color-muted);
		opacity: 0.75;
		transition: opacity 0.15s, color 0.15s;
	}

	.nav-item--chat:hover {
		background: color-mix(in srgb, var(--item-accent) 8%, transparent);
		color: var(--item-accent);
		opacity: 1;
	}

	.nav-external {
		font-size: 0.65rem;
		margin-left: auto;
		color: inherit;
		opacity: 0.6;
	}
</style>
