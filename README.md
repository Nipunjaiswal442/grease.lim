# Grease Plant Routing System

Production control console for **IOCL Vashi LBP** — routes grease batches through shared plant equipment with real-time compatibility checking, batch tracking, and an AI assistant.

**Live:** [grease-lim.vercel.app](https://grease-lim.vercel.app)

---

## What it does

Grease manufacturing uses shared equipment across many product grades. Running an incompatible grade through the same kettle or homogeniser without cleaning causes product contamination. This system solves that by:

1. Looking up the compatibility group of the entered product grade
2. Scoring every piece of equipment based on its last batch group
3. Recommending equipment that needs no cleaning (safe changeover)
4. Flagging equipment that needs cleaning or a dye flush before use
5. Tracking each batch through its 4-stage pipeline in real time

---

## Features

| Feature | Description |
|---|---|
| **Routing Console** | Enter a 4-digit product code → instant equipment recommendations with ★ REC / clean-required / incompatible labels |
| **Plant Status** | Live view of all 19 equipment units — status, current batch, stage, last group |
| **Batch Log** | Full history of every production run with per-stage advance controls |
| **Compatibility Matrix** | 25×25 visual reference of all group-to-group compatibility pairs |
| **AI Assistant** | NVIDIA Gemma 4 (diffusiongemma-26b) with extended thinking — answers routing, compatibility and cleaning questions |
| **Email + Google Auth** | Firebase Authentication with Google OAuth and email/password sign-in |

---

## Product data

- **137 product grades** across **25 compatibility groups** (G01–G25)
- Groups defined by thickener type: Aluminium Complex, Calcium, Calcium Sulphonate, Lithium Complex, Clay, Lithium 12-OH, Sodium, Silica
- **625 compatibility pairs** derived from 8×8 thickener compatibility table
- Relations: `SAME` · `COMPATIBLE` · `BORDERLINE` · `INCOMPATIBLE`

## Equipment registry

| Type | Units | Notes |
|---|---|---|
| Reactor | 2 | R-101, R-102 |
| Kettle | 7 | K-101 – K-107 (K-104 starts out-of-order) |
| Homogeniser | 5 | H-101 – H-105 |
| Filling Point | 5 | F-101 – F-105 |

**Equipment statuses:** `AVAILABLE` · `BUSY` · `SCHEDULED` · `NEEDS_CLEAN` · `DYE_FLUSH_REQUIRED` · `OUT_OF_ORDER`

**Dye flush rule:** kettle, homogeniser, and filling point are marked `DYE_FLUSH_REQUIRED` after any batch that contains a dye/coloured product.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite 8 + TypeScript |
| Backend / DB | [Convex](https://convex.dev) — real-time queries and mutations |
| Authentication | Firebase Auth (Google OAuth + email/password) |
| AI | NVIDIA NIM API — `google/diffusiongemma-26b-a4b-it` with SSE streaming |
| Deployment | Vercel (SPA rewrite + security headers) |
| Font | JetBrains Mono |

---

## Architecture

```
Browser
  └── React SPA (Vite build)
        ├── Firebase Auth  ←→  Google / Email sign-in
        ├── Convex client  ←→  Convex cloud (real-time WebSocket)
        │     ├── /convex/schema.ts       — 6 tables: groups, grades, compatibility,
        │     │                             equipment, batches, seedState
        │     ├── /convex/seed.ts         — one-time data seed on first login
        │     ├── /convex/routing.ts      — compatibility resolver query
        │     ├── /convex/batches.ts      — batch lifecycle mutations
        │     └── /convex/auth.config.ts  — Firebase JWT provider config
        └── NVIDIA NIM API  ←→  Gemma 4 AI (SSE streaming, <think> parsing)
```

**Auth flow:**
1. User signs in → Firebase issues a JWT
2. `ConvexProviderWithAuth` exchanges the JWT with Convex on every request
3. Convex validates the token against the Firebase project
4. Real-time subscriptions activate for the authenticated user

**Batch ID format:** `MMDDIV` + 8-char uppercase hex — e.g. `0627IV5DA55AE1`

---

## Local development

### Prerequisites

- Node.js 18+
- A [Firebase project](https://console.firebase.google.com) with Google and Email/Password auth enabled
- A [Convex account](https://convex.dev)

### Setup

```bash
# 1. Clone
git clone https://github.com/Nipunjaiswal442/grease.lim.git
cd grease.lim

# 2. Install dependencies
npm install

# 3. Copy env template and fill in values
cp .env.example .env.local
# Edit .env.local with your Firebase config and Convex URL

# 4. Start Convex local backend (terminal 1)
npx convex dev

# 5. Start Vite dev server (terminal 2)
npm run dev
```

Open `http://localhost:5173`.

The database seeds automatically on first login — 25 groups, 137 grades, 19 equipment units, 625 compatibility pairs.

### Environment variables

All required variables are documented in [`.env.example`](.env.example):

```
VITE_CONVEX_URL=                   # from `npx convex dev` or `npx convex deploy`

VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

VITE_NVIDIA_API_KEY=               # from build.nvidia.com
```

---

## Production deployment

### 1. Deploy Convex backend

```bash
npx convex login       # one-time browser auth
npx convex deploy      # pushes functions + outputs your cloud URL
```

The Firebase project ID is hardcoded in `convex/auth.config.ts` — no extra env vars needed in the Convex dashboard.

### 2. Deploy to Vercel

1. Import the GitHub repo in [Vercel](https://vercel.com/new)
2. Add all `VITE_*` environment variables from the list above
3. Build command: `npm run build` · Output directory: `dist`
4. Deploy

### 3. Firebase authorised domains

Firebase Console → Authentication → Settings → Authorised domains → add your `.vercel.app` domain.

### Security headers

Configured in [`vercel.json`](vercel.json):

- `Content-Security-Policy` — restricts script, style, connect, and frame sources
- `X-Frame-Options: DENY` — clickjacking protection
- `X-Content-Type-Options: nosniff`
- `Strict-Transport-Security` — HSTS (1 year)
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` — disables camera, microphone, geolocation

---

## Project structure

```
grease/
├── convex/
│   ├── schema.ts           # DB schema — 6 tables
│   ├── seed.ts             # One-time data seed
│   ├── routing.ts          # Equipment compatibility query
│   ├── batches.ts          # Batch lifecycle mutations
│   └── auth.config.ts      # Firebase JWT auth provider
├── src/
│   ├── main.tsx            # App root — auth gate, Convex provider
│   ├── App.tsx             # Plant console (nav + 4 views)
│   ├── firebase.ts         # Firebase auth helpers
│   ├── index.css           # Dark industrial theme
│   ├── components/
│   │   ├── LandingPage.tsx         # Marketing page + sign-in modal
│   │   ├── RoutingConsole.tsx      # Grade input → equipment routing
│   │   ├── PlantStatus.tsx         # Live equipment grid
│   │   ├── BatchLog.tsx            # Batch history + stage controls
│   │   ├── CompatibilityMatrix.tsx # 25×25 group matrix
│   │   ├── AiAssistant.tsx         # NVIDIA Gemma 4 chat panel
│   │   └── ToastContainer.tsx      # Toast notifications
│   └── hooks/
│       ├── useAuth.ts      # ConvexProviderWithAuth adapter
│       └── useToast.ts     # Toast state
├── data/
│   ├── groups.json         # 25 compatibility groups
│   ├── grades.json         # 137 product grades
│   └── compatibility.json  # 625 compatibility pairs
├── vercel.json             # SPA rewrite + security headers
└── .env.example            # Environment variable template
```

---

## Compatibility logic

Each group maps to a primary thickener type. Compatibility between two groups follows this 8×8 thickener matrix:

| | AlX | Ca | CaS | LiX | Clay | Li12OH | Na | Silica |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **AlX** | — | B | C | B | I | B | I | I |
| **Ca** | B | — | B | B | I | C | C | I |
| **CaS** | C | B | — | B | I | B | I | I |
| **LiX** | B | B | B | — | I | C | B | I |
| **Clay** | I | I | I | I | — | I | I | I |
| **Li12OH** | B | C | B | C | I | — | B | I |
| **Na** | I | C | I | B | I | B | — | I |
| **Silica** | I | I | I | I | I | I | I | — |

`—` Same group &nbsp;·&nbsp; `C` Compatible &nbsp;·&nbsp; `B` Borderline (QC consult) &nbsp;·&nbsp; `I` Incompatible (must clean)

---

## Cleaning rules

| Compatibility | Action required |
|---|---|
| SAME / COMPATIBLE | No cleaning — proceed directly |
| BORDERLINE | Consult QC; kettle wash collected for Servo Grease C or per QC direction |
| INCOMPATIBLE | Kettle must be cleaned before next batch |
| DYE_FLUSH_REQUIRED | Kettle, homogeniser, and filling point flushed after any coloured/dye product before switching to non-dye |

---

## AI assistant

The floating 🤖 button opens a chat panel powered by **NVIDIA NIM** (`google/diffusiongemma-26b-a4b-it`):

- Streamed responses via Server-Sent Events
- Extended thinking enabled — model reasoning shown via 💭 toggle
- Grounded in plant-specific context: compatibility rules, dye handling, borderline decisions, cleaning procedures

---

*IOCL Vashi LBP — Grease Plant Production Control*
