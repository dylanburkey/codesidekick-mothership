import type { PageServerLoad } from './$types';
import { getActiveProjects } from '$lib/config/projects';

export const load: PageServerLoad = async () => {
  return {
    projects: getActiveProjects(),
  };
};
