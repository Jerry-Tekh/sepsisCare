const express    = require("express");
const cors       = require("cors");
const helmet     = require("helmet");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const env        = require("./config/env");
const requestLogger = require("./middleware/requestLogger.middleware");
const authMiddleware = require("./middleware/auth.middleware");
const errorMiddleware = require("./middleware/error.middleware");
const { apiLimiter, authLimiter } = require("./middleware/rateLimit.middleware");

const authRoutes      = require("./modules/auth/auth.routes");
const patientRoutes   = require("./modules/patient/patient.routes");
const discoveryRoutes = require("./modules/discovery/discovery.routes");
const dashboardRoutes = require("./modules/dashboard/dashboard.routes");

const app = express();

// Required when running behind a reverse proxy / load balancer (Render,
// Railway, Heroku, Nginx, AWS ALB) so req.ip and rate limiting see the
// real client IP via X-Forwarded-For instead of the proxy's IP.
app.set("trust proxy", 1);

app.use(helmet());
app.use(compression());

// credentials:true is REQUIRED for the browser to include the httpOnly cookie
// on cross-origin requests. The origin must be an explicit value (not "*")
// when credentials are used — the browser enforces this.
app.use(cors({ origin: env.corsOrigin, credentials: true }));

app.use(express.json());
app.use(cookieParser());
app.use(requestLogger);

app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));

// Public auth routes — stricter rate limit, no auth middleware.
// NOTE: /me inside auth.routes.js applies authMiddleware directly on that
// route handler, so it is protected even though the parent mount here has none.
app.use("/api/auth", authLimiter, authRoutes);

// Everything below requires a valid JWT cookie
app.use("/api/patients",   apiLimiter, authMiddleware, patientRoutes);
app.use("/api/onboarding", apiLimiter, authMiddleware, discoveryRoutes);
app.use("/api/dashboard",  apiLimiter, authMiddleware, dashboardRoutes);

// 404 handler for unmatched API routes
app.use("/api", (_req, res) => res.status(404).json({ error: "Not found" }));

// Centralized error handler — must be last
app.use(errorMiddleware);

module.exports = app;
