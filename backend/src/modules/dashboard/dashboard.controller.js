const dashboardService = require("./dashboard.service");
const monitoringService = require("../monitoring/monitoring.service");

async function summary(req, res, next) {
  try {
    const result = await dashboardService.summary(req.user.id);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function alerts(req, res, next) {
  try {
    const result = await monitoringService.recentAlerts(req.user.id);
    res.status(200).json({ alerts: result });
  } catch (err) {
    next(err);
  }
}

module.exports = { summary, alerts };
