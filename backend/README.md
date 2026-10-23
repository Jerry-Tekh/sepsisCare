# Backend — Caregiver Sepsis Prevention Platform

Express + Prisma + PostgreSQL API implementing the Hybrid Clinical Discovery Engine.

## Setup

```bash
cp .env.example .env   # fill in DATABASE_URL, JWT_SECRET, GEMINI_API_KEY
npm install
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

Server starts on `http://localhost:5000`. Health check: `GET /health`.

For production deployment steps and the full environment variable reference, see the root `README.md`.

## Architecture Notes

- `src/modules/*` — one folder per feature (auth, patient, discovery, risk, dashboard), each with routes → controller → service.
- `src/modules/discovery/rulesEngine/` — the deterministic Clinical Rules Engine (Layer 1). Pure functions, no I/O. `pathways.config.js` is the single source of truth for pathway objectives; `activationRules.js` is the extendable activation rule list.
- `src/modules/discovery/gemini/` — the Gemini Conversation Engine (Layer 2). Sole owner of the Gemini SDK; it phrases questions and interprets answers only for the pathway/objective dictated by the rules engine. Gemini structured JSON output is validated with Zod before use.
- `src/modules/risk/` — the Risk Assessment Engine (Layer 3). Risk *levels* are computed deterministically from rule thresholds in `risk.service.js`; Gemini is only used to write the narrative `summary` text.
- `src/middleware/` — auth (JWT), Zod validation, rate limiting, centralized error handling, request logging.
- `src/errors/AppError.js` — typed errors with HTTP status codes, thrown from services and caught centrally.

## Production Hardening

- `helmet` — standard security response headers.
- `compression` — gzip response compression.
- `express-rate-limit` — 300 req/15min on general API routes, 20 req/15min on `/api/auth/*` specifically.
- `app.set('trust proxy', 1)` — correct client IP detection behind a reverse proxy/load balancer.
- Graceful shutdown + `unhandledRejection`/`uncaughtException` handlers in `server.js`.

## Re-onboarding behavior

Starting a new onboarding session for a patient who already completed a previous round clears that patient's `PatientPathway` progress (but not their conversation history or past risk profiles) so the new session asks every question fresh, rather than silently treating stale answers from the prior round as still valid.

## Adding a new clinical pathway

1. Add an entry to `pathways.config.js` with `description` and `objectives`.
2. Add any activation rule(s) to `activationRules.js` that should trigger it.
3. Add fallback questions for its objectives in `gemini.service.js`'s `FALLBACK_QUESTIONS` map (used only if Gemini is unreachable).
4. Re-run `npx prisma db seed` to register it in the `ClinicalPathway` table.

No other code changes are required — the engine is fully data-driven.

## Risk Scoring Thresholds (flagged for clinical review)

The thresholds in `risk.service.js` (e.g. "2+ sepsis red flags = high risk") are MVP defaults chosen for a Final Year Project demo, not a validated clinical instrument. Before any real-world deployment, these should be reviewed and adjusted with a clinical advisor.

## Gemini Model

Defaults to `gemini-2.5-pro`. Override with the `GEMINI_MODEL` environment variable. Check the [Gemini model list](https://ai.google.dev/gemini-api/docs/models) for availability. Structured JSON responses are validated by the app with Zod.
