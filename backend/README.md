# Backend — Caregiver Sepsis Prevention Platform

The backend is an Express + Prisma + PostgreSQL API. Conversational decisions are made by the private Render agent in `agent/`, which reads the skill corpus in `skills/` and calls OpenRouter. The browser only calls this API; it never receives either the OpenRouter key or the shared agent secret.

## Local setup

```bash
cp .env.example .env
# Configure DATABASE_URL, JWT_SECRET, AGENT_BASE_URL, and AGENT_SHARED_SECRET.
npm install
npx prisma migrate dev
npm run dev
```

Run the agent in a second terminal:

```bash
cd agent
cp .env.example .env
npm install
npm start
```

Set the same `AGENT_SHARED_SECRET` for the backend and agent. Add `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` only to the agent environment. Select a model with a context window large enough for the applicable skills, patient history, and response. Microlearning source retrieval also requires model tool-calling support. Health endpoints are `GET /health` on each service.

## Agent architecture

- `agent/server.js` hosts the Render agent endpoint and loads the skill corpus from `../skills`.
- Identity and boundary files are always included. Each mode selects its applicable workflows and examples; onboarding and care planning receive the full prognosis-vector set, with additional vectors added when the conversation calls for them. Across the modes, every workflow in the skills corpus has a route into the agent context.
- `src/services/agentClient.service.js` calls the agent over the private shared-secret connection and validates its structured response.
- `src/modules/discovery/` stores adaptive onboarding conversations and screening facts extracted by the agent. The agent selects the next question and completion point; the backend controls access, persistence, and deterministic risk calculations.
- `src/modules/care-workspace/` stores agent memory, care-plan revisions, caregiver check-ins, and flags for clinician review.
- Safety Query and microlearning generation also use the skills agent. Risk levels remain deterministic; missing screening facts are shown as `unknown` rather than silently treated as low.

## Render deployment

Deploy the existing API from the `backend` directory as before, with database and authentication configuration. Apply migrations with `npx prisma migrate deploy`.

Create a second Web Service from the same repository for the agent. Leave Render's **Root Directory** blank so the service can access the skill folder. Use:

- Build: `npm install --prefix backend/agent`
- Start: `npm start --prefix backend/agent`
- Health check: `/health`

Agent environment variables: `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, and `AGENT_SHARED_SECRET`. Backend environment variables: `AGENT_BASE_URL` and the identical `AGENT_SHARED_SECRET`. Keep the OpenRouter key on the agent service only.

See the repository README for the full deployment and frontend setup.
