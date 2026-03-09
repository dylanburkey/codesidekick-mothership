import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getProject } from '$lib/config/projects';
import { getInvoice } from '$lib/integrations/invoices';

export const load: PageServerLoad = async ({ params, platform }) => {
  const manifest = getProject(params.slug);
  if (!manifest) throw error(404, `Project "${params.slug}" not found`);

  const invoice = await getInvoice(platform, params.slug, params.id);
  if (!invoice) throw error(404, `Invoice "${params.id}" not found`);

  return { manifest, invoice };
};
