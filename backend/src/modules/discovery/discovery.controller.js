const discoveryService = require("./discovery.service");
const patientService = require("../patient/patient.service");

async function start(req, res, next) {
  try {
    await patientService.assertOwnership(req.params.patientId, req.user.id);
    const result = await discoveryService.startSession(req.params.patientId);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function submitAnswer(req, res, next) {
  try {
    // Load session once, check ownership from it, then submit.
    // This avoids fetching the session twice (once here, once inside the service).
    const session = await discoveryService.getSession(req.params.sessionId);
    await patientService.assertOwnership(session.patientId, req.user.id);
    const result = await discoveryService.submitAnswer(req.params.sessionId, req.body.answer);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function getSession(req, res, next) {
  try {
    const session = await discoveryService.getSession(req.params.sessionId);
    await patientService.assertOwnership(session.patientId, req.user.id);
    res.status(200).json({ session });
  } catch (err) {
    next(err);
  }
}

async function getActiveSession(req, res, next) {
  try {
    await patientService.assertOwnership(req.params.patientId, req.user.id);
    const session = await discoveryService.getActiveSession(req.params.patientId);
    res.status(200).json({ session: session || null });
  } catch (err) {
    next(err);
  }
}

async function listSessions(req, res, next) {
  try {
    await patientService.assertOwnership(req.params.patientId, req.user.id);
    const sessions = await discoveryService.listSessionsForPatient(req.params.patientId);
    res.status(200).json({ sessions });
  } catch (err) {
    next(err);
  }
}

module.exports = { start, submitAnswer, getSession, getActiveSession, listSessions };
