# Frontend — Caregiver Sepsis Prevention Platform

React + Vite client for the caregiver onboarding and risk dashboard experience.

## Setup

```bash
cp .env.example .env   # set VITE_API_BASE_URL if backend isn't on localhost:5000
npm install
npm run dev
```

Runs on `http://localhost:5173`.

## Structure

- `src/api/` — one file per backend module, all routed through `axiosClient.js` (which attaches the JWT and redirects to `/login` on 401).
- `src/context/AuthContext.jsx` — holds the logged-in user/token in memory + localStorage; exposes `login`, `register`, `logout`.
- `src/components/common/` — shared building blocks (Button, Input, Card, Badge, Spinner, AppLayout), styled with CSS Modules, no UI framework.
- `src/components/discovery/` — the chat experience: `ChatWindow` (message list + input, auto-scroll), `MessageBubble`, `TypingIndicator`.
- `src/pages/` — one folder per feature area, mirroring the backend modules.

## Onboarding Chat Flow

`pages/discovery/DiscoverySession.jsx` either resumes an active session (passed via router state from the patient profile page, or looked up via `GET /patients/:id/onboarding/active`) or shows an error if none exists. Each caregiver answer is sent to `POST /onboarding/:sessionId/answer`; the response is either the next AI-generated question or a `COMPLETED` status, at which point the page redirects to the patient profile to show the freshly generated risk profile.
