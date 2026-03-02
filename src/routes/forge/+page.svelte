<script lang="ts">
	import { formatRelative } from '$lib/utils';

	// Placeholder — will be fetched from forge-agent
	const project = {
		name: 'Forge Industrial',
		client: 'Zebra Skimmers',
		phase: 'Invoice Module',
		progress: 70,
		updatedAt: new Date(Date.now() - 3 * 3600000).toISOString(),
	};

	const tasks = [
		{ id: 't1', title: 'Invoice list component', status: 'done' },
		{ id: 't2', title: 'Invoice detail page', status: 'done' },
		{ id: 't3', title: 'PDF export', status: 'in_progress' },
		{ id: 't4', title: 'Email delivery integration', status: 'todo' },
		{ id: 't5', title: 'Stripe payment link', status: 'todo' },
	];

	const commits = [
		{ hash: 'f2a9c1e', message: 'feat: invoice list component merged', date: new Date(Date.now() - 3 * 3600000).toISOString() },
		{ hash: 'e8b3d44', message: 'feat: invoice detail layout', date: new Date(Date.now() - 12 * 3600000).toISOString() },
		{ hash: 'd5c7f21', message: 'chore: Shopify theme structure scaffolding', date: new Date(Date.now() - 2 * 86400000).toISOString() },
	];

	const doneTasks = tasks.filter(t => t.status === 'done').length;

	const taskBadge: Record<string, string> = {
		done:        'badge-active',
		in_progress: 'badge-pending',
		todo:        'badge-idle',
	};
</script>

<div class="page">
	<header class="page-header">
		<div>
			<h1 class="page-title">
				<span class="title-accent">Forge</span>
				Industrial Theme
			</h1>
			<p class="page-sub">
				{project.client} · {project.phase} · Updated {formatRelative(project.updatedAt)}
			</p>
		</div>
		<span class="badge badge-pending">Active</span>
	</header>

	<div class="stat-row">
		<div class="stat-card">
			<div class="label">Progress</div>
			<div class="value">{project.progress}%</div>
			<div class="progress-track" style="margin-top: 0.75rem">
				<div class="progress-fill" style="width: {project.progress}%; background: var(--color-forge)"></div>
			</div>
		</div>
		<div class="stat-card">
			<div class="label">Tasks Complete</div>
			<div class="value">{doneTasks} / {tasks.length}</div>
		</div>
		<div class="stat-card">
			<div class="label">Current Phase</div>
			<div class="value" style="font-size: 1.1rem; margin-top: 0.5rem">{project.phase}</div>
		</div>
	</div>

	<div class="two-col">
		<section class="section">
			<h2 class="section-title">Tasks</h2>
			<div class="task-card">
				{#each tasks as task}
					<div class="task-row">
						<span class="task-check" class:done={task.status === 'done'}>
							{task.status === 'done' ? '✓' : task.status === 'in_progress' ? '◐' : '○'}
						</span>
						<span class="task-title" class:task-done-text={task.status === 'done'}>{task.title}</span>
						<span class="badge {taskBadge[task.status]}">{task.status}</span>
					</div>
				{/each}
			</div>
		</section>

		<section class="section">
			<h2 class="section-title">Recent Commits</h2>
			<div class="commit-list">
				{#each commits as commit}
					<div class="commit-row">
						<code class="commit-hash">{commit.hash}</code>
						<span class="commit-msg">{commit.message}</span>
						<span class="commit-meta dim">{formatRelative(commit.date)}</span>
					</div>
				{/each}
			</div>
		</section>
	</div>
</div>

<style>
	.page { padding: 2rem; max-width: 1200px; }
	.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; }
	.page-title { font-size: 1.5rem; font-weight: 700; margin: 0; }
	.title-accent { color: var(--color-forge); }
	.page-sub { font-size: 0.875rem; color: var(--color-muted); margin: 0.25rem 0 0; }

	.stat-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 2rem; }

	.two-col { display: grid; grid-template-columns: 1fr 360px; gap: 1.5rem; align-items: start; }

	.section-title {
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-muted);
		margin: 0 0 0.75rem;
	}

	.task-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	.task-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1.25rem;
		border-bottom: 1px solid var(--color-border);
		font-size: 0.875rem;
	}
	.task-row:last-child { border-bottom: none; }

	.task-check { width: 1rem; text-align: center; font-family: var(--font-mono); color: var(--color-muted); }
	.task-check.done { color: #10b981; }
	.task-title { flex: 1; }
	.task-done-text { color: var(--color-muted); text-decoration: line-through; }

	.commit-list {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}
	.commit-row {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--color-border);
		font-size: 0.8rem;
	}
	.commit-row:last-child { border-bottom: none; }
	.commit-hash { font-family: var(--font-mono); font-size: 0.7rem; color: var(--color-forge); }
	.commit-msg { color: var(--color-text-dim); }
	.commit-meta { font-size: 0.7rem; font-family: var(--font-mono); }
</style>
