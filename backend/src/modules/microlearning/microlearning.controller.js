const microlearningService = require("./microlearning.service");
const patientService = require("../patient/patient.service");

async function list(req, res, next) {
  try {
    await patientService.assertOwnership(req.params.patientId, req.user.id);
    const materials = await microlearningService.listForPatient(req.params.patientId);
    res.status(200).json({ materials });
  } catch (err) {
    next(err);
  }
}

async function requestGeneration(req, res, next) {
  try {
    await patientService.assertOwnership(req.params.patientId, req.user.id);
    const material = await microlearningService.requestGeneration(
      req.params.patientId,
      req.body.topic
    );
    res.status(201).json({ material });
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const material = await microlearningService.getOne(req.params.materialId);
    await patientService.assertOwnership(material.patientId, req.user.id);
    res.status(200).json({ material });
  } catch (err) {
    next(err);
  }
}

async function assign(req, res, next) {
  try {
    const material = await microlearningService.getOne(req.params.materialId);
    await patientService.assertOwnership(material.patientId, req.user.id);
    const updated = await microlearningService.toggleAssign(req.params.materialId, req.body.assign);
    res.status(200).json({ material: updated });
  } catch (err) {
    next(err);
  }
}

async function downloadPDF(req, res, next) {
  try {
    const material = await microlearningService.getOne(req.params.materialId);
    await patientService.assertOwnership(material.patientId, req.user.id);
    const { pdfBuffer, title } = await microlearningService.downloadPDF(req.params.materialId);
    const safeName = title.replace(/[^a-z0-9]/gi, "_").slice(0, 60);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
      "Content-Length": pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
}

async function downloadImageCard(req, res, next) {
  try {
    const material = await microlearningService.getOne(req.params.materialId);
    await patientService.assertOwnership(material.patientId, req.user.id);
    const { svg, title } = await microlearningService.downloadImageCard(req.params.materialId);
    const safeName = title.replace(/[^a-z0-9]/gi, "_").slice(0, 60);
    res.set({
      "Content-Type": "image/svg+xml",
      "Content-Disposition": `attachment; filename="${safeName}.svg"`,
    });
    res.send(svg);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, requestGeneration, getOne, assign, downloadPDF, downloadImageCard };
