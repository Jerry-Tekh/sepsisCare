const { z } = require("zod");

const searchSchema = z.object({
  q: z.string().trim().max(120).optional(),
  vector: z.string().trim().max(120).optional(),
  detail: z.string().trim().max(180).optional(),
  tag: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

const guideIdSchema = z.object({ guideId: z.string().uuid() });

module.exports = { searchSchema, guideIdSchema };
