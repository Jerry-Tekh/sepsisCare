const express = require("express");
const riskController = require("./risk.controller");

// mergeParams so :patientId from the parent mount point is visible here
const router = express.Router({ mergeParams: true });

router.get("/", riskController.getLatest);
router.get("/history", riskController.getHistory);

module.exports = router;
