const express = require("express");
const ctrl     = require("./microlearning.controller");
const validate = require("../../middleware/validate.middleware");
const {
  requestGenerationSchema,
  assignSchema,
  materialIdParamSchema,
} = require("./microlearning.schema");

// Patient-scoped: /api/patients/:patientId/microlearning
const patientRouter = express.Router({ mergeParams: true });
patientRouter.get("/",         ctrl.list);
patientRouter.post("/generate", validate(requestGenerationSchema), ctrl.requestGeneration);

// Material-scoped: /api/microlearning/:materialId
const materialRouter = express.Router();
materialRouter.get("/:materialId",               validate(materialIdParamSchema, "params"), ctrl.getOne);
materialRouter.patch("/:materialId/assign",      validate(materialIdParamSchema, "params"), validate(assignSchema), ctrl.assign);
materialRouter.get("/:materialId/download/pdf",  validate(materialIdParamSchema, "params"), ctrl.downloadPDF);
materialRouter.get("/:materialId/download/card", validate(materialIdParamSchema, "params"), ctrl.downloadImageCard);

module.exports = { patientRouter, materialRouter };
