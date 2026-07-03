# Backend — Caregiver Sepsis Prevention Platform

Express + Prisma + PostgreSQL API implementing the Hybrid Clinical Discovery Engine.

## Setup

```bash
cp .env.example .env   # fill in DATABASE_URL, JWT_SECRET, OPENAI_API_KEY
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
- `src/modules/discovery/openai/` — the OpenAI Conversation Engine (Layer 2). Sole owner of the OpenAI SDK; only ever phrases questions and interprets answers for the pathway/objective the rules engine dictates. Never chooses what to ask. `temperature` is intentionally not set on any call — current-generation reasoning-tier models (GPT-5 family) reject non-default temperature values on `/v1/chat/completions`, and Structured Outputs already guarantees schema-correct responses regardless of temperature.
- `src/modules/risk/` — the Risk Assessment Engine (Layer 3). Risk *levels* are computed deterministically from rule thresholds in `risk.service.js`; OpenAI is only used to write the narrative `summary` text.
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
3. Add fallback questions for its objectives in `openai.service.js`'s `FALLBACK_QUESTIONS` map (used only if OpenAI is unreachable).
4. Re-run `npx prisma db seed` to register it in the `ClinicalPathway` table.

No other code changes are required — the engine is fully data-driven.

## Risk Scoring Thresholds (flagged for clinical review)

The thresholds in `risk.service.js` (e.g. "2+ sepsis red flags = high risk") are MVP defaults chosen for a Final Year Project demo, not a validated clinical instrument. Before any real-world deployment, these should be reviewed and adjusted with a clinical advisor.

## OpenAI Model

Defaults to `gpt-5.4-mini` (current low-latency, cost-efficient model as of mid-2026, supports Chat Completions + Structured Outputs). Override via the `OPENAI_MODEL` env var. Check `platform.openai.com/docs/models` periodically — OpenAI deprecates and replaces "mini"-tier models on a rolling basis, and this app's reliance on Structured Outputs means any replacement model needs to support `response_format: json_schema` on the Chat Completions endpoint.
