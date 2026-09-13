import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Match, SeedData, Swipe } from "../../shared/contract";

// JSON-file store (Phase 1). data/store.json starts as a copy of the
// deterministic seed; swipes/matches/feedback accumulate at runtime.
// Upgrade path (Phase 2+): SQLite/Postgres behind this same interface.
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const STORE_PATH = join(ROOT, "data", "store.json");
const SEED_PATH = join(ROOT, "data", "seed.json");

export function loadStore(): SeedData {
  if (!existsSync(STORE_PATH)) {
    copyFileSync(SEED_PATH, STORE_PATH);
  }
  return JSON.parse(readFileSync(STORE_PATH, "utf-8")) as SeedData;
}

export function saveStore(store: SeedData): void {
  writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf-8");
}

export function nextId(prefix: string, existing: string[]): string {
  return `${prefix}${String(existing.length + 1).padStart(3, "0")}`;
}

export function findPair(
  swipes: Swipe[],
  workerId: string,
  jobId: string
): { workerLike: boolean; employerLike: boolean } {
  const workerLike = swipes.some(
    (s) =>
      s.actor_type === "worker" &&
      s.actor_id === workerId &&
      s.target_type === "job" &&
      s.target_id === jobId &&
      s.direction === "like"
  );
  const employerLike = swipes.some(
    (s) =>
      s.actor_type === "employer" &&
      s.actor_id === jobId &&
      s.target_type === "worker" &&
      s.target_id === workerId &&
      s.direction === "like"
  );
  return { workerLike, employerLike };
}

export function matchExists(matches: Match[], workerId: string, jobId: string): boolean {
  return matches.some((m) => m.worker_id === workerId && m.job_id === jobId);
}
