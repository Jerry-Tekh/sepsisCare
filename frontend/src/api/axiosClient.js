import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const axiosClient = axios.create({
  baseURL,
  // withCredentials:true tells the browser to include the httpOnly cookie on
  // every request, even for cross-origin requests (e.g. frontend on
  // app.vercel.app, backend on api.railway.app). The server's CORS config
  // must have credentials:true and an explicit origin (not "*") for this to work.
  withCredentials: true,
});

// No request interceptor needed — the browser attaches the httpOnly cookie
// automatically. We never touch localStorage for the token.

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token missing, expired, or invalid. Clear stored user info and
      // redirect to login. The httpOnly cookie is cleared server-side by
      // the /api/auth/logout endpoint — on a 401 the expired/missing cookie
      // will simply not be re-sent, so no explicit cookie deletion needed here.
      localStorage.removeItem("user");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
