const jwt = require("jsonwebtoken");
const env = require("../config/env");
const { UnauthorizedError } = require("../errors/AppError");

/**
 * Reads the JWT from the httpOnly "token" cookie set by auth.controller.js.
 * The token is never sent in an Authorization header or response body — only
 * the cookie transport is accepted, which means JavaScript on the client
 * cannot read or steal the token.
 *
 * On success, attaches the signed role and organization context to req.user.
 * On failure (missing/invalid/expired cookie), throws 401.
 */
function authMiddleware(req, res, next) {
  const token = req.cookies && req.cookies.token;

  if (!token) {
    return next(new UnauthorizedError("Not authenticated — please log in"));
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.user = {
      id: payload.userId,
      email: payload.email,
      role: payload.role || "CAREGIVER",
      organizationId: payload.organizationId || null,
    };
    next();
  } catch {
    return next(new UnauthorizedError("Session expired or invalid — please log in again"));
  }
}

module.exports = authMiddleware;
