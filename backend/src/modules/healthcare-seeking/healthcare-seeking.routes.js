const express = require("express");
const validate = require("../../middleware/validate.middleware");
const ctrl = require("./healthcare-seeking.controller");
const { patientParamSchema, eventParamSchema, createEventSchema, recordArrivalSchema } = require("./healthcare-seeking.schema");

const router = express.Router({ mergeParams: true });
router.get("/", validate(patientParamSchema, "params"), ctrl.list);
router.post("/", validate(patientParamSchema, "params"), validate(createEventSchema), ctrl.create);
router.patch("/:eventId/arrival", validate(eventParamSchema, "params"), validate(recordArrivalSchema), ctrl.recordArrival);

module.exports = router;
