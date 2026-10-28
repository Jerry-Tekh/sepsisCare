const { z } = require("zod");

const patientParamSchema = z.object({ patientId: z.string().min(1) });
const eventParamSchema = z.object({ patientId: z.string().min(1), eventId: z.string().min(1) });
const timestamp = z.string().datetime({ offset: true });
const notInFuture = (value) => new Date(value) <= new Date(Date.now() + 5 * 60_000);

const createEventSchema = z.object({
  recognizedAt: timestamp,
  arrivedAt: timestamp.optional(),
}).refine((data) => !data.arrivedAt || new Date(data.arrivedAt) >= new Date(data.recognizedAt), {
  message: "Arrival time must be at or after the warning sign was recognized.",
  path: ["arrivedAt"],
}).refine((data) => notInFuture(data.recognizedAt) && (!data.arrivedAt || notInFuture(data.arrivedAt)), {
  message: "Event times cannot be in the future.",
});

const recordArrivalSchema = z.object({ arrivedAt: timestamp }).refine((data) => notInFuture(data.arrivedAt), {
  message: "Arrival time cannot be in the future.",
  path: ["arrivedAt"],
});

module.exports = { patientParamSchema, eventParamSchema, createEventSchema, recordArrivalSchema };
