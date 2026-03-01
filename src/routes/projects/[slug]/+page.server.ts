import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getProject } from '$lib/config/projects';
import { fetchAsanaProject } from '$lib/integrations/asana';
import { fetchShopifyStore } from '$lib/integrations/shopify';
import { env } from '$env/dynamic/private';

export const load: PageServerLoad = async ({ params }) => {
  const manifest = getProject(params.slug);

  if (!manifest) {
    throw error(404, `Project "${params.slug}" not found in manifest`);
  }

  // Run integrations in parallel — only fetch what the project declares
  const [asana, shopify] = await Promise.all([
    manifest.asana && env.ASANA_PAT
      ? fetchAsanaProject(manifest.asana.projectId, env.ASANA_PAT)
      : null,

    manifest.shopify && env.SHOPIFY_ADMIN_TOKEN
      ? fetchShopifyStore(manifest.shopify.storeDomain, env.SHOPIFY_ADMIN_TOKEN)
      : null,
  ]);

  return {
    manifest,
    asana,
    shopify,
  };
};
