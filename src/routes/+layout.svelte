<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';

	let { children } = $props();

	const nav = [
		{ href: '/',            label: 'Overview',    icon: '⬡' },
		{ href: '/ccs',         label: 'CCS',         icon: '◈', accent: 'ccs' },
		{ href: '/forge',       label: 'Forge',       icon: '◆', accent: 'forge' },
		{ href: '/walletwatch', label: 'WalletWatch', icon: '◉', accent: 'wallet' },
	];

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
			{#each nav as item}
				<a
					href={item.href}
					class="nav-item"
					class:active={isActive(item.href, $page.url.pathname)}
					style={item.accent ? `--item-accent: var(--color-${item.accent})` : ''}
				>
					<span class="nav-icon">{item.icon}</span>
					<span class="nav-label">{item.label}</span>
				</a>
			{/each}
		</nav>

		<div class="sidebar-footer">
			<a href="/settings" class="nav-item">
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
	}

	.sidebar-footer {
		padding: 0.5rem;
		border-top: 1px solid var(--color-border);
	}

	.nav-item {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		padding: 0.55rem 0.75rem;
		border-radius: var(--radius);
		color: var(--color-text-dim);
		font-size: 0.875rem;
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
		font-size: 1rem;
		width: 1.25rem;
		text-align: center;
		flex-shrink: 0;
	}

	.nav-label { font-weight: 500; }

	/* ── Main ────────────────────────────────────────────────── */
	.main {
		background: var(--color-bg);
		overflow-y: auto;
	}
</style>
