import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const PUBLIC_PATHS = ["/login", "/register"];

const axiosClient = axios.create({
  baseURL,
  // withCredentials:true tells the browser to include the httpOnly cookie on
  // every request, even for cross-origin requests (e.g. frontend on
  // app.vercel.app, backend on api.railway.app). The server's CORS config
  // must have credentials:true and an explicit origin (not "*") for this to work.
  withCredentials: true,
});

// No auth header needed — the browser attaches the httpOnly cookie
// automatically. We never touch localStorage for the token.

// ── Slow-request tracking ─────────────────────────────────────
// The hosted backend sleeps when idle and can take up to a minute to wake.
// If ordinary requests are still pending after SLOW_AFTER_MS, subscribers
// (the ServerStatusBanner) are told so they can reassure the user.
// Requests that are expected to be slow (AI generation) pass
// `{ slowNotice: false }` in their config to opt out.
const SLOW_AFTER_MS = 4000;
let pendingTracked = 0;
let slowTimer = null;
let isSlow = false;
const slowListeners = new Set();

function setSlow(value) {
  if (isSlow === value) return;
  isSlow = value;
  slowListeners.forEach((listener) => listener(value));
}

/** Subscribe to slow-server changes. Returns an unsubscribe function. */
export function onSlowServerChange(listener) {
  slowListeners.add(listener);
  listener(isSlow);
  return () => slowListeners.delete(listener);
}

function trackStart(config) {
  if (config.slowNotice === false) return config;
  config._tracked = true;
  pendingTracked += 1;
  if (pendingTracked === 1) slowTimer = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
  return config;
}

function trackEnd(config) {
  if (!config?._tracked) return;
  pendingTracked = Math.max(0, pendingTracked - 1);
  if (pendingTracked === 0) {
    clearTimeout(slowTimer);
    setSlow(false);
  }
}

axiosClient.interceptors.request.use(trackStart);

axiosClient.interceptors.response.use(
  (response) => {
    trackEnd(response.config);
    return response;
  },
  (error) => {
    trackEnd(error.config);
    if (error.response && error.response.status === 401) {
      // Token missing, expired, or invalid. Clear stored user info and
      // redirect to login. The httpOnly cookie is cleared server-side by
      // the /api/auth/logout endpoint — on a 401 the expired/missing cookie
      // will simply not be re-sent, so no explicit cookie deletion needed here.
      //
      // Skip the redirect on public pages: the session check (/auth/me) runs
      // on every load and 401s when logged out, which would otherwise bounce
      // a visitor from /register to /login.
      localStorage.removeItem("user");
      if (!PUBLIC_PATHS.includes(window.location.pathname)) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
