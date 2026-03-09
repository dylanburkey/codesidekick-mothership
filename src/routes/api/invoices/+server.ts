/**
 * POST   /api/invoices           — create invoice
 * PUT    /api/invoices           — update invoice
 * DELETE /api/invoices?id=&pid=  — delete invoice
 */

import { json, type RequestHandler } from '@sveltejs/kit';
import { saveInvoice, deleteInvoice } from '$lib/integrations/invoices';
import { computeTotals, newInvoiceId } from '$lib/types/invoice';
import type { Invoice } from '$lib/types/invoice';

export const POST: RequestHandler = async ({ request, platform }) => {
  let body: Partial<Invoice>;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, { status: 400 }); }

  const now = new Date().toISOString();
  const lineItems = body.lineItems ?? [];
  const totals    = computeTotals(lineItems, body.taxRate ?? 0);

  const invoice: Invoice = {
    id:            body.id ?? newInvoiceId(),
    projectId:     body.projectId ?? '',
    invoiceNumber: body.invoiceNumber ?? 'INV-0001',
    status:        body.status ?? 'draft',
    clientName:    body.clientName ?? '',
    clientEmail:   body.clientEmail,
    clientAddress: body.clientAddress,
    issueDate:     body.issueDate ?? now.slice(0, 10),
    dueDate:       body.dueDate   ?? now.slice(0, 10),
    lineItems,
    notes:    body.notes,
    taxRate:  body.taxRate ?? 0,
    ...totals,
    createdAt: body.createdAt ?? now,
    updatedAt: now,
  };

  if (!invoice.projectId) return json({ error: 'projectId required' }, { status: 400 });

  await saveInvoice(platform, invoice);
  return json(invoice, { status: 201 });
};

export const PUT: RequestHandler = async ({ request, platform }) => {
  let body: Invoice;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, { status: 400 }); }

  if (!body.id || !body.projectId) return json({ error: 'id and projectId required' }, { status: 400 });

  const totals = computeTotals(body.lineItems ?? [], body.taxRate ?? 0);
  const updated: Invoice = { ...body, ...totals, updatedAt: new Date().toISOString() };

  await saveInvoice(platform, updated);
  return json(updated);
};

export const DELETE: RequestHandler = async ({ url, platform }) => {
  const invoiceId = url.searchParams.get('id');
  const projectId = url.searchParams.get('pid');
  if (!invoiceId || !projectId) return json({ error: 'id and pid required' }, { status: 400 });

  await deleteInvoice(platform, projectId, invoiceId);
  return json({ ok: true });
};
