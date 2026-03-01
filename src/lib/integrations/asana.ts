/**
 * Asana API adapter — server-side only.
 *
 * Fetches tasks for a given project, normalises the shape,
 * and provides a simple summary. All calls require a PAT
 * set in the ASANA_PAT environment variable.
 */

export interface AsanaTask {
  id: string;
  name: string;
  completed: boolean;
  due_on: string | null;
  assignee: string | null;
  notes: string;
  permalink: string;
  section: string | null;
}

export interface AsanaProjectSummary {
  projectId: string;
  name: string;
  tasks: AsanaTask[];
  completedCount: number;
  totalCount: number;
  progressPct: number;
  error?: string;
}

const BASE = 'https://app.asana.com/api/1.0';

function headers(pat: string) {
  return {
    Authorization: `Bearer ${pat}`,
    Accept: 'application/json',
  };
}

async function fetchJson<T>(url: string, pat: string): Promise<T> {
  const res = await fetch(url, { headers: headers(pat) });
  if (!res.ok) throw new Error(`Asana ${res.status}: ${url}`);
  const json = await res.json();
  return json.data as T;
}

export async function fetchAsanaProject(
  projectId: string,
  pat: string
): Promise<AsanaProjectSummary> {
  try {
    // Fetch project meta + tasks in parallel
    const [meta, rawTasks] = await Promise.all([
      fetchJson<{ name: string }>(
        `${BASE}/projects/${projectId}?opt_fields=name`,
        pat
      ),
      fetchJson<Array<{
        gid: string;
        name: string;
        completed: boolean;
        due_on: string | null;
        assignee: { name: string } | null;
        notes: string;
        permalink_url: string;
        memberships: Array<{ section: { name: string } | null }>;
      }>>(
        `${BASE}/tasks?project=${projectId}&opt_fields=name,completed,due_on,assignee.name,notes,permalink_url,memberships.section.name&limit=100`,
        pat
      ),
    ]);

    const tasks: AsanaTask[] = rawTasks.map((t) => ({
      id: t.gid,
      name: t.name,
      completed: t.completed,
      due_on: t.due_on,
      assignee: t.assignee?.name ?? null,
      notes: t.notes,
      permalink: t.permalink_url,
      section: t.memberships?.[0]?.section?.name ?? null,
    }));

    const completedCount = tasks.filter((t) => t.completed).length;

    return {
      projectId,
      name: meta.name,
      tasks,
      completedCount,
      totalCount: tasks.length,
      progressPct: tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0,
    };
  } catch (err) {
    return {
      projectId,
      name: '',
      tasks: [],
      completedCount: 0,
      totalCount: 0,
      progressPct: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
