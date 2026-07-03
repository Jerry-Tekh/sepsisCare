require("dotenv").config();

const required = ["DATABASE_URL", "JWT_SECRET", "OPENAI_API_KEY"];
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(
    `Missing required environment variables: ${missing.join(", ")}. Check your .env file against .env.example.`
  );
  process.exit(1);
}

/**
 * Parses a JWT-style duration string ("2h", "7d", "30m", "3600s") into
 * milliseconds so the cookie maxAge matches the JWT expiry exactly.
 */
function parseDurationMs(str) {
  const match = String(str).match(/^(\d+)([smhd])$/i);
  if (!match) return 2 * 60 * 60 * 1000; // fallback: 2 hours
  const value = parseInt(match[1], 10);
  switch (match[2].toLowerCase()) {
    case "s": return value * 1000;
    case "m": return value * 60 * 1000;
    case "h": return value * 60 * 60 * 1000;
    case "d": return value * 24 * 60 * 60 * 1000;
    default:  return 2 * 60 * 60 * 1000;
  }
}

const nodeEnv       = process.env.NODE_ENV || "development";
const jwtExpiresIn  = process.env.JWT_EXPIRES_IN || "2h";
const isProduction  = nodeEnv === "production";

module.exports = {
  port:       parseInt(process.env.PORT || "5000", 10),
  nodeEnv,
  isProduction,
  databaseUrl:   process.env.DATABASE_URL,
  jwtSecret:     process.env.JWT_SECRET,
  jwtExpiresIn,
  openaiApiKey:  process.env.OPENAI_API_KEY,
  openaiModel:   process.env.OPENAI_MODEL || "gpt-4o-mini",
  corsOrigin:    process.env.CORS_ORIGIN || "http://localhost:5173",

  // Cookie configuration.
  // httpOnly: always true — this is the whole point, never touch it.
  // secure: true in production (HTTPS only), false in development (HTTP localhost).
  // sameSite: 'none' in production to support frontend/backend on different domains
  //   (e.g. app.vercel.app + api.railway.app). SameSite=None REQUIRES secure=true.
  //   'lax' in development (localhost cross-port is same-site, no HTTPS needed).
  // maxAge: derived from jwtExpiresIn so the cookie and the JWT expire together.
  cookie: {
    httpOnly:    true,
    secure:      isProduction,
    sameSite:    isProduction ? "none" : "lax",
    maxAge:      parseDurationMs(jwtExpiresIn),
    path:        "/",
  },
};
