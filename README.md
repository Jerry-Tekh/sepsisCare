# Caregiver Sepsis Prevention Platform

AI-Powered Caregiver Support System for Early Risk Detection and Sepsis Prevention — Final Year Project MVP.

This system helps caregivers and community health workers uncover hidden patient risks (infection, sepsis, pressure injury, environmental, caregiver burden) through a conversational, clinically-controlled onboarding flow. **It does not diagnose disease and does not replace clinicians.**

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite + React Router + Axios + CSS Modules |
| Backend | Node.js + Express 5 |
| Database | PostgreSQL + Prisma ORM 7 |
| Auth | JWT stored in **httpOnly cookie** + bcrypt |
| Validation | Zod 4 |
| AI | Gemini API (Gemini 3.8 Flash, structured JSON output) |
| Security | Helmet, cookie-parser, express-rate-limit, compression, CORS credentials |

---

## Prerequisites

- Node.js 20 LTS or newer
- PostgreSQL 14+ running locally or accessible via connection string
- A Gemini API key from Google AI Studio

---

## Local Development Setup

### 1. Backend

```bash
cd backend
cp .env.example .env
# Fill in: DATABASE_URL, JWT_SECRET, GEMINI_API_KEY

npm install
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

Backend runs on `http://localhost:5000`.
Health check: `GET /health`

### 2. Frontend

```bash
cd frontend
cp .env.example .env
# Set VITE_API_BASE_URL if your backend isn't on localhost:5000

npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

---

## Security Model — httpOnly Cookie Authentication

The JWT is **never sent in a response body** and **never stored in localStorage or a JavaScript variable**. It lives exclusively in an `httpOnly` cookie set by the server on login/register.

This means:
- JavaScript on the client (including browser extensions and injected scripts) **cannot read the token at all**
- XSS attacks that steal `localStorage` tokens are not effective against this app
- The browser attaches the cookie automatically on every request to the backend — no manual Authorization header needed

### Cookie flags

| Flag | Development | Production | Why |
|---|---|---|---|
| `HttpOnly` | ✅ | ✅ | Blocks all JavaScript access |
| `Secure` | ❌ | ✅ | HTTPS only — not set for HTTP localhost |
| `SameSite` | `Lax` | `None` | `None` supports cross-domain deploys (Vercel + Railway); `Lax` for localhost |
| `Path` | `/` | `/` | Cookie sent on all backend routes |
| `Max-Age` | Matches JWT_EXPIRES_IN | Matches JWT_EXPIRES_IN | Cookie and JWT expire together |

### Session restore flow

On every page load, the frontend calls `GET /api/auth/me` with the cookie attached. If the cookie is valid, the server returns the current user. If missing or expired, it returns 401 and the app redirects to `/login`. The client never inspects or decodes the cookie itself — it cannot.

### CSRF protection

CORS is configured with `credentials: true` and an explicit allowed origin. All state-changing API calls use `Content-Type: application/json`, which triggers a browser CORS preflight. Requests from any origin other than `CORS_ORIGIN` are rejected before the preflight completes, making CSRF impossible for JSON API calls.

---

## MVP Walkthrough

1. Register a caregiver account → log in.
2. Create Patient A → start onboarding → answer AI-generated questions.
3. Onboarding completes when all activated clinical pathways are satisfied → Risk Profile generated automatically.
4. Create Patient B → fully separate conversation, pathways, and risk profile.
5. View risk profiles and conversation history from each patient's page; see aggregate stats on the dashboard.
6. Open a patient's **Monitoring** tab → record vital signs and complete the daily check-in. Each entry is screened as Normal / Watch / Urgent, trends are charted, and recent Watch/Urgent entries appear under "Needs attention" on the dashboard.

### Monitoring alert thresholds (clinical sign-off required)

Alert levels are computed server-side in `backend/src/modules/monitoring/monitoring.rules.js`, adapted from NEWS2 bands, qSOFA and public sepsis red-flag guidance. They are conservative screening thresholds for adult patients — **not** diagnostic rules — and must be reviewed by a clinical advisor before real-world use. Oxygen thresholds do not suit patients with chronic lung disease who have a lower clinician-set target.

---

## Production Deployment

### Backend

```bash
# Set all required env vars on your hosting platform first, then:
npx prisma migrate deploy   # NOT migrate dev (dev is interactive/local only)
npx prisma db seed
npm start                   # node src/server.js — no file watching
```

Point your platform's health check at `GET /health`.

The app trusts the first proxy hop (`trust proxy 1`) for correct client IPs behind a load balancer — standard on Render, Railway, Heroku, Nginx, AWS ALB. Adjust if you have multiple chained proxies.

TLS/HTTPS termination happens at the hosting platform or reverse proxy — the app does not terminate TLS itself, but the `Secure` cookie flag ensures tokens are only sent over HTTPS in production.

### Frontend

`VITE_API_BASE_URL` is baked into the JS bundle at **build time**, not read at runtime. Set it **before** running `npm run build`.

```bash
# In your CI/CD or hosting platform:
VITE_API_BASE_URL=https://your-backend.com/api npm run build
```

Deploy `frontend/dist/` to any static host (Vercel, Netlify, Cloudflare Pages, S3+CloudFront). The included `public/_redirects` (Netlify) and `vercel.json` handle SPA client-side routing so page refreshes work.

**IMPORTANT:** Make sure the backend's `CORS_ORIGIN` exactly matches the deployed frontend's URL, including `https://` and no trailing slash. Without this, the browser will block the credentialed request and the cookie will never be sent.

---

## Environment Variables

### Backend

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string. e.g. `postgresql://user:pass@host:5432/db?schema=public`. Add `?sslmode=require` for most cloud providers. |
| `JWT_SECRET` | ✅ | Long random string. Generate: `openssl rand -base64 48`. **Never reuse the example value.** Rotating this invalidates all active sessions. |
| `GEMINI_API_KEY` | ✅ | Your Gemini API key from Google AI Studio. This app makes 2–3 API calls per onboarding answer. |
| `CORS_ORIGIN` | ✅ | Exact frontend URL, e.g. `https://your-app.com`. No trailing slash. Must match exactly or the browser will block credentialed requests. |
| `NODE_ENV` | ✅ | Set to `production` in production. Controls `Secure` and `SameSite` cookie flags, Prisma log level, and error verbosity. |
| `JWT_EXPIRES_IN` | Optional | Token lifetime. Default: `2h`. Accepts `30m`, `8h`, `7d`, etc. Cookie `Max-Age` is derived automatically. |
| `GEMINI_MODEL` | Optional | Default: `gemini-3.8-flash`. Check `ai.google.dev/gemini-api/docs/models` for current model availability. |
| `PORT` | Optional | Default: `5000`. Most platforms inject this automatically. |

### Frontend (set before `npm run build`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_BASE_URL` | ✅ | Full URL of the backend API, e.g. `https://api.your-app.com/api`. Baked into the bundle at build time — changing it requires a rebuild. |

---

## Responsive Design

The UI is fully responsive across all screen sizes:

| Breakpoint | Behaviour |
|---|---|
| Desktop (> 768px) | Full 3-column stats grid, horizontal navbar with username |
| Tablet (≤ 768px) | 2-column stats grid, condensed navbar |
| Mobile (≤ 640px) | Hamburger menu, 1-column layouts, full-width buttons, chat fills viewport height |
| Small phones (≤ 480px) | Single-column stats, stacked patient actions, reduced padding |

iOS-specific fixes:
- All inputs use `font-size: 16px` to prevent Safari auto-zoom on focus
- `-webkit-overflow-scrolling: touch` on scrollable containers (chat transcript, conversation history)
- `-webkit-tap-highlight-color: transparent` on buttons
- `-webkit-text-size-adjust: 100%` in the root to prevent font inflation

---

## Safety Note

This tool is a screening aid for caregivers and community health workers. It surfaces risk signals and referral suggestions; it does not provide a diagnosis and is not a substitute for professional medical evaluation. Any "high" risk or referral-recommended result should prompt contacting a clinician or health facility.
