import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { signOutUser } from "./firebase";
import type { User } from "firebase/auth";
import { useToast } from "./hooks/useToast";
import RoutingConsole from "./components/RoutingConsole";
import PlantStatus from "./components/PlantStatus";
import BatchLog from "./components/BatchLog";
import CompatibilityMatrix from "./components/CompatibilityMatrix";
import AiAssistant from "./components/AiAssistant";
import ToastContainer from "./components/ToastContainer";

type View = "routing" | "plant" | "batches" | "matrix";
type Theme = "dark" | "light";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = window.localStorage.getItem("grease-theme");
  return stored === "light" || stored === "dark" ? stored : "dark";
}

// App is only rendered when the user is authenticated and ConvexProvider is mounted.
// Auth gating and the landing page live in main.tsx.
export default function App({ user }: { user: User }) {
  const [view, setView] = useState<View>("routing");
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [clock, setClock] = useState(new Date());
  const { toasts, addToast, removeToast } = useToast();
  const seedDatabase = useMutation(api.seed.seedDatabase);
  const isSeedComplete = useQuery(api.seed.isSeedComplete);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("grease-theme", theme);

    return () => {
      document.documentElement.removeAttribute("data-theme");
    };
  }, [theme]);

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (isSeedComplete === false) {
      seedDatabase({ force: false }).catch(console.error);
    }
  }, [isSeedComplete, seedDatabase]);

  const fmtTime = (d: Date) =>
    d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const fmtDate = (d: Date) =>
    d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="app-shell">
      <header className="nav">
        <div className="brand-stack">
          <div className="nav-logo"><span className="brand-mark" />Grease Plant Routing System</div>
          <div className="nav-subtitle">Manual stage control · Dye tracking · Base compatibility</div>
        </div>
        <div className="nav-right">
          <span className="clock-readout">
            {fmtDate(clock)} {fmtTime(clock)}
          </span>
          <button
            className={`theme-switch ${theme === "light" ? "is-light" : ""}`}
            type="button"
            aria-label={`Switch to ${theme === "dark" ? "bright" : "dark"} mode`}
            aria-pressed={theme === "light"}
            onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
          >
            <span className="theme-switch-track"><span className="theme-switch-thumb" /></span>
            <span>{theme === "dark" ? "Dark" : "Bright"}</span>
          </button>
          <span className="user-chip">{user.email?.split("@")[0] ?? "operator"}</span>
          <button className="btn btn-outline btn-sm" onClick={() => signOutUser().catch(console.error)}>
            Sign out
          </button>
        </div>
      </header>

      <nav className="nav-tabs" aria-label="Plant console views">
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
      </nav>

      <div className="main-content">
        {view === "routing" && <RoutingConsole addToast={addToast} />}
        {view === "plant" && <PlantStatus addToast={addToast} />}
        {view === "batches" && <BatchLog addToast={addToast} />}
        {view === "matrix" && <CompatibilityMatrix />}
      </div>

      <AiAssistant />
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
