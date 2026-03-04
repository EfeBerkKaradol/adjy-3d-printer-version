import { z } from "zod";

export const createParameterSchema = z.object({
  name: z
    .string()
    .min(1, "Parametre adı zorunludur")
    .max(50)
    .regex(
      /^[a-zA-Z][a-zA-Z0-9_]*$/,
      "Parametre adı harf ile başlamalı, sadece harf, rakam ve _ içermeli"
    ),
  displayName: z.string().min(1, "Görüntüleme adı zorunludur").max(100),
  type: z.enum(["SLIDER", "DROPDOWN", "COLOR", "TEXT", "NUMBER"]),
  minValue: z.number().nullable().optional(),
  maxValue: z.number().nullable().optional(),
  defaultValue: z.string(),
  step: z.number().positive().nullable().optional(),
  unit: z.string().max(20).nullable().optional(),
  affectsPrice: z.boolean().default(false),
  priceFormula: z.string().nullable().optional(),
  affectsGeometry: z.boolean().default(true),
  validationRules: z
    .object({
      options: z.array(z.string()).optional(),
      maxLength: z.number().int().positive().optional(),
      minLength: z.number().int().nonnegative().optional(),
    })
    .nullable()
    .optional(),
  sortOrder: z.number().int().nonnegative().default(0),
});

export const updateParameterSchema = createParameterSchema.partial();

export const reorderParametersSchema = z.array(
  z.object({
    id: z.string(),
    sortOrder: z.number().int().nonnegative(),
  })
);

export type CreateParameterInput = z.infer<typeof createParameterSchema>;
export type UpdateParameterInput = z.infer<typeof updateParameterSchema>;
