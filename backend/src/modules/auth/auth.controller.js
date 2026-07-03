const authService = require("./auth.service");
const env         = require("../../config/env");

/**
 * Sets the JWT as an httpOnly cookie on the response.
 * The token is NEVER sent in the JSON body — it lives only in the cookie
 * so JavaScript on the client cannot read it.
 */
function setTokenCookie(res, token) {
  res.cookie("token", token, env.cookie);
}

/**
 * Clears the auth cookie by name. Path and domain must match exactly
 * what was set, otherwise the browser won't delete it.
 */
function clearTokenCookie(res) {
  res.clearCookie("token", {
    httpOnly:  env.cookie.httpOnly,
    secure:    env.cookie.secure,
    sameSite:  env.cookie.sameSite,
    path:      env.cookie.path,
  });
}

async function register(req, res, next) {
  try {
    const { token, user } = await authService.register(req.body);
    setTokenCookie(res, token);
    // Return only the non-sensitive user object — token stays in the cookie.
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { token, user } = await authService.login(req.body);
    setTokenCookie(res, token);
    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res) {
  clearTokenCookie(res);
  res.status(200).json({ message: "Logged out" });
}

/**
 * Returns the authenticated user's public profile.
 * Called on app load to revalidate the session without the client needing
 * to read the cookie (it can't — it's httpOnly). If the cookie is missing
 * or expired, authMiddleware will reject the request with 401 before this
 * handler is ever reached.
 */
async function me(req, res, next) {
  try {
    const user = await authService.getMe(req.user.id);
    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, logout, me };
