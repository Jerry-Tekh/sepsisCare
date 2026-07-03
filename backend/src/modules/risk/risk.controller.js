const riskService = require("./risk.service");
const patientService = require("../patient/patient.service");

async function getLatest(req, res, next) {
  try {
    await patientService.assertOwnership(req.params.patientId, req.user.id);
    const profile = await riskService.getLatest(req.params.patientId);
    res.status(200).json({ riskProfile: profile });
  } catch (err) {
    next(err);
  }
}

async function getHistory(req, res, next) {
  try {
    await patientService.assertOwnership(req.params.patientId, req.user.id);
    const profiles = await riskService.getHistory(req.params.patientId);
    res.status(200).json({ riskProfiles: profiles });
  } catch (err) {
    next(err);
  }
}

module.exports = { getLatest, getHistory };
