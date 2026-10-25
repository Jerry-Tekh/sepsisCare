const net = require("node:net");
const prisma = require("../../config/prismaClient");
const logger = require("../../utils/logger");
const { BadRequestError, ForbiddenError, NotFoundError } = require("../../errors/AppError");
const storage = require("../learning-guides/object-storage.service");

const MAX_PDF_BYTES = 15 * 1024 * 1024;

function parseFormArray(value, field) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) throw new Error("Expected array");
    return parsed;
  } catch {
    throw new BadRequestError(`${field} must be a JSON array`);
  }
}

function normalizeUploadBody(body) {
  return {
    ...body,
    tags: parseFormArray(body.tags, "tags"),
    sourceIds: parseFormArray(body.sourceIds, "sourceIds"),
  };
}

function normalizeSourceUrl(rawUrl) {
  let parsed;
  try { parsed = new URL(rawUrl); } catch { throw new BadRequestError("Enter a valid source URL"); }
  if (parsed.protocol !== "https:") throw new BadRequestError("Source URLs must use HTTPS");
  if (parsed.username || parsed.password || !parsed.hostname) throw new BadRequestError("This source URL is not allowed");
  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || net.isIP(host)) {
    throw new BadRequestError("Source URL must point to a public website hostname");
  }
  parsed.hash = "";
  return parsed.toString();
}

function requireOrganization(user) {
  if (!user.organizationId) throw new ForbiddenError("This organization account is not linked to an organization");
  return user.organizationId;
}

async function organizationGuides(user) {
  const organizationId = requireOrganization(user);
  return prisma.learningGuide.findMany({
    where: { organizationId },
    include: { sources: { include: { source: { select: { id: true, name: true, url: true, status: true } } } } },
    orderBy: { updatedAt: "desc" },
  });
}

async function createGuide(user, body, file) {
  const organizationId = requireOrganization(user);
  if (!file?.buffer) throw new BadRequestError("Choose a PDF file to upload");
  if (file.size > MAX_PDF_BYTES) throw new BadRequestError("PDF files must be 15 MB or smaller");
  if (file.mimetype !== "application/pdf" || file.buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new BadRequestError("The uploaded file is not a valid PDF");
  }

  const data = normalizeUploadBody(body);
  const objectKey = storage.createObjectKey(organizationId);
  if (data.sourceIds.length) {
    const validSources = await prisma.verifiedSource.count({
      where: { id: { in: data.sourceIds }, organizationId },
    });
    if (validSources !== new Set(data.sourceIds).size) {
      throw new BadRequestError("Select only sources managed by your organization");
    }
  }

  await storage.putPdf(objectKey, file.buffer, file.originalname);
  try {
    return await prisma.learningGuide.create({
      data: {
        organizationId,
        uploadedById: user.id,
        title: data.title,
        prognosisVector: data.prognosisVector,
        details: data.details,
        tags: data.tags,
        pdfObjectKey: objectKey,
        pdfOriginalName: file.originalname.slice(0, 240),
        pdfSizeBytes: file.size,
        status: data.status,
        sources: { create: data.sourceIds.map((sourceId) => ({ sourceId })) },
      },
      include: { sources: { include: { source: { select: { id: true, name: true, url: true, status: true } } } } },
    });
  } catch (err) {
    await storage.deleteObject(objectKey).catch((storageErr) =>
      logger.error("Could not clean up uploaded guide after database failure", { error: storageErr.message })
    );
    throw err;
  }
}

async function getOwnedGuide(user, id) {
  const organizationId = requireOrganization(user);
  const guide = await prisma.learningGuide.findFirst({ where: { id, organizationId } });
  if (!guide) throw new NotFoundError("Learning guide not found");
  return guide;
}

async function updateGuide(user, id, input) {
  const organizationId = requireOrganization(user);
  await getOwnedGuide(user, id);
  const data = { ...input };
  delete data.sourceIds;
  if (input.sourceIds) {
    const uniqueIds = [...new Set(input.sourceIds)];
    const sourceCount = await prisma.verifiedSource.count({ where: { id: { in: uniqueIds }, organizationId } });
    if (sourceCount !== uniqueIds.length) throw new BadRequestError("Select only sources managed by your organization");
    await prisma.$transaction([
      prisma.guideSource.deleteMany({ where: { guideId: id } }),
      ...(uniqueIds.length ? [prisma.guideSource.createMany({ data: uniqueIds.map((sourceId) => ({ guideId: id, sourceId })) })] : []),
    ]);
  }
  return prisma.learningGuide.update({ where: { id }, data, include: { sources: { include: { source: true } } } });
}

async function getGuidePdfUrl(user, id) {
  const guide = await getOwnedGuide(user, id);
  return storage.createPdfUrl(guide.pdfObjectKey, guide.pdfOriginalName, false);
}

async function deleteGuide(user, id) {
  const guide = await getOwnedGuide(user, id);
  await prisma.learningGuide.delete({ where: { id } });
  await storage.deleteObject(guide.pdfObjectKey).catch((err) =>
    logger.error("Could not delete guide PDF object after database deletion", { guideId: id, error: err.message })
  );
}

async function listSources(user) {
  const organizationId = requireOrganization(user);
  return prisma.verifiedSource.findMany({
    where: { organizationId },
    include: { guides: { include: { guide: { select: { id: true, title: true } } } } },
    orderBy: { updatedAt: "desc" },
  });
}

async function createSource(user, input) {
  const organizationId = requireOrganization(user);
  const url = normalizeSourceUrl(input.url);
  return prisma.verifiedSource.create({
    data: {
      organizationId,
      createdById: user.id,
      approvedById: input.approve ? user.id : null,
      name: input.name,
      url,
      notes: input.notes || null,
      status: input.approve ? "APPROVED" : "PENDING",
      approvedAt: input.approve ? new Date() : null,
    },
  });
}

async function setSourceStatus(user, id, status) {
  const organizationId = requireOrganization(user);
  const source = await prisma.verifiedSource.findFirst({ where: { id, organizationId } });
  if (!source) throw new NotFoundError("Source not found");
  return prisma.verifiedSource.update({
    where: { id },
    data: {
      status,
      approvedById: status === "APPROVED" ? user.id : null,
      approvedAt: status === "APPROVED" ? new Date() : null,
    },
  });
}

async function deleteSource(user, id) {
  const organizationId = requireOrganization(user);
  const source = await prisma.verifiedSource.findFirst({ where: { id, organizationId } });
  if (!source) throw new NotFoundError("Source not found");
  await prisma.verifiedSource.delete({ where: { id } });
}

module.exports = {
  MAX_PDF_BYTES,
  normalizeUploadBody,
  organizationGuides,
  createGuide,
  updateGuide,
  getGuidePdfUrl,
  deleteGuide,
  listSources,
  createSource,
  setSourceStatus,
  deleteSource,
};
