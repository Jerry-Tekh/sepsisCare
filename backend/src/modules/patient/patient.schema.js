const { z } = require("zod");

const createPatientSchema = z.object({
  fullName: z.string().min(2).max(120),
  age: z.coerce.number().int().min(0).max(130),
  gender: z.string().min(1).max(40),
  location: z.string().max(200).optional(),
  relationshipToCaregiver: z.string().min(1).max(80),
});

const updatePatientSchema = createPatientSchema.partial();

const patientIdParamSchema = z.object({
  id: z.string().min(1),
});

module.exports = { createPatientSchema, updatePatientSchema, patientIdParamSchema };
