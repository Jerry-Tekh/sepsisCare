const app = require("./app");
const env = require("./config/env");
const logger = require("./utils/logger");
const prisma = require("./config/prismaClient");

const server = app.listen(env.port, () => {
  logger.info(`Caregiver Sepsis Prevention API listening on port ${env.port} (${env.nodeEnv})`);
});

// Catch errors that would otherwise crash the process silently, log them,
// and exit so a process manager (PM2, Docker, systemd, the hosting
// platform) can restart cleanly rather than leaving the app in a broken state.
process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled promise rejection", { reason: reason?.message || reason });
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  logger.error("Uncaught exception", { message: err.message, stack: err.stack });
  process.exit(1);
});

// Graceful shutdown: stop accepting new connections, let in-flight requests
// finish, then close the Prisma connection pool before exiting. Matters for
// zero-downtime deploys on platforms that send SIGTERM before killing the
// container (Render, Railway, Kubernetes, Docker, Heroku).
function shutdown(signal) {
  logger.info(`Received ${signal}, shutting down gracefully`);
  server.close(async () => {
    await prisma.$disconnect();
    logger.info("Shutdown complete");
    process.exit(0);
  });

  // Force-exit if shutdown hangs longer than 10s.
  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
