/**
 * Invoice data model — stored in Cloudflare KV as JSON.
 * KV key schema:
 *   invoice:{projectId}:{invoiceId}   →  Invoice (full record)
 *   invoices:{projectId}              →  string[] (list of IDs, newest first)
 */

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'void';

export interface InvoiceLineItem {
  id: string;
  description: string;
  qty: number;
  rate: number;           // USD per unit
}

export interface Invoice {
  id: string;             // nanoid-style slug, e.g. "inv_1748a2b3"
  projectId: string;      // matches ProjectManifest.id
  invoiceNumber: string;  // human-readable, e.g. "INV-0042"
  status: InvoiceStatus;

  clientName: string;
  clientEmail?: string;
  clientAddress?: string;

  issueDate: string;      // ISO date string YYYY-MM-DD
  dueDate: string;        // ISO date string YYYY-MM-DD

  lineItems: InvoiceLineItem[];

  notes?: string;
  taxRate?: number;       // percentage, e.g. 0.08 for 8%

  // Derived — recomputed on save, stored for fast reads
  subtotal: number;
  taxAmount: number;
  total: number;

  createdAt: string;      // ISO timestamp
  updatedAt: string;      // ISO timestamp
}

// ── Helpers ───────────────────────────────────────────────────────

export function computeTotals(lineItems: InvoiceLineItem[], taxRate = 0): Pick<Invoice, 'subtotal' | 'taxAmount' | 'total'> {
  const subtotal  = lineItems.reduce((sum, li) => sum + li.qty * li.rate, 0);
  const taxAmount = subtotal * taxRate;
  return { subtotal, taxAmount, total: subtotal + taxAmount };
}

export function newInvoiceId(): string {
  return 'inv_' + Math.random().toString(36).slice(2, 10);
}

export function newLineItemId(): string {
  return 'li_' + Math.random().toString(36).slice(2, 8);
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

export const STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft:   'Draft',
  sent:    'Sent',
  paid:    'Paid',
  overdue: 'Overdue',
  void:    'Void',
};
