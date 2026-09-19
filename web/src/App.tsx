import { useEffect, useState } from "react";
import type { Job, Match, Worker, ChatMessage } from "../../shared/contract";
import {
  getJobs,
  getWorkers,
  getWorkerDeck,
  getJobDeck,
  postSwipe,
  getMatches,
  getChats,
  postChat,
  login,
  register,
  logout,
  setToken,
  type AuthUser,
  type JobCard,
  type WorkerCard,
} from "./api";
import "./App.css";

type Screen = "auth" | "deck" | "chat";
type Mode = "worker" | "employer";

export default function App() {
  const [screen, setScreen] = useState<Screen>("auth");
  const [authScreen, setAuthScreen] = useState<"login" | "register">("login");
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authError, setAuthError] = useState("");
  const [authForm, setAuthForm] = useState({ username: "", password: "" });

  const [mode, setMode] = useState<Mode>("worker");
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [workerId, setWorkerId] = useState("w001");
  const [jobId, setJobId] = useState("j001");
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [workerCards, setWorkerCards] = useState<WorkerCard[]>([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [match, setMatch] = useState<Match | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [msgInput, setMsgInput] = useState("");
  const [error, setError] = useState("");

  // Auth
  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setAuthError("");
    try {
      if (authScreen === "login") {
        const u = await login(authForm.username, authForm.password);
        setToken(u.token);
        setAuthUser(u);
      } else {
        const u = await register(authForm.username, authForm.password);
        setToken(u.token);
        setAuthUser(u);
      }
      setAuthForm({ username: "", password: "" });
      enterApp();
    } catch (e) {
      setAuthError(String(e));
    }
  }

  function enterApp() {
    setScreen("deck");
    loadData();
  }

  async function handleLogout() {
    try { await logout(); } catch {}
    setAuthUser(null);
    setScreen("auth");
    setMatch(null);
    setMatches([]);
    setMessages([]);
    setCardIndex(0);
  }

  // Load initial data
  async function loadData() {
    try {
      const [w, j] = await Promise.all([getWorkers(), getJobs()]);
      setWorkers(w);
      setJobs(j);
    } catch (e) {
      setError(String(e));
    }
  }

  // Load deck when mode/ids change
  useEffect(() => {
    if (screen !== "deck") return;
    setCardIndex(0);
    setError("");
    setMatch(null);
    if (mode === "worker") {
      getWorkerDeck(workerId).then((d) => {
        setJobCards(d.cards);
        getMatches(workerId).then(setMatches);
      }).catch((e) => setError(String(e)));
    } else {
      getJobDeck(jobId).then((d) => {
        setWorkerCards(d.cards);
        getMatches(undefined, jobId).then(setMatches);
      }).catch((e) => setError(String(e)));
    }
  }, [screen, mode, workerId, jobId]);

  // Swipe
  async function swipe(direction: "like" | "pass") {
    try {
      setError("");
      const cards = mode === "worker" ? jobCards : workerCards;
      const current = cards[cardIndex];
      if (!current) return;
      const actorType = mode === "worker" ? "worker" : "employer";
      const actorId = mode === "worker" ? workerId : jobId;
      const targetType = mode === "worker" ? "job" : "worker";
      const targetId = (current as JobCard).job.id;
      const r = await postSwipe(actorType, actorId, targetType, targetId, direction);
      if (r.match) {
        setMatch(r.match);
        setMatches(await getMatches());
        loadMessages(r.match);
      }
      setCardIndex((i) => i + 1);
    } catch (e) {
      setError(String(e));
    }
  }

  // Chat
  async function loadMessages(m: Match) {
    try {
      const msgs = await getChats(m.id);
      setMessages(msgs);
    } catch {}
  }

  async function sendMessage() {
    if (!match || !msgInput.trim()) return;
    try {
      const msg = await postChat(match.id, msgInput.trim());
      setMessages((prev) => [...prev, msg]);
      setMsgInput("");
    } catch (e) {
      setError(String(e));
    }
  }

  // Render
  if (screen === "auth") {
    return (
      <div className="app">
        <div className="app-grid" />
        <div className="app-blob app-blob-1" />
        <div className="app-blob app-blob-2" />
        <div className="auth-screen">
          <p className="app-brand">MeisterMatch</p>
          <h1 className="app-title">Swipe Right for a Meister<br />Who Shows Up</h1>
          <p className="app-subtitle">Reciprocal human-AI matching for skilled trades</p>

          <div className="tabs">
            <button className={`tab-btn ${authScreen === "login" ? "active" : ""}`} onClick={() => setAuthScreen("login")}>Log in</button>
            <button className={`tab-btn ${authScreen === "register" ? "active" : ""}`} onClick={() => setAuthScreen("register")}>Sign up</button>
          </div>

          <form className="auth-form" onSubmit={handleAuth}>
            <input className="auth-input" type="text" placeholder="Username" value={authForm.username} onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })} required minLength={3} />
            <input className="auth-input" type="password" placeholder="Password" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} required minLength={3} />
            {authError && <p className="error">{authError}</p>}
            <button className="action-btn action-btn-like" type="submit">{authScreen === "login" ? "Log in" : "Sign up"}</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="app-grid" />
      <div className="app-blob app-blob-1" />
      <div className="app-blob app-blob-2" />

      {/* Top bar */}
      <header className="top-bar">
        <span className="app-brand">MeisterMatch</span>
        <div className="top-bar-right">
          <span className="badge badge-blue">{mode === "worker" ? "Worker" : "Employer"}</span>
          <button className="logout-btn" onClick={handleLogout}>Log out</button>
        </div>
      </header>

      {/* Error */}
      {error && <p className="error">{error}</p>}

      {/* Deck */}
      {screen === "deck" && (
        <>
          <div className="mode-switch">
            <button className={`tab-btn ${mode === "worker" ? "active" : ""}`} onClick={() => setMode("worker")}>Worker</button>
            <button className={`tab-btn ${mode === "employer" ? "active" : ""}`} onClick={() => setMode("employer")}>Employer</button>
          </div>

          <div className="picker-row">
            <select value={mode === "worker" ? workerId : jobId} onChange={(e) => { if (mode === "worker") setWorkerId(e.target.value); else setJobId(e.target.value); }}>
              {(mode === "worker" ? workers : jobs).map((item: any) => (
                <option key={item.id} value={item.id}>{item.id} — {mode === "worker" ? (item as Worker).name : (item as Job).title}</option>
              ))}
            </select>
          </div>

          {match && (
            <div className="match-banner">
              <span className="match-banner-text"><span className="badge badge-blue">Match!</span> {match.worker_id} + {match.job_id}</span>
              <button onClick={() => setScreen("chat")}>Chat</button>
            </div>
          )}

          {cardIndex < (mode === "worker" ? jobCards.length : workerCards.length) ? (
            <div className="deck">
              {(mode === "worker" ? jobCards[cardIndex] : workerCards[cardIndex]) && (
                mode === "worker"
                  ? <JobCardView card={jobCards[cardIndex]} />
                  : <WorkerCardView card={workerCards[cardIndex]} />
              )}
              <div className="actions">
                <button className="action-btn action-btn-pass" onClick={() => swipe("pass")}>✕ Pass</button>
                <button className="action-btn action-btn-like" onClick={() => swipe("like")}>♥ Like</button>
              </div>
              <p className="cards-left">{Math.max(0, (mode === "worker" ? jobCards.length : workerCards.length) - cardIndex - 1)} left</p>
            </div>
          ) : (
            <div className="done">
              <p>No more cards in this deck.</p>
              <button className="action-btn action-btn-like" onClick={() => setScreen("auth")}>Switch identity</button>
            </div>
          )}

          <section className="matches-preview">
            <h3>Matches ({matches.length})</h3>
            {matches.map((m) => (
              <button key={m.id} className="match-link" onClick={() => { setMatch(m); setScreen("chat"); loadMessages(m); }}>
                {m.worker_id} + {m.job_id}
              </button>
            ))}
          </section>
        </>
      )}

      {/* Chat */}
      {screen === "chat" && match && (
        <div className="chat-screen">
          <header className="top-bar">
            <button className="back-btn" onClick={() => setScreen("deck")}>← Back</button>
            <span className="app-brand">Chat</span>
            <button className="logout-btn" onClick={handleLogout}>Log out</button>
          </header>

          <div className="messages">
            {messages.map((m) => (
              <div key={m.id} className={`message ${m.by === (authUser?.username ?? "") ? "mine" : "theirs"}`}>
                <span className="message-text">{m.text}</span>
                <span className="message-time">{new Date(m.time).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>

          <div className="chat-input">
            <input className="chat-field" type="text" placeholder="Type a message..." value={msgInput} onChange={(e) => setMsgInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} />
            <button className="action-btn action-btn-like" onClick={sendMessage}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Card components ---
function Score({ score }: { score: number }) {
  return (
    <div className="score">
      <div className="score-bar-container">
        <div className="score-bar" style={{ width: `${score}%` }} />
      </div>
      <span className="score-value">{score}</span>
    </div>
  );
}

function JobCardView({ card }: { card: JobCard }) {
  return (
    <div className="card">
      <h3>{card.job.title}</h3>
      <p className="meta">{card.job.trade} · {card.job.district} · {card.job.pay_min_eur_h}–{card.job.pay_max_eur_h} EUR/h · {card.job.season}</p>
      <p className="card-description">{card.job.description_lv}</p>
      <div className="skills-tag">{card.job.required_skills.map((s) => <span key={s}>{s}</span>)}</div>
      <Score score={card.score} />
      <ul className="reasons">{card.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
    </div>
  );
}

function WorkerCardView({ card }: { card: WorkerCard }) {
  return (
    <div className="card">
      <h3>{card.worker.name} ({card.worker.id})</h3>
      <p className="meta">{card.worker.trade} · {card.worker.experience_years} yrs · {card.worker.district} · {card.worker.hourly_rate_eur} EUR/h · {card.worker.languages.join("/")}</p>
      <div className="skills-tag">{card.worker.skills.map((s) => <span key={s}>{s}</span>)}</div>
      <Score score={card.score} />
      <ul className="reasons">{card.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
    </div>
  );
}
