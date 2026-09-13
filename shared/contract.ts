// MeisterMatch data contract v1 (Phase 0).
// Mirrors shared/schema.json. Single source of truth for cards, swipes, matches, feedback.

export type Trade = "electrician" | "plumber" | "welder" | "carpenter" | "hvac";

export type Language = "lv" | "ru" | "en";

export type Availability = "immediate" | "one_to_two_weeks" | "date";

export type Season = "summer" | "winter" | "all_year";

export interface Worker {
  id: string; // w001...
  name: string;
  trade: Trade;
  skills: string[];
  experience_years: number;
  district: string; // Riga district
  languages: Language[];
  availability: Availability;
  available_from: string | null; // ISO date when availability === "date"
  hourly_rate_eur: number;
}

export interface Job {
  id: string; // j001...
  employer: string;
  title: string;
  trade: Trade;
  required_skills: string[];
  district: string;
  pay_min_eur_h: number;
  pay_max_eur_h: number;
  start: Availability;
  start_date: string | null; // ISO date when start === "date"
  season: Season;
  description_lv: string;
}

export type SwipeDirection = "like" | "pass";

export interface Swipe {
  id: string;
  actor_type: "worker" | "employer";
  actor_id: string;
  target_type: "job" | "worker";
  target_id: string;
  direction: SwipeDirection;
}

export interface Match {
  id: string;
  worker_id: string;
  job_id: string;
}

export type FeedbackLabel = "relevant" | "irrelevant";

export interface Feedback {
  id: string;
  worker_id: string;
  job_id: string;
  label: FeedbackLabel;
  by: "worker" | "employer" | "recruiter";
}

export interface SeedData {
  workers: Worker[];
  jobs: Job[];
  swipes: Swipe[];
  matches: Match[];
  feedback: Feedback[];
}

export type RankMode = "jobs_for_worker" | "workers_for_job";

export interface RankRequest {
  mode: RankMode;
  worker?: Worker;
  job?: Job;
  candidates: Worker[] | Job[];
  limit: number;
}

export interface RankedItem {
  id: string;
  score: number;
  reasons: string[];
}

export interface RankResponse {
  results: RankedItem[];
}
