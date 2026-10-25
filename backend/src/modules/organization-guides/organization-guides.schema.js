const { z } = require("zod");

const tagsSchema = z.array(z.string().trim().min(1).max(80)).max(20).default([]);
const sourceIdsSchema = z.array(z.string().uuid()).max(20).default([]);

const guideUploadSchema = z.object({
  title: z.string().trim().min(2).max(160),
  prognosisVector: z.string().trim().min(1).max(120),
  details: z.string().trim().min(2).max(500),
  tags: tagsSchema,
  sourceIds: sourceIdsSchema,
  status: z.enum(["DRAFT", "PUBLISHED"]).default("PUBLISHED"),
});

const updateGuideSchema = z.object({
  title: z.string().trim().min(2).max(160).optional(),
  prognosisVector: z.string().trim().min(1).max(120).optional(),
  details: z.string().trim().min(2).max(500).optional(),
  tags: tagsSchema.optional(),
  sourceIds: sourceIdsSchema.optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
}).refine((value) => Object.keys(value).length > 0, "At least one field is required");

const sourceSchema = z.object({
  name: z.string().trim().min(2).max(160),
  url: z.url().max(2048),
  notes: z.string().trim().max(500).optional().default(""),
  approve: z.coerce.boolean().default(false),
});

const sourceStatusSchema = z.object({ status: z.enum(["PENDING", "APPROVED", "REJECTED"]) });
const idParamSchema = z.object({ id: z.string().uuid() });

module.exports = { guideUploadSchema, updateGuideSchema, sourceSchema, sourceStatusSchema, idParamSchema };
