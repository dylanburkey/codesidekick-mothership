import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// /dashboard is an alias for the root overview.
// Keeps old links working and allows /dashboard to be used
// as a canonical URL in nav, docs, or external references.
export const load: PageServerLoad = () => {
  throw redirect(301, '/');
};
