import type {
  Job,
  Match,
  RankedItem,
  SwipeDirection,
  Worker,
} from "../../shared/contract";

export const API_BASE = "http://127.0.0.1:3001";

async function get<T>(path: string): Promise<T> {
  const r = await fetch(`${API_BASE}${path}`);
  if (!r.ok) throw new Error(`${path} -> ${r.status}`);
  return (await r.json()) as T;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${path} -> ${r.status}`);
  return (await r.json()) as T;
}

export interface JobCard extends RankedItem {
  job: Job;
}

export interface WorkerCard extends RankedItem {
  worker: Worker;
}

export const getWorkers = () => get<Worker[]>("/api/workers");
export const getJobs = () => get<Job[]>("/api/jobs");

export const getWorkerDeck = (workerId: string) =>
  get<{ worker: Worker; cards: JobCard[] }>(`/api/deck/worker/${workerId}`);

export const getJobDeck = (jobId: string) =>
  get<{ job: Job; cards: WorkerCard[] }>(`/api/deck/job/${jobId}`);

export const postSwipe = (
  actor_type: "worker" | "employer",
  actor_id: string,
  target_type: "job" | "worker",
  target_id: string,
  direction: SwipeDirection
) =>
  post<{ swipe: { id: string }; match: Match | null }>("/api/swipes", {
    actor_type,
    actor_id,
    target_type,
    target_id,
    direction,
  });

export const getMatches = (worker_id?: string, job_id?: string) => {
  const q = new URLSearchParams();
  if (worker_id) q.set("worker_id", worker_id);
  if (job_id) q.set("job_id", job_id);
  return get<Match[]>(`/api/matches?${q.toString()}`);
};
