const { z } = require("zod");

const startQuerySchema = z.object({
  question: z.string().min(3, "Question must be at least 3 characters").max(1000),
});

const sendMessageSchema = z.object({
  message: z.string().min(1, "Message cannot be empty").max(1000),
});

const queryIdParamSchema = z.object({
  queryId: z.string().min(1),
});

module.exports = { startQuerySchema, sendMessageSchema, queryIdParamSchema };
