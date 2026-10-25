const { z } = require("zod");
const service = require("./learning-guides.service");
const { searchSchema, guideIdSchema } = require("./learning-guides.schema");

function publicGuide(guide) {
  const { pdfObjectKey, ...safe } = guide;
  return safe;
}

async function list(req, res, next) {
  try {
    const filters = searchSchema.parse(req.query);
    const result = await service.listPublished(filters);
    res.status(200).json({ ...result, guides: result.guides.map(publicGuide) });
  } catch (err) { next(err); }
}

async function options(_req, res, next) {
  try { res.status(200).json(await service.getFilterOptions()); }
  catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const { guideId } = guideIdSchema.parse(req.params);
    res.status(200).json({ guide: publicGuide(await service.getPublishedGuide(guideId)) });
  } catch (err) { next(err); }
}

async function pdfUrl(req, res, next) {
  try {
    const { guideId } = guideIdSchema.parse(req.params);
    const download = req.query.download === "true";
    const { url } = await service.getDownloadUrl(guideId, download);
    res.redirect(302, url);
  } catch (err) { next(err); }
}

module.exports = { list, options, getOne, pdfUrl };
