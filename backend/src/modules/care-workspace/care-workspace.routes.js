const express = require("express");
const ctrl = require("./care-workspace.controller");
const validate = require("../../middleware/validate.middleware");
const { patientIdParamSchema, flagIdParamSchema, planIdParamSchema, generatePlanSchema, checkInSchema, resolveFlagSchema, updateFlagSchema } = require("./care-workspace.schema");

const router = express.Router({ mergeParams: true });
router.get("/", validate(patientIdParamSchema, "params"), ctrl.getWorkspace);
router.post("/generate", validate(patientIdParamSchema, "params"), validate(generatePlanSchema), ctrl.generatePlan);
router.post("/:planId/check-in", validate(patientIdParamSchema, "params"), validate(planIdParamSchema, "params"), validate(checkInSchema), ctrl.checkIn);
router.get("/flags", validate(patientIdParamSchema, "params"), ctrl.listFlags);
router.patch("/flags/:flagId", validate(patientIdParamSchema, "params"), validate(flagIdParamSchema, "params"), validate(updateFlagSchema), ctrl.updateFlag);
router.patch("/flags/:flagId/resolve", validate(patientIdParamSchema, "params"), validate(flagIdParamSchema, "params"), validate(resolveFlagSchema), ctrl.resolveFlag);
module.exports = router;
