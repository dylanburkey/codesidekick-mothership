<script lang="ts">
	import { formatRelative } from '$lib/utils';

	const project = {
		name: 'WalletWatch',
		status: 'deployed',
		version: '1.2.0',
		updatedAt: new Date(Date.now() - 86400000).toISOString(),
	};

	const stats = {
		walletsTracked: 3,
		alertsFired: 12,
		dustThreshold: 0.001,
	};

	const recentAlerts = [
		{ wallet: '0xD80F...cf413', event: 'Dust filter threshold updated', time: new Date(Date.now() - 86400000).toISOString(), kind: 'config' },
		{ wallet: '0xD80F...cf413', event: 'Incoming tx: 0.42 ETH', time: new Date(Date.now() - 2 * 86400000).toISOString(), kind: 'tx' },
		{ wallet: '0xD80F...cf413', event: 'Low balance warning', time: new Date(Date.now() - 3 * 86400000).toISOString(), kind: 'warning' },
	];

	const kindColor: Record<string, string> = {
		config:  'var(--color-wallet)',
		tx:      '#10b981',
		warning: '#f0a500',
	};
</script>

<div class="page">
	<header class="page-header">
		<div>
			<h1 class="page-title">
				<span class="title-accent">WalletWatch</span>
			</h1>
			<p class="page-sub">
				v{project.version} · Deployed · Updated {formatRelative(project.updatedAt)}
			</p>
		</div>
		<span class="badge badge-active">Live</span>
	</header>

	<div class="stat-row">
		<div class="stat-card">
			<div class="label">Wallets Tracked</div>
			<div class="value">{stats.walletsTracked}</div>
		</div>
		<div class="stat-card">
			<div class="label">Alerts Fired</div>
			<div class="value">{stats.alertsFired}</div>
		</div>
		<div class="stat-card">
			<div class="label">Dust Threshold</div>
			<div class="value" style="font-family: var(--font-mono); font-size: 1.1rem; margin-top: 0.5rem">{stats.dustThreshold} ETH</div>
		</div>
	</div>

	<section class="section">
		<h2 class="section-title">Recent Alerts</h2>
		<div class="feed">
			{#each recentAlerts as alert}
				<div class="feed-item">
					<span class="feed-dot" style="background: {kindColor[alert.kind]}"></span>
					<div class="feed-content">
						<code class="feed-wallet dim">{alert.wallet}</code>
						<span class="feed-event">{alert.event}</span>
					</div>
					<time class="feed-time dim">{formatRelative(alert.time)}</time>
				</div>
			{/each}
		</div>
	</section>
</div>

<style>
	.page { padding: 2rem; max-width: 1200px; }
	.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; }
	.page-title { font-size: 1.5rem; font-weight: 700; margin: 0; }
	.title-accent { color: var(--color-wallet); }
	.page-sub { font-size: 0.875rem; color: var(--color-muted); margin: 0.25rem 0 0; }

	.stat-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 2rem; }

	.section { margin-bottom: 2rem; }
	.section-title {
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-muted);
		margin: 0 0 0.75rem;
	}

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

	.feed-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

	.feed-content {
		flex: 1;
		font-size: 0.875rem;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.feed-wallet { font-size: 0.7rem; font-family: var(--font-mono); }
	.feed-event { color: var(--color-text-dim); }
	.feed-time { font-size: 0.75rem; font-family: var(--font-mono); flex-shrink: 0; }
</style>
