const { z } = require("zod");

// Plausibility bounds only — they reject typos (e.g. 370 °C), not abnormal values.
const createVitalSchema = z
  .object({
    recordedAt:       z.coerce.date().optional(),
    temperatureC:     z.number().min(25).max(45).nullable().optional(),
    heartRate:        z.number().int().min(20).max(250).nullable().optional(),
    respiratoryRate:  z.number().int().min(4).max(70).nullable().optional(),
    systolicBP:       z.number().int().min(50).max(260).nullable().optional(),
    diastolicBP:      z.number().int().min(20).max(160).nullable().optional(),
    oxygenSaturation: z.number().int().min(50).max(100).nullable().optional(),
    notes:            z.string().trim().max(1000).optional(),
  })
  .refine(
    (v) => ["temperatureC", "heartRate", "respiratoryRate", "systolicBP", "oxygenSaturation"]
      .some((k) => v[k] !== null && v[k] !== undefined),
    { message: "Enter at least one vital sign" }
  )
  .refine((v) => !v.recordedAt || v.recordedAt <= new Date(Date.now() + 5 * 60 * 1000), {
    message: "Reading time cannot be in the future",
    path: ["recordedAt"],
  });

const symptom = z.boolean().optional().default(false);

const createCheckInSchema = z.object({
  feverOrChills:     symptom,
  confusion:         symptom,
  breathingTrouble:  symptom,
  skinChanges:       symptom,
  severePain:        symptom,
  reducedUrine:      symptom,
  woundWorse:        symptom,
  notEatingDrinking: symptom,
  feelsWorse:        symptom,
  notes:             z.string().trim().max(1000).optional(),
});

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional().default(60),
});

const entryIdParamSchema = z.object({
  entryId: z.string().min(1),
});

module.exports = { createVitalSchema, createCheckInSchema, listQuerySchema, entryIdParamSchema };
