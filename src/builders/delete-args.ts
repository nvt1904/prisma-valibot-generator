import { DMMF } from '@prisma/generator-helper';

/**
 * Generates Delete args schema
 */
export function generateDeleteArgsSchema(model: DMMF.Model): string {
  const schemaName = `${model.name}DeleteArgsSchema`;

  return `export const ${schemaName}: v.GenericSchema<Prisma.${model.name}DeleteArgs> = v.lazy(() => v.object({
  select: v.optional(${model.name}SelectSchema),
  include: v.optional(${model.name}IncludeSchema),
  where: ${model.name}WhereUniqueInputSchema,
}));
`;
}

/**
 * Generates DeleteMany args schema
 */
export function generateDeleteManyArgsSchema(model: DMMF.Model): string {
  const schemaName = `${model.name}DeleteManyArgsSchema`;

  return `export const ${schemaName}: v.GenericSchema<Prisma.${model.name}DeleteManyArgs> = v.lazy(() => v.object({
  where: v.optional(${model.name}WhereInputSchema),
}));
`;
}
