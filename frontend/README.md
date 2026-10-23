# Frontend — Caregiver Sepsis Prevention Platform

React + Vite client for the caregiver onboarding and risk dashboard experience.

## Setup

```bash
cp .env.example .env
# To use the shared Render backend from your local frontend, set:
# VITE_API_BASE_URL=https://sepsiscarebackend.onrender.com/api
npm install
npm run dev
```

Runs on `http://localhost:5173`.

For local testing against the shared backend, set `VITE_API_BASE_URL=https://sepsiscarebackend.onrender.com/api` in `.env`, then restart the Vite dev server. The hosted backend must allow `http://localhost:5173` in its `CORS_ORIGIN` setting for browser requests to work.

## Structure

- `src/api/` — one file per backend module, all routed through `axiosClient.js` (which attaches the JWT and redirects to `/login` on 401).
- `src/context/AuthContext.jsx` — holds the logged-in user/token in memory + localStorage; exposes `login`, `register`, `logout`.
- `src/components/common/` — shared building blocks (Button, Input, Card, Badge, Spinner, AppLayout), styled with CSS Modules, no UI framework.
- `src/components/discovery/` — the chat experience: `ChatWindow` (message list + input, auto-scroll), `MessageBubble`, `TypingIndicator`.
- `src/pages/` — one folder per feature area, mirroring the backend modules.

## Onboarding Chat Flow

`pages/discovery/DiscoverySession.jsx` either resumes an active session (passed via router state from the patient profile page, or looked up via `GET /patients/:id/onboarding/active`) or shows an error if none exists. Each caregiver answer is sent to `POST /onboarding/:sessionId/answer`; the response is either the next AI-generated question or a `COMPLETED` status, at which point the page redirects to the patient profile to show the freshly generated risk profile.
