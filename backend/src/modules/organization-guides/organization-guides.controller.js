const multer = require("multer");
const { BadRequestError } = require("../../errors/AppError");
const service = require("./organization-guides.service");
const {
  guideUploadSchema,
  updateGuideSchema,
  sourceSchema,
  sourceStatusSchema,
  idParamSchema,
} = require("./organization-guides.schema");

const uploadPdf = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: service.MAX_PDF_BYTES, files: 1 },
}).single("pdf");

function handlePdfUpload(req, res, next) {
  uploadPdf(req, res, (err) => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE") return next(new BadRequestError("PDF files must be 15 MB or smaller"));
    if (err instanceof multer.MulterError) return next(new BadRequestError(err.message));
    next(err);
  });
}

async function listGuides(req, res, next) {
  try { res.status(200).json({ guides: await service.organizationGuides(req.user) }); }
  catch (err) { next(err); }
}

async function createGuide(req, res, next) {
  try {
    const input = guideUploadSchema.parse(service.normalizeUploadBody(req.body));
    const guide = await service.createGuide(req.user, input, req.file);
    res.status(201).json({ guide });
  } catch (err) { next(err); }
}

async function updateGuide(req, res, next) {
  try {
    const { id } = idParamSchema.parse(req.params);
    const input = updateGuideSchema.parse(req.body);
    res.status(200).json({ guide: await service.updateGuide(req.user, id, input) });
  } catch (err) { next(err); }
}

async function guidePdf(req, res, next) {
  try {
    const { id } = idParamSchema.parse(req.params);
    const url = await service.getGuidePdfUrl(req.user, id);
    res.redirect(302, url);
  } catch (err) { next(err); }
}

async function removeGuide(req, res, next) {
  try {
    const { id } = idParamSchema.parse(req.params);
    await service.deleteGuide(req.user, id);
    res.status(204).send();
  } catch (err) { next(err); }
}

async function listSources(req, res, next) {
  try { res.status(200).json({ sources: await service.listSources(req.user) }); }
  catch (err) { next(err); }
}

async function createSource(req, res, next) {
  try {
    const input = sourceSchema.parse(req.body);
    res.status(201).json({ source: await service.createSource(req.user, input) });
  } catch (err) { next(err); }
}

async function changeSourceStatus(req, res, next) {
  try {
    const { id } = idParamSchema.parse(req.params);
    const { status } = sourceStatusSchema.parse(req.body);
    res.status(200).json({ source: await service.setSourceStatus(req.user, id, status) });
  } catch (err) { next(err); }
}

async function removeSource(req, res, next) {
  try {
    const { id } = idParamSchema.parse(req.params);
    await service.deleteSource(req.user, id);
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = {
  handlePdfUpload,
  listGuides,
  createGuide,
  updateGuide,
  guidePdf,
  removeGuide,
  listSources,
  createSource,
  changeSourceStatus,
  removeSource,
};
