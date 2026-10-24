const express = require("express");
const ctrl = require("./monitoring.controller");
const validate = require("../../middleware/validate.middleware");
const {
  createVitalSchema,
  createCheckInSchema,
  entryIdParamSchema,
} = require("./monitoring.schema");

// Scoped to a patient: /api/patients/:patientId/monitoring
// mergeParams so :patientId from the parent mount is visible here
const patientRouter = express.Router({ mergeParams: true });
patientRouter.get("/vitals",     ctrl.listVitals);
patientRouter.post("/vitals",    validate(createVitalSchema), ctrl.createVital);
patientRouter.get("/check-ins",  ctrl.listCheckIns);
patientRouter.post("/check-ins", validate(createCheckInSchema), ctrl.createCheckIn);

// Entry-level: /api/monitoring/...
const entryRouter = express.Router();
entryRouter.delete("/vitals/:entryId",    validate(entryIdParamSchema, "params"), ctrl.deleteVital);
entryRouter.delete("/check-ins/:entryId", validate(entryIdParamSchema, "params"), ctrl.deleteCheckIn);

module.exports = { patientRouter, entryRouter };
