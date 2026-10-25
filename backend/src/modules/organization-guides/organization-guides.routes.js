const express = require("express");
const controller = require("./organization-guides.controller");

const router = express.Router();

router.get("/guides", controller.listGuides);
router.post("/guides", controller.handlePdfUpload, controller.createGuide);
router.get("/guides/:id/pdf", controller.guidePdf);
router.patch("/guides/:id", controller.updateGuide);
router.delete("/guides/:id", controller.removeGuide);
router.get("/sources", controller.listSources);
router.post("/sources", controller.createSource);
router.patch("/sources/:id/status", controller.changeSourceStatus);
router.delete("/sources/:id", controller.removeSource);

module.exports = router;
