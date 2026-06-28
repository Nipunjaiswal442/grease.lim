import { useState, useEffect } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { auth, signOutUser } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import { useToast } from "./hooks/useToast";
import RoutingConsole from "./components/RoutingConsole";
import PlantStatus from "./components/PlantStatus";
import BatchLog from "./components/BatchLog";
import CompatibilityMatrix from "./components/CompatibilityMatrix";
import AiAssistant from "./components/AiAssistant";
import ToastContainer from "./components/ToastContainer";
import LandingPage from "./components/LandingPage";

type View = "routing" | "plant" | "batches" | "matrix";

export default function App() {
  // Firebase auth state — resolves in ~100ms locally, no network needed
  const [user, setUser] = useState<User | null>(null);
  const [fbLoading, setFbLoading] = useState(true);

  // Convex auth state — only meaningful once Firebase user is confirmed
  const { isAuthenticated, isLoading: convexAuthLoading } = useConvexAuth();

  const [view, setView] = useState<View>("routing");
  const [clock, setClock] = useState(new Date());
  const { toasts, addToast, removeToast } = useToast();
  const seedDatabase = useMutation(api.seed.seedDatabase);
  const isSeedComplete = useQuery(api.seed.isSeedComplete);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setFbLoading(false);
    });
  }, []);

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (isAuthenticated && isSeedComplete === false) {
      seedDatabase({ force: false }).catch(console.error);
    }
  }, [isAuthenticated, isSeedComplete, seedDatabase]);

  // Gate 1: wait for Firebase (fast — local cache check only)
  if (fbLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--bg-base)" }}>
        <div style={{ color: "var(--text-secondary)", fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Initialising...
        </div>
      </div>
    );
  }

  // Gate 2: no Firebase user → show landing page immediately, without waiting for Convex
  if (!user) {
    return <LandingPage />;
  }

  // Gate 3: Firebase user exists, wait for Convex to validate the JWT token
  if (convexAuthLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--bg-base)" }}>
        <div style={{ color: "var(--text-secondary)", fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Connecting to plant backend...
        </div>
      </div>
    );
  }

  const fmtTime = (d: Date) =>
    d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const fmtDate = (d: Date) =>
    d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <>
      <nav className="nav">
        <div className="nav-logo">⚙ Grease Routing</div>
        <div className="nav-tabs">
          {(["routing", "plant", "batches", "matrix"] as View[]).map((v) => (
            <button
              key={v}
              className={`nav-tab ${view === v ? "active" : ""}`}
              onClick={() => setView(v)}
            >
              {v === "routing" && "Routing Console"}
              {v === "plant" && "Plant Status"}
              {v === "batches" && "Batch Log"}
              {v === "matrix" && "Compat Matrix"}
            </button>
          ))}
        </div>
        <div className="nav-right">
          <span style={{ color: "var(--text-dim)", fontSize: "0.62rem" }}>{fmtDate(clock)}</span>
          <span style={{ color: "var(--status-available)", fontVariantNumeric: "tabular-nums", fontSize: "0.72rem" }}>
            {fmtTime(clock)}
          </span>
          <span style={{ color: "var(--text-dim)", fontSize: "0.62rem" }}>{user?.email?.split("@")[0] ?? ""}</span>
          <button className="btn btn-outline btn-sm" onClick={() => signOutUser().catch(console.error)}>
            Sign out
          </button>
        </div>
      </nav>

      <div className="main-content">
        {view === "routing" && <RoutingConsole addToast={addToast} />}
        {view === "plant" && <PlantStatus addToast={addToast} />}
        {view === "batches" && <BatchLog addToast={addToast} />}
        {view === "matrix" && <CompatibilityMatrix />}
      </div>

      <AiAssistant />
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </>
  );
}
