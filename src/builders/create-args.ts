import { DMMF } from '@prisma/generator-helper';
import { getValibotType, wrapOptional } from '../utils/type-mapping';

/**
 * Generates Create args schema
 */
export function generateCreateArgsSchema(model: DMMF.Model): string {
  const schemaName = `${model.name}CreateArgsSchema`;

  return `export const ${schemaName}: v.GenericSchema<Prisma.${model.name}CreateArgs> = v.object({
  select: v.optional(${model.name}SelectSchema),
  include: v.optional(${model.name}IncludeSchema),
  data: ${model.name}CreateInputSchema,
});
`;
}

/**
 * Generates CreateInput schema
 */
export function generateCreateInputSchema(model: DMMF.Model): string {
  const schemaName = `${model.name}CreateInputSchema`;
  const fields: string[] = [];

  for (const field of model.fields) {
    if (field.kind === 'object') {
      // Relation fields
      if (field.isList) {
        fields.push(
          `  ${field.name}: v.optional(v.lazy(() => ${field.type}CreateNestedManyInputSchema)),`
        );
      } else {
        fields.push(
          `  ${field.name}: v.optional(v.lazy(() => ${field.type}CreateNestedOneInputSchema)),`
        );
      }
    } else {
      // Scalar/enum fields
      const valibotType =
        field.kind === 'enum'
          ? `v.picklist(${field.type}Enum)`
          : getValibotType(field.type, field.isList);

      const wrappedType = wrapOptional(valibotType, field.isRequired && !field.hasDefaultValue);
      fields.push(`  ${field.name}: ${wrappedType},`);
    }
  }

  return `export const ${schemaName} = v.object({
${fields.join('\n')}
});
`;
}

/**
 * Generates CreateNestedMany input schema for list relations
 */
export function generateCreateNestedManyInputSchema(model: DMMF.Model): string {
  return `export const ${model.name}CreateNestedManyInputSchema: v.GenericSchema = v.lazy(() => v.object({
  create: v.optional(v.union([v.lazy(() => ${model.name}CreateInputSchema), v.array(v.lazy(() => ${model.name}CreateInputSchema))])),
  connectOrCreate: v.optional(v.union([v.lazy(() => ${model.name}CreateOrConnectInputSchema), v.array(v.lazy(() => ${model.name}CreateOrConnectInputSchema))])),
  connect: v.optional(v.union([${model.name}WhereUniqueInputSchema, v.array(${model.name}WhereUniqueInputSchema)])),
}));
`;
}

/**
 * Generates CreateNestedOne input schema for single relations
 */
export function generateCreateNestedOneInputSchema(model: DMMF.Model): string {
  return `export const ${model.name}CreateNestedOneInputSchema: v.GenericSchema = v.lazy(() => v.object({
  create: v.optional(v.lazy(() => ${model.name}CreateInputSchema)),
  connectOrCreate: v.optional(v.lazy(() => ${model.name}CreateOrConnectInputSchema)),
  connect: v.optional(${model.name}WhereUniqueInputSchema),
}));
`;
}

/**
 * Generates CreateOrConnect input schema
 */
export function generateCreateOrConnectInputSchema(model: DMMF.Model): string {
  return `export const ${model.name}CreateOrConnectInputSchema: v.GenericSchema = v.lazy(() => v.object({
  where: ${model.name}WhereUniqueInputSchema,
  create: v.lazy(() => ${model.name}CreateInputSchema),
}));
`;
}

/**
 * Generates CreateMany args schema
 */
export function generateCreateManyArgsSchema(model: DMMF.Model): string {
  const schemaName = `${model.name}CreateManyArgsSchema`;

  return `export const ${schemaName}: v.GenericSchema<Prisma.${model.name}CreateManyArgs> = v.object({
  data: v.union([${model.name}CreateManyInputSchema, v.array(${model.name}CreateManyInputSchema)]),
  skipDuplicates: v.optional(v.boolean()),
});
`;
}

/**
 * Generates CreateManyInput schema (without relations)
 */
export function generateCreateManyInputSchema(model: DMMF.Model): string {
  const schemaName = `${model.name}CreateManyInputSchema`;
  const fields: string[] = [];

  for (const field of model.fields) {
    // Skip relation fields in createMany
    if (field.kind === 'object') continue;

    const valibotType =
      field.kind === 'enum'
        ? `v.picklist(${field.type}Enum)`
        : getValibotType(field.type, field.isList);

    const wrappedType = wrapOptional(valibotType, field.isRequired && !field.hasDefaultValue);
    fields.push(`  ${field.name}: ${wrappedType},`);
  }

  return `export const ${schemaName} = v.object({
${fields.join('\n')}
});
`;
}
