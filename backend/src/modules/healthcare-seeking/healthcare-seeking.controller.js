const patientService = require("../patient/patient.service");
const service = require("./healthcare-seeking.service");

async function list(req, res, next) {
  try {
    await patientService.assertOwnership(req.params.patientId, req.user.id);
    res.json({ events: await service.listEvents(req.params.patientId) });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    await patientService.assertOwnership(req.params.patientId, req.user.id);
    const event = await service.createEvent(req.params.patientId, req.user.id, req.body);
    res.status(201).json({ event });
  } catch (err) { next(err); }
}

async function recordArrival(req, res, next) {
  try {
    await patientService.assertOwnership(req.params.patientId, req.user.id);
    const event = await service.recordArrival(req.params.patientId, req.params.eventId, req.body);
    res.json({ event });
  } catch (err) { next(err); }
}

module.exports = { list, create, recordArrival };
