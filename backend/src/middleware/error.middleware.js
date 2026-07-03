const { AppError } = require("../errors/AppError");
const logger = require("../utils/logger");

/**
 * Centralized error handler. Must be registered LAST in app.js, after all routes.
 * Operational errors (AppError subclasses) are returned with their intended
 * status code and message. Anything else is logged with full detail and
 * returned to the client as a generic 500 — we never leak internals.
 */
function errorMiddleware(err, req, res, _next) {
  if (err instanceof AppError) {
    if (!err.isOperational || err.statusCode >= 500) {
      logger.error(err.message, { stack: err.stack, path: req.path });
    }
    return res.status(err.statusCode).json({
      error: err.message,
      details: err.details,
    });
  }

  // Zod validation errors not already wrapped by validate.middleware
  if (err && err.name === "ZodError") {
    return res.status(400).json({
      error: "Validation failed",
      details: err.issues,
    });
  }

  logger.error("Unhandled error", { message: err.message, stack: err.stack, path: req.path });
  return res.status(500).json({ error: "Internal server error" });
}

module.exports = errorMiddleware;
