/**
 * Invoice KV storage helpers.
 * Works with the KV_INVOICES binding declared in wrangler.toml.
 *
 * In local dev without a real KV namespace, falls back to an in-memory
 * Map so the routes stay functional.
 */

import type { Invoice } from '$lib/types/invoice';

// ── KV key helpers ────────────────────────────────────────────────

export const invoiceKey  = (pid: string, id: string) => `invoice:${pid}:${id}`;
export const indexKey    = (pid: string) => `invoices:${pid}`;

// ── Local fallback (dev without wrangler KV) ──────────────────────

const memStore = new Map<string, string>();

function getKV(platform: App.Platform | undefined): KVNamespace | null {
  return (platform?.env as Record<string, KVNamespace> | undefined)?.KV_INVOICES ?? null;
}

async function kvGet<T>(kv: KVNamespace | null, key: string): Promise<T | null> {
  if (kv) {
    return await kv.get<T>(key, 'json');
  }
  const raw = memStore.get(key);
  return raw ? (JSON.parse(raw) as T) : null;
}

async function kvPut(kv: KVNamespace | null, key: string, value: unknown): Promise<void> {
  const json = JSON.stringify(value);
  if (kv) {
    await kv.put(key, json);
  } else {
    memStore.set(key, json);
  }
}

async function kvDelete(kv: KVNamespace | null, key: string): Promise<void> {
  if (kv) {
    await kv.delete(key);
  } else {
    memStore.delete(key);
  }
}

// ── Public API ────────────────────────────────────────────────────

export async function listInvoices(
  platform: App.Platform | undefined,
  projectId: string
): Promise<Invoice[]> {
  const kv = getKV(platform);
  const ids = (await kvGet<string[]>(kv, indexKey(projectId))) ?? [];
  const results = await Promise.all(
    ids.map(id => kvGet<Invoice>(kv, invoiceKey(projectId, id)))
  );
  return results.filter((inv): inv is Invoice => inv !== null);
}

export async function getInvoice(
  platform: App.Platform | undefined,
  projectId: string,
  invoiceId: string
): Promise<Invoice | null> {
  const kv = getKV(platform);
  return kvGet<Invoice>(kv, invoiceKey(projectId, invoiceId));
}

export async function saveInvoice(
  platform: App.Platform | undefined,
  invoice: Invoice
): Promise<void> {
  const kv = getKV(platform);
  await kvPut(kv, invoiceKey(invoice.projectId, invoice.id), invoice);

  // Update index
  const ids = (await kvGet<string[]>(kv, indexKey(invoice.projectId))) ?? [];
  if (!ids.includes(invoice.id)) {
    await kvPut(kv, indexKey(invoice.projectId), [invoice.id, ...ids]);
  }
}

export async function deleteInvoice(
  platform: App.Platform | undefined,
  projectId: string,
  invoiceId: string
): Promise<void> {
  const kv = getKV(platform);
  await kvDelete(kv, invoiceKey(projectId, invoiceId));

  const ids = (await kvGet<string[]>(kv, indexKey(projectId))) ?? [];
  await kvPut(kv, indexKey(projectId), ids.filter(id => id !== invoiceId));
}
