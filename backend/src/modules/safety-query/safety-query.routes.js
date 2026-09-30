const express = require("express");
const ctrl    = require("./safety-query.controller");
const validate = require("../../middleware/validate.middleware");
const { startQuerySchema, sendMessageSchema, queryIdParamSchema } = require("./safety-query.schema");

// mergeParams so :patientId from the parent mount is visible here
const router = express.Router({ mergeParams: true });

// Scoped to a patient: /api/patients/:patientId/safety-query
router.get("/",      ctrl.listQueries);
router.post("/start", validate(startQuerySchema), ctrl.startQuery);

// Session-level: /api/safety-query/:queryId
const sessionRouter = express.Router();
sessionRouter.get("/:queryId",          validate(queryIdParamSchema, "params"), ctrl.getQuery);
sessionRouter.post("/:queryId/message", validate(queryIdParamSchema, "params"), validate(sendMessageSchema), ctrl.sendMessage);
sessionRouter.post("/:queryId/close",   validate(queryIdParamSchema, "params"), ctrl.closeQuery);

module.exports = { patientRouter: router, sessionRouter };
