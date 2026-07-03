const express = require("express");
const discoveryController = require("./discovery.controller");
const validate = require("../../middleware/validate.middleware");
const { submitAnswerSchema, sessionIdParamSchema } = require("./discovery.schema");

const router = express.Router();

router.get("/:sessionId", validate(sessionIdParamSchema, "params"), discoveryController.getSession);
router.post(
  "/:sessionId/answer",
  validate(sessionIdParamSchema, "params"),
  validate(submitAnswerSchema),
  discoveryController.submitAnswer
);

module.exports = router;
