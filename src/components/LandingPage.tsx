import { useState } from "react";
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

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", display: "flex", flexDirection: "column" }}>
      {/* NAV */}
      <nav style={{
        background: "var(--bg-panel)", borderBottom: "1px solid var(--border-subtle)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 40px", height: 52, position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{ fontSize: "0.72rem", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600 }}>
          <span className="landing-brand-mark" aria-hidden="true">GP</span>
          Grease Plant Routing System
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-outline btn-sm" onClick={() => setAuthMode("signin")}>Sign In</button>
          <button className="btn btn-confirm btn-sm" onClick={() => setAuthMode("signup")}>Get Started</button>
        </div>
      </nav>

      {/* HERO */}
      <section style={{
        padding: "80px 40px 60px", maxWidth: 880, margin: "0 auto", width: "100%",
        position: "relative", overflow: "hidden",
      }}>
        <img
          src={heroAsset}
          alt=""
          aria-hidden="true"
          style={{
            position: "absolute", right: 8, top: 34, width: 260, maxWidth: "36%",
            opacity: 0.18, pointerEvents: "none",
          }}
        />
        <div style={{
          display: "inline-block", fontSize: "0.6rem", letterSpacing: "0.14em",
          textTransform: "uppercase", color: "var(--accent)",
          background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)",
          padding: "4px 10px", borderRadius: 2, marginBottom: 24,
        }}>
          IOCL Vashi LBP · Production Control
        </div>
        <h1 style={{
          fontSize: "2.8rem", fontWeight: 700, lineHeight: 1.15, letterSpacing: 0,
          color: "var(--text-primary)", marginBottom: 20, fontFamily: "inherit",
          position: "relative",
        }}>
          Grease Manufacturing<br />
          <span style={{ color: "var(--accent)" }}>Routing Intelligence</span>
        </h1>
        <p style={{
          fontSize: "0.95rem", color: "var(--text-secondary)", lineHeight: 1.7,
          maxWidth: 600, marginBottom: 36,
        }}>
          A production control console for 137 grease grades across 25 compatibility groups.
          Route batches through shared equipment — reactors, kettles, homogenisers, and filling points
          — with full compatibility checking and real-time status tracking.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button className="btn btn-confirm" style={{ fontSize: "0.82rem", padding: "10px 24px" }} onClick={() => setAuthMode("signup")}>
            Launch Console →
          </button>
          <button className="btn btn-outline" style={{ fontSize: "0.82rem", padding: "10px 24px" }} onClick={() => setAuthMode("signin")}>
            Sign In
          </button>
        </div>
      </section>

      {/* PIPELINE STRIP */}
      <section style={{ background: "var(--bg-panel)", borderTop: "1px solid var(--border-subtle)", borderBottom: "1px solid var(--border-subtle)", padding: "24px 40px" }}>
        <div style={{ maxWidth: 880, margin: "0 auto" }}>
          <div style={{ fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: 16 }}>
            Production Pipeline
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
            {PIPELINE.map((step, i) => (
              <div
                key={step.label}
                style={{
                  padding: "12px 16px",
                  borderLeft: i === 0 ? `3px solid ${step.color}` : "1px solid var(--border-subtle)",
                  background: "var(--bg-panel)",
                  borderRadius: 6,
                  minWidth: 0,
                }}
              >
                <div style={{ fontSize: "0.8rem", fontWeight: 600, color: step.color, marginBottom: 4 }}>
                  {step.label}
                </div>
                <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", lineHeight: 1.4 }}>
                  {step.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ padding: "60px 40px", maxWidth: 880, margin: "0 auto", width: "100%" }}>
        <div style={{ fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 32 }}>
          Core Features
        </div>
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12,
        }}>
          {FEATURES.map((f) => (
            <div
              key={f.title}
              style={{
                background: "var(--bg-panel)", border: "1px solid var(--border-subtle)",
                borderRadius: 2, padding: "20px",
              }}
            >
              <div className="feature-mark" aria-hidden="true">{f.mark}</div>
              <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>
                {f.title}
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                {f.desc}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* STATS BAR */}
      <section style={{ background: "var(--bg-panel)", borderTop: "1px solid var(--border-subtle)", borderBottom: "1px solid var(--border-subtle)", padding: "32px 40px" }}>
        <div style={{ maxWidth: 880, margin: "0 auto", display: "flex", justifyContent: "space-around", textAlign: "center", gap: 24, flexWrap: "wrap" }}>
          {[
            { num: "137", label: "Product Grades" },
            { num: "25", label: "Compatibility Groups" },
            { num: "19", label: "Equipment Units" },
            { num: "625", label: "Compatibility Pairs" },
            { num: "4", label: "Pipeline Stages" },
          ].map((s) => (
            <div key={s.label}>
              <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--accent)", letterSpacing: 0 }}>{s.num}</div>
              <div style={{ fontSize: "0.65rem", color: "var(--text-dim)", marginTop: 4, letterSpacing: "0.06em", textTransform: "uppercase" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ padding: "60px 40px", maxWidth: 880, margin: "0 auto", width: "100%" }}>
        <div style={{ fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 32 }}>
          How It Works
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {[
            ["01", "Select a product grade", "Enter the 4-digit grade code (e.g. 7770 = SERVOGEM EP 2). The system resolves its compatibility group automatically."],
            ["02", "Review equipment recommendations", "Available equipment is scored for compatibility with the previous batch group. ★ REC equipment needs no cleaning."],
            ["03", "Confirm route & start batch", "Select one unit per stage, confirm the route preview, and start the batch. Equipment locks immediately."],
            ["04", "Advance stages & complete", "Each stage advance is operator-confirmed. Equipment status updates in real time across all connected sessions."],
          ].map(([num, title, desc]) => (
            <div
              key={num}
              style={{
                display: "flex", gap: 24, padding: "20px 0",
                borderBottom: "1px solid var(--border-subtle)",
              }}
            >
              <div style={{ fontSize: "1.4rem", color: "var(--border-subtle)", fontWeight: 700, minWidth: 40 }}>{num}</div>
              <div>
                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>{title}</div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{
        background: "linear-gradient(to right, rgba(59,130,246,0.08), rgba(22,163,74,0.06))",
        borderTop: "1px solid var(--border-subtle)", padding: "60px 40px", textAlign: "center",
      }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 12, letterSpacing: 0 }}>
            Ready to optimise your production routing?
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: 28, lineHeight: 1.6 }}>
            Sign in with your Google account or create an account with email and password.
            The plant database auto-seeds on first login.
          </div>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button className="btn btn-confirm" style={{ fontSize: "0.85rem", padding: "10px 28px" }} onClick={() => setAuthMode("signup")}>
              Create Account
            </button>
            <button className="btn btn-outline" style={{ fontSize: "0.85rem", padding: "10px 28px" }} onClick={() => setAuthMode("signin")}>
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        background: "var(--bg-panel)", borderTop: "1px solid var(--border-subtle)",
        padding: "20px 40px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap",
      }}>
        <div style={{ fontSize: "0.62rem", color: "var(--text-dim)" }}>
          Grease Plant Routing System · IOCL Vashi LBP
        </div>
        <div style={{ fontSize: "0.6rem", color: "var(--text-dim)" }}>
          React · Convex · Firebase · NVIDIA Gemma 4 · Vercel
        </div>
      </footer>

      {authMode && <AuthPanel mode={authMode} onClose={() => setAuthMode(null)} />}
    </div>
  );
}
