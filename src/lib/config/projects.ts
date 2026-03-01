/**
 * Project Manifest — single source of truth for all tracked projects.
 *
 * Each project declares its metadata and which integrations to use.
 * The dashboard + dynamic route consume this config at runtime.
 */

export type ProjectKind = 'ccs' | 'forge' | 'shopify' | 'defi' | 'ai' | 'infra' | 'generic';
export type ProjectStatus = 'active' | 'idle' | 'paused' | 'complete' | 'archived';

export interface AsanaConfig {
  workspaceId: string;
  projectId: string;
}

export interface ShopifyConfig {
  storeDomain: string;   // e.g. zebra-skimmers.myshopify.com
  themeId?: string;
}

export interface AgentConfig {
  url: string;           // Tailscale / local agent endpoint
}

export interface ProjectManifest {
  id: string;            // URL-safe slug
  name: string;          // Display name
  description?: string;
  kind: ProjectKind;
  status: ProjectStatus;
  accent: string;        // CSS custom property name, e.g. --color-ccs
  client?: string;
  repo?: string;

  // Integration configs — all optional; determines what data tabs appear
  asana?: AsanaConfig;
  shopify?: ShopifyConfig;
  agent?: AgentConfig;
}

// ─────────────────────────────────────────────────────────────
// Master Project Registry
// Add / edit entries here — no other files need to change.
// ─────────────────────────────────────────────────────────────

export const projectManifest: ProjectManifest[] = [
  // ── Internal / Tooling ─────────────────────────────────────
  {
    id: 'ccs',
    name: 'Claude Code Sidekick',
    description: 'CLI framework + agent system for AI-assisted development',
    kind: 'ccs',
    status: 'active',
    accent: '--color-ccs',
    repo: 'https://github.com/dylanburkey/claude-code-sidekick',
    agent: { url: 'http://macbook.tail.ts.net:4242' },
    asana: {
      workspaceId: '$ASANA_WORKSPACE_ID',
      projectId: '$ASANA_PROJECT_CCS',
    },
  },
  {
    id: 'mothership',
    name: 'Codesidekick Mothership',
    description: 'Unified project dashboard — this app',
    kind: 'infra',
    status: 'active',
    accent: '--color-accent',
    repo: 'https://github.com/dylanburkey/codesidekick-mothership',
  },

  // ── Zebra Skimmers (client) ────────────────────────────────
  {
    id: 'forge',
    name: 'Forge',
    description: 'Industrial Shopify theme for Zebra Skimmers',
    kind: 'shopify',
    status: 'active',
    accent: '--color-forge',
    client: 'Zebra Skimmers',
    agent: { url: 'http://macbook.tail.ts.net:4243' },
    shopify: {
      storeDomain: '$SHOPIFY_DOMAIN_ZEBRA',
      themeId: '$SHOPIFY_THEME_FORGE',
    },
    asana: {
      workspaceId: '$ASANA_WORKSPACE_ID',
      projectId: '$ASANA_PROJECT_FORGE',
    },
  },

  // ── Athena (DeFi trading platform) ────────────────────────
  {
    id: 'athena',
    name: 'Athena',
    description: 'DeFi trading platform — API gateway + signals + UI',
    kind: 'defi',
    status: 'active',
    accent: '--color-athena',
    asana: {
      workspaceId: '$ASANA_WORKSPACE_ID',
      projectId: '$ASANA_PROJECT_ATHENA',
    },
  },

  // ── NorthCoast AI ─────────────────────────────────────────
  {
    id: 'northcoast-ai',
    name: 'NorthCoast AI',
    description: 'AI-powered recovery innovation platform',
    kind: 'ai',
    status: 'active',
    accent: '--color-northcoast',
    asana: {
      workspaceId: '$ASANA_WORKSPACE_ID',
      projectId: '$ASANA_PROJECT_NORTHCOAST',
    },
  },

  // ── WalletWatch ───────────────────────────────────────────
  {
    id: 'walletwatch',
    name: 'WalletWatch',
    description: 'On-chain wallet monitoring + alert system',
    kind: 'defi',
    status: 'idle',
    accent: '--color-wallet',
    repo: 'https://github.com/dylanburkey/wallet-watch',
  },

  // ── Home Infra ────────────────────────────────────────────
  {
    id: 'home-infra',
    name: 'Home Infrastructure',
    description: 'Home server, media stack, Home Assistant, Tailscale mesh',
    kind: 'infra',
    status: 'idle',
    accent: '--color-infra',
  },
];

// ─── Helpers ──────────────────────────────────────────────────

export function getProject(id: string): ProjectManifest | undefined {
  return projectManifest.find((p) => p.id === id);
}

export function getActiveProjects(): ProjectManifest[] {
  return projectManifest.filter((p) => p.status !== 'archived');
}
