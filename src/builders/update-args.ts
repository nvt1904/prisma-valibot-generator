import { DMMF } from '@prisma/generator-helper';
import { getValibotType } from '../utils/type-mapping';

/**
 * Generates Update args schema
 */
export function generateUpdateArgsSchema(model: DMMF.Model): string {
  const schemaName = `${model.name}UpdateArgsSchema`;

  return `export const ${schemaName}: v.GenericSchema<Prisma.${model.name}UpdateArgs> = v.lazy(() => v.object({
  select: v.optional(${model.name}SelectSchema),
  include: v.optional(${model.name}IncludeSchema),
  data: ${model.name}UpdateInputSchema,
  where: ${model.name}WhereUniqueInputSchema,
}));
`;
}

/**
 * Generates UpdateInput schema
 */
export function generateUpdateInputSchema(model: DMMF.Model): string {
  const schemaName = `${model.name}UpdateInputSchema`;
  const fields: string[] = [];

  for (const field of model.fields) {
    if (field.kind === 'object') {
      // Relation fields
      if (field.isList) {
        fields.push(
          `  ${field.name}: v.optional(v.lazy(() => ${field.type}UpdateManyNestedInputSchema)),`
        );
      } else {
        fields.push(
          `  ${field.name}: v.optional(v.lazy(() => ${field.type}UpdateOneNestedInputSchema)),`
        );
      }
    } else {
      // Scalar/enum fields - all optional in update
      const valibotType =
        field.kind === 'enum'
          ? `v.picklist(${field.type}Enum)`
          : getValibotType(field.type, field.isList);

      fields.push(`  ${field.name}: v.optional(${valibotType}),`);
    }
  }

  return `export const ${schemaName}: v.GenericSchema = v.lazy(() => v.object({
${fields.join('\n')}
}));
`;
}

/**
 * Generates UpdateManyNested input schema for list relations
 */
export function generateUpdateManyNestedInputSchema(model: DMMF.Model): string {
  return `export const ${model.name}UpdateManyNestedInputSchema: v.GenericSchema = v.lazy(() => v.object({
  create: v.optional(v.union([v.lazy(() => ${model.name}CreateInputSchema), v.array(v.lazy(() => ${model.name}CreateInputSchema))])),
  connectOrCreate: v.optional(v.union([v.lazy(() => ${model.name}CreateOrConnectInputSchema), v.array(v.lazy(() => ${model.name}CreateOrConnectInputSchema))])),
  upsert: v.optional(v.union([v.lazy(() => ${model.name}UpsertWithWhereUniqueInputSchema), v.array(v.lazy(() => ${model.name}UpsertWithWhereUniqueInputSchema))])),
  set: v.optional(v.union([${model.name}WhereUniqueInputSchema, v.array(${model.name}WhereUniqueInputSchema)])),
  disconnect: v.optional(v.union([${model.name}WhereUniqueInputSchema, v.array(${model.name}WhereUniqueInputSchema)])),
  delete: v.optional(v.union([${model.name}WhereUniqueInputSchema, v.array(${model.name}WhereUniqueInputSchema)])),
  connect: v.optional(v.union([${model.name}WhereUniqueInputSchema, v.array(${model.name}WhereUniqueInputSchema)])),
  update: v.optional(v.union([v.lazy(() => ${model.name}UpdateWithWhereUniqueInputSchema), v.array(v.lazy(() => ${model.name}UpdateWithWhereUniqueInputSchema))])),
  updateMany: v.optional(v.union([v.lazy(() => ${model.name}UpdateManyWithWhereInputSchema), v.array(v.lazy(() => ${model.name}UpdateManyWithWhereInputSchema))])),
  deleteMany: v.optional(v.union([v.lazy(() => ${model.name}WhereInputSchema), v.array(v.lazy(() => ${model.name}WhereInputSchema))])),
}));
`;
}

/**
 * Generates UpdateOneNested input schema for single relations
 */
export function generateUpdateOneNestedInputSchema(model: DMMF.Model): string {
  return `export const ${model.name}UpdateOneNestedInputSchema: v.GenericSchema = v.lazy(() => v.object({
  create: v.optional(v.lazy(() => ${model.name}CreateInputSchema)),
  connectOrCreate: v.optional(v.lazy(() => ${model.name}CreateOrConnectInputSchema)),
  upsert: v.optional(v.lazy(() => ${model.name}UpsertInputSchema)),
  disconnect: v.optional(v.boolean()),
  delete: v.optional(v.boolean()),
  connect: v.optional(${model.name}WhereUniqueInputSchema),
  update: v.optional(v.lazy(() => ${model.name}UpdateInputSchema)),
}));
`;
}

/**
 * Generates UpsertWithWhereUnique input schema
 */
export function generateUpsertWithWhereUniqueInputSchema(model: DMMF.Model): string {
  return `export const ${model.name}UpsertWithWhereUniqueInputSchema: v.GenericSchema = v.lazy(() => v.object({
  where: ${model.name}WhereUniqueInputSchema,
  update: v.lazy(() => ${model.name}UpdateInputSchema),
  create: v.lazy(() => ${model.name}CreateInputSchema),
}));
`;
}

/**
 * Generates Upsert input schema for single relations
 */
export function generateUpsertInputSchema(model: DMMF.Model): string {
  return `export const ${model.name}UpsertInputSchema: v.GenericSchema = v.lazy(() => v.object({
  update: v.lazy(() => ${model.name}UpdateInputSchema),
  create: v.lazy(() => ${model.name}CreateInputSchema),
}));
`;
}

/**
 * Generates UpdateWithWhereUnique input schema
 */
export function generateUpdateWithWhereUniqueInputSchema(model: DMMF.Model): string {
  return `export const ${model.name}UpdateWithWhereUniqueInputSchema: v.GenericSchema = v.lazy(() => v.object({
  where: ${model.name}WhereUniqueInputSchema,
  data: v.lazy(() => ${model.name}UpdateInputSchema),
}));
`;
}

/**
 * Generates UpdateManyWithWhere input schema
 */
export function generateUpdateManyWithWhereInputSchema(model: DMMF.Model): string {
  return `export const ${model.name}UpdateManyWithWhereInputSchema: v.GenericSchema = v.lazy(() => v.object({
  where: v.lazy(() => ${model.name}WhereInputSchema),
  data: v.lazy(() => ${model.name}UpdateManyMutationInputSchema),
}));
`;
}

/**
 * Generates UpdateMany args schema
 */
export function generateUpdateManyArgsSchema(model: DMMF.Model): string {
  const schemaName = `${model.name}UpdateManyArgsSchema`;

  return `export const ${schemaName}: v.GenericSchema<Prisma.${model.name}UpdateManyArgs> = v.lazy(() => v.object({
  data: ${model.name}UpdateManyMutationInputSchema,
  where: v.optional(${model.name}WhereInputSchema),
}));
`;
}

/**
 * Generates UpdateManyMutation input schema (without relations)
 */
export function generateUpdateManyMutationInputSchema(model: DMMF.Model): string {
  const schemaName = `${model.name}UpdateManyMutationInputSchema`;
  const fields: string[] = [];

  for (const field of model.fields) {
    // Skip relation fields
    if (field.kind === 'object') continue;

    const valibotType =
      field.kind === 'enum'
        ? `v.picklist(${field.type}Enum)`
        : getValibotType(field.type, field.isList);

    fields.push(`  ${field.name}: v.optional(${valibotType}),`);
  }

  return `export const ${schemaName}: v.GenericSchema = v.lazy(() => v.object({
${fields.join('\n')}
}));
`;
}

/**
 * Generates Upsert args schema
 */
export function generateUpsertArgsSchema(model: DMMF.Model): string {
  const schemaName = `${model.name}UpsertArgsSchema`;

  return `export const ${schemaName}: v.GenericSchema<Prisma.${model.name}UpsertArgs> = v.lazy(() => v.object({
  select: v.optional(${model.name}SelectSchema),
  include: v.optional(${model.name}IncludeSchema),
  where: ${model.name}WhereUniqueInputSchema,
  create: v.lazy(() => ${model.name}CreateInputSchema),
  update: v.lazy(() => ${model.name}UpdateInputSchema),
}));
`;
}
