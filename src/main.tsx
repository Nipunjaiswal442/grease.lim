import React from "react";
import ReactDOM from "react-dom/client";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithAuth } from "convex/react";
import { useAuth as useFirebaseAuth } from "./hooks/useAuth";
import App from "./App";
import "./index.css";

// Fall back to a non-throwing URL if VITE_CONVEX_URL is missing from env vars.
// The app still mounts and shows the landing page for unauthenticated users;
// Convex queries only run after the user signs in.
const convexUrl =
  (import.meta.env.VITE_CONVEX_URL as string | undefined) ||
  "http://localhost:3210";

const convex = new ConvexReactClient(convexUrl);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConvexProviderWithAuth client={convex} useAuth={useFirebaseAuth}>
      <App />
    </ConvexProviderWithAuth>
  </React.StrictMode>
);
