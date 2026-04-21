<script lang="ts">
	import type { PageData } from './$types';
	import { formatCurrency, STATUS_LABELS } from '$lib/types/invoice';
	import type { Invoice, InvoiceStatus } from '$lib/types/invoice';

	let { data }: { data: PageData } = $props();
	const manifest = $derived(data.manifest);

	let invoices = $state<Invoice[]>(data.invoices ?? []);
	let creating = $state(false);
	let error    = $state('');

	const accentVar = $derived(`var(${manifest.accent})`);

	const statusColor: Record<InvoiceStatus, string> = {
		draft:   'var(--color-muted)',
		sent:    'var(--color-northcoast)',
		paid:    'var(--color-wallet)',
		overdue: '#f87171',
		void:    'var(--color-muted)',
	};

	// ── Summary stats ──────────────────────────────────────────
	const totalPaid     = $derived(invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0));
	const totalOutstanding = $derived(invoices.filter(i => i.status === 'sent' || i.status === 'overdue').reduce((s, i) => s + i.total, 0));
	const draftCount    = $derived(invoices.filter(i => i.status === 'draft').length);

	// ── Create new invoice ─────────────────────────────────────
	async function createInvoice() {
		creating = true; error = '';
		const today    = new Date().toISOString().slice(0, 10);
		const dueDate  = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
		const nextNum  = `INV-${String(invoices.length + 1).padStart(4, '0')}`;

		try {
			const res = await fetch('/api/invoices', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					projectId: manifest.id,
					invoiceNumber: nextNum,
					status: 'draft',
					clientName: manifest.client ?? '',
					issueDate: today,
					dueDate,
					lineItems: [{ id: 'li_init', description: 'Development services', qty: 1, rate: 0 }],
				}),
			});
			const inv: Invoice = await res.json();
			if (!res.ok) throw new Error((inv as unknown as { error: string }).error);
			invoices = [inv, ...invoices];
			window.location.href = `/projects/${manifest.id}/invoices/${inv.id}`;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to create invoice';
			creating = false;
		}
	}

	async function deleteInvoice(inv: Invoice) {
		if (!confirm(`Delete ${inv.invoiceNumber}? This cannot be undone.`)) return;
		try {
			await fetch(`/api/invoices?id=${inv.id}&pid=${inv.projectId}`, { method: 'DELETE' });
			invoices = invoices.filter(i => i.id !== inv.id);
		} catch {
			error = 'Delete failed';
		}
	}

	function formatDate(iso: string) {
		return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}
</script>

<div class="page">
	<header class="page-header">
		<div>
			<a href="/projects/{manifest.id}" class="breadcrumb">← {manifest.name}</a>
			<h1 class="page-title">Invoices</h1>
			{#if manifest.client}<p class="page-sub">{manifest.client}</p>{/if}
		</div>
		<button class="btn-primary" onclick={createInvoice} disabled={creating} style="--accent: {accentVar}">
			{creating ? 'Creating…' : '+ New Invoice'}
		</button>
	</header>

	{#if error}<div class="error-banner">⚠ {error}</div>{/if}

	<!-- Summary stats -->
	<div class="stat-row">
		<div class="stat-card">
			<div class="label">Total Invoices</div>
			<div class="value">{invoices.length}</div>
		</div>
		<div class="stat-card">
			<div class="label">Paid</div>
			<div class="value" style="color: var(--color-wallet)">{formatCurrency(totalPaid)}</div>
		</div>
		<div class="stat-card">
			<div class="label">Outstanding</div>
			<div class="value" style="color: var(--color-northcoast)">{formatCurrency(totalOutstanding)}</div>
		</div>
		<div class="stat-card">
			<div class="label">Drafts</div>
			<div class="value">{draftCount}</div>
		</div>
	</div>

	{#if invoices.length === 0}
		<div class="empty-state">
			<p>No invoices yet.</p>
			<p class="dim">Click <strong>+ New Invoice</strong> to get started.</p>
		</div>
	{:else}
		<section class="section">
			<h2 class="section-title">All Invoices</h2>
			<div class="invoice-table">
				<div class="table-head">
					<span>Number</span><span>Client</span><span>Issued</span>
					<span>Due</span><span>Total</span><span>Status</span><span></span>
				</div>
				{#each invoices as inv (inv.id)}
					<div class="table-row">
						<a href="/projects/{manifest.id}/invoices/{inv.id}" class="inv-number mono">
							{inv.invoiceNumber}
						</a>
						<span class="inv-client">{inv.clientName || '—'}</span>
						<span class="dim mono">{formatDate(inv.issueDate)}</span>
						<span class="dim mono">{formatDate(inv.dueDate)}</span>
						<span class="inv-total mono">{formatCurrency(inv.total)}</span>
						<span class="inv-status" style="color: {statusColor[inv.status]}">
							{STATUS_LABELS[inv.status]}
						</span>
						<div class="inv-actions">
							<a href="/projects/{manifest.id}/invoices/{inv.id}" class="btn-icon" title="Edit">✏</a>
							<button class="btn-icon btn-icon--danger" onclick={() => deleteInvoice(inv)} title="Delete">✕</button>
						</div>
					</div>
				{/each}
			</div>
		</section>
	{/if}
</div>

<style>
	.page { padding: 2rem; max-width: 1100px; }
	.breadcrumb { font-size: .8rem; color: var(--color-muted); display: block; margin-bottom: .25rem; }
	.breadcrumb:hover { color: var(--color-text); }
	.page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 1.75rem; gap: 1rem; }
	.page-title  { font-size: 1.5rem; font-weight: 700; margin: 0; }
	.page-sub    { color: var(--color-muted); font-size: .875rem; margin: .15rem 0 0; }
	.stat-row    { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 2rem; }
	.section     { margin-bottom: 2rem; }
	.section-title { font-size: .72rem; font-weight: 600; text-transform: uppercase; letter-spacing: .1em; color: var(--color-muted); margin: 0 0 .75rem; }

	.btn-primary {
		background: var(--accent, var(--color-accent)); color: #fff;
		border: none; border-radius: var(--radius-lg); padding: .55rem 1.1rem;
		font-size: .85rem; font-weight: 600; cursor: pointer; transition: opacity .15s;
	}
	.btn-primary:hover { opacity: .85; }
	.btn-primary:disabled { opacity: .45; cursor: not-allowed; }

	.invoice-table {
		background: var(--color-surface); border: 1px solid var(--color-border);
		border-radius: var(--radius-lg); overflow: hidden;
	}
	.table-head, .table-row {
		display: grid;
		grid-template-columns: 7rem 1fr 9rem 9rem 8rem 6rem 5rem;
		align-items: center; gap: .75rem; padding: .65rem 1.1rem;
	}
	.table-head { font-size: .68rem; font-weight: 600; text-transform: uppercase; letter-spacing: .08em; color: var(--color-muted); border-bottom: 1px solid var(--color-border); }
	.table-row  { border-bottom: 1px solid var(--color-border); font-size: .85rem; transition: background .12s; }
	.table-row:last-child { border-bottom: none; }
	.table-row:hover { background: var(--color-surface-2); }

	.inv-number { color: var(--color-accent); font-size: .82rem; }
	.inv-number:hover { text-decoration: underline; }
	.inv-client { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.inv-total  { font-weight: 600; }
	.inv-status { font-size: .78rem; font-weight: 600; }
	.inv-actions { display: flex; gap: .25rem; justify-content: flex-end; }

	.btn-icon {
		display: inline-flex; align-items: center; justify-content: center;
		width: 1.75rem; height: 1.75rem; background: var(--color-surface-2);
		border: 1px solid var(--color-border); border-radius: var(--radius);
		font-size: .8rem; color: var(--color-muted); cursor: pointer;
		transition: color .12s, border-color .12s;
	}
	.btn-icon:hover { color: var(--color-text); border-color: var(--color-text-dim); }
	.btn-icon--danger:hover { color: #f87171; border-color: #f87171; }

	.error-banner {
		background: color-mix(in srgb, #f87171 10%, transparent);
		border: 1px solid color-mix(in srgb, #f87171 30%, transparent);
		border-radius: var(--radius); padding: .65rem 1rem;
		font-size: .82rem; color: #f87171; margin-bottom: 1.25rem;
	}
	.empty-state { text-align: center; padding: 4rem 2rem; color: var(--color-muted); font-size: .9rem; }
	.empty-state strong { color: var(--color-text); }
	.dim  { color: var(--color-muted); }
	.mono { font-family: var(--font-mono); }

	@media (max-width: 900px) {
		.table-head { display: none; }
		.table-row  { grid-template-columns: 1fr; gap: .25rem; }
		.stat-row   { grid-template-columns: 1fr 1fr; }
	}
</style>
