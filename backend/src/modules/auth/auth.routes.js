const express    = require("express");
const authController = require("./auth.controller");
const validate   = require("../../middleware/validate.middleware");
const authMiddleware = require("../../middleware/auth.middleware");
const { registerSchema, loginSchema } = require("./auth.schema");

const router = express.Router();

router.post("/register", validate(registerSchema), authController.register);
router.post("/login",    validate(loginSchema),    authController.login);
router.post("/logout",   authController.logout);

// /me validates the existing cookie and returns the current user.
// Used by the frontend on app load to restore the session without needing
// to read the cookie from JavaScript.
router.get("/me", authMiddleware, authController.me);

module.exports = router;
