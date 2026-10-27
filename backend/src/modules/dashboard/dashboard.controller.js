const dashboardService = require("./dashboard.service");

async function summary(req, res, next) {
  try {
    const result = await dashboardService.summary(req.user.id);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function welcome(req, res, next) {
  try {
    const result = await dashboardService.welcome(req.user);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { summary, welcome };
