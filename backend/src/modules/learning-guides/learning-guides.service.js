const prisma = require("../../config/prismaClient");
const { NotFoundError } = require("../../errors/AppError");
const storage = require("./object-storage.service");

async function listPublished({ q, vector, detail, tag, page, pageSize }) {
  const where = { status: "PUBLISHED" };
  if (vector) where.prognosisVector = { equals: vector, mode: "insensitive" };
  if (detail) where.details = { contains: detail, mode: "insensitive" };
  if (tag) where.tags = { has: tag };
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { prognosisVector: { contains: q, mode: "insensitive" } },
      { details: { contains: q, mode: "insensitive" } },
      { tags: { has: q } },
    ];
  }

  const [guides, total] = await Promise.all([
    prisma.learningGuide.findMany({
      where,
      include: {
        organization: { select: { id: true, name: true } },
        sources: { where: { source: { status: "APPROVED" } }, include: { source: { select: { id: true, name: true, url: true } } } },
      },
      orderBy: [{ updatedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.learningGuide.count({ where }),
  ]);
  return {
    guides: guides.map((guide) => ({
      ...guide,
      sources: guide.sources.map(({ source }) => source),
    })),
    total,
    page,
    pageSize,
    pageCount: Math.ceil(total / pageSize),
  };
}

async function getFilterOptions() {
  const rows = await prisma.learningGuide.findMany({
    where: { status: "PUBLISHED" },
    select: { prognosisVector: true, details: true, tags: true },
  });
  return {
    vectors: [...new Set(rows.map((row) => row.prognosisVector))].sort((a, b) => a.localeCompare(b)),
    details: [...new Set(rows.map((row) => row.details))].sort((a, b) => a.localeCompare(b)),
    tags: [...new Set(rows.flatMap((row) => row.tags))].sort((a, b) => a.localeCompare(b)),
  };
}

async function getPublishedGuide(guideId) {
  const guide = await prisma.learningGuide.findFirst({
    where: { id: guideId, status: "PUBLISHED" },
    include: {
      organization: { select: { id: true, name: true } },
      sources: { where: { source: { status: "APPROVED" } }, include: { source: true } },
    },
  });
  if (!guide) throw new NotFoundError("Learning guide not found");
  return {
    ...guide,
    sources: guide.sources.map(({ source }) => ({ id: source.id, name: source.name, url: source.url, notes: source.notes })),
  };
}

async function getDownloadUrl(guideId, download = false) {
  const guide = await getPublishedGuide(guideId);
  const url = await storage.createPdfUrl(guide.pdfObjectKey, guide.pdfOriginalName, download);
  return { url, expiresIn: 300 };
}

async function getRelevantLearningMaterialsForTopic(topic) {
  const searchText = topic.replace(/_/g, " ");
  const guides = await prisma.learningGuide.findMany({
    where: {
      status: "PUBLISHED",
      OR: [
        { title: { contains: searchText, mode: "insensitive" } },
        { prognosisVector: { contains: searchText, mode: "insensitive" } },
        { details: { contains: searchText, mode: "insensitive" } },
        { tags: { has: searchText } },
      ],
    },
    include: {
      organization: { select: { name: true } },
      sources: {
        where: { source: { status: "APPROVED" } },
        select: { source: { select: { name: true, url: true } } },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 5,
  });
  return guides.map((guide) => ({
    id: guide.id,
    title: guide.title,
    organization: guide.organization.name,
    prognosisVector: guide.prognosisVector,
    details: guide.details,
    tags: guide.tags,
    sources: guide.sources.map(({ source }) => source),
  }));
}

async function getApprovedSourcesForTopic(topic) {
  const guides = await getRelevantLearningMaterialsForTopic(topic);
  const unique = new Map();
  for (const guide of guides) {
    for (const source of guide.sources) {
      if (source?.url && !unique.has(source.url)) unique.set(source.url, { name: source.name, url: source.url });
    }
  }
  return [...unique.values()].slice(0, 5);
}

module.exports = { listPublished, getFilterOptions, getPublishedGuide, getDownloadUrl, getApprovedSourcesForTopic, getRelevantLearningMaterialsForTopic };
