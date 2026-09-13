import express from "express";
import type {
  Job,
  Match,
  RankedItem,
  Swipe,
  Worker,
} from "../../shared/contract";
import { findPair, loadStore, matchExists, nextId, saveStore } from "./store.js";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
const ML_URL = process.env.ML_URL ?? "http://127.0.0.1:8001";

const app = express();

// Minimal CORS (prototype; tighten in Phase 4).
app.use((_req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "meistermatch-api", phase: 1 });
});

app.get("/api/workers", (_req, res) => {
  res.json(loadStore().workers);
});

app.get("/api/jobs", (_req, res) => {
  res.json(loadStore().jobs);
});

async function rank<T>(mode: string, body: Record<string, unknown>): Promise<RankedItem[]> {
  const r = await fetch(`${ML_URL}/rank`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode, ...body }),
  });
  if (!r.ok) {
    throw new Error(`rank service responded ${r.status}`);
  }
  const data = (await r.json()) as { results: RankedItem[] };
  return data.results;
}

// Ranked job cards for a worker.
app.get("/api/deck/worker/:id", async (req, res) => {
  try {
    const store = loadStore();
    const worker = store.workers.find((w) => w.id === req.params.id);
    if (!worker) {
      res.status(404).json({ error: "worker not found" });
      return;
    }
    const results = await rank("jobs_for_worker", {
      worker,
      candidates: store.jobs,
      limit: 10,
    });
    const cards = results.map((r) => ({
      ...r,
      job: store.jobs.find((j) => j.id === r.id) as Job,
    }));
    res.json({ worker, cards });
  } catch (e) {
    res.status(502).json({ error: `rank service unavailable: ${(e as Error).message}` });
  }
});

// Ranked worker cards for a job posting (employer view).
app.get("/api/deck/job/:id", async (req, res) => {
  try {
    const store = loadStore();
    const job = store.jobs.find((j) => j.id === req.params.id);
    if (!job) {
      res.status(404).json({ error: "job not found" });
      return;
    }
    const results = await rank("workers_for_job", {
      job,
      candidates: store.workers,
      limit: 10,
    });
    const cards = results.map((r) => ({
      ...r,
      worker: store.workers.find((w) => w.id === r.id) as Worker,
    }));
    res.json({ job, cards });
  } catch (e) {
    res.status(502).json({ error: `rank service unavailable: ${(e as Error).message}` });
  }
});

interface SwipeBody {
  actor_type?: string;
  actor_id?: string;
  target_type?: string;
  target_id?: string;
  direction?: string;
}

// Record a swipe. Employer acts on behalf of one job posting
// (actor_id = job id), which keeps matching strictly pairwise.
app.post("/api/swipes", (req, res) => {
  const b = req.body as SwipeBody;
  const valid =
    (b.actor_type === "worker" || b.actor_type === "employer") &&
    (b.target_type === "job" || b.target_type === "worker") &&
    (b.direction === "like" || b.direction === "pass") &&
    typeof b.actor_id === "string" &&
    typeof b.target_id === "string" &&
    ((b.actor_type === "worker" && b.target_type === "job") ||
      (b.actor_type === "employer" && b.target_type === "worker"));
  if (!valid) {
    res.status(400).json({ error: "invalid swipe payload" });
    return;
  }

  const store = loadStore();
  const workerId = b.actor_type === "worker" ? (b.actor_id as string) : (b.target_id as string);
  const jobId = b.actor_type === "worker" ? (b.target_id as string) : (b.actor_id as string);
  if (
    !store.workers.some((w) => w.id === workerId) ||
    !store.jobs.some((j) => j.id === jobId)
  ) {
    res.status(404).json({ error: "unknown worker or job id" });
    return;
  }

  const swipe: Swipe = {
    id: nextId("s", store.swipes.map((s) => s.id)),
    actor_type: b.actor_type as "worker" | "employer",
    actor_id: b.actor_id as string,
    target_type: b.target_type as "job" | "worker",
    target_id: b.target_id as string,
    direction: b.direction as "like" | "pass",
  };
  store.swipes.push(swipe);

  // Mutual match: worker liked the job AND the employer liked the worker.
  let match: Match | null = null;
  const { workerLike, employerLike } = findPair(store.swipes, workerId, jobId);
  if (workerLike && employerLike && !matchExists(store.matches, workerId, jobId)) {
    match = {
      id: nextId("m", store.matches.map((m) => m.id)),
      worker_id: workerId,
      job_id: jobId,
    };
    store.matches.push(match);
  }
  saveStore(store);
  res.status(201).json({ swipe, match });
});

app.get("/api/matches", (req, res) => {
  const store = loadStore();
  const { worker_id, job_id } = req.query as Record<string, string | undefined>;
  const matches = store.matches.filter(
    (m) =>
      (!worker_id || m.worker_id === worker_id) &&
      (!job_id || m.job_id === job_id)
  );
  res.json(matches);
});

app.listen(PORT, () => {
  console.log(`meistermatch-api listening on http://127.0.0.1:${PORT} (ml: ${ML_URL})`);
});
