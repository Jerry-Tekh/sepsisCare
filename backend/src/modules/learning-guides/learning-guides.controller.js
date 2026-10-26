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
    // Return the short-lived URL through the authenticated API request. The
    // frontend can then open the storage URL without requiring the browser to
    // send the API's httpOnly session cookie during a direct navigation.
    res.status(200).json(await service.getDownloadUrl(guideId, download));
  } catch (err) { next(err); }
}

module.exports = { list, options, getOne, pdfUrl };
