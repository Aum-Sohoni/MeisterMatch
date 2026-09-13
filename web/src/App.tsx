import { useEffect, useState } from "react";
import type { Job, Match, Worker } from "../../shared/contract";
import {
  getJobDeck,
  getJobs,
  getMatches,
  getWorkerDeck,
  getWorkers,
  postSwipe,
  type JobCard,
  type WorkerCard,
} from "./api";
import "./App.css";

type Mode = "worker" | "employer";

export default function App() {
  const [mode, setMode] = useState<Mode>("worker");
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [workerId, setWorkerId] = useState("w001");
  const [jobId, setJobId] = useState("j001");
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [workerCards, setWorkerCards] = useState<WorkerCard[]>([]);
  const [index, setIndex] = useState(0);
  const [match, setMatch] = useState<Match | null>(null);
  const [myMatches, setMyMatches] = useState<Match[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getWorkers().then(setWorkers).catch((e) => setError(String(e)));
    getJobs().then(setJobs).catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    setError(null);
    setMatch(null);
    setIndex(0);
    if (mode === "worker") {
      getWorkerDeck(workerId)
        .then((d) => {
          setJobCards(d.cards);
          return getMatches(workerId);
        })
        .then(setMyMatches)
        .catch((e) => setError(String(e)));
    } else {
      getJobDeck(jobId)
        .then((d) => {
          setWorkerCards(d.cards);
          return getMatches(undefined, jobId);
        })
        .then(setMyMatches)
        .catch((e) => setError(String(e)));
    }
  }, [mode, workerId, jobId]);

  async function swipe(direction: "like" | "pass") {
    try {
      if (mode === "worker") {
        const card = jobCards[index];
        if (!card) return;
        const r = await postSwipe("worker", workerId, "job", card.job.id, direction);
        if (r.match) {
          setMatch(r.match);
          setMyMatches(await getMatches(workerId));
        }
      } else {
        const card = workerCards[index];
        if (!card) return;
        const r = await postSwipe("employer", jobId, "worker", card.worker.id, direction);
        if (r.match) {
          setMatch(r.match);
          setMyMatches(await getMatches(undefined, jobId));
        }
      }
      setIndex((i) => i + 1);
    } catch (e) {
      setError(String(e));
    }
  }

  const cardsLeft = mode === "worker" ? jobCards.length - index : workerCards.length - index;

  return (
    <div className="mm">
      <header>
        <h1>MeisterMatch (prototype)</h1>
        <div className="tabs">
          <button className={mode === "worker" ? "active" : ""} onClick={() => setMode("worker")}>
            Worker view
          </button>
          <button className={mode === "employer" ? "active" : ""} onClick={() => setMode("employer")}>
            Employer view
          </button>
        </div>
      </header>

      {error && <p className="error">{error} — is the API running on :3001?</p>}

      {mode === "worker" ? (
        <div className="picker">
          <label>
            Worker{" "}
            <select value={workerId} onChange={(e) => setWorkerId(e.target.value)}>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.id} — {w.name} ({w.trade})
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : (
        <div className="picker">
          <label>
            Job posting{" "}
            <select value={jobId} onChange={(e) => setJobId(e.target.value)}>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.id} — {j.title}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {match && (
        <div className="match-banner">
          Match! {match.worker_id} + {match.job_id} ({match.id})
          <button onClick={() => setMatch(null)}>Dismiss</button>
        </div>
      )}

      {cardsLeft > 0 ? (
        <div className="deck">
          {mode === "worker" ? (
            <JobCardView card={jobCards[index]} />
          ) : (
            <WorkerCardView card={workerCards[index]} />
          )}
          <div className="actions">
            <button className="pass" onClick={() => swipe("pass")}>
              Pass
            </button>
            <button className="like" onClick={() => swipe("like")}>
              Like
            </button>
          </div>
          <p className="left">{cardsLeft - 1} cards left</p>
        </div>
      ) : (
        <p className="done">Deck finished. Switch sides to match from the other direction.</p>
      )}

      <section className="matches">
        <h2>My matches ({myMatches.length})</h2>
        <ul>
          {myMatches.map((m) => (
            <li key={m.id}>
              {m.id}: {m.worker_id} + {m.job_id}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Score({ score }: { score: number }) {
  return (
    <div className="score">
      <div className="bar" style={{ width: `${score}%` }} />
      <span>{score}</span>
    </div>
  );
}

function JobCardView({ card }: { card: JobCard }) {
  return (
    <div className="card">
      <h3>{card.job.title}</h3>
      <p className="meta">
        {card.job.trade} · {card.job.district} · {card.job.pay_min_eur_h}–
        {card.job.pay_max_eur_h} EUR/h · {card.job.season}
      </p>
      <p>{card.job.description_lv}</p>
      <p className="meta">Needs: {card.job.required_skills.join(", ")}</p>
      <Score score={card.score} />
      <ul className="reasons">
        {card.reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
    </div>
  );
}

function WorkerCardView({ card }: { card: WorkerCard }) {
  return (
    <div className="card">
      <h3>
        {card.worker.name} ({card.worker.id})
      </h3>
      <p className="meta">
        {card.worker.trade} · {card.worker.experience_years} yrs · {card.worker.district} ·{" "}
        {card.worker.hourly_rate_eur} EUR/h · {card.worker.languages.join("/")}
      </p>
      <p className="meta">Skills: {card.worker.skills.join(", ")}</p>
      <Score score={card.score} />
      <ul className="reasons">
        {card.reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
    </div>
  );
}
