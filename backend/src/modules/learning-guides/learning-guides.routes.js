const express = require("express");
const controller = require("./learning-guides.controller");

const router = express.Router();

router.get("/options", controller.options);
router.get("/", controller.list);
router.get("/:guideId/pdf", controller.pdfUrl);
router.get("/:guideId", controller.getOne);

module.exports = router;
