import express from "express";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Match, RankedItem, Worker, Job, ChatMessage } from "../../shared/contract";
import { findPair, loadStore, matchExists, nextId, saveStore } from "./store.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const STORE_PATH = join(ROOT, "data", "store.json");
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
const ML_URL = process.env.ML_URL ?? "http://127.0.0.1:8001";

const app = express();

app.use((_req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS,DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});
app.use(express.json());

const sessions: Record<string, string> = {};

function getSession(req: express.Request): string | null {
  const token = (req.headers.authorization as string | undefined)?.replace("Bearer ", "");
  return token ? sessions[token] ?? null : null;
}

function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = getSession(req);
  if (!user) { res.status(401).json({ error: "not authenticated" }); return; }
  (req as any).user = user;
  next();
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "meistermatch-api", phase: 1 });
});

app.post("/api/auth/register", (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string };
  if (!username || !password || username.length < 3) {
    res.status(400).json({ error: "username (min 3 chars) and password required" }); return;
  }
  const store = loadStore();
  if (!store.users) store.users = [];
  if (store.users.some((u: { username: string }) => u.username === username)) {
    res.status(409).json({ error: "username already exists" }); return;
  }
  store.users.push({ username, password });
  saveStore(store);
  const token = nextId("tk", Object.keys(sessions)) as string;
  (sessions as Record<string, string>)[token] = username;
  res.status(201).json({ token, username });
});

app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string };
  const store = loadStore();
  const user = (store.users ?? []).find(
    (u: { username: string; password: string }) => u.username === username && u.password === password
  );
  if (!user) { res.status(401).json({ error: "invalid credentials" }); return; }
  const token = nextId("tk", Object.keys(sessions) as string[]);
  (sessions as any)[token] = username;
  res.json({ token, username });
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json({ username: (req as any).user });
});

app.post("/api/auth/logout", requireAuth, (req, res) => {
  const token = (req.headers.authorization ?? "").replace("Bearer ", "");
  delete sessions[token];
  res.json({ ok: true });
});

app.get("/api/workers", (_req, res) => res.json(loadStore().workers));
app.get("/api/jobs", (_req, res) => res.json(loadStore().jobs));

async function rank(mode: string, body: Record<string, unknown>): Promise<RankedItem[]> {
  const r = await fetch(`${ML_URL}/rank`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode, ...body }),
  });
  if (!r.ok) throw new Error(`rank service responded ${r.status}`);
  const data = (await r.json()) as { results: RankedItem[] };
  return data.results;
}

app.get("/api/deck/worker/:id", requireAuth, async (req, res) => {
  try {
    const store = loadStore();
    const worker = store.workers.find((w) => w.id === req.params.id);
    if (!worker) { res.status(404).json({ error: "worker not found" }); return; }
    const results = await rank("jobs_for_worker", { worker, candidates: store.jobs, limit: 10 });
    const cards = results.map((r) => ({ ...r, job: store.jobs.find((j) => j.id === r.id) as Job }));
    res.json({ worker, cards });
  } catch (e) {
    res.status(502).json({ error: `rank service unavailable: ${(e as Error).message}` });
  }
});

app.get("/api/deck/job/:id", requireAuth, async (req, res) => {
  try {
    const store = loadStore();
    const job = store.jobs.find((j) => j.id === req.params.id);
    if (!job) { res.status(404).json({ error: "job not found" }); return; }
    const results = await rank("workers_for_job", { job, candidates: store.workers, limit: 10 });
    const cards = results.map((r) => ({ ...r, worker: store.workers.find((w) => w.id === r.id) as Worker }));
    res.json({ job, cards });
  } catch (e) {
    res.status(502).json({ error: `rank service unavailable: ${(e as Error).message}` });
  }
});

app.post("/api/swipes", requireAuth, (req, res) => {
  const b = req.body as { actor_type?: string; actor_id?: string; target_type?: string; target_id?: string; direction?: string };
  const valid =
    (b.actor_type === "worker" || b.actor_type === "employer") &&
    (b.target_type === "job" || b.target_type === "worker") &&
    (b.direction === "like" || b.direction === "pass") &&
    typeof b.actor_id === "string" && typeof b.target_id === "string" &&
    ((b.actor_type === "worker" && b.target_type === "job") ||
     (b.actor_type === "employer" && b.target_type === "worker"));
  if (!valid) { res.status(400).json({ error: "invalid swipe payload" }); return; }
  const store = loadStore();
  const workerId = b.actor_type === "worker" ? (b.actor_id as string) : (b.target_id as string);
  const jobId = b.actor_type === "worker" ? (b.target_id as string) : (b.actor_id as string);
  if (!store.workers.some((w) => w.id === workerId) || !store.jobs.some((j) => j.id === jobId)) {
    res.status(404).json({ error: "unknown worker or job id" }); return;
  }
  const swipe = {
    id: nextId("s", store.swipes.map((s) => s.id)),
    actor_type: b.actor_type as "worker" | "employer",
    actor_id: b.actor_id as string,
    target_type: b.target_type as "job" | "worker",
    target_id: b.target_id as string,
    direction: b.direction as "like" | "pass",
  };
  store.swipes.push(swipe);
  let match: Match | null = null;
  const { workerLike, employerLike } = findPair(store.swipes, workerId, jobId);
  if (workerLike && employerLike && !matchExists(store.matches, workerId, jobId)) {
    match = { id: nextId("m", store.matches.map((m) => m.id)), worker_id: workerId, job_id: jobId };
    store.matches.push(match);
  }
  saveStore(store);
  res.status(201).json({ swipe, match });
});

app.get("/api/matches", requireAuth, (req, res) => {
  const store = loadStore();
  const { worker_id, job_id } = req.query as Record<string, string | undefined>;
  const matches = store.matches.filter(
    (m) => (!worker_id || m.worker_id === worker_id) && (!job_id || m.job_id === job_id)
  );
  res.json(matches);
});

app.get("/api/chats/:matchId", requireAuth, (req, res) => {
  const store = loadStore();
  const match = store.matches.find((m) => m.id === req.params.matchId);
  if (!match) { res.status(404).json({ error: "match not found" }); return; }
  res.json((store.chats as unknown as any)[req.params.matchId as string] ?? []);
});

app.post("/api/chats/:matchId", requireAuth, (req, res) => {
  const store = loadStore();
  const match = store.matches.find((m) => m.id === req.params.matchId);
  if (!match) { res.status(404).json({ error: "match not found" }); return; }
  const chats = (store.chats as any) ?? {};
  const key = req.params.matchId as string;
  if (!chats[key]) chats[key] = [];
  const chatList: ChatMessage[] = chats[key];
  const msg = {
    id: nextId("c", chatList.map((m: { id: string }) => m.id)),
    text: (req.body as { text?: string }).text ?? "",
    by: (req as any).user,
    time: new Date().toISOString(),
  };
  chatList.push(msg);
  saveStore(store);
  res.status(201).json(msg);
});

const buildPath = join(ROOT, "web", "dist");
if (existsSync(buildPath)) {
  app.use(express.static(buildPath));
  app.use((_req, res) => { res.sendFile(join(buildPath, "index.html")); });
}

app.listen(PORT, () => {
  console.log(`meistermatch-api on http://127.0.0.1:${PORT} (ml: ${ML_URL}, serve static: ${existsSync(buildPath)})`);
});
