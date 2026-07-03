const express = require("express");
const patientController = require("./patient.controller");
const discoveryController = require("../discovery/discovery.controller");
const riskRoutes = require("../risk/risk.routes");
const validate = require("../../middleware/validate.middleware");
const {
  createPatientSchema,
  updatePatientSchema,
  patientIdParamSchema,
} = require("./patient.schema");
const {
  patientIdParamSchema: onboardingPatientIdParamSchema,
} = require("../discovery/discovery.schema");

const router = express.Router();

router.get("/", patientController.list);
router.post("/", validate(createPatientSchema), patientController.create);
router.get("/:id", validate(patientIdParamSchema, "params"), patientController.getOne);
router.put(
  "/:id",
  validate(patientIdParamSchema, "params"),
  validate(updatePatientSchema),
  patientController.update
);
router.delete("/:id", validate(patientIdParamSchema, "params"), patientController.remove);

// Discovery / onboarding sub-routes, scoped to a patient
router.post(
  "/:patientId/onboarding/start",
  validate(onboardingPatientIdParamSchema, "params"),
  discoveryController.start
);
router.get(
  "/:patientId/onboarding/active",
  validate(onboardingPatientIdParamSchema, "params"),
  discoveryController.getActiveSession
);
router.get(
  "/:patientId/onboarding/sessions",
  validate(onboardingPatientIdParamSchema, "params"),
  discoveryController.listSessions
);

// Risk profile sub-routes, scoped to a patient
router.use("/:patientId/risk-profile", riskRoutes);

module.exports = router;
