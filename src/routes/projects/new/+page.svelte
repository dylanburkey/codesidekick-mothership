<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ActionData } from './$types';

  export let form: ActionData;

  // ── Step state ──────────────────────────────────────────────────
  let step = 1;
  const TOTAL_STEPS = 4;

  // ── Form fields ─────────────────────────────────────────────────
  let name = '';
  let slug = '';
  let kind = 'web-app';
  let client = '';
  let repo = '';

  let frontend = '';
  let backend = '';
  let infra = 'Cloudflare Workers';
  let database = '';

  let goal = '';
  let deliverables = '';
  let timeline = '';
  let constraints = '';

  let hasAsana = false;
  let hasShopify = false;
  let shopifyDomain = '';
  let hasAgent = false;

  // ── Results tab ─────────────────────────────────────────────────
  let activeTab: 'brief' | 'tasks' | 'config' = 'brief';
  let submitting = false;

  // Auto-generate slug from name
  $: slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  // Task grouping
  type TaskItem = { name: string; section?: string; priority: string; notes: string };
  $: tasksBySection = (form?.tasks ?? []).reduce<Record<string, TaskItem[]>>((acc, t) => {
    const s = t.section ?? 'Other';
    (acc[s] ??= []).push(t);
    return acc;
  }, {});

  const kindOptions = [
    { value: 'web-app',    label: 'Web App' },
    { value: 'shopify',    label: 'Shopify Theme' },
    { value: 'api',        label: 'API / Backend' },
    { value: 'defi',       label: 'DeFi / Web3' },
    { value: 'infra',      label: 'Infrastructure' },
    { value: 'ai',         label: 'AI / ML' },
    { value: 'tool',       label: 'Internal Tool' },
    { value: 'mobile',     label: 'Mobile' },
  ];

  function copyText(text: string) {
    navigator.clipboard.writeText(text);
  }

  function priorityClass(p: string) {
    if (p === 'high')   return 'priority--high';
    if (p === 'low')    return 'priority--low';
    return 'priority--medium';
  }
</script>

<svelte:head>
  <title>New Project — CCS Intake</title>
</svelte:head>

<div class="intake">

  <!-- ── Header ─────────────────────────────────────────── -->
  <header class="intake__header">
    <h1 class="intake__title">
      {#if form?.success}Project Brief Generated{:else}New Project Intake{/if}
    </h1>
    <p class="intake__subtitle">
      {#if form?.success}
        Review your brief, task list, and CCS config below.
      {:else}
        Answer a few questions and Workers AI will generate your brief, Asana tasks, and CCS manifest.
      {/if}
    </p>
  </header>

  <!-- ── Results ────────────────────────────────────────── -->
  {#if form?.success}
    <section class="results">

      <!-- Tab bar -->
      <div class="results__tabs" role="tablist">
        <button role="tab" class="results__tab" class:results__tab--active={activeTab === 'brief'}
          on:click={() => activeTab = 'brief'}>📄 Brief</button>
        <button role="tab" class="results__tab" class:results__tab--active={activeTab === 'tasks'}
          on:click={() => activeTab = 'tasks'}>✅ Tasks ({form.tasks?.length ?? 0})</button>
        <button role="tab" class="results__tab" class:results__tab--active={activeTab === 'config'}
          on:click={() => activeTab = 'config'}>⚙️ CCS Config</button>
        <button class="results__reset" on:click={() => { step = 1; }}>← Start over</button>
      </div>

      <!-- Brief tab -->
      {#if activeTab === 'brief'}
        <div class="panel">
          <div class="panel__actions">
            <button class="btn btn--ghost" on:click={() => copyText(JSON.stringify(form.brief, null, 2))}>Copy JSON</button>
          </div>
          <p class="brief__summary">{form.brief?.summary}</p>

          <div class="brief__grid">
            <div class="brief__section">
              <h3>Goals</h3>
              <ul>{#each form.brief?.goals ?? [] as g}<li>{g}</li>{/each}</ul>
            </div>
            <div class="brief__section">
              <h3>Deliverables</h3>
              <ul>{#each form.brief?.deliverables ?? [] as d}<li>{d}</li>{/each}</ul>
            </div>
            <div class="brief__section">
              <h3>Risks</h3>
              <ul>{#each form.brief?.risks ?? [] as r}<li>{r}</li>{/each}</ul>
            </div>
            <div class="brief__section">
              <h3>Success Criteria</h3>
              <ul>{#each form.brief?.successCriteria ?? [] as s}<li>{s}</li>{/each}</ul>
            </div>
          </div>

          {#if form.brief?.techNotes}
            <div class="brief__tech">
              <h3>Technical Notes</h3>
              <p>{form.brief.techNotes}</p>
            </div>
          {/if}
        </div>
      {/if}

      <!-- Tasks tab -->
      {#if activeTab === 'tasks'}
        <div class="panel">
          <div class="panel__actions">
            <button class="btn btn--ghost" on:click={() => copyText(JSON.stringify(form.tasks, null, 2))}>Copy JSON</button>
            <span class="panel__note">Push to Asana coming soon</span>
          </div>
          {#each Object.entries(tasksBySection) as [section, tasks]}
            <div class="task-section">
              <h3 class="task-section__label">{section}</h3>
              {#each tasks as task}
                <div class="task-row">
                  <span class="task-row__priority {priorityClass(task.priority)}">{task.priority}</span>
                  <span class="task-row__name">{task.name}</span>
                  {#if task.notes}
                    <span class="task-row__notes">{task.notes}</span>
                  {/if}
                </div>
              {/each}
            </div>
          {/each}
        </div>
      {/if}

      <!-- Config tab -->
      {#if activeTab === 'config'}
        <div class="panel">
          <div class="panel__actions">
            <button class="btn btn--ghost" on:click={() => copyText(JSON.stringify(form.ccsConfig, null, 2))}>Copy JSON</button>
            <button class="btn btn--ghost" on:click={() => {
              const blob = new Blob([JSON.stringify(form.ccsConfig, null, 2)], { type: 'application/json' });
              const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `${form.ccsConfig?.id ?? 'project'}.ccs.json` });
              a.click();
            }}>Download</button>
          </div>
          <pre class="config-code"><code>{JSON.stringify(form.ccsConfig, null, 2)}</code></pre>
        </div>
      {/if}

    </section>

  <!-- ── Error ───────────────────────────────────────────── -->
  {:else if form?.error}
    <div class="intake__error">
      <strong>Error:</strong> {form.error}
      {#if (form as Record<string, unknown>).raw}
        <details>
          <summary>Raw AI output</summary>
          <pre>{(form as Record<string, unknown>).raw}</pre>
        </details>
      {/if}
    </div>

  <!-- ── Form ───────────────────────────────────────────── -->
  {:else}
    <!-- Progress bar -->
    <div class="progress" aria-label="Step {step} of {TOTAL_STEPS}">
      {#each Array(TOTAL_STEPS) as _, i}
        <div class="progress__step" class:progress__step--done={i + 1 < step} class:progress__step--active={i + 1 === step}>
          <span class="progress__num">{i + 1}</span>
          <span class="progress__label">{['Basics','Stack','Goals','Integrations'][i]}</span>
        </div>
        {#if i < TOTAL_STEPS - 1}<div class="progress__line" class:progress__line--done={i + 1 < step}></div>{/if}
      {/each}
    </div>

    <form method="POST" action="?/generate" class="intake__form"
      use:enhance={() => {
        submitting = true;
        return async ({ update }) => { await update(); submitting = false; };
      }}>

      <!-- Hidden fields for all steps so they all submit -->
      <input type="hidden" name="slug" value={slug} />

      <!-- ── Step 1: Basics ──────────────────────────── -->
      <fieldset class="step" class:step--active={step === 1} disabled={step !== 1} aria-hidden={step !== 1}>
        <legend>Project Basics</legend>

        <div class="field">
          <label for="name">Project name <span aria-hidden="true">*</span></label>
          <input id="name" name="name" type="text" bind:value={name} required placeholder="Zebra Skimmers Storefront" />
          {#if slug}<p class="field__hint">Slug: <code>{slug}</code></p>{/if}
        </div>

        <div class="field">
          <label for="kind">Project type <span aria-hidden="true">*</span></label>
          <select id="kind" name="kind" bind:value={kind}>
            {#each kindOptions as o}<option value={o.value}>{o.label}</option>{/each}
          </select>
        </div>

        <div class="field">
          <label for="client">Client <span class="field__optional">(optional)</span></label>
          <input id="client" name="client" type="text" bind:value={client} placeholder="Zebra Skimmers Inc." />
        </div>

        <div class="field">
          <label for="repo">Repository URL <span class="field__optional">(optional)</span></label>
          <input id="repo" name="repo" type="url" bind:value={repo} placeholder="https://github.com/org/repo" />
        </div>
      </fieldset>

      <!-- ── Step 2: Stack ───────────────────────────── -->
      <fieldset class="step" class:step--active={step === 2} disabled={step !== 2} aria-hidden={step !== 2}>
        <legend>Tech Stack</legend>

        <div class="field">
          <label for="frontend">Frontend</label>
          <input id="frontend" name="frontend" type="text" bind:value={frontend} placeholder="Astro, SvelteKit, Next.js…" />
        </div>

        <div class="field">
          <label for="backend">Backend / API</label>
          <input id="backend" name="backend" type="text" bind:value={backend} placeholder="FastAPI, Hono, SvelteKit endpoints…" />
        </div>

        <div class="field">
          <label for="infra">Infrastructure</label>
          <input id="infra" name="infra" type="text" bind:value={infra} placeholder="Cloudflare Workers, DO, Vercel…" />
        </div>

        <div class="field">
          <label for="database">Database</label>
          <input id="database" name="database" type="text" bind:value={database} placeholder="MongoDB, D1, Postgres, BigQuery…" />
        </div>
      </fieldset>

      <!-- ── Step 3: Goals ───────────────────────────── -->
      <fieldset class="step" class:step--active={step === 3} disabled={step !== 3} aria-hidden={step !== 3}>
        <legend>Goals &amp; Scope</legend>

        <div class="field">
          <label for="goal">Primary goal <span aria-hidden="true">*</span></label>
          <textarea id="goal" name="goal" bind:value={goal} required rows="3"
            placeholder="What does success look like? What problem does this solve?"></textarea>
        </div>

        <div class="field">
          <label for="deliverables">Key deliverables</label>
          <textarea id="deliverables" name="deliverables" bind:value={deliverables} rows="3"
            placeholder="List the main things you need to ship — one per line or comma-separated."></textarea>
        </div>

        <div class="field">
          <label for="timeline">Timeline <span class="field__optional">(optional)</span></label>
          <input id="timeline" name="timeline" type="text" bind:value={timeline} placeholder="6 weeks, Q2 2025, by May 1…" />
        </div>

        <div class="field">
          <label for="constraints">Constraints <span class="field__optional">(optional)</span></label>
          <textarea id="constraints" name="constraints" bind:value={constraints} rows="2"
            placeholder="Budget limits, legacy system dependencies, team size, tech requirements…"></textarea>
        </div>
      </fieldset>

      <!-- ── Step 4: Integrations ────────────────────── -->
      <fieldset class="step" class:step--active={step === 4} disabled={step !== 4} aria-hidden={step !== 4}>
        <legend>Integrations</legend>

        <div class="toggles">
          <label class="toggle">
            <input type="checkbox" name="hasAsana" bind:checked={hasAsana} />
            <span class="toggle__track"></span>
            <span class="toggle__label">Asana task tracking</span>
          </label>
          <label class="toggle">
            <input type="checkbox" name="hasShopify" bind:checked={hasShopify} />
            <span class="toggle__track"></span>
            <span class="toggle__label">Shopify store</span>
          </label>
          {#if hasShopify}
            <div class="field field--indent">
              <label for="shopifyDomain">Store domain</label>
              <input id="shopifyDomain" name="shopifyDomain" type="text" bind:value={shopifyDomain}
                placeholder="your-store.myshopify.com" />
            </div>
          {/if}
          <label class="toggle">
            <input type="checkbox" name="hasAgent" bind:checked={hasAgent} />
            <span class="toggle__track"></span>
            <span class="toggle__label">Local CCS agent</span>
          </label>
        </div>
      </fieldset>

      <!-- ── Nav buttons ─────────────────────────────── -->
      <div class="intake__nav">
        {#if step > 1}
          <button type="button" class="btn btn--ghost" on:click={() => step--}>← Back</button>
        {:else}
          <span></span>
        {/if}

        {#if step < TOTAL_STEPS}
          <button type="button" class="btn btn--primary" on:click={() => step++}
            disabled={step === 1 && (!name || !goal && false)}>
            Next →
          </button>
        {:else}
          <button type="submit" class="btn btn--primary btn--generate" disabled={submitting || !name || !goal}>
            {#if submitting}
              <span class="spinner" aria-hidden="true"></span> Generating…
            {:else}
              ✨ Generate with Workers AI
            {/if}
          </button>
        {/if}
      </div>

    </form>
  {/if}

</div>

<style>
/* ── Layout ─────────────────────────────────────────────── */
.intake {
  max-width: 780px;
  margin-inline: auto;
  padding: 2rem 1.5rem 4rem;
}

.intake__header {
  margin-bottom: 2rem;
}

.intake__title {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-text-primary, #f1f5f9);
  margin: 0 0 .4rem;
}

.intake__subtitle {
  color: var(--color-text-muted, #94a3b8);
  margin: 0;
}

/* ── Progress bar ───────────────────────────────────────── */
.progress {
  display: flex;
  align-items: center;
  gap: 0;
  margin-bottom: 2.5rem;
}

.progress__step {
  display: flex;
  align-items: center;
  gap: .45rem;
  flex-shrink: 0;
}

.progress__num {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid var(--color-border, #334155);
  display: grid;
  place-items: center;
  font-size: .8rem;
  font-weight: 600;
  color: var(--color-text-muted, #94a3b8);
  background: transparent;
  transition: background .2s, border-color .2s, color .2s;
}

.progress__step--active .progress__num {
  background: var(--color-ccs, #6366f1);
  border-color: var(--color-ccs, #6366f1);
  color: #fff;
}

.progress__step--done .progress__num {
  background: #22c55e;
  border-color: #22c55e;
  color: #fff;
}

.progress__label {
  font-size: .78rem;
  color: var(--color-text-muted, #94a3b8);
}

.progress__step--active .progress__label {
  color: var(--color-text-primary, #f1f5f9);
  font-weight: 600;
}

.progress__line {
  flex: 1;
  height: 2px;
  background: var(--color-border, #334155);
  margin: 0 .5rem;
  transition: background .3s;
}

.progress__line--done {
  background: #22c55e;
}

/* ── Fieldset / step ────────────────────────────────────── */
fieldset {
  border: none;
  padding: 0;
  margin: 0;
}

.step {
  display: none;
}

.step--active {
  display: block;
}

legend {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text-primary, #f1f5f9);
  margin-bottom: 1.5rem;
  padding: 0;
}

/* ── Fields ─────────────────────────────────────────────── */
.field {
  margin-bottom: 1.25rem;
}

.field label {
  display: block;
  font-size: .85rem;
  font-weight: 500;
  color: var(--color-text-secondary, #cbd5e1);
  margin-bottom: .4rem;
}

.field__optional {
  font-weight: 400;
  color: var(--color-text-muted, #64748b);
}

.field__hint {
  font-size: .78rem;
  color: var(--color-text-muted, #64748b);
  margin: .25rem 0 0;
}

.field__hint code {
  background: var(--color-surface-raised, #1e293b);
  padding: .1em .3em;
  border-radius: 3px;
}

.field--indent {
  margin-left: 2rem;
  margin-top: .75rem;
}

input[type="text"],
input[type="url"],
select,
textarea {
  width: 100%;
  background: var(--color-surface, #0f172a);
  border: 1px solid var(--color-border, #334155);
  border-radius: 6px;
  padding: .6rem .75rem;
  color: var(--color-text-primary, #f1f5f9);
  font-size: .9rem;
  font-family: inherit;
  transition: border-color .15s;
  box-sizing: border-box;
}

input:focus,
select:focus,
textarea:focus {
  outline: none;
  border-color: var(--color-ccs, #6366f1);
  box-shadow: 0 0 0 3px rgb(99 102 241 / .2);
}

textarea {
  resize: vertical;
}

/* ── Toggles ─────────────────────────────────────────────── */
.toggles {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.toggle {
  display: flex;
  align-items: center;
  gap: .75rem;
  cursor: pointer;
}

.toggle input[type="checkbox"] {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle__track {
  display: inline-block;
  width: 40px;
  height: 22px;
  border-radius: 11px;
  background: var(--color-border, #334155);
  position: relative;
  flex-shrink: 0;
  transition: background .2s;
}

.toggle__track::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  transition: transform .2s;
}

.toggle input:checked + .toggle__track {
  background: var(--color-ccs, #6366f1);
}

.toggle input:checked + .toggle__track::after {
  transform: translateX(18px);
}

.toggle__label {
  font-size: .9rem;
  color: var(--color-text-secondary, #cbd5e1);
}

/* ── Navigation ─────────────────────────────────────────── */
.intake__nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--color-border, #334155);
}

/* ── Buttons ─────────────────────────────────────────────── */
.btn {
  display: inline-flex;
  align-items: center;
  gap: .5rem;
  padding: .55rem 1.25rem;
  border-radius: 6px;
  font-size: .9rem;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background .15s, opacity .15s;
}

.btn--primary {
  background: var(--color-ccs, #6366f1);
  color: #fff;
  border-color: var(--color-ccs, #6366f1);
}

.btn--primary:hover:not(:disabled) {
  background: #4f46e5;
}

.btn--primary:disabled {
  opacity: .45;
  cursor: not-allowed;
}

.btn--ghost {
  background: transparent;
  color: var(--color-text-secondary, #cbd5e1);
  border-color: var(--color-border, #334155);
}

.btn--ghost:hover {
  background: var(--color-surface-raised, #1e293b);
}

.btn--generate {
  padding: .65rem 1.75rem;
  font-size: 1rem;
}

/* ── Spinner ─────────────────────────────────────────────── */
.spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255,255,255,.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin .7s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* ── Error ───────────────────────────────────────────────── */
.intake__error {
  background: rgb(239 68 68 / .1);
  border: 1px solid rgb(239 68 68 / .4);
  border-radius: 8px;
  padding: 1rem 1.25rem;
  color: #fca5a5;
  font-size: .9rem;
}

.intake__error details {
  margin-top: .75rem;
}

.intake__error pre {
  font-size: .75rem;
  overflow: auto;
  margin-top: .5rem;
  color: #94a3b8;
}

/* ── Results ─────────────────────────────────────────────── */
.results__tabs {
  display: flex;
  align-items: center;
  gap: .25rem;
  border-bottom: 1px solid var(--color-border, #334155);
  margin-bottom: 1.5rem;
}

.results__tab {
  background: none;
  border: none;
  padding: .6rem 1rem;
  font-size: .9rem;
  color: var(--color-text-muted, #64748b);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: color .15s, border-color .15s;
}

.results__tab--active {
  color: var(--color-text-primary, #f1f5f9);
  border-bottom-color: var(--color-ccs, #6366f1);
}

.results__reset {
  margin-left: auto;
  background: none;
  border: none;
  color: var(--color-text-muted, #64748b);
  font-size: .82rem;
  cursor: pointer;
}

.results__reset:hover {
  color: var(--color-text-secondary, #cbd5e1);
}

/* ── Panel ───────────────────────────────────────────────── */
.panel {
  background: var(--color-surface, #0f172a);
  border: 1px solid var(--color-border, #334155);
  border-radius: 10px;
  padding: 1.5rem;
}

.panel__actions {
  display: flex;
  gap: .5rem;
  align-items: center;
  margin-bottom: 1.25rem;
}

.panel__note {
  font-size: .78rem;
  color: var(--color-text-muted, #64748b);
  margin-left: .5rem;
}

/* ── Brief ───────────────────────────────────────────────── */
.brief__summary {
  font-size: 1rem;
  color: var(--color-text-secondary, #cbd5e1);
  line-height: 1.6;
  margin: 0 0 1.5rem;
  padding-bottom: 1.25rem;
  border-bottom: 1px solid var(--color-border, #334155);
}

.brief__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
  margin-bottom: 1.25rem;
}

@media (max-width: 560px) {
  .brief__grid { grid-template-columns: 1fr; }
}

.brief__section h3,
.brief__tech h3 {
  font-size: .8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .06em;
  color: var(--color-text-muted, #64748b);
  margin: 0 0 .6rem;
}

.brief__section ul {
  margin: 0;
  padding-left: 1.1rem;
  color: var(--color-text-secondary, #cbd5e1);
  font-size: .88rem;
  line-height: 1.6;
}

.brief__tech {
  padding-top: 1.25rem;
  border-top: 1px solid var(--color-border, #334155);
}

.brief__tech p {
  color: var(--color-text-secondary, #cbd5e1);
  font-size: .88rem;
  line-height: 1.6;
  margin: 0;
}

/* ── Tasks ───────────────────────────────────────────────── */
.task-section {
  margin-bottom: 1.5rem;
}

.task-section__label {
  font-size: .78rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .06em;
  color: var(--color-text-muted, #64748b);
  margin: 0 0 .6rem;
}

.task-row {
  display: grid;
  grid-template-columns: 68px 1fr;
  gap: .5rem .75rem;
  align-items: start;
  padding: .6rem 0;
  border-bottom: 1px solid var(--color-border, #1e293b);
}

.task-row__notes {
  grid-column: 2;
  font-size: .78rem;
  color: var(--color-text-muted, #64748b);
}

.task-row__name {
  font-size: .88rem;
  color: var(--color-text-secondary, #cbd5e1);
}

.task-row__priority {
  font-size: .7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .05em;
  padding: .15em .5em;
  border-radius: 4px;
  text-align: center;
  align-self: center;
}

.priority--high   { background: rgb(239 68 68 / .15); color: #f87171; }
.priority--medium { background: rgb(234 179 8 / .15);  color: #facc15; }
.priority--low    { background: rgb(34 197 94 / .15);  color: #4ade80; }

/* ── Config ─────────────────────────────────────────────── */
.config-code {
  background: var(--color-surface-raised, #0a111f);
  border-radius: 6px;
  padding: 1rem;
  overflow: auto;
  font-size: .82rem;
  color: #93c5fd;
  line-height: 1.6;
  margin: 0;
}
</style>
