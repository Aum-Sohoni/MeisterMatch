import type { Job, Match, Worker } from "../../shared/contract";

let _token: string | null = null;
export function setToken(t: string | null) { _token = t; }
export function getToken() { return _token; }

const BASE = "/api";

async function fetchJson<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json", ...(opts.headers as Record<string, string> ?? {}) };
  if (_token) headers["Authorization"] = `Bearer ${_token}`;
  const r = await fetch(`${BASE}${path}`, { ...opts, headers });
  if (!r.ok) throw new Error(`${path} -> ${r.status}`);
  return (await r.json()) as T;
}

// Auth
export interface AuthUser { username: string; token: string }
export const register = (username: string, password: string) =>
  fetchJson<AuthUser>("/auth/register", { method: "POST", body: JSON.stringify({ username, password }) });
export const login = (username: string, password: string) =>
  fetchJson<AuthUser>("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) });
export const getMe = () => fetchJson<{ username: string }>("/auth/me");
export const logout = () => fetchJson("/auth/logout", { method: "POST" });

// Data
export const getWorkers = () => fetchJson<Worker[]>("/workers");
export const getJobs = () => fetchJson<Job[]>("/jobs");

// Deck
export interface JobCard extends RankedItem { job: Job }
export interface WorkerCard extends RankedItem { worker: Worker }
export const getWorkerDeck = (workerId: string) =>
  fetchJson<{ worker: Worker; cards: JobCard[] }>(`/deck/worker/${workerId}`);
export const getJobDeck = (jobId: string) =>
  fetchJson<{ job: Job; cards: WorkerCard[] }>(`/deck/job/${jobId}`);

// Swipe
export const postSwipe = (
  actor_type: "worker" | "employer",
  actor_id: string,
  target_type: "job" | "worker",
  target_id: string,
  direction: "like" | "pass"
) =>
  fetchJson<{ swipe: { id: string }; match: Match | null }>("/swipes", {
    method: "POST", body: JSON.stringify({ actor_type, actor_id, target_type, target_id, direction }),
  });

// Matches
export const getMatches = (worker_id?: string, job_id?: string) => {
  const q = new URLSearchParams();
  if (worker_id) q.set("worker_id", worker_id);
  if (job_id) q.set("job_id", job_id);
  return fetchJson<Match[]>(`/matches?${q.toString()}`);
};

// Chat
export interface ChatMessage { id: string; text: string; by: string; time: string }
export const getChats = (matchId: string) =>
  fetchJson<ChatMessage[]>(`/chats/${matchId}`);
export const postChat = (matchId: string, text: string) =>
  fetchJson<ChatMessage>(`/chats/${matchId}`, { method: "POST", body: JSON.stringify({ text }) });

// Types
export interface RankedItem { id: string; score: number; reasons: string[] }
export interface RankResponse { results: RankedItem[] }
