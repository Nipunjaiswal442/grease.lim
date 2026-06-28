import { useState, useEffect } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { auth, signInWithGoogle, signOutUser } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import { useToast } from "./hooks/useToast";
import RoutingConsole from "./components/RoutingConsole";
import PlantStatus from "./components/PlantStatus";
import BatchLog from "./components/BatchLog";
import CompatibilityMatrix from "./components/CompatibilityMatrix";
import AiAssistant from "./components/AiAssistant";
import ToastContainer from "./components/ToastContainer";

type View = "routing" | "plant" | "batches" | "matrix";

export default function App() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<View>("routing");
  const [clock, setClock] = useState(new Date());
  const { toasts, addToast, removeToast } = useToast();
  const seedDatabase = useMutation(api.seed.seedDatabase);
  const isSeedComplete = useQuery(api.seed.isSeedComplete);

  useEffect(() => {
    return onAuthStateChanged(auth, setUser);
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

  if (authLoading) {
    return (
      <div className="login-screen">
        <div style={{ color: "var(--text-secondary)", fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Initialising...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <div style={{ fontSize: "2.5rem" }}>⚙️</div>
          <div className="login-title">Grease Plant Routing System</div>
          <div className="login-sub">IOCL Vashi LBP — Production Control Console</div>
          <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", lineHeight: "1.6" }}>
            Sign in with your corporate Google account to access the plant control system.
          </div>
          <button
            className="btn btn-primary"
            onClick={() => signInWithGoogle().catch(console.error)}
            style={{ width: "100%", justifyContent: "center" }}
          >
            Sign in with Google
          </button>
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
