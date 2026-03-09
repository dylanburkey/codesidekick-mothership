<script lang="ts">
	import type { PageData } from './$types';
	import { computeTotals, formatCurrency, newLineItemId, STATUS_LABELS } from '$lib/types/invoice';
	import type { Invoice, InvoiceLineItem, InvoiceStatus } from '$lib/types/invoice';

	let { data }: { data: PageData } = $props();
	const { manifest } = data;

	let inv   = $state<Invoice>({ ...data.invoice });
	let saved = $state(true);
	let saving = $state(false);
	let saveError = $state('');
	let previewMode = $state(false);

	const accentVar = `var(${manifest.accent})`;

	// Recompute totals whenever line items or tax change
	const totals = $derived(computeTotals(inv.lineItems, inv.taxRate ?? 0));

	function markDirty() { saved = false; }

	function addLineItem() {
		inv.lineItems = [
			...inv.lineItems,
			{ id: newLineItemId(), description: '', qty: 1, rate: 0 },
		];
		markDirty();
	}

	function removeLineItem(id: string) {
		if (inv.lineItems.length <= 1) return;
		inv.lineItems = inv.lineItems.filter(li => li.id !== id);
		markDirty();
	}

	function updateLineItem(id: string, field: keyof InvoiceLineItem, value: string | number) {
		inv.lineItems = inv.lineItems.map(li =>
			li.id === id ? { ...li, [field]: value } : li
		);
		markDirty();
	}

	async function saveInvoice() {
		saving = true; saveError = '';
		const payload: Invoice = {
			...inv,
			...computeTotals(inv.lineItems, inv.taxRate ?? 0),
			updatedAt: new Date().toISOString(),
		};
		try {
			const res = await fetch('/api/invoices', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			if (!res.ok) {
				const e = await res.json();
				throw new Error(e.error ?? 'Save failed');
			}
			inv   = await res.json();
			saved = true;
		} catch (e) {
			saveError = e instanceof Error ? e.message : 'Save failed';
		} finally {
			saving = false;
		}
	}

	async function setStatus(status: InvoiceStatus) {
		inv.status = status;
		markDirty();
		await saveInvoice();
	}

	const statusOptions: InvoiceStatus[] = ['draft', 'sent', 'paid', 'overdue', 'void'];
	const statusColor: Record<InvoiceStatus, string> = {
		draft:   'var(--color-muted)',
		sent:    'var(--color-northcoast)',
		paid:    'var(--color-wallet)',
		overdue: '#f87171',
		void:    'var(--color-muted)',
	};

	// Keyboard save
	function onKeydown(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); saveInvoice(); }
	}
</script>

<svelte:window onkeydown={onKeydown} />

<div class="page" class:preview={previewMode}>

	<!-- Toolbar -->
	<div class="toolbar">
		<a href="/projects/{manifest.id}/invoices" class="breadcrumb">← Invoices</a>
		<div class="toolbar-right">
			<span class="dirty-indicator" class:visible={!saved}>Unsaved</span>

			<!-- Status picker -->
			<div class="status-picker">
				{#each statusOptions as s}
					<button
						class="status-btn"
						class:status-btn--active={inv.status === s}
						style={inv.status === s ? `color: ${statusColor[s]}; border-color: ${statusColor[s]}` : ''}
						onclick={() => setStatus(s)}
					>
						{STATUS_LABELS[s]}
					</button>
				{/each}
			</div>

			<button class="btn-ghost" onclick={() => previewMode = !previewMode}>
				{previewMode ? '✏ Edit' : '👁 Preview'}
			</button>
			<button class="btn-primary" onclick={saveInvoice} disabled={saving || saved} style="--accent: {accentVar}">
				{saving ? 'Saving…' : saved ? 'Saved ✓' : '⌘S Save'}
			</button>
		</div>
	</div>

	{#if saveError}<div class="error-banner">⚠ {saveError}</div>{/if}

	{#if !previewMode}
	<!-- ── Editor ───────────────────────────────────────────── -->
	<div class="editor-grid">

		<!-- Left: invoice meta -->
		<section class="form-section">
			<h2 class="section-title">Invoice Details</h2>
			<div class="field-group">
				<label class="field">
					<span class="label">Invoice Number</span>
					<input class="input mono" bind:value={inv.invoiceNumber} oninput={markDirty} />
				</label>
				<label class="field">
					<span class="label">Issue Date</span>
					<input class="input" type="date" bind:value={inv.issueDate} oninput={markDirty} />
				</label>
				<label class="field">
					<span class="label">Due Date</span>
					<input class="input" type="date" bind:value={inv.dueDate} oninput={markDirty} />
				</label>
			</div>
		</section>

		<!-- Right: client info -->
		<section class="form-section">
			<h2 class="section-title">Bill To</h2>
			<div class="field-group">
				<label class="field field--full">
					<span class="label">Client Name</span>
					<input class="input" bind:value={inv.clientName} oninput={markDirty} />
				</label>
				<label class="field field--full">
					<span class="label">Email</span>
					<input class="input" type="email" bind:value={inv.clientEmail} oninput={markDirty} placeholder="optional" />
				</label>
				<label class="field field--full">
					<span class="label">Address</span>
					<textarea class="input textarea" bind:value={inv.clientAddress} oninput={markDirty} placeholder="optional" rows="2"></textarea>
				</label>
			</div>
		</section>

		<!-- Line items — full width -->
		<section class="form-section form-section--full">
			<div class="section-row">
				<h2 class="section-title">Line Items</h2>
				<button class="btn-ghost btn-ghost--sm" onclick={addLineItem}>+ Add Row</button>
			</div>
			<div class="line-items">
				<div class="li-head">
					<span>Description</span><span>Qty</span><span>Rate</span><span>Amount</span><span></span>
				</div>
				{#each inv.lineItems as li (li.id)}
					<div class="li-row">
						<input
							class="input li-desc"
							value={li.description}
							oninput={(e) => updateLineItem(li.id, 'description', (e.target as HTMLInputElement).value)}
							placeholder="Description"
						/>
						<input
							class="input mono li-num"
							type="number" min="0" step="1"
							value={li.qty}
							oninput={(e) => updateLineItem(li.id, 'qty', parseFloat((e.target as HTMLInputElement).value) || 0)}
						/>
						<input
							class="input mono li-num"
							type="number" min="0" step="0.01"
							value={li.rate}
							oninput={(e) => updateLineItem(li.id, 'rate', parseFloat((e.target as HTMLInputElement).value) || 0)}
						/>
						<span class="li-amount mono">{formatCurrency(li.qty * li.rate)}</span>
						<button class="btn-icon btn-icon--danger" onclick={() => removeLineItem(li.id)} title="Remove" disabled={inv.lineItems.length <= 1}>✕</button>
					</div>
				{/each}
			</div>

			<!-- Totals -->
			<div class="totals">
				<div class="total-row">
					<span class="total-label">Subtotal</span>
					<span class="mono">{formatCurrency(totals.subtotal)}</span>
				</div>
				<div class="total-row">
					<span class="total-label">
						Tax
						<input class="input input--inline mono" type="number" min="0" max="100" step="0.5"
							value={(inv.taxRate ?? 0) * 100}
							oninput={(e) => { inv.taxRate = (parseFloat((e.target as HTMLInputElement).value) || 0) / 100; markDirty(); }}
						/>%
					</span>
					<span class="mono">{formatCurrency(totals.taxAmount)}</span>
				</div>
				<div class="total-row total-row--grand">
					<span class="total-label">Total</span>
					<span class="mono total-grand">{formatCurrency(totals.total)}</span>
				</div>
			</div>
		</section>

		<!-- Notes -->
		<section class="form-section form-section--full">
			<h2 class="section-title">Notes</h2>
			<textarea class="input textarea" bind:value={inv.notes} oninput={markDirty}
				placeholder="Payment terms, bank details, thank you note…" rows="3"></textarea>
		</section>
	</div>
	{/if}


	<!-- ── Print / Preview ─────────────────────────────────── -->
	{#if previewMode}
	<div class="preview-doc">
		<div class="preview-header">
			<div>
				<div class="preview-brand">Invoice</div>
				<div class="preview-number mono">{inv.invoiceNumber}</div>
			</div>
			<div class="preview-meta">
				<div><span class="dim">Issued:</span> {inv.issueDate}</div>
				<div><span class="dim">Due:</span> {inv.dueDate}</div>
				<div class="preview-status" style="color: {statusColor[inv.status]}">{STATUS_LABELS[inv.status]}</div>
			</div>
		</div>

		<div class="preview-bill">
			<div class="dim" style="font-size:.75rem;text-transform:uppercase;letter-spacing:.1em;margin-bottom:.35rem">Bill To</div>
			<div style="font-weight:600">{inv.clientName}</div>
			{#if inv.clientEmail}<div class="dim">{inv.clientEmail}</div>{/if}
			{#if inv.clientAddress}<div class="dim" style="white-space:pre-line;margin-top:.25rem">{inv.clientAddress}</div>{/if}
		</div>

		<table class="preview-table">
			<thead>
				<tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr>
			</thead>
			<tbody>
				{#each inv.lineItems as li}
					<tr>
						<td>{li.description}</td>
						<td class="mono center">{li.qty}</td>
						<td class="mono right">{formatCurrency(li.rate)}</td>
						<td class="mono right">{formatCurrency(li.qty * li.rate)}</td>
					</tr>
				{/each}
			</tbody>
		</table>

		<div class="preview-totals">
			<div class="preview-total-row"><span>Subtotal</span><span class="mono">{formatCurrency(totals.subtotal)}</span></div>
			{#if totals.taxAmount > 0}
				<div class="preview-total-row"><span>Tax ({((inv.taxRate ?? 0) * 100).toFixed(1)}%)</span><span class="mono">{formatCurrency(totals.taxAmount)}</span></div>
			{/if}
			<div class="preview-total-row preview-total-grand"><span>Total</span><span class="mono">{formatCurrency(totals.total)}</span></div>
		</div>

		{#if inv.notes}
			<div class="preview-notes">
				<div class="dim" style="font-size:.75rem;text-transform:uppercase;letter-spacing:.1em;margin-bottom:.35rem">Notes</div>
				<div style="white-space:pre-line">{inv.notes}</div>
			</div>
		{/if}
	</div>
	{/if}

</div>

<style>
	.page { padding: 2rem; max-width: 960px; }
	.breadcrumb { font-size: .8rem; color: var(--color-muted); }
	.breadcrumb:hover { color: var(--color-text); }

	/* ── Toolbar ───────────────────────────────────────────── */
	.toolbar {
		display: flex; align-items: center; justify-content: space-between;
		margin-bottom: 1.5rem; gap: 1rem; flex-wrap: wrap;
	}
	.toolbar-right { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; }
	.dirty-indicator {
		font-size: .72rem; color: var(--color-muted); opacity: 0;
		transition: opacity .2s; font-family: var(--font-mono);
	}
	.dirty-indicator.visible { opacity: 1; color: var(--color-forge); }

	/* ── Status picker ─────────────────────────────────────── */
	.status-picker { display: flex; gap: .25rem; }
	.status-btn {
		padding: .25rem .55rem; font-size: .7rem; font-weight: 600;
		background: var(--color-surface); border: 1px solid var(--color-border);
		border-radius: var(--radius); cursor: pointer; color: var(--color-muted);
		transition: color .12s, border-color .12s;
	}
	.status-btn:hover { color: var(--color-text); }
	.status-btn--active { background: color-mix(in srgb, currentColor 10%, transparent); }

	/* ── Buttons ───────────────────────────────────────────── */
	.btn-primary {
		background: var(--accent, var(--color-accent)); color: #fff;
		border: none; border-radius: var(--radius-lg); padding: .5rem 1rem;
		font-size: .82rem; font-weight: 600; cursor: pointer; white-space: nowrap;
		transition: opacity .15s;
	}
	.btn-primary:hover { opacity: .85; }
	.btn-primary:disabled { opacity: .5; cursor: not-allowed; }
	.btn-ghost {
		background: none; border: 1px solid var(--color-border); border-radius: var(--radius);
		padding: .4rem .75rem; font-size: .8rem; color: var(--color-muted); cursor: pointer;
		transition: color .12s, border-color .12s;
	}
	.btn-ghost:hover { color: var(--color-text); border-color: var(--color-text-dim); }
	.btn-ghost--sm { padding: .25rem .6rem; font-size: .75rem; }
	.btn-icon {
		display: inline-flex; align-items: center; justify-content: center;
		width: 1.75rem; height: 1.75rem; background: var(--color-surface-2);
		border: 1px solid var(--color-border); border-radius: var(--radius);
		font-size: .75rem; color: var(--color-muted); cursor: pointer;
	}
	.btn-icon--danger:hover { color: #f87171; border-color: #f87171; }
	.btn-icon:disabled { opacity: .3; cursor: not-allowed; }

	/* ── Editor grid ───────────────────────────────────────── */
	.editor-grid {
		display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;
	}
	.form-section { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 1.25rem; }
	.form-section--full { grid-column: 1 / -1; }
	.section-title { font-size: .72rem; font-weight: 600; text-transform: uppercase; letter-spacing: .1em; color: var(--color-muted); margin: 0 0 1rem; }
	.section-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: .75rem; }
	.section-row .section-title { margin: 0; }
	.field-group { display: grid; grid-template-columns: 1fr 1fr; gap: .75rem; }
	.field { display: flex; flex-direction: column; gap: .3rem; }
	.field--full { grid-column: 1 / -1; }
	.label { font-size: .72rem; font-weight: 600; color: var(--color-muted); text-transform: uppercase; letter-spacing: .07em; }
	.input {
		background: var(--color-bg); border: 1px solid var(--color-border);
		border-radius: var(--radius); padding: .5rem .65rem;
		color: var(--color-text); font-size: .85rem; font-family: inherit;
		transition: border-color .15s; width: 100%;
	}
	.input:focus { outline: none; border-color: var(--color-accent); }
	.textarea { resize: vertical; min-height: 60px; }
	.input--inline { display: inline-block; width: 3.5rem; padding: .15rem .4rem; margin: 0 .25rem; text-align: right; }

	/* ── Line items ────────────────────────────────────────── */
	.line-items { border: 1px solid var(--color-border); border-radius: var(--radius); overflow: hidden; }
	.li-head {
		display: grid; grid-template-columns: 1fr 5rem 7rem 7rem 2rem;
		gap: .5rem; padding: .5rem .75rem;
		background: var(--color-surface-2); border-bottom: 1px solid var(--color-border);
		font-size: .68rem; font-weight: 600; text-transform: uppercase; letter-spacing: .08em; color: var(--color-muted);
	}
	.li-row {
		display: grid; grid-template-columns: 1fr 5rem 7rem 7rem 2rem;
		gap: .5rem; padding: .5rem .75rem; border-bottom: 1px solid var(--color-border);
		align-items: center;
	}
	.li-row:last-child { border-bottom: none; }
	.li-num  { text-align: right; }
	.li-amount { font-size: .85rem; text-align: right; padding-right: .25rem; }

	/* ── Totals ────────────────────────────────────────────── */
	.totals { margin-top: 1rem; display: flex; flex-direction: column; align-items: flex-end; gap: .4rem; }
	.total-row { display: flex; gap: 2rem; align-items: center; font-size: .875rem; min-width: 20rem; justify-content: space-between; }
	.total-row--grand { padding-top: .4rem; border-top: 1px solid var(--color-border); }
	.total-grand { font-size: 1.1rem; font-weight: 700; }
	.total-label { color: var(--color-text-dim); display: flex; align-items: center; gap: .25rem; }

	/* ── Preview doc ───────────────────────────────────────── */
	.preview-doc {
		background: var(--color-surface); border: 1px solid var(--color-border);
		border-radius: var(--radius-lg); padding: 2.5rem; max-width: 720px;
	}
	.preview-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2.5rem; }
	.preview-brand  { font-size: 1.3rem; font-weight: 800; letter-spacing: .04em; }
	.preview-number { font-size: .9rem; color: var(--color-muted); margin-top: .15rem; }
	.preview-meta   { text-align: right; font-size: .85rem; display: flex; flex-direction: column; gap: .3rem; }
	.preview-status { font-weight: 700; }
	.preview-bill   { margin-bottom: 2rem; padding: 1rem; background: var(--color-bg); border-radius: var(--radius); }

	.preview-table { width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; font-size: .875rem; }
	.preview-table th {
		text-align: left; font-size: .68rem; text-transform: uppercase; letter-spacing: .1em;
		color: var(--color-muted); padding: .5rem .75rem; border-bottom: 1px solid var(--color-border);
	}
	.preview-table td { padding: .65rem .75rem; border-bottom: 1px solid var(--color-border); }
	.preview-table .center { text-align: center; }
	.preview-table .right  { text-align: right; }

	.preview-totals { display: flex; flex-direction: column; align-items: flex-end; gap: .4rem; margin-bottom: 1.5rem; }
	.preview-total-row { display: flex; justify-content: space-between; min-width: 260px; font-size: .875rem; }
	.preview-total-grand { border-top: 1px solid var(--color-border); padding-top: .5rem; font-weight: 700; font-size: 1rem; }
	.preview-notes { border-top: 1px solid var(--color-border); padding-top: 1.25rem; font-size: .875rem; color: var(--color-text-dim); }

	.error-banner {
		background: color-mix(in srgb, #f87171 10%, transparent);
		border: 1px solid color-mix(in srgb, #f87171 30%, transparent);
		border-radius: var(--radius); padding: .65rem 1rem;
		font-size: .82rem; color: #f87171; margin-bottom: 1.25rem;
	}
	.dim  { color: var(--color-muted); }
	.mono { font-family: var(--font-mono); }

	@media (max-width: 700px) { .editor-grid { grid-template-columns: 1fr; } }
</style>
