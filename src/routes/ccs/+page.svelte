<script lang="ts">
	import { formatRelative } from '$lib/utils';
	import type { CCSSnapshot } from '$lib/types/ccs';

	// Mock snapshot — will be fetched from ccs-agent
	const snapshot: CCSSnapshot = {
		project: 'claude-code-sidekick',
		fetchedAt: new Date().toISOString(),
		execution: {
			current_phase: 2,
			phase_status: 'in_progress',
			authorized_phases: [1, 2],
			completed_phases: [1],
			last_updated: new Date(Date.now() - 25 * 60000).toISOString(),
		},
		phases: [
			{
				number: 1, title: 'Foundation & Core Types', status: 'complete',
				tasks: [
					{ id: 't1', phase: 1, title: 'Data model types', status: 'done' },
					{ id: 't2', phase: 1, title: 'State machine', status: 'done' },
					{ id: 't3', phase: 1, title: 'Config loader', status: 'done' },
				]
			},
			{
				number: 2, title: 'Agent Daemon', status: 'in_progress',
				tasks: [
					{ id: 't4', phase: 2, title: 'HTTP server', status: 'done', agent: 'implementer' },
					{ id: 't5', phase: 2, title: 'File watcher', status: 'in_progress', agent: 'implementer' },
					{ id: 't6', phase: 2, title: 'Git log parser', status: 'in_progress', agent: 'implementer' },
					{ id: 't7', phase: 2, title: 'SSE event stream', status: 'todo' },
					{ id: 't8', phase: 2, title: 'Tailscale auth', status: 'todo' },
				]
			},
			{
				number: 3, title: 'PTY Bridge', status: 'pending',
				tasks: [
					{ id: 't9',  phase: 3, title: 'Spawn CCS in PTY', status: 'todo' },
					{ id: 't10', phase: 3, title: 'WebSocket relay', status: 'todo' },
					{ id: 't11', phase: 3, title: 'Approval parser', status: 'todo' },
				]
			},
			{
				number: 4, title: 'Dashboard UI', status: 'pending',
				tasks: [
					{ id: 't12', phase: 4, title: 'Overview page', status: 'todo' },
					{ id: 't13', phase: 4, title: 'CCS dashboard', status: 'todo' },
					{ id: 't14', phase: 4, title: 'Terminal view', status: 'todo' },
				]
			},
			{
				number: 5, title: 'Deploy & Polish', status: 'pending',
				tasks: [
					{ id: 't15', phase: 5, title: 'DNS + Cloudflare Pages', status: 'todo' },
					{ id: 't16', phase: 5, title: 'Auth layer', status: 'todo' },
				]
			},
		],
		recentCommits: [
			{ hash: 'a3f1c2d', message: 'feat: HTTP server with /state endpoint', author: 'Dylan', date: new Date(Date.now() - 2 * 3600000).toISOString(), files_changed: 3 },
			{ hash: 'b9e4a12', message: 'feat: config loader with schema validation', author: 'Dylan', date: new Date(Date.now() - 5 * 3600000).toISOString(), files_changed: 5 },
			{ hash: 'c1d8f33', message: 'chore: project scaffolding', author: 'Dylan', date: new Date(Date.now() - 24 * 3600000).toISOString(), files_changed: 12 },
		],
		reviewIssues: [
			{ file: 'src/server.ts', line: 42, severity: 'warning', message: 'Missing error handling on file watch', model: 'claude' },
			{ file: 'src/git.ts', line: 18, severity: 'info', message: 'Consider caching parsed commits', model: 'gemini' },
			{ file: 'src/config.ts', severity: 'warning', message: 'No validation on agent secret length', model: 'claude' },
		],
	};

	const totalTasks = snapshot.phases.flatMap(p => p.tasks).length;
	const doneTasks  = snapshot.phases.flatMap(p => p.tasks).filter(t => t.status === 'done').length;
	const progress   = Math.round((doneTasks / totalTasks) * 100);

	const activePhase = snapshot.phases.find(p => p.status === 'in_progress');
	const activeTasks = activePhase?.tasks.filter(t => t.status === 'in_progress') ?? [];

	const statusLabel: Record<string, string> = {
		in_progress: 'In Progress',
		complete:    'Complete',
		paused:      'Paused',
		blocked:     'Blocked',
	};

	const taskStatusBadge: Record<string, string> = {
		done:        'badge-active',
		in_progress: 'badge-pending',
		todo:        'badge-idle',
		blocked:     'badge-error',
	};

	const issueSeverityColor: Record<string, string> = {
		error:   '#f87171',
		warning: '#f0a500',
		info:    '#60a5fa',
	};
</script>

<div class="page">
	<header class="page-header">
		<div>
			<h1 class="page-title">
				<span class="title-accent">CCS</span>
				Claude Code Sidekick
			</h1>
			<p class="page-sub">
				Phase {snapshot.execution.current_phase} · {statusLabel[snapshot.execution.phase_status]}
				· Updated {formatRelative(snapshot.execution.last_updated)}
			</p>
		</div>
		<div>
			<span class="badge badge-pending">Phase {snapshot.execution.current_phase} active</span>
		</div>
	</header>

	<!-- Stats -->
	<div class="stat-row">
		<div class="stat-card">
			<div class="label">Overall Progress</div>
			<div class="value">{progress}%</div>
			<div class="progress-track" style="margin-top: 0.75rem">
				<div class="progress-fill" style="width: {progress}%; background: var(--color-ccs)"></div>
			</div>
		</div>
		<div class="stat-card">
			<div class="label">Tasks Complete</div>
			<div class="value">{doneTasks} / {totalTasks}</div>
		</div>
		<div class="stat-card">
			<div class="label">Current Phase</div>
			<div class="value" style="font-size: 1.25rem; margin-top: 0.5rem">{activePhase?.title ?? '—'}</div>
		</div>
		<div class="stat-card">
			<div class="label">Review Issues</div>
			<div class="value" style="color: #f0a500">{snapshot.reviewIssues.length}</div>
		</div>
	</div>

	<div class="two-col">
		<!-- Phase list -->
		<section class="section">
			<h2 class="section-title">Phases</h2>
			<div class="phase-list">
				{#each snapshot.phases as phase}
					{@const pctDone = Math.round((phase.tasks.filter(t => t.status === 'done').length / phase.tasks.length) * 100)}
					<div class="phase-item" class:phase-active={phase.status === 'in_progress'}>
						<div class="phase-head">
							<div class="phase-label">
								<span class="phase-num">Phase {phase.number}</span>
								<span class="phase-title">{phase.title}</span>
							</div>
							<span class="badge badge-{phase.status === 'complete' ? 'active' : phase.status === 'in_progress' ? 'pending' : 'idle'}">
								{phase.status}
							</span>
						</div>
						<div class="progress-track" style="margin: 0.6rem 0">
							<div class="progress-fill" style="width: {pctDone}%; background: var(--color-ccs)"></div>
						</div>
						<div class="task-list">
							{#each phase.tasks as task}
								<div class="task-row">
									<span class="task-check" class:done={task.status === 'done'}>
										{task.status === 'done' ? '✓' : task.status === 'in_progress' ? '◐' : '○'}
									</span>
									<span class="task-title" class:task-done-text={task.status === 'done'}>{task.title}</span>
									{#if task.agent}
										<span class="task-agent dim">{task.agent}</span>
									{/if}
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</section>

		<div class="right-col">
			<!-- Recent commits -->
			<section class="section">
				<h2 class="section-title">Recent Commits</h2>
				<div class="commit-list">
					{#each snapshot.recentCommits as commit}
						<div class="commit-row">
							<code class="commit-hash">{commit.hash}</code>
							<span class="commit-msg">{commit.message}</span>
							<span class="commit-meta dim">
								{commit.files_changed}f · {formatRelative(commit.date)}
							</span>
						</div>
					{/each}
				</div>
			</section>

			<!-- Review issues -->
			<section class="section">
				<h2 class="section-title">Review Issues</h2>
				<div class="issue-list">
					{#each snapshot.reviewIssues as issue}
						<div class="issue-row">
							<span class="issue-dot" style="background: {issueSeverityColor[issue.severity]}"></span>
							<div class="issue-body">
								<code class="issue-file">{issue.file}{issue.line ? `:${issue.line}` : ''}</code>
								<span class="issue-msg dim">{issue.message}</span>
							</div>
							{#if issue.model}
								<span class="issue-model dim">{issue.model}</span>
							{/if}
						</div>
					{/each}
				</div>
			</section>
		</div>
	</div>
</div>

<style>
	.page { padding: 2rem; max-width: 1200px; }

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 2rem;
	}

	.page-title { font-size: 1.5rem; font-weight: 700; margin: 0; }
	.title-accent { color: var(--color-ccs); }
	.page-sub { font-size: 0.875rem; color: var(--color-muted); margin: 0.25rem 0 0; }

	.stat-row {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.two-col {
		display: grid;
		grid-template-columns: 1fr 360px;
		gap: 1.5rem;
		align-items: start;
	}

	.right-col { display: flex; flex-direction: column; gap: 1.5rem; }

	.section-title {
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-muted);
		margin: 0 0 0.75rem;
	}

	/* Phase list */
	.phase-list { display: flex; flex-direction: column; gap: 0.5rem; }

	.phase-item {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: 1rem 1.25rem;
	}

	.phase-active { border-color: var(--color-ccs); }

	.phase-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.phase-label { display: flex; flex-direction: column; gap: 2px; }
	.phase-num { font-size: 0.7rem; color: var(--color-muted); font-family: var(--font-mono); }
	.phase-title { font-size: 0.9rem; font-weight: 600; }

	.task-list { display: flex; flex-direction: column; gap: 4px; margin-top: 0.5rem; }

	.task-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8rem;
		padding: 2px 0;
	}

	.task-check { width: 1rem; text-align: center; font-family: var(--font-mono); color: var(--color-muted); }
	.task-check.done { color: #10b981; }
	.task-title { flex: 1; }
	.task-done-text { color: var(--color-muted); text-decoration: line-through; }
	.task-agent { font-size: 0.7rem; font-family: var(--font-mono); }

	/* Commits */
	.commit-list {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	.commit-row {
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--color-border);
		font-size: 0.8rem;
	}

	.commit-row:last-child { border-bottom: none; }

	.commit-hash {
		font-family: var(--font-mono);
		font-size: 0.7rem;
		color: var(--color-ccs);
		background: color-mix(in srgb, var(--color-ccs) 10%, transparent);
		padding: 2px 6px;
		border-radius: 3px;
	}

	.commit-msg { color: var(--color-text-dim); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.commit-meta { font-family: var(--font-mono); font-size: 0.7rem; white-space: nowrap; }

	/* Issues */
	.issue-list {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	.issue-row {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--color-border);
		font-size: 0.8rem;
	}

	.issue-row:last-child { border-bottom: none; }

	.issue-dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		flex-shrink: 0;
		margin-top: 4px;
	}

	.issue-body { flex: 1; display: flex; flex-direction: column; gap: 2px; }
	.issue-file { font-size: 0.75rem; color: var(--color-text); }
	.issue-msg { font-size: 0.75rem; }
	.issue-model { font-size: 0.7rem; font-family: var(--font-mono); flex-shrink: 0; }
</style>
