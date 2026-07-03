const rateLimit = require("express-rate-limit");

/**
 * General API rate limit: generous enough for normal app usage, but bounds
 * worst-case abuse (and OpenAI API cost exposure) from a single client.
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again shortly." },
});

/**
 * Stricter limit for auth endpoints to slow down credential-stuffing /
 * brute-force attempts against login and registration.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication attempts. Please try again shortly." },
});

module.exports = { apiLimiter, authLimiter };
