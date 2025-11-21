import { DMMF } from '@prisma/generator-helper';

/**
 * Generates FindMany args schema
 */
export function generateFindManyArgsSchema(model: DMMF.Model): string {
  const schemaName = `${model.name}FindManyArgsSchema`;

  return `export const ${schemaName}: v.GenericSchema<Prisma.${model.name}FindManyArgs> = v.lazy(() => v.object({
  select: v.optional(${model.name}SelectSchema),
  include: v.optional(${model.name}IncludeSchema),
  where: v.optional(${model.name}WhereInputSchema),
  orderBy: v.optional(v.union([${model.name}OrderByInputSchema, v.array(${model.name}OrderByInputSchema)])),
  cursor: v.optional(${model.name}WhereUniqueInputSchema),
  take: v.optional(v.number()),
  skip: v.optional(v.number()),
  distinct: v.optional(v.array(v.picklist(Object.keys(${model.name}ScalarFieldEnum) as [string, ...string[]]))),
}));
`;
}

/**
 * Generates FindFirst args schema
 */
export function generateFindFirstArgsSchema(model: DMMF.Model): string {
  const schemaName = `${model.name}FindFirstArgsSchema`;

  return `export const ${schemaName}: v.GenericSchema<Prisma.${model.name}FindFirstArgs> = v.lazy(() => v.object({
  select: v.optional(${model.name}SelectSchema),
  include: v.optional(${model.name}IncludeSchema),
  where: v.optional(${model.name}WhereInputSchema),
  orderBy: v.optional(v.union([${model.name}OrderByInputSchema, v.array(${model.name}OrderByInputSchema)])),
  cursor: v.optional(${model.name}WhereUniqueInputSchema),
  take: v.optional(v.number()),
  skip: v.optional(v.number()),
  distinct: v.optional(v.array(v.picklist(Object.keys(${model.name}ScalarFieldEnum) as [string, ...string[]]))),
}));
`;
}

/**
 * Generates FindUnique args schema
 */
export function generateFindUniqueArgsSchema(model: DMMF.Model): string {
  const schemaName = `${model.name}FindUniqueArgsSchema`;

  return `export const ${schemaName}: v.GenericSchema<Prisma.${model.name}FindUniqueArgs> = v.lazy(() => v.object({
  select: v.optional(${model.name}SelectSchema),
  include: v.optional(${model.name}IncludeSchema),
  where: ${model.name}WhereUniqueInputSchema,
}));
`;
}

/**
 * Generates generic Args schema (used for nested relations)
 */
export function generateArgsSchema(model: DMMF.Model): string {
  const schemaName = `${model.name}ArgsSchema`;

  return `export const ${schemaName}: v.GenericSchema<Prisma.${model.name}DefaultArgs> = v.lazy(() => v.object({
  select: v.optional(${model.name}SelectSchema),
  include: v.optional(${model.name}IncludeSchema),
}));
`;
}
