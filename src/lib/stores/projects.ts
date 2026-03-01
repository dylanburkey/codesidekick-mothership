import { writable, derived } from 'svelte/store';

export interface ProjectConfig {
	id: string;
	name: string;
	label: string;
	agentUrl: string;     // e.g. http://macbook.tail.ts.net:4242
	kind: 'ccs' | 'forge' | 'walletwatch' | 'generic';
	color: string;        // CSS var name, e.g. --color-ccs
}

export interface AgentState {
	status: 'connecting' | 'connected' | 'error' | 'offline';
	lastSeen?: Date;
	error?: string;
}

// Project registry — will be loaded from settings/config
export const projects = writable<ProjectConfig[]>([
	{
		id: 'ccs-main',
		name: 'claude-code-sidekick',
		label: 'CCS',
		agentUrl: 'http://macbook.tail.ts.net:4242',
		kind: 'ccs',
		color: '--color-ccs',
	},
	{
		id: 'forge',
		name: 'forge',
		label: 'Forge',
		agentUrl: 'http://macbook.tail.ts.net:4243',
		kind: 'forge',
		color: '--color-forge',
	},
]);

// Agent connection states keyed by project id
export const agentStates = writable<Record<string, AgentState>>({});

export const connectedCount = derived(agentStates, ($s) =>
	Object.values($s).filter((a) => a.status === 'connected').length
);
