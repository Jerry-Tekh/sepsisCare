const express = require("express");
const dashboardController = require("./dashboard.controller");

const router = express.Router();

router.get("/summary", dashboardController.summary);
router.get("/alerts", dashboardController.alerts);

module.exports = router;
