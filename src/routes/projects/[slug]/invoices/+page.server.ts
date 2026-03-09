import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getProject } from '$lib/config/projects';
import { listInvoices } from '$lib/integrations/invoices';

export const load: PageServerLoad = async ({ params, platform }) => {
  const manifest = getProject(params.slug);
  if (!manifest) throw error(404, `Project "${params.slug}" not found`);

  const invoices = await listInvoices(platform, params.slug);

  return { manifest, invoices };
};
