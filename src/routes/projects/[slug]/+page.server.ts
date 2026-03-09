import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getProject } from '$lib/config/projects';
import { fetchAsanaProject } from '$lib/integrations/asana';
import { fetchShopifyStore } from '$lib/integrations/shopify';
import { env } from '$env/dynamic/private';

export interface GitCommit {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
}

/**
 * Parse a GitHub repo URL into { owner, repo } or null.
 * Handles:  https://github.com/owner/repo
 *           https://github.com/owner/repo.git
 */
function parseGithubRepo(repoUrl?: string): { owner: string; repo: string } | null {
  if (!repoUrl) return null;
  const m = repoUrl.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/.*)?$/);
  if (!m) return null;
  return { owner: m[1], repo: m[2] };
}

async function fetchGithubCommits(
  repoUrl: string,
  token?: string
): Promise<GitCommit[]> {
  const parsed = parseGithubRepo(repoUrl);
  if (!parsed) return [];

  const headers: Record<string, string> = { Accept: 'application/vnd.github.v3+json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(
      `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/commits?per_page=10`,
      { headers }
    );
    if (!res.ok) return [];

    const data = await res.json();
    return (data as Array<Record<string, unknown>>).map((c: Record<string, unknown>) => {
      const commit = c.commit as Record<string, unknown>;
      const commitAuthor = commit.author as Record<string, unknown>;
      const committer = c.committer as Record<string, unknown> | null;
      return {
        sha: (c.sha as string).slice(0, 7),
        message: ((commit.message as string) ?? '').split('\n')[0].slice(0, 80),
        author: (commitAuthor?.name as string) ?? (committer?.login as string) ?? 'unknown',
        date: (commitAuthor?.date as string) ?? '',
        url: (c.html_url as string) ?? '#',
      };
    });
  } catch {
    return [];
  }
}

export const load: PageServerLoad = async ({ params }) => {
  const manifest = getProject(params.slug);

  if (!manifest) {
    throw error(404, `Project "${params.slug}" not found in manifest`);
  }

  // Run all integrations in parallel
  const [asana, shopify, commits] = await Promise.all([
    manifest.asana && env.ASANA_PAT
      ? fetchAsanaProject(manifest.asana.projectId, env.ASANA_PAT)
      : null,

    manifest.shopify && env.SHOPIFY_ADMIN_TOKEN
      ? fetchShopifyStore(manifest.shopify.storeDomain, env.SHOPIFY_ADMIN_TOKEN)
      : null,

    manifest.repo
      ? fetchGithubCommits(manifest.repo, env.GITHUB_TOKEN)
      : ([] as GitCommit[]),
  ]);

  return {
    manifest,
    asana,
    shopify,
    commits,
  };
};
