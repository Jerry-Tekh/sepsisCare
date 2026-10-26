const safetyQueryService = require("./safety-query.service");
const patientService = require("../patient/patient.service");

async function startQuery(req, res, next) {
  try {
    await patientService.assertOwnership(req.params.patientId, req.user.id);
    const result = await safetyQueryService.startQuery(
      req.params.patientId,
      req.user.id,
      req.body.question
    );
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function sendMessage(req, res, next) {
  try {
    const query = await safetyQueryService.getQuery(req.params.queryId);
    await patientService.assertOwnership(query.patientId, req.user.id);
    const result = await safetyQueryService.sendMessage(
      req.params.queryId,
      req.body.message,
      query.patientId
    );
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function listQueries(req, res, next) {
  try {
    await patientService.assertOwnership(req.params.patientId, req.user.id);
    const queries = await safetyQueryService.listQueriesForPatient(req.params.patientId);
    res.status(200).json({ queries });
  } catch (err) {
    next(err);
  }
}

async function getQuery(req, res, next) {
  try {
    const query = await safetyQueryService.getQuery(req.params.queryId);
    await patientService.assertOwnership(query.patientId, req.user.id);
    await safetyQueryService.assertOnboardingCompleted(query.patientId);
    res.status(200).json({ query });
  } catch (err) {
    next(err);
  }
}

async function closeQuery(req, res, next) {
  try {
    const query = await safetyQueryService.getQuery(req.params.queryId);
    await patientService.assertOwnership(query.patientId, req.user.id);
    await safetyQueryService.assertOnboardingCompleted(query.patientId);
    const updated = await safetyQueryService.closeQuery(req.params.queryId);
    res.status(200).json({ query: updated });
  } catch (err) {
    next(err);
  }
}

module.exports = { startQuery, sendMessage, listQueries, getQuery, closeQuery };
