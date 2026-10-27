const express = require("express");
const dashboardController = require("./dashboard.controller");

const router = express.Router();

router.get("/summary", dashboardController.summary);
router.get("/welcome", dashboardController.welcome);

module.exports = router;
