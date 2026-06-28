import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { ConvexReactClient, ConvexProviderWithAuth } from "convex/react";
import { useAuth as useFirebaseAuth } from "./hooks/useAuth";
import { auth, completeGoogleRedirectSignIn } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import App from "./App";
import LandingPage from "./components/LandingPage";
import "./index.css";

// Build Convex client at module level — null if URL is missing or invalid.
// ConvexProviderWithAuth is only mounted when convex != null AND user is signed in,
// so a missing/wrong VITE_CONVEX_URL never prevents the landing page from rendering.
let convex: ConvexReactClient | null = null;
const rawConvexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;
if (rawConvexUrl) {
  try {
    convex = new ConvexReactClient(rawConvexUrl);
  } catch (e) {
    console.error("[Convex] Failed to create client:", e);
  }
}

export function Root() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Firebase resolves from local cache in ~100ms — no network needed for this step.
    // Wrap in try/catch in case firebase.ts fails due to missing env vars.
    let unsub: (() => void) | undefined;
    try {
      if (!auth) {
        setLoading(false);
      } else {
        completeGoogleRedirectSignIn()
          .then((redirectUser) => {
            if (redirectUser) setUser(redirectUser);
          })
          .catch((e) => console.error("[Firebase] Google redirect sign-in failed:", e));
        unsub = onAuthStateChanged(auth, (u) => {
          setUser(u);
          setLoading(false);
        });
      }
    } catch (e) {
      console.error("[Firebase] onAuthStateChanged failed:", e);
      setLoading(false);
    }
    // Safety timeout: if Firebase never calls back (e.g. SDK not configured),
    // unblock after 4 s so users can still see the landing page.
    const timer = setTimeout(() => setLoading(false), 4000);
    return () => {
      unsub?.();
      clearTimeout(timer);
    };
  }, []);

  if (loading) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100vh", background: "var(--bg-base)",
      }}>
        <div style={{
          color: "var(--text-secondary)", fontSize: "0.7rem",
          letterSpacing: "0.1em", textTransform: "uppercase",
        }}>
          Initialising...
        </div>
      </div>
    );
  }

  // Unauthenticated OR no Convex URL → show landing page (requires no backend)
  if (!user || !convex) {
    return <LandingPage />;
  }

  // Authenticated + Convex configured → full plant app
  return (
    <ConvexProviderWithAuth client={convex} useAuth={useFirebaseAuth}>
      <App user={user} />
    </ConvexProviderWithAuth>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
