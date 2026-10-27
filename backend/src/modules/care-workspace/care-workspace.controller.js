const service = require("./care-workspace.service");
const patientService = require("../patient/patient.service");

async function getWorkspace(req, res, next) {
  try { await patientService.assertOwnership(req.params.patientId, req.user.id); res.json(await service.getWorkspace(req.params.patientId)); }
  catch (err) { next(err); }
}
async function generatePlan(req, res, next) {
  try { await patientService.assertOwnership(req.params.patientId, req.user.id); res.status(201).json(await service.generatePlan(req.params.patientId, req.body.request, req.body.conversationId)); }
  catch (err) { next(err); }
}
async function checkIn(req, res, next) {
  try { await patientService.assertOwnership(req.params.patientId, req.user.id); res.status(201).json({ checkIn: await service.recordCheckIn(req.params.patientId, req.params.planId, req.body) }); }
  catch (err) { next(err); }
}
async function listFlags(req, res, next) {
  try { await patientService.assertOwnership(req.params.patientId, req.user.id); res.json({ flags: await service.listFlags(req.params.patientId) }); }
  catch (err) { next(err); }
}
async function resolveFlag(req, res, next) {
  try { await patientService.assertOwnership(req.params.patientId, req.user.id); res.json({ flag: await service.resolveFlag(req.params.flagId, req.params.patientId, req.body.outcome) }); }
  catch (err) { next(err); }
}
async function updateFlag(req, res, next) {
  try { await patientService.assertOwnership(req.params.patientId, req.user.id); res.json({ flag: await service.updateFlag(req.params.flagId, req.params.patientId, req.body) }); }
  catch (err) { next(err); }
}

module.exports = { getWorkspace, generatePlan, checkIn, listFlags, resolveFlag, updateFlag };
