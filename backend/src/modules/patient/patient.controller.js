const patientService = require("./patient.service");

async function list(req, res, next) {
  try {
    const patients = await patientService.list(req.user.id);
    res.status(200).json({ patients });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const patient = await patientService.create(req.user.id, req.body);
    res.status(201).json({ patient });
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const patient = await patientService.getOne(req.user.id, req.params.id);
    res.status(200).json({ patient });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const patient = await patientService.update(req.user.id, req.params.id, req.body);
    res.status(200).json({ patient });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await patientService.remove(req.user.id, req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, getOne, update, remove };
