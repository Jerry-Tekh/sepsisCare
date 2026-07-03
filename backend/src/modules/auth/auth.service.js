const bcrypt  = require("bcrypt");
const jwt     = require("jsonwebtoken");
const prisma  = require("../../config/prismaClient");
const env     = require("../../config/env");
const { ConflictError, UnauthorizedError, NotFoundError } = require("../../errors/AppError");

const BCRYPT_COST_FACTOR = 12;

function signToken(user) {
  return jwt.sign({ userId: user.id, email: user.email }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

function toPublicUser(user) {
  return { id: user.id, fullName: user.fullName, email: user.email };
}

async function register({ fullName, email, password }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ConflictError("An account with this email already exists");
  }

  const hashedPassword = await bcrypt.hash(password, BCRYPT_COST_FACTOR);
  const user = await prisma.user.create({
    data: { fullName, email, password: hashedPassword },
  });

  const token = signToken(user);
  // Return both token (for the controller to set as cookie) and public user.
  return { token, user: toPublicUser(user) };
}

async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new UnauthorizedError("Invalid email or password");

  const matches = await bcrypt.compare(password, user.password);
  if (!matches) throw new UnauthorizedError("Invalid email or password");

  const token = signToken(user);
  return { token, user: toPublicUser(user) };
}

/**
 * Used by the /me endpoint to fetch fresh user data from the DB using the
 * userId from the verified JWT payload (req.user.id set by authMiddleware).
 */
async function getMe(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError("User not found");
  return toPublicUser(user);
}

module.exports = { register, login, getMe, toPublicUser };
