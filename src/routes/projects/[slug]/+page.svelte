<script lang="ts">
	import type { PageData } from './$types';
	import { formatRelative, formatDate } from '$lib/utils';
	import type { AsanaTask } from '$lib/integrations/asana';

	let { data }: { data: PageData } = $props();
	const manifest = $derived(data.manifest);
	const asana    = $derived(data.asana);
	const shopify  = $derived(data.shopify);
	const commits  = $derived(data.commits);

	const accentVar = $derived(`var(${manifest.accent})`);

	type Tab = 'overview' | 'board' | 'chat' | 'commits';
	let activeTab = $state<Tab>('overview');

	const kindLabel: Record<string, string> = {
		ccs: 'Framework', shopify: 'Shopify', forge: 'Theme',
		defi: 'DeFi', ai: 'AI Platform', infra: 'Infrastructure', generic: 'Project',
	};

	// ── Kanban helpers ──────────────────────────────────────────
	const IN_PROGRESS_KW = ['progress', 'doing', 'active', 'wip', 'current', 'sprint'];
	const REVIEW_KW      = ['review', 'staging', 'qa', 'testing', 'feedback'];

	function taskColumn(t: AsanaTask): 'todo' | 'in_progress' | 'review' | 'done' {
		if (t.completed) return 'done';
		const s = (t.section ?? '').toLowerCase();
		if (REVIEW_KW.some(k => s.includes(k)))      return 'review';
		if (IN_PROGRESS_KW.some(k => s.includes(k))) return 'in_progress';
		return 'todo';
	}

	const board = $derived(asana ? {
		todo:        asana.tasks.filter(t => taskColumn(t) === 'todo'),
		in_progress: asana.tasks.filter(t => taskColumn(t) === 'in_progress'),
		review:      asana.tasks.filter(t => taskColumn(t) === 'review'),
		done:        asana.tasks.filter(t => taskColumn(t) === 'done').slice(0, 8),
	} : null);

	// ── AI Chat ─────────────────────────────────────────────────
	interface Msg { role: 'user' | 'assistant'; content: string }
	let messages   = $state<Msg[]>([]);
	let chatInput  = $state('');
	let chatBusy   = $state(false);
	let chatError  = $state('');
	let chatEl: HTMLElement | undefined = $state();

	const projectContext = JSON.stringify({
		name: manifest.name, kind: manifest.kind,
		client: manifest.client, description: manifest.description,
		status: manifest.status, repo: manifest.repo,
	});

	async function sendChat() {
		const txt = chatInput.trim();
		if (!txt || chatBusy) return;
		messages  = [...messages, { role: 'user', content: txt }];
		chatInput = '';
		chatBusy  = true;
		chatError = '';

		try {
			const res = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ messages, projectContext }),
			});
			const json = await res.json();
			if (!res.ok) throw new Error(json.error ?? 'Unknown error');
			messages = [...messages, { role: 'assistant', content: json.content }];
		} catch (e) {
			chatError = e instanceof Error ? e.message : 'Request failed';
		} finally {
			chatBusy = false;
			setTimeout(() => chatEl?.scrollTo({ top: chatEl.scrollHeight, behavior: 'smooth' }), 60);
		}
	}

	function onChatKey(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
	}

	// ── Quick-action suggestions ────────────────────────────────
	const suggestions = [
		'What should I work on next?',
		'Write a standup update',
		'Suggest architecture improvements',
		'Draft a commit message',
	];
</script>

<div class="page">

	<!-- ── Header ─────────────────────────────────────────────── -->
	<header class="page-header" style="--accent: {accentVar}">
		<div class="header-left">
			<div class="kind-tag">{kindLabel[manifest.kind] ?? manifest.kind}</div>
			<h1 class="page-title">{manifest.name}</h1>
			{#if manifest.description}
				<p class="page-sub">{manifest.description}</p>
			{/if}
		</div>
		<div class="header-right">
			<span class="badge badge-{manifest.status}">{manifest.status}</span>
			{#if manifest.client}
				<span class="client-tag">{manifest.client}</span>
			{/if}
			{#if manifest.repo}
				<a href={manifest.repo} class="icon-link" target="_blank" rel="noopener" title="Repository">
					⎇
				</a>
			{/if}
			<a href="/projects/{manifest.id}/invoices" class="icon-link" title="Invoices">🧾</a>
		</div>
	</header>

	<!-- ── Tabs ───────────────────────────────────────────────── -->
	<div class="tabs" role="tablist">
		{#each (['overview', 'board', 'chat', 'commits'] as Tab[]) as tab}
			<button
				role="tab"
				class="tab"
				class:tab--active={activeTab === tab}
				aria-selected={activeTab === tab}
				onclick={() => activeTab = tab}
				style={activeTab === tab ? `--tab-accent: ${accentVar}` : ''}
			>
				{#if tab === 'overview'}⬡ Overview
				{:else if tab === 'board'}
					◫ Board
					{#if asana}<span class="tab-count">{asana.tasks.filter(t => !t.completed).length}</span>{/if}
				{:else if tab === 'chat'}◈ AI Chat
				{:else if tab === 'commits'}
					⎇ Commits
					{#if commits?.length}<span class="tab-count">{commits.length}</span>{/if}
				{/if}
			</button>
		{/each}
	</div>

	<!-- ══════════════════════════════════════════════════════════
	     TAB: OVERVIEW
	══════════════════════════════════════════════════════════ -->
	{#if activeTab === 'overview'}

		<!-- Asana summary -->
		{#if asana}
			<section class="section">
				<h2 class="section-title">Progress</h2>
				{#if asana.error}
					<div class="error-banner">⚠ {asana.error}</div>
				{:else}
					<div class="progress-row">
						<div class="progress-meta">
							<span>{asana.completedCount} / {asana.totalCount} tasks complete</span>
							<span class="mono">{asana.progressPct}%</span>
						</div>
						<div class="progress-track">
							<div class="progress-fill" style="width: {asana.progressPct}%; background: {accentVar}"></div>
						</div>
					</div>

					<div class="task-list">
						{#each asana.tasks.filter(t => !t.completed).slice(0, 8) as task}
							<a href={task.permalink} class="task-row" target="_blank" rel="noopener">
								<span class="task-check" aria-hidden="true">○</span>
								<span class="task-name">{task.name}</span>
								{#if task.section}<span class="task-section dim">{task.section}</span>{/if}
								{#if task.due_on}<span class="task-due mono">{task.due_on}</span>{/if}
							</a>
						{/each}
					</div>
				{/if}
			</section>
		{/if}

		<!-- Shopify stats -->
		{#if shopify}
			<section class="section">
				<h2 class="section-title">Shopify</h2>
				{#if shopify.error}
					<div class="error-banner">⚠ {shopify.error}</div>
				{:else}
					<div class="stat-row">
						<div class="stat-card">
							<div class="label">Store</div>
							<div class="value truncate" style="font-size:1.1rem;margin-top:.5rem">{shopify.name}</div>
						</div>
						<div class="stat-card">
							<div class="label">Orders (30d)</div>
							<div class="value">{shopify.ordersLast30Days}</div>
						</div>
						<div class="stat-card">
							<div class="label">Revenue (30d)</div>
							<div class="value" style="font-size:1.25rem">
								{shopify.currency} {shopify.revenueLast30Days.toLocaleString()}
							</div>
						</div>
						<div class="stat-card">
							<div class="label">Active Theme</div>
							<div class="value truncate" style="font-size:1rem;margin-top:.5rem">
								{shopify.activeTheme?.name ?? '—'}
							</div>
						</div>
					</div>
				{/if}
			</section>
		{/if}

		{#if !asana && !shopify}
			<div class="empty-state">
				<p>No live integrations configured.</p>
				<p class="dim">Add <code>asana</code> or <code>shopify</code> to the manifest to see data here.</p>
			</div>
		{/if}
	{/if}

	<!-- ══════════════════════════════════════════════════════════
	     TAB: BOARD (KANBAN)
	══════════════════════════════════════════════════════════ -->
	{#if activeTab === 'board'}
		{#if board}
			<div class="kanban">
				{#each ([
					{ key: 'todo',        label: 'To Do',      color: 'var(--color-muted)' },
					{ key: 'in_progress', label: 'In Progress', color: accentVar },
					{ key: 'review',      label: 'Review',      color: 'var(--color-northcoast)' },
					{ key: 'done',        label: 'Done',        color: 'var(--color-wallet)' },
				] as const) as col}
					{@const tasks = board[col.key]}
					<div class="kanban-col">
						<div class="kanban-col-header">
							<span class="kanban-col-dot" style="background: {col.color}"></span>
							<span class="kanban-col-label">{col.label}</span>
							<span class="kanban-col-count">{tasks.length}</span>
						</div>
						<div class="kanban-cards">
							{#each tasks as task (task.id)}
								<a href={task.permalink} class="kanban-card" target="_blank" rel="noopener">
									<p class="kanban-card-title">{task.name}</p>
									<div class="kanban-card-meta">
										{#if task.section}<span class="kanban-card-section">{task.section}</span>{/if}
										{#if task.assignee}<span class="kanban-card-assignee">{task.assignee}</span>{/if}
										{#if task.due_on}<span class="kanban-card-due mono">{task.due_on}</span>{/if}
									</div>
								</a>
							{/each}
							{#if tasks.length === 0}
								<div class="kanban-empty">—</div>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="empty-state">
				<p>No Asana integration configured for this project.</p>
				<p class="dim">Add <code>asana</code> config to the manifest to enable the board.</p>
			</div>
		{/if}
	{/if}

	<!-- ══════════════════════════════════════════════════════════
	     TAB: AI CHAT
	══════════════════════════════════════════════════════════ -->
	{#if activeTab === 'chat'}
		<div class="chat-shell">
			<div class="chat-messages" bind:this={chatEl}>
				{#if messages.length === 0}
					<div class="chat-welcome">
						<p class="chat-welcome-title">Project AI · <span style="color:{accentVar}">{manifest.name}</span></p>
						<p class="chat-welcome-sub">Context loaded: stack, status, client, and repo. Ask anything.</p>
						<div class="suggestions">
							{#each suggestions as s}
								<button class="suggestion" onclick={() => { chatInput = s; sendChat(); }}>
									{s}
								</button>
							{/each}
						</div>
					</div>
				{/if}

				{#each messages as msg}
					<div class="chat-msg chat-msg--{msg.role}">
						<div class="chat-msg-bubble">
							{#each msg.content.split(/```([\s\S]*?)```/g) as part, i}
								{#if i % 2 === 0}
									<p>{@html part.replace(/\n/g, '<br>')}</p>
								{:else}
									<pre class="chat-code"><code>{part}</code></pre>
								{/if}
							{/each}
						</div>
					</div>
				{/each}

				{#if chatBusy}
					<div class="chat-msg chat-msg--assistant">
						<div class="chat-msg-bubble chat-msg-bubble--loading">
							<span class="dot"></span><span class="dot"></span><span class="dot"></span>
						</div>
					</div>
				{/if}
			</div>

			{#if chatError}
				<div class="chat-error">⚠ {chatError}</div>
			{/if}

			<div class="chat-input-row">
				<textarea
					class="chat-input"
					bind:value={chatInput}
					onkeydown={onChatKey}
					placeholder="Ask anything about {manifest.name}… (Enter to send, Shift+Enter for newline)"
					rows="1"
					disabled={chatBusy}
				></textarea>
				<button class="chat-send" onclick={sendChat} disabled={chatBusy || !chatInput.trim()} style="--accent: {accentVar}">
					{chatBusy ? '…' : '↑'}
				</button>
			</div>
		</div>
	{/if}

	<!-- ══════════════════════════════════════════════════════════
	     TAB: COMMITS
	══════════════════════════════════════════════════════════ -->
	{#if activeTab === 'commits'}
		{#if commits && commits.length > 0}
			<section class="section">
				<h2 class="section-title">Recent Commits</h2>
				<div class="commit-list">
					{#each commits as commit}
						<a href={commit.url} class="commit-row" target="_blank" rel="noopener">
							<span class="commit-sha mono">{commit.sha}</span>
							<span class="commit-message">{commit.message}</span>
							<span class="commit-author dim">{commit.author}</span>
							<span class="commit-date dim mono">{formatRelative(commit.date)}</span>
						</a>
					{/each}
				</div>
			</section>
		{:else if manifest.repo}
			<div class="empty-state">
				<p>No commits found.</p>
				<p class="dim">Set <code>GITHUB_TOKEN</code> in env to access private repos.</p>
			</div>
		{:else}
			<div class="empty-state">
				<p>No repository configured for this project.</p>
				<p class="dim">Add <code>repo</code> to the manifest to enable the commit feed.</p>
			</div>
		{/if}
	{/if}

</div>

<style>
	.page { padding: 2rem; max-width: 1200px; }

	/* ── Header ─────────────────────────────────────────────── */
	.page-header {
		display: flex; align-items: flex-start;
		justify-content: space-between; margin-bottom: 1.5rem; gap: 1rem;
	}
	.kind-tag {
		font-size: .7rem; font-weight: 600; text-transform: uppercase;
		letter-spacing: .1em; color: var(--accent); margin-bottom: .3rem;
	}
	.page-title { font-size: 1.5rem; font-weight: 700; margin: 0 0 .25rem; }
	.page-sub   { color: var(--color-muted); font-size: .875rem; margin: 0; }
	.header-right {
		display: flex; align-items: center; gap: .5rem;
		flex-shrink: 0; padding-top: .2rem;
	}
	.client-tag { font-size: .75rem; color: var(--color-muted); }
	.icon-link {
		display: inline-flex; align-items: center; justify-content: center;
		width: 2rem; height: 2rem;
		background: var(--color-surface); border: 1px solid var(--color-border);
		border-radius: var(--radius); font-size: .9rem;
		color: var(--color-text-dim); transition: color .15s, border-color .15s;
	}
	.icon-link:hover { color: var(--color-text); border-color: var(--color-text-dim); }

	/* ── Tabs ───────────────────────────────────────────────── */
	.tabs {
		display: flex; gap: 0;
		border-bottom: 1px solid var(--color-border); margin-bottom: 2rem;
	}
	.tab {
		display: inline-flex; align-items: center; gap: .4rem;
		padding: .6rem 1rem; background: none; border: none;
		font-size: .85rem; color: var(--color-muted); cursor: pointer;
		border-bottom: 2px solid transparent; margin-bottom: -1px;
		transition: color .15s, border-color .15s;
	}
	.tab:hover { color: var(--color-text); }
	.tab--active {
		color: var(--color-text);
		border-bottom-color: var(--tab-accent, var(--color-accent));
	}
	.tab-count {
		background: var(--color-surface-2); border: 1px solid var(--color-border);
		border-radius: 9999px; padding: .05rem .45rem;
		font-size: .7rem; font-weight: 600; font-family: var(--font-mono);
	}

	/* ── Sections ───────────────────────────────────────────── */
	.section { margin-bottom: 2.5rem; }
	.section-title {
		font-size: .75rem; font-weight: 600; text-transform: uppercase;
		letter-spacing: .1em; color: var(--color-muted); margin: 0 0 1rem;
	}
	.progress-row { margin-bottom: 1rem; }
	.progress-meta {
		display: flex; justify-content: space-between;
		font-size: .8rem; color: var(--color-text-dim); margin-bottom: .4rem;
	}

	/* ── Task list ──────────────────────────────────────────── */
	.task-list {
		background: var(--color-surface); border: 1px solid var(--color-border);
		border-radius: var(--radius-lg); overflow: hidden;
	}
	.task-row {
		display: flex; align-items: center; gap: .75rem;
		padding: .7rem 1rem; border-bottom: 1px solid var(--color-border);
		font-size: .875rem; color: var(--color-text); transition: background .12s;
	}
	.task-row:last-child { border-bottom: none; }
	.task-row:hover { background: var(--color-surface-2); }
	.task-check { color: var(--color-muted); flex-shrink: 0; }
	.task-name  { flex: 1; }
	.task-section {
		font-size: .72rem; background: var(--color-surface-2);
		border: 1px solid var(--color-border); border-radius: 3px;
		padding: .15rem .4rem; flex-shrink: 0;
	}
	.task-due { font-size: .72rem; color: var(--color-muted); flex-shrink: 0; }

	/* ── Stat row ───────────────────────────────────────────── */
	.stat-row {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 1rem;
	}

	/* ── Kanban ─────────────────────────────────────────────── */
	.kanban {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1rem;
		align-items: start;
	}
	@media (max-width: 900px) { .kanban { grid-template-columns: 1fr 1fr; } }
	@media (max-width: 560px) { .kanban { grid-template-columns: 1fr; } }

	.kanban-col {
		background: var(--color-surface); border: 1px solid var(--color-border);
		border-radius: var(--radius-lg); overflow: hidden;
	}
	.kanban-col-header {
		display: flex; align-items: center; gap: .5rem;
		padding: .65rem 1rem; border-bottom: 1px solid var(--color-border);
	}
	.kanban-col-dot  { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
	.kanban-col-label { font-size: .75rem; font-weight: 600; flex: 1; }
	.kanban-col-count {
		font-size: .7rem; font-family: var(--font-mono);
		background: var(--color-surface-2); border: 1px solid var(--color-border);
		border-radius: 9999px; padding: .05rem .45rem;
	}
	.kanban-cards { display: flex; flex-direction: column; gap: 0; padding: .5rem; }
	.kanban-card {
		background: var(--color-bg); border: 1px solid var(--color-border);
		border-radius: var(--radius); padding: .75rem; margin-bottom: .4rem;
		transition: border-color .15s, box-shadow .15s; display: block;
	}
	.kanban-card:last-child { margin-bottom: 0; }
	.kanban-card:hover {
		border-color: var(--color-muted);
		box-shadow: 0 2px 8px rgba(0,0,0,.3);
	}
	.kanban-card-title { font-size: .82rem; margin: 0 0 .4rem; line-height: 1.4; }
	.kanban-card-meta  { display: flex; flex-wrap: wrap; gap: .3rem; }
	.kanban-card-section, .kanban-card-assignee {
		font-size: .68rem; background: var(--color-surface);
		border: 1px solid var(--color-border); border-radius: 3px;
		padding: .1rem .35rem; color: var(--color-muted);
	}
	.kanban-card-due { font-size: .68rem; color: var(--color-muted); font-family: var(--font-mono); }
	.kanban-empty { padding: 1rem; text-align: center; font-size: .8rem; color: var(--color-muted); }

	/* ── Chat ───────────────────────────────────────────────── */
	.chat-shell {
		display: flex; flex-direction: column;
		height: calc(100vh - 220px); min-height: 400px;
	}
	.chat-messages {
		flex: 1; overflow-y: auto; display: flex; flex-direction: column;
		gap: .75rem; padding: .5rem 0; scroll-behavior: smooth;
	}
	.chat-welcome {
		flex: 1; display: flex; flex-direction: column;
		justify-content: center; align-items: center; text-align: center;
		padding: 3rem 1rem; gap: .5rem;
	}
	.chat-welcome-title { font-size: 1rem; font-weight: 600; margin: 0; }
	.chat-welcome-sub   { color: var(--color-muted); font-size: .85rem; margin: 0 0 1rem; }
	.suggestions { display: flex; flex-wrap: wrap; gap: .5rem; justify-content: center; }
	.suggestion {
		background: var(--color-surface); border: 1px solid var(--color-border);
		border-radius: var(--radius-lg); padding: .4rem .85rem;
		font-size: .8rem; color: var(--color-text-dim); cursor: pointer;
		transition: border-color .15s, color .15s;
	}
	.suggestion:hover { border-color: var(--color-muted); color: var(--color-text); }

	.chat-msg { display: flex; }
	.chat-msg--user     { justify-content: flex-end; }
	.chat-msg--assistant { justify-content: flex-start; }

	.chat-msg-bubble {
		max-width: 78%; padding: .7rem 1rem;
		border-radius: var(--radius-lg); font-size: .875rem; line-height: 1.55;
	}
	.chat-msg--user .chat-msg-bubble {
		background: var(--color-accent); color: #fff;
	}
	.chat-msg--assistant .chat-msg-bubble {
		background: var(--color-surface); border: 1px solid var(--color-border);
		color: var(--color-text);
	}
	.chat-msg-bubble p { margin: 0 0 .5rem; }
	.chat-msg-bubble p:last-child { margin-bottom: 0; }
	.chat-code {
		background: var(--color-bg); border: 1px solid var(--color-border);
		border-radius: var(--radius); padding: .75rem 1rem;
		font-size: .8rem; overflow-x: auto; margin: .5rem 0;
	}

	.chat-msg-bubble--loading {
		display: flex; gap: .35rem; align-items: center; padding: .6rem 1rem;
	}
	.dot {
		width: 7px; height: 7px; border-radius: 50%;
		background: var(--color-muted); animation: pulse 1.2s infinite;
	}
	.dot:nth-child(2) { animation-delay: .2s; }
	.dot:nth-child(3) { animation-delay: .4s; }
	@keyframes pulse { 0%, 80%, 100% { opacity: .3; } 40% { opacity: 1; } }

	.chat-error {
		margin: .5rem 0; padding: .5rem .75rem;
		background: color-mix(in srgb, #f87171 10%, transparent);
		border: 1px solid color-mix(in srgb, #f87171 30%, transparent);
		border-radius: var(--radius); font-size: .8rem; color: #f87171;
	}

	.chat-input-row {
		display: flex; gap: .5rem; align-items: flex-end;
		padding-top: 1rem; border-top: 1px solid var(--color-border); margin-top: auto;
	}
	.chat-input {
		flex: 1; background: var(--color-surface); border: 1px solid var(--color-border);
		border-radius: var(--radius-lg); padding: .65rem 1rem;
		color: var(--color-text); font-size: .875rem; font-family: inherit;
		resize: none; field-sizing: content; max-height: 160px; line-height: 1.5;
		transition: border-color .15s;
	}
	.chat-input:focus { outline: none; border-color: var(--color-accent); }
	.chat-send {
		display: flex; align-items: center; justify-content: center;
		width: 2.25rem; height: 2.25rem; flex-shrink: 0;
		background: var(--accent, var(--color-accent)); color: #fff;
		border: none; border-radius: var(--radius-lg);
		font-size: 1.1rem; cursor: pointer; transition: opacity .15s;
	}
	.chat-send:disabled { opacity: .4; cursor: not-allowed; }

	/* ── Commits ────────────────────────────────────────────── */
	.commit-list {
		background: var(--color-surface); border: 1px solid var(--color-border);
		border-radius: var(--radius-lg); overflow: hidden;
	}
	.commit-row {
		display: grid;
		grid-template-columns: 5rem 1fr auto auto;
		align-items: center; gap: 1rem;
		padding: .7rem 1rem; border-bottom: 1px solid var(--color-border);
		font-size: .83rem; color: var(--color-text); transition: background .12s;
	}
	.commit-row:last-child { border-bottom: none; }
	.commit-row:hover { background: var(--color-surface-2); }
	.commit-sha { font-family: var(--font-mono); color: var(--color-accent); font-size: .8rem; }
	.commit-message { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.commit-author  { font-size: .75rem; }
	.commit-date    { font-size: .75rem; white-space: nowrap; }

	/* ── Shared ─────────────────────────────────────────────── */
	.error-banner {
		background: color-mix(in srgb, #f87171 10%, transparent);
		border: 1px solid color-mix(in srgb, #f87171 30%, transparent);
		border-radius: var(--radius); padding: .75rem 1rem;
		font-size: .875rem; color: #f87171;
	}
	.empty-state {
		text-align: center; padding: 4rem 2rem;
		color: var(--color-muted); font-size: .9rem;
	}
	.empty-state code {
		background: var(--color-surface); border: 1px solid var(--color-border);
		border-radius: 4px; padding: .1em .4em;
		font-family: var(--font-mono); font-size: .85em;
	}
	.mono     { font-family: var(--font-mono); }
	.dim      { color: var(--color-muted); }
	.truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
