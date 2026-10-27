const express    = require("express");
const cors       = require("cors");
const helmet     = require("helmet");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const env        = require("./config/env");
const requestLogger = require("./middleware/requestLogger.middleware");
const authMiddleware = require("./middleware/auth.middleware");
const requireRole = require("./middleware/role.middleware");
const errorMiddleware = require("./middleware/error.middleware");
const { apiLimiter, authLimiter } = require("./middleware/rateLimit.middleware");

const authRoutes      = require("./modules/auth/auth.routes");
const patientRoutes   = require("./modules/patient/patient.routes");
const discoveryRoutes = require("./modules/discovery/discovery.routes");
const dashboardRoutes = require("./modules/dashboard/dashboard.routes");
const learningGuideRoutes = require("./modules/learning-guides/learning-guides.routes");
const organizationGuideRoutes = require("./modules/organization-guides/organization-guides.routes");
const careWorkspaceRoutes = require("./modules/care-workspace/care-workspace.routes");

const {
  patientRouter: safetyQueryPatientRouter,
  sessionRouter: safetyQuerySessionRouter,
} = require("./modules/safety-query/safety-query.routes");

const {
  patientRouter: microlearningPatientRouter,
  materialRouter: microlearningMaterialRouter,
} = require("./modules/microlearning/microlearning.routes");

const app = express();

app.set("trust proxy", 1);

app.use(helmet());
app.use(compression());
app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(requestLogger);

app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));

// Public auth routes
app.use("/api/auth", authLimiter, authRoutes);

// Protected routes — all require a valid JWT cookie
app.use("/api/patients",   apiLimiter, authMiddleware, requireRole("CAREGIVER"), patientRoutes);
app.use("/api/onboarding", apiLimiter, authMiddleware, requireRole("CAREGIVER"), discoveryRoutes);
app.use("/api/dashboard",  apiLimiter, authMiddleware, requireRole("CAREGIVER"), dashboardRoutes);
app.use("/api/library/guides", apiLimiter, authMiddleware, requireRole("CAREGIVER"), learningGuideRoutes);
app.use("/api/organization", apiLimiter, authMiddleware, requireRole("ORGANIZATION_ADMIN"), organizationGuideRoutes);

// Safety Query — patient-scoped (start / list) + session-scoped (message / close)
app.use("/api/patients/:patientId/safety-query", apiLimiter, authMiddleware, requireRole("CAREGIVER"), safetyQueryPatientRouter);
app.use("/api/patients/:patientId/care-workspace", apiLimiter, authMiddleware, requireRole("CAREGIVER"), careWorkspaceRoutes);
app.use("/api/safety-query", apiLimiter, authMiddleware, requireRole("CAREGIVER"), safetyQuerySessionRouter);

// Microlearning — patient-scoped (list / generate) + material-scoped (view / assign / download)
app.use("/api/patients/:patientId/microlearning", apiLimiter, authMiddleware, requireRole("CAREGIVER"), microlearningPatientRouter);
app.use("/api/microlearning", apiLimiter, authMiddleware, requireRole("CAREGIVER"), microlearningMaterialRouter);

// 404 handler for unmatched API routes
app.use("/api", (_req, res) => res.status(404).json({ error: "Not found" }));

// Centralized error handler — must be last
app.use(errorMiddleware);

module.exports = app;
