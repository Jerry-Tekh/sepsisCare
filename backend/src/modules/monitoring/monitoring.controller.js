const monitoringService = require("./monitoring.service");
const patientService = require("../patient/patient.service");
const { listQuerySchema } = require("./monitoring.schema");

// Express 5 makes req.query read-only, so parse it here rather than via validate().
function parseLimit(query) {
  const result = listQuerySchema.safeParse(query);
  return result.success ? result.data.limit : 60;
}

async function createVital(req, res, next) {
  try {
    await patientService.assertOwnership(req.params.patientId, req.user.id);
    const reading = await monitoringService.createVital(req.params.patientId, req.body);
    res.status(201).json({ reading });
  } catch (err) {
    next(err);
  }
}

async function listVitals(req, res, next) {
  try {
    await patientService.assertOwnership(req.params.patientId, req.user.id);
    const readings = await monitoringService.listVitals(req.params.patientId, parseLimit(req.query));
    res.status(200).json({ readings });
  } catch (err) {
    next(err);
  }
}

async function deleteVital(req, res, next) {
  try {
    const reading = await monitoringService.getVital(req.params.entryId);
    await patientService.assertOwnership(reading.patientId, req.user.id);
    await monitoringService.deleteVital(reading.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

async function createCheckIn(req, res, next) {
  try {
    await patientService.assertOwnership(req.params.patientId, req.user.id);
    const checkIn = await monitoringService.createCheckIn(req.params.patientId, req.body);
    res.status(201).json({ checkIn });
  } catch (err) {
    next(err);
  }
}

async function listCheckIns(req, res, next) {
  try {
    await patientService.assertOwnership(req.params.patientId, req.user.id);
    const checkIns = await monitoringService.listCheckIns(req.params.patientId, parseLimit(req.query));
    res.status(200).json({ checkIns });
  } catch (err) {
    next(err);
  }
}

async function deleteCheckIn(req, res, next) {
  try {
    const checkIn = await monitoringService.getCheckIn(req.params.entryId);
    await patientService.assertOwnership(checkIn.patientId, req.user.id);
    await monitoringService.deleteCheckIn(checkIn.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = { createVital, listVitals, deleteVital, createCheckIn, listCheckIns, deleteCheckIn };
