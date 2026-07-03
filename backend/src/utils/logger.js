/**
 * Minimal structured logger. Kept dependency-free and simple; swap for
 * pino/winston later if log aggregation becomes a requirement.
 */

function timestamp() {
  return new Date().toISOString();
}

const logger = {
  info: (message, meta = {}) => {
    console.log(`[INFO] ${timestamp()} - ${message}`, Object.keys(meta).length ? meta : "");
  },
  warn: (message, meta = {}) => {
    console.warn(`[WARN] ${timestamp()} - ${message}`, Object.keys(meta).length ? meta : "");
  },
  error: (message, meta = {}) => {
    console.error(`[ERROR] ${timestamp()} - ${message}`, Object.keys(meta).length ? meta : "");
  },
};

module.exports = logger;
