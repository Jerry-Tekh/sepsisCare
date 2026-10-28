# Caregiver Sepsis Prevention Platform

AI-Powered Caregiver Support System for Early Risk Detection and Sepsis Prevention — Final Year Project MVP.

This system helps caregivers and community health workers uncover hidden patient risks (infection, sepsis, pressure injury, environmental, caregiver burden) through a conversational, clinically-controlled onboarding flow. It also provides a shared library of organization-published learning guides and verified web sources. **It does not diagnose disease and does not replace clinicians.**

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite + React Router + Axios + CSS Modules |
| Backend | Node.js + Express 5 |
| Database | PostgreSQL + Prisma ORM 7 |
| Auth | JWT stored in **httpOnly cookie** + bcrypt |
| Validation | Zod 4 |
| AI | OpenRouter model API behind a private Render-hosted skills agent |
| Security | Helmet, cookie-parser, express-rate-limit, compression, CORS credentials |

---

## Prerequisites

- Node.js 20 LTS or newer
- PostgreSQL 14+ running locally or accessible via connection string
- An OpenRouter API key and a Render service for the agent

---

## Local Development Setup

### 1. Backend

```bash
cd backend
cp .env.example .env
# Fill in: DATABASE_URL, JWT_SECRET, AGENT_BASE_URL, AGENT_SHARED_SECRET

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
# To use the shared Render backend from your local frontend, set:
# VITE_API_BASE_URL=https://sepsiscarebackend.onrender.com/api

npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

For local testing against the shared backend, put `VITE_API_BASE_URL=https://sepsiscarebackend.onrender.com/api` in `frontend/.env` and restart the Vite dev server. The hosted backend must also allow `http://localhost:5173` in its `CORS_ORIGIN` setting for browser requests to work.

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
2. Create Patient A → start skill-led onboarding → the Render agent chooses a gentle next question from the conversation and patient record.
3. When the agent completes the onboarding round, the backend builds a deterministic Risk Profile; unanswered risk fields remain `unknown`.
4. Caregivers can browse published organization learning guides; patient-specific Microlearning remains a separate feature.
5. Create Patient B → separate agent memory, conversations, care plans, and risk profile. Review onboarding, safety conversations, clinician flags, and versioned care plans from the patient profile.

### Roles and organization learning guides

Registration creates a `CAREGIVER` account by default. Both roles use the same login route; after login, the app routes each user to the dashboard allowed by their signed-in role. Only an `ORGANIZATION_ADMIN` can manage that organization's shared guides and web sources. Caregivers can search and read published guides, while patient-specific Microlearning remains separate and continues to generate patient-specific content and PDFs.

To provision the first organization admin, first apply database migrations and configure persistent S3-compatible storage (AWS S3 or a compatible provider) using `OBJECT_STORAGE_BUCKET`, `OBJECT_STORAGE_REGION`, `OBJECT_STORAGE_ACCESS_KEY_ID`, and `OBJECT_STORAGE_SECRET_ACCESS_KEY`. For a compatible service, also set `OBJECT_STORAGE_ENDPOINT`. Then run from `backend/` with these values set in the shell or deployment environment:

```bash
ORG_NAME="Example Health Organization" \
ORG_ADMIN_NAME="Organization Admin" \
ORG_ADMIN_EMAIL="admin@example.org" \
ORG_ADMIN_PASSWORD="use-a-unique-password" \
npm run admin:create
```

The command creates the organization and admin, or promotes and updates the account with the supplied email. Use a unique initial password and have the admin change it after signing in. The admin dashboard can upload PDF guides (up to 15 MB), add free-text vectors/details/tags, and associate HTTPS sources. Newly added sources are pending until approved. Only published guides and approved associated sources appear to caregivers or are eligible as context for Microlearning. Private uploaded PDFs are stored in the configured bucket and served through short-lived signed links; keep bucket access private and enable encryption at rest in the storage provider.

Apply the new migration with `npx prisma migrate deploy` in production or `npx prisma migrate dev` locally. Existing accounts receive the caregiver role by default. If promoting an existing account, have it sign in again so its session receives the updated role.

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

### Render-hosted skills agent

Create a second Render Web Service from this same repository. Leave **Root Directory** blank so the service can read `backend/skills`. Set its build command to `npm install --prefix backend/agent` and start command to `npm start --prefix backend/agent`. Set `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, and `AGENT_SHARED_SECRET` in the agent service. Set `AGENT_BASE_URL` and the same `AGENT_SHARED_SECRET` in the existing backend service. Keep the OpenRouter key only on the agent service. The agent's `/health` endpoint is its health check.

Before deploying the backend release, apply the new schema migration with `npx prisma migrate deploy` from `backend/`. The migration adds healthcare-seeking event records, including separate warning-sign recognition, facility-arrival, and app-entry timestamps. Patient profiles calculate elapsed time to arrival and a median across that patient's completed episodes. This is a monitoring measure; it must never delay urgent care.

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
| `AGENT_BASE_URL` | ✅ | HTTPS base URL of the separate Render agent service. |
| `AGENT_SHARED_SECRET` | ✅ | Long random shared secret configured identically on backend and agent services. |
| `CORS_ORIGIN` | ✅ | Exact frontend URL, e.g. `https://your-app.com`. No trailing slash. Must match exactly or the browser will block credentialed requests. |
| `NODE_ENV` | ✅ | Set to `production` in production. Controls `Secure` and `SameSite` cookie flags, Prisma log level, and error verbosity. |
| `JWT_EXPIRES_IN` | Optional | Token lifetime. Default: `2h`. Accepts `30m`, `8h`, `7d`, etc. Cookie `Max-Age` is derived automatically. |
| `PORT` | Optional | Default: `5000`. Most platforms inject this automatically. |
| `OBJECT_STORAGE_BUCKET` | Required for guide PDFs | Private bucket name for uploaded PDFs. |
| `OBJECT_STORAGE_REGION` | Optional | Storage region; defaults to `auto` for S3-compatible services. |
| `OBJECT_STORAGE_ENDPOINT` | Optional | S3-compatible service endpoint, such as an account-specific endpoint. |
| `OBJECT_STORAGE_ACCESS_KEY_ID` / `OBJECT_STORAGE_SECRET_ACCESS_KEY` | Required for uploads | Private credentials scoped to the guide bucket. |

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
