import { useEffect, useState, type CSSProperties } from "react";
import { isFirebaseConfigured, signInWithGoogle, signInWithEmail, registerWithEmail, resetPassword } from "../firebase";
import heroAsset from "../assets/hero.png";

type AuthMode = "signin" | "signup" | "reset" | null;

const FEATURES = [
  {
    mark: "RT",
    title: "Routing Console",
    desc: "Enter a product code and instantly see which equipment is safe to use — no cleaning required. Recommended equipment highlighted automatically.",
  },
  {
    mark: "PL",
    title: "Live Plant Status",
    desc: "Real-time overview of all 19 equipment units across 4 stages. See active batches, equipment state, and advance stages with one click.",
  },
  {
    mark: "LOG",
    title: "Batch Log",
    desc: "Full history of every production run. Track grade, group, dye flag, equipment assignments, and current pipeline stage.",
  },
  {
    mark: "MX",
    title: "Compatibility Matrix",
    desc: "25×25 visual reference of all group-to-group compatibility. Instantly know whether a kettle changeover requires cleaning.",
  },
  {
    mark: "AI",
    title: "AI Assistant",
    desc: "Powered by NVIDIA Gemma 4 with extended thinking. Ask about compatibility decisions, cleaning rules, or borderline-group guidance.",
  },
  {
    mark: "SEC",
    title: "Secure Access",
    desc: "Google or email sign-in via Firebase Auth. All sessions verified. CSP and HSTS headers enforced in production.",
  },
];

const PIPELINE = [
  { label: "Reactor", color: "var(--stage-reactor)", desc: "Soap synthesis from fatty acid + metal hydroxide" },
  { label: "Kettle", color: "var(--stage-kettle)", desc: "Base oil blended with soap to form grease" },
  { label: "Homogeniser", color: "var(--stage-homo)", desc: "Final texture and consistency achieved" },
  { label: "Filling Point", color: "var(--stage-fillpt)", desc: "Packaged into drums, cartridges, or pails" },
];

function AuthPanel({
  mode, onClose,
}: {
  mode: AuthMode;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localMode, setLocalMode] = useState<"signin" | "signup" | "reset">(mode as any ?? "signin");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    setError(""); setInfo("");
    if (!isFirebaseConfigured) {
      setError("Firebase Auth is not configured in Vercel yet. Add the VITE_FIREBASE_* environment variables, then redeploy.");
      return;
    }
    if (!email.trim()) { setError("Email is required."); return; }
    if (localMode !== "reset" && !password) { setError("Password is required."); return; }
    setBusy(true);
    try {
      if (localMode === "signin") {
        await signInWithEmail(email.trim(), password);
      } else if (localMode === "signup") {
        if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
        await registerWithEmail(email.trim(), password);
      } else {
        await resetPassword(email.trim());
        setInfo("Password reset email sent. Check your inbox.");
      }
    } catch (e: any) {
      const msg: Record<string, string> = {
        "auth/user-not-found": "No account with this email.",
        "auth/wrong-password": "Incorrect password.",
        "auth/email-already-in-use": "Account already exists. Sign in instead.",
        "auth/invalid-email": "Invalid email address.",
        "auth/weak-password": "Password too weak (min 8 chars).",
        "auth/too-many-requests": "Too many attempts. Try again later.",
        "auth/unauthorized-domain": "This Vercel domain is not authorised in Firebase Authentication settings.",
        "auth/popup-blocked": "Popup blocked. Redirect sign-in will open instead.",
        "auth/popup-closed-by-user": "Google sign-in did not finish. Try again or use email sign-in.",
      };
      setError(msg[e.code] ?? e.message ?? "Authentication failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(11,14,19,0.88)", zIndex: 500,
        display: "flex", alignItems: "center", justifyContent: "center",
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "var(--bg-panel)", border: "1px solid var(--border-subtle)",
          borderRadius: 4, padding: "32px 36px", width: 360, position: "relative",
        }}
      >
        <button
          onClick={onClose}
          style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: 18 }}
        >
          ✕
        </button>

        <div style={{ fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 20 }}>
          {localMode === "signin" ? "Sign In" : localMode === "signup" ? "Create Account" : "Reset Password"}
        </div>

        {!isFirebaseConfigured && (
          <div className="warn-banner red" style={{ fontSize: "0.68rem", marginBottom: 16 }}>
            Firebase Auth is not configured on this deployment yet. The website content is visible, but sign-in needs the Vercel `VITE_FIREBASE_*` variables.
          </div>
        )}

        {/* Google */}
        {localMode !== "reset" && (
          <>
            <button
              className="btn btn-outline"
              style={{ width: "100%", justifyContent: "center", marginBottom: 16 }}
              onClick={() => signInWithGoogle().catch((e) => setError(e.message))}
            >
              <svg width="16" height="16" viewBox="0 0 48 48" style={{ marginRight: 6 }}>
                <path fill="#4285F4" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.1 29.3 35 24 35c-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.3 1 7.2 2.7l5.7-5.7C33.4 7.5 28.9 5.5 24 5.5 12.7 5.5 3.5 14.7 3.5 26S12.7 46.5 24 46.5 44.5 37.3 44.5 26c0-2-.2-3.9-.9-5.9z"/>
                <path fill="#34A853" d="M6.3 16.7l6.6 4.8C14.5 18 18.9 15 24 15c2.8 0 5.3 1 7.2 2.7l5.7-5.7C33.4 8.5 28.9 5.5 24 5.5c-7.7 0-14.3 4.4-17.7 11.2z"/>
                <path fill="#FBBC05" d="M24 46.5c5.2 0 9.9-1.9 13.4-5L31.1 36c-1.9 1.4-4.4 2.3-7.1 2.3-5.2 0-9.6-3.5-11.2-8.3l-6.6 5.1C9.7 42 16.3 46.5 24 46.5z"/>
                <path fill="#EA4335" d="M43.6 20.1H42V20H24v8h11.3c-.9 2.5-2.5 4.6-4.7 6l6.3 5.5C40.9 36.4 44.5 31.6 44.5 26c0-2-.2-3.9-.9-5.9z"/>
              </svg>
              Continue with Google
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div style={{ flex: 1, height: 1, background: "var(--border-subtle)" }} />
              <span style={{ fontSize: "0.62rem", color: "var(--text-dim)" }}>or</span>
              <div style={{ flex: 1, height: 1, background: "var(--border-subtle)" }} />
            </div>
          </>
        )}

        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: "0.62rem", color: "var(--text-secondary)", marginBottom: 4 }}>EMAIL</div>
          <input
            className="input"
            type="email"
            placeholder="operator@plant.in"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            autoComplete="email"
          />
        </div>

        {localMode !== "reset" && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: "0.62rem", color: "var(--text-secondary)", marginBottom: 4 }}>PASSWORD</div>
            <input
              className="input"
              type="password"
              placeholder={localMode === "signup" ? "Min 8 characters" : "••••••••"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              autoComplete={localMode === "signup" ? "new-password" : "current-password"}
            />
          </div>
        )}

        {error && (
          <div style={{ fontSize: "0.72rem", color: "var(--status-busy)", marginBottom: 10 }}>{error}</div>
        )}
        {info && (
          <div style={{ fontSize: "0.72rem", color: "var(--status-available)", marginBottom: 10 }}>{info}</div>
        )}

        <button
          className="btn btn-confirm"
          style={{ width: "100%", justifyContent: "center", marginBottom: 14 }}
          onClick={handleSubmit}
          disabled={busy}
        >
          {busy ? "Please wait…" : localMode === "signin" ? "Sign In" : localMode === "signup" ? "Create Account" : "Send Reset Email"}
        </button>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.65rem", color: "var(--text-secondary)" }}>
          {localMode === "signin" ? (
            <>
              <button className="btn btn-sm" style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", padding: 0, fontFamily: "inherit", fontSize: "inherit" }} onClick={() => { setLocalMode("signup"); setError(""); }}>
                Create account
              </button>
              <button className="btn btn-sm" style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", padding: 0, fontFamily: "inherit", fontSize: "inherit" }} onClick={() => { setLocalMode("reset"); setError(""); }}>
                Forgot password?
              </button>
            </>
          ) : (
            <button className="btn btn-sm" style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", padding: 0, fontFamily: "inherit", fontSize: "inherit" }} onClick={() => { setLocalMode("signin"); setError(""); }}>
              ← Back to sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [authMode, setAuthMode] = useState<AuthMode>(null);

  useEffect(() => {
    const elements = Array.from(document.querySelectorAll(".reveal-on-scroll"));
    if (!("IntersectionObserver" in window)) {
      elements.forEach((el) => el.classList.add("animate-reveal"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("animate-reveal");
        });
      },
      { threshold: 0.15 }
    );

    elements.forEach((el) => observer.observe(el));
    return () => elements.forEach((el) => observer.unobserve(el));
  }, []);

  return (
    <div className="landing-page">
      <nav className="landing-nav">
        <div className="landing-nav-brand">
          <span className="landing-brand-mark" aria-hidden="true">GP</span>
          Grease Plant Routing System
        </div>
        <div className="landing-nav-actions">
          <button className="btn btn-outline btn-sm" onClick={() => setAuthMode("signin")}>Sign In</button>
          <button className="btn btn-confirm btn-sm" onClick={() => setAuthMode("signup")}>Get Started</button>
        </div>
      </nav>

      <main className="landing-hero">
        <div className="landing-ambient" aria-hidden="true" />
        <img
          src={heroAsset}
          alt=""
          aria-hidden="true"
          className="landing-hero-art"
        />
        <div className="landing-kicker reveal-on-scroll">Production Control · Compatibility Intelligence</div>
        <h1 className="landing-title reveal-on-scroll delay-100">
          <span>Grease Manufacturing</span>
          <span>Routing Intelligence</span>
        </h1>
        <p className="landing-copy reveal-on-scroll delay-200">
          A production control console for 137 grease grades across 25 compatibility groups.
          Route batches through shared equipment — reactors, kettles, homogenisers, and filling points
          — with full compatibility checking and real-time status tracking.
        </p>
        <div className="landing-hero-actions reveal-on-scroll delay-300">
          <button className="landing-primary-action" onClick={() => setAuthMode("signup")}>
            Launch Console
          </button>
          <button className="landing-secondary-action" onClick={() => setAuthMode("signin")}>
            Sign In
          </button>
        </div>
      </main>

      <section className="landing-strip reveal-on-scroll">
        <div className="landing-container">
          <div className="landing-section-label">
            Production Pipeline
          </div>
          <div className="pipeline-grid">
            {PIPELINE.map((step, i) => (
              <div
                key={step.label}
                className="pipeline-card"
                style={{ "--pipe-color": step.color, "--pipe-border": i === 0 ? step.color : "rgba(255,255,255,0.08)" } as CSSProperties}
              >
                <div className="pipeline-title">
                  {step.label}
                </div>
                <div className="pipeline-desc">
                  {step.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section landing-problem">
        <div className="landing-container landing-two-col">
          <div className="reveal-on-scroll">
            <div className="landing-section-label">Routing Bottleneck</div>
            <h2 className="landing-section-title">
              Shared equipment needs clean sequencing.
            </h2>
          </div>
          <div className="landing-problem-copy reveal-on-scroll delay-100">
            <p>
              Grease manufacturing depends on shared reactors, kettles, homogenisers, and filling points.
              A poorly sequenced batch can create cleaning delays, dye flush requirements, and contamination risk.
            </p>
            <p>
              The console turns compatibility, last-run group history, and active batch stage data into an operator-ready route recommendation.
            </p>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-container">
          <div className="landing-section-head reveal-on-scroll">
            <div className="landing-section-label">Core Features</div>
            <h2 className="landing-section-title">Built for fast plant decisions.</h2>
          </div>
          <div className="feature-grid">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="feature-card reveal-on-scroll"
            >
              <div className="feature-mark" aria-hidden="true">{f.mark}</div>
              <div className="feature-title">
                {f.title}
              </div>
              <div className="feature-desc">
                {f.desc}
              </div>
            </div>
          ))}
          </div>
        </div>
      </section>

      <section className="landing-section landing-architecture">
        <div className="landing-container">
          <div className="landing-section-head reveal-on-scroll">
            <div className="landing-section-label">Operational Architecture</div>
            <h2 className="landing-section-title">Route, lock, advance, release.</h2>
          </div>
          <div className="bento-grid">
            <div className="bento-card bento-wide reveal-on-scroll">
              <div className="feature-mark">SEQ</div>
              <h3>Compatibility-first sequencing</h3>
              <p>Every equipment card is scored against the previous batch group, with recommended routes shown ahead of clean-required options.</p>
            </div>
            <div className="bento-card reveal-on-scroll delay-100">
              <div className="feature-mark">DYE</div>
              <h3>Dye flush tracking</h3>
              <p>Coloured batches automatically flag kettle, homogeniser, and filling point flush requirements after use.</p>
            </div>
            <div className="bento-card reveal-on-scroll">
              <div className="feature-mark">ADM</div>
              <h3>Controlled master data</h3>
              <p>Grades, equipment, groups, and compatibility pairs are maintained from the admin console without changing code.</p>
            </div>
            <div className="bento-card bento-wide reveal-on-scroll delay-100">
              <div className="feature-mark">LIVE</div>
              <h3>Stage-aware equipment locking</h3>
              <p>Batch start locks the route, stage advances release used equipment, and the plant view mirrors scheduled and active units.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-stats reveal-on-scroll">
        <div className="landing-container stats-grid">
          {[
            { num: "137", label: "Product Grades" },
            { num: "25", label: "Compatibility Groups" },
            { num: "19", label: "Equipment Units" },
            { num: "625", label: "Compatibility Pairs" },
            { num: "4", label: "Pipeline Stages" },
          ].map((s) => (
            <div key={s.label} className="stat-card">
              <div className="stat-num">{s.num}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-container">
          <div className="landing-section-head reveal-on-scroll">
            <div className="landing-section-label">How It Works</div>
            <h2 className="landing-section-title">A four-step control loop.</h2>
          </div>
          <div className="steps-list">
          {[
            ["01", "Select a product grade", "Enter the 4-digit grade code (e.g. 7770 = SERVOGEM EP 2). The system resolves its compatibility group automatically."],
            ["02", "Review equipment recommendations", "Available equipment is scored for compatibility with the previous batch group. ★ REC equipment needs no cleaning."],
            ["03", "Confirm route & start batch", "Select one unit per stage, confirm the route preview, and start the batch. Equipment locks immediately."],
            ["04", "Advance stages & complete", "Each stage advance is operator-confirmed. Equipment status updates in real time across all connected sessions."],
          ].map(([num, title, desc]) => (
            <div
              key={num}
              className="step-row reveal-on-scroll"
            >
              <div className="step-num">{num}</div>
              <div>
                <div className="step-title">{title}</div>
                <div className="step-desc">{desc}</div>
              </div>
            </div>
          ))}
          </div>
        </div>
      </section>

      <section className="landing-cta reveal-on-scroll">
        <div className="landing-cta-inner">
          <div className="landing-cta-title">
            Ready to optimise your production routing?
          </div>
          <div className="landing-cta-copy">
            Sign in with your Google account or create an account with email and password.
            The plant database auto-seeds on first login.
          </div>
          <div className="landing-hero-actions landing-cta-actions">
            <button className="landing-primary-action" onClick={() => setAuthMode("signup")}>
              Create Account
            </button>
            <button className="landing-secondary-action" onClick={() => setAuthMode("signin")}>
              Sign In
            </button>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div>
          Grease Plant Routing System · Production Control Console
        </div>
        <div>
          React · Convex · Firebase · NVIDIA Gemma 4 · Vercel
        </div>
      </footer>

      {authMode && <AuthPanel mode={authMode} onClose={() => setAuthMode(null)} />}
    </div>
  );
}
