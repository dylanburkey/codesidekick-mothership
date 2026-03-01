// Mirrors .claude/state/execution.json
export interface CCSExecution {
	current_phase: number;
	phase_status: 'in_progress' | 'complete' | 'paused' | 'blocked';
	authorized_phases: number[];
	completed_phases: number[];
	last_updated: string;
}

export interface CCSTask {
	id: string;
	phase: number;
	title: string;
	status: 'todo' | 'in_progress' | 'done' | 'blocked';
	agent?: string;
	updated_at?: string;
}

export interface CCSPhase {
	number: number;
	title: string;
	status: 'pending' | 'in_progress' | 'complete';
	tasks: CCSTask[];
}

export interface CCSReviewIssue {
	file: string;
	line?: number;
	severity: 'error' | 'warning' | 'info';
	message: string;
	model?: string;
}

export interface CCSSnapshot {
	project: string;
	execution: CCSExecution;
	phases: CCSPhase[];
	recentCommits: GitCommit[];
	reviewIssues: CCSReviewIssue[];
	fetchedAt: string;
}

export interface GitCommit {
	hash: string;
	message: string;
	author: string;
	date: string;
	files_changed?: number;
}
