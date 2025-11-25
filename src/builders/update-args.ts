import { DMMF } from '@prisma/generator-helper';
import { getValibotType } from '../utils/type-mapping';

/**
 * Helper function to find the reverse relation field name
 * For a many-to-many or one-to-many relation, finds the field name on the other side
 */
function findReverseRelationFieldName(
  currentModel: DMMF.Model,
  field: DMMF.Field,
  allModels: readonly DMMF.Model[]
): string {
  // Find the related model
  const relatedModel = allModels.find((m) => m.name === field.type);
  if (!relatedModel) {
    return currentModel.name; // Fallback
  }

  // Find all fields in the related model that could be the reverse
  const candidateFields = relatedModel.fields.filter(
    (f) =>
      f.kind === 'object' &&
      f.type === currentModel.name &&
      f.relationName === field.relationName &&
      f.name !== field.name // Exclude self in self-referential relations
  );

  // If we have multiple candidates, prefer matching list-ness
  if (candidateFields.length > 1) {
    const matchingListness = candidateFields.find((f) => f.isList === field.isList);
    if (matchingListness) {
      return matchingListness.name;
    }
  }

  // Return the first (or only) candidate
  if (candidateFields.length > 0) {
    return candidateFields[0].name;
  }

  // Fallback to current model name
  return currentModel.name;
}

/**
 * Generates Update args schema
 */
export function generateUpdateArgsSchema(model: DMMF.Model): string {
  const schemaName = `${model.name}UpdateArgsSchema`;

  return `export const ${schemaName}: v.GenericSchema<Prisma.${model.name}UpdateArgs> = v.lazy(() => v.object({
  select: v.optional(${model.name}SelectSchema),
  include: v.optional(${model.name}IncludeSchema),
  data: v.union([${model.name}UpdateInputSchema, ${model.name}UncheckedUpdateInputSchema]),
  where: ${model.name}WhereUniqueInputSchema,
}));
`;
}

/**
 * Generates UpdateInput schema (with nested relations)
 */
export function generateUpdateInputSchema(
  model: DMMF.Model,
  allModels: readonly DMMF.Model[]
): string {
  const schemaName = `${model.name}UpdateInputSchema`;
  const fields: string[] = [];

  for (const field of model.fields) {
    if (field.kind === 'object') {
      // Relation fields - use context-specific nested update schemas
      const reverseFieldName = findReverseRelationFieldName(model, field, allModels);
      const reverseFieldCapitalized =
        reverseFieldName.charAt(0).toUpperCase() + reverseFieldName.slice(1);

      if (field.isList) {
        fields.push(
          `  ${field.name}: v.optional(v.lazy(() => ${field.type}UpdateManyWithout${reverseFieldCapitalized}NestedInputSchema)),`
        );
      } else {
        fields.push(
          `  ${field.name}: v.optional(v.lazy(() => ${field.type}UpdateOneWithout${reverseFieldCapitalized}NestedInputSchema)),`
        );
      }
    } else {
      // Skip foreign key fields if there's a corresponding relation
      const isRelationForeignKey = model.fields.some(
        (f) => f.kind === 'object' && f.relationFromFields?.includes(field.name)
      );
      if (isRelationForeignKey) continue;

      // Scalar/enum fields - all optional in update
      let valibotType =
        field.kind === 'enum'
          ? field.isList
            ? `v.array(v.picklist(${field.type}Enum))`
            : `v.picklist(${field.type}Enum)`
          : getValibotType(field.type, field.isList);

      // Wrap with v.nullable() if field is nullable
      if (!field.isRequired) {
        valibotType = `v.nullable(${valibotType})`;
      }

      fields.push(`  ${field.name}: v.optional(${valibotType}),`);
    }
  }

  return `export const ${schemaName}: v.GenericSchema<Prisma.${model.name}UpdateInput> = v.lazy(() => v.object({
${fields.join('\n')}
}));
`;
}

/**
 * Generates UncheckedUpdateInput schema (with foreign key IDs instead of relations)
 */
export function generateUncheckedUpdateInputSchema(model: DMMF.Model): string {
  const schemaName = `${model.name}UncheckedUpdateInputSchema`;
  const fields: string[] = [];

  for (const field of model.fields) {
    if (field.kind === 'object') {
      // For UncheckedUpdateInput, exclude all relations (use foreign keys instead)
      continue;
    }

    // Include all scalar/enum fields (including foreign keys)
    let valibotType =
      field.kind === 'enum'
        ? field.isList
          ? `v.array(v.picklist(${field.type}Enum))`
          : `v.picklist(${field.type}Enum)`
        : getValibotType(field.type, field.isList);

    // Wrap with v.nullable() if field is nullable
    if (!field.isRequired) {
      valibotType = `v.nullable(${valibotType})`;
    }

    fields.push(`  ${field.name}: v.optional(${valibotType}),`);
  }

  return `export const ${schemaName}: v.GenericSchema<Prisma.${model.name}UncheckedUpdateInput> = v.lazy(() => v.object({
${fields.join('\n')}
}));
`;
}

/**
 * Generates UpdateManyNested input schema for list relations
 */
export function generateUpdateManyNestedInputSchema(model: DMMF.Model): string {
  return `export const ${model.name}UpdateManyNestedInputSchema = v.lazy(() => v.object({
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
  return `export const ${model.name}UpdateOneNestedInputSchema = v.lazy(() => v.object({
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
  return `export const ${model.name}UpsertWithWhereUniqueInputSchema = v.lazy(() => v.object({
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
  return `export const ${model.name}UpsertInputSchema = v.lazy(() => v.object({
  update: v.lazy(() => ${model.name}UpdateInputSchema),
  create: v.lazy(() => ${model.name}CreateInputSchema),
}));
`;
}

/**
 * Generates UpdateWithWhereUnique input schema
 */
export function generateUpdateWithWhereUniqueInputSchema(model: DMMF.Model): string {
  return `export const ${model.name}UpdateWithWhereUniqueInputSchema = v.lazy(() => v.object({
  where: ${model.name}WhereUniqueInputSchema,
  data: v.lazy(() => ${model.name}UpdateInputSchema),
}));
`;
}

/**
 * Generates UpdateManyWithWhere input schema
 */
export function generateUpdateManyWithWhereInputSchema(model: DMMF.Model): string {
  return `export const ${model.name}UpdateManyWithWhereInputSchema = v.lazy(() => v.object({
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
        ? field.isList
          ? `v.array(v.picklist(${field.type}Enum))`
          : `v.picklist(${field.type}Enum)`
        : getValibotType(field.type, field.isList);

    fields.push(`  ${field.name}: v.optional(${valibotType}),`);
  }

  return `export const ${schemaName}: v.GenericSchema<Prisma.${model.name}UpdateManyMutationInput> = v.lazy(() => v.object({
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

/**
 * Generates UpdateWithout input schemas for each relation context
 * Example: ProductUpdateWithoutPersonalizationsInput
 */
export function generateUpdateWithoutInputSchemas(
  model: DMMF.Model,
  allModels: readonly DMMF.Model[]
): string {
  let output = '';

  // Find all relation fields in this model
  const relationFields = model.fields.filter((f) => f.kind === 'object');

  if (relationFields.length === 0) {
    return output;
  }

  // Generate an UpdateWithout schema for each relation
  for (const excludedField of relationFields) {
    const fields: string[] = [];

    for (const field of model.fields) {
      // Skip the excluded relation field
      if (field.name === excludedField.name) continue;

      if (field.kind === 'object') {
        // Other relation fields - use nested update schemas
        const reverseFieldName = findReverseRelationFieldName(model, field, allModels);
        const reverseFieldCapitalized =
          reverseFieldName.charAt(0).toUpperCase() + reverseFieldName.slice(1);

        if (field.isList) {
          fields.push(
            `  ${field.name}: v.optional(v.lazy(() => ${field.type}UpdateManyWithout${reverseFieldCapitalized}NestedInputSchema)),`
          );
        } else {
          fields.push(
            `  ${field.name}: v.optional(v.lazy(() => ${field.type}UpdateOneWithout${reverseFieldCapitalized}NestedInputSchema)),`
          );
        }
        continue;
      }

      // Skip foreign key fields if there's a corresponding relation
      const isRelationForeignKey = model.fields.some(
        (f) => f.kind === 'object' && f.relationFromFields?.includes(field.name)
      );
      if (isRelationForeignKey) continue;

      // Scalar/enum fields - all optional in update
      let valibotType =
        field.kind === 'enum'
          ? field.isList
            ? `v.array(v.picklist(${field.type}Enum))`
            : `v.picklist(${field.type}Enum)`
          : getValibotType(field.type, field.isList);

      if (!field.isRequired) {
        valibotType = `v.nullable(${valibotType})`;
      }

      fields.push(`  ${field.name}: v.optional(${valibotType}),`);
    }

    const excludedFieldCapitalized =
      excludedField.name.charAt(0).toUpperCase() + excludedField.name.slice(1);
    output += `export const ${model.name}UpdateWithout${excludedFieldCapitalized}InputSchema: v.GenericSchema<Prisma.${model.name}UpdateWithout${excludedFieldCapitalized}Input> = v.lazy(() => v.object({
${fields.join('\n')}
}));

`;
  }

  return output;
}

/**
 * Generates UncheckedUpdateWithout input schemas for each relation context
 * Example: ProductUncheckedUpdateWithoutPersonalizationsInput
 */
export function generateUncheckedUpdateWithoutInputSchemas(model: DMMF.Model): string {
  let output = '';

  // Find all relation fields in this model
  const relationFields = model.fields.filter((f) => f.kind === 'object');

  if (relationFields.length === 0) {
    return output;
  }

  // Generate an UncheckedUpdateWithout schema for each relation
  for (const excludedField of relationFields) {
    const fields: string[] = [];

    for (const field of model.fields) {
      // Skip the excluded relation field
      if (field.name === excludedField.name) continue;

      if (field.kind === 'object') {
        // Skip all relations in unchecked mode
        continue;
      }

      // Include all scalar/enum fields (including foreign keys)
      let valibotType =
        field.kind === 'enum'
          ? field.isList
            ? `v.array(v.picklist(${field.type}Enum))`
            : `v.picklist(${field.type}Enum)`
          : getValibotType(field.type, field.isList);

      if (!field.isRequired) {
        valibotType = `v.nullable(${valibotType})`;
      }

      fields.push(`  ${field.name}: v.optional(${valibotType}),`);
    }

    const excludedFieldCapitalized =
      excludedField.name.charAt(0).toUpperCase() + excludedField.name.slice(1);
    output += `export const ${model.name}UncheckedUpdateWithout${excludedFieldCapitalized}InputSchema: v.GenericSchema<Prisma.${model.name}UncheckedUpdateWithout${excludedFieldCapitalized}Input> = v.lazy(() => v.object({
${fields.join('\n')}
}));

`;
  }

  return output;
}

/**
 * Generates UpdateOneWithout nested input schemas
 * Example: ProductSEOUpdateOneWithoutProductNestedInput
 */
export function generateUpdateOneNestedWithoutInputSchemas(
  model: DMMF.Model,
  allModels: readonly DMMF.Model[]
): string {
  let output = '';

  // For each model that has a single relation TO this model, generate WithoutX schema
  for (const otherModel of allModels) {
    for (const field of otherModel.fields) {
      if (field.kind === 'object' && field.type === model.name && !field.isList) {
        // Find reverse field (exclude same field name for self-referential relations)
        const reverseField = model.fields.find(
          (f) =>
            f.kind === 'object' &&
            f.type === otherModel.name &&
            f.relationName === field.relationName &&
            f.name !== field.name
        );
        const reverseFieldName = reverseField ? reverseField.name : otherModel.name;
        const reverseFieldCapitalized =
          reverseFieldName.charAt(0).toUpperCase() + reverseFieldName.slice(1);

        output += `export const ${model.name}UpdateOneWithout${reverseFieldCapitalized}NestedInputSchema = v.lazy(() => v.object({
  create: v.optional(v.union([v.lazy(() => ${model.name}CreateWithout${reverseFieldCapitalized}InputSchema), v.lazy(() => ${model.name}UncheckedCreateWithout${reverseFieldCapitalized}InputSchema)])),
  connectOrCreate: v.optional(v.lazy(() => ${model.name}CreateOrConnectWithout${reverseFieldCapitalized}InputSchema)),
  upsert: v.optional(v.lazy(() => ${model.name}UpsertWithout${reverseFieldCapitalized}InputSchema)),
  disconnect: v.optional(v.boolean()),
  delete: v.optional(v.boolean()),
  connect: v.optional(${model.name}WhereUniqueInputSchema),
  update: v.optional(v.union([v.lazy(() => ${model.name}UpdateWithout${reverseFieldCapitalized}InputSchema), v.lazy(() => ${model.name}UncheckedUpdateWithout${reverseFieldCapitalized}InputSchema)])),
}));

`;
      }
    }
  }

  return output;
}

/**
 * Generates UpdateManyWithout nested input schemas
 * Example: ProductPersonalizationUpdateManyWithoutProductNestedInput
 */
export function generateUpdateManyNestedWithoutInputSchemas(
  model: DMMF.Model,
  allModels: readonly DMMF.Model[]
): string {
  let output = '';

  // For each model that has a list relation TO this model, generate WithoutX schema
  for (const otherModel of allModels) {
    for (const field of otherModel.fields) {
      if (field.kind === 'object' && field.type === model.name && field.isList) {
        // Find reverse field (exclude same field name for self-referential relations)
        const reverseField = model.fields.find(
          (f) =>
            f.kind === 'object' &&
            f.type === otherModel.name &&
            f.relationName === field.relationName &&
            f.name !== field.name
        );
        const reverseFieldName = reverseField ? reverseField.name : otherModel.name;
        const reverseFieldCapitalized =
          reverseFieldName.charAt(0).toUpperCase() + reverseFieldName.slice(1);

        output += `export const ${model.name}UpdateManyWithout${reverseFieldCapitalized}NestedInputSchema = v.lazy(() => v.object({
  create: v.optional(v.union([v.lazy(() => ${model.name}CreateWithout${reverseFieldCapitalized}InputSchema), v.lazy(() => ${model.name}UncheckedCreateWithout${reverseFieldCapitalized}InputSchema), v.array(v.lazy(() => ${model.name}CreateWithout${reverseFieldCapitalized}InputSchema)), v.array(v.lazy(() => ${model.name}UncheckedCreateWithout${reverseFieldCapitalized}InputSchema))])),
  connectOrCreate: v.optional(v.union([v.lazy(() => ${model.name}CreateOrConnectWithout${reverseFieldCapitalized}InputSchema), v.array(v.lazy(() => ${model.name}CreateOrConnectWithout${reverseFieldCapitalized}InputSchema))])),
  upsert: v.optional(v.union([v.lazy(() => ${model.name}UpsertWithWhereUniqueWithout${reverseFieldCapitalized}InputSchema), v.array(v.lazy(() => ${model.name}UpsertWithWhereUniqueWithout${reverseFieldCapitalized}InputSchema))])),
  set: v.optional(v.union([${model.name}WhereUniqueInputSchema, v.array(${model.name}WhereUniqueInputSchema)])),
  disconnect: v.optional(v.union([${model.name}WhereUniqueInputSchema, v.array(${model.name}WhereUniqueInputSchema)])),
  delete: v.optional(v.union([${model.name}WhereUniqueInputSchema, v.array(${model.name}WhereUniqueInputSchema)])),
  connect: v.optional(v.union([${model.name}WhereUniqueInputSchema, v.array(${model.name}WhereUniqueInputSchema)])),
  update: v.optional(v.union([v.lazy(() => ${model.name}UpdateWithWhereUniqueWithout${reverseFieldCapitalized}InputSchema), v.array(v.lazy(() => ${model.name}UpdateWithWhereUniqueWithout${reverseFieldCapitalized}InputSchema))])),
  updateMany: v.optional(v.union([v.lazy(() => ${model.name}UpdateManyWithWhereWithout${reverseFieldCapitalized}InputSchema), v.array(v.lazy(() => ${model.name}UpdateManyWithWhereWithout${reverseFieldCapitalized}InputSchema))])),
  deleteMany: v.optional(v.union([v.lazy(() => ${model.name}WhereInputSchema), v.array(v.lazy(() => ${model.name}WhereInputSchema))])),
}));

`;
      }
    }
  }

  return output;
}

/**
 * Generates UpsertWithout input schemas
 * Example: ProductSEOUpsertWithoutProductInput
 */
export function generateUpsertWithoutInputSchemas(model: DMMF.Model): string {
  let output = '';

  // Find all relation fields in this model
  const relationFields = model.fields.filter((f) => f.kind === 'object');

  for (const excludedField of relationFields) {
    const excludedFieldCapitalized =
      excludedField.name.charAt(0).toUpperCase() + excludedField.name.slice(1);
    output += `export const ${model.name}UpsertWithout${excludedFieldCapitalized}InputSchema = v.lazy(() => v.object({
  update: v.union([v.lazy(() => ${model.name}UpdateWithout${excludedFieldCapitalized}InputSchema), v.lazy(() => ${model.name}UncheckedUpdateWithout${excludedFieldCapitalized}InputSchema)]),
  create: v.union([v.lazy(() => ${model.name}CreateWithout${excludedFieldCapitalized}InputSchema), v.lazy(() => ${model.name}UncheckedCreateWithout${excludedFieldCapitalized}InputSchema)]),
}));

`;
  }

  return output;
}

/**
 * Generates UpsertWithWhereUniqueWithout input schemas
 * Example: ProductPersonalizationUpsertWithWhereUniqueWithoutProductInput
 */
export function generateUpsertWithWhereUniqueWithoutInputSchemas(model: DMMF.Model): string {
  let output = '';

  // Find all relation fields in this model
  const relationFields = model.fields.filter((f) => f.kind === 'object');

  for (const excludedField of relationFields) {
    const excludedFieldCapitalized =
      excludedField.name.charAt(0).toUpperCase() + excludedField.name.slice(1);
    output += `export const ${model.name}UpsertWithWhereUniqueWithout${excludedFieldCapitalized}InputSchema = v.lazy(() => v.object({
  where: ${model.name}WhereUniqueInputSchema,
  update: v.union([v.lazy(() => ${model.name}UpdateWithout${excludedFieldCapitalized}InputSchema), v.lazy(() => ${model.name}UncheckedUpdateWithout${excludedFieldCapitalized}InputSchema)]),
  create: v.union([v.lazy(() => ${model.name}CreateWithout${excludedFieldCapitalized}InputSchema), v.lazy(() => ${model.name}UncheckedCreateWithout${excludedFieldCapitalized}InputSchema)]),
}));

`;
  }

  return output;
}

/**
 * Generates UpdateWithWhereUniqueWithout input schemas
 * Example: ProductPersonalizationUpdateWithWhereUniqueWithoutProductInput
 */
export function generateUpdateWithWhereUniqueWithoutInputSchemas(model: DMMF.Model): string {
  let output = '';

  // Find all relation fields in this model
  const relationFields = model.fields.filter((f) => f.kind === 'object');

  for (const excludedField of relationFields) {
    const excludedFieldCapitalized =
      excludedField.name.charAt(0).toUpperCase() + excludedField.name.slice(1);
    output += `export const ${model.name}UpdateWithWhereUniqueWithout${excludedFieldCapitalized}InputSchema = v.lazy(() => v.object({
  where: ${model.name}WhereUniqueInputSchema,
  data: v.union([v.lazy(() => ${model.name}UpdateWithout${excludedFieldCapitalized}InputSchema), v.lazy(() => ${model.name}UncheckedUpdateWithout${excludedFieldCapitalized}InputSchema)]),
}));

`;
  }

  return output;
}

/**
 * Generates UpdateManyWithWhereWithout input schemas
 * Example: ProductPersonalizationUpdateManyWithWhereWithoutProductInput
 */
export function generateUpdateManyWithWhereWithoutInputSchemas(model: DMMF.Model): string {
  let output = '';

  // Find all relation fields in this model
  const relationFields = model.fields.filter((f) => f.kind === 'object');

  for (const excludedField of relationFields) {
    const excludedFieldCapitalized =
      excludedField.name.charAt(0).toUpperCase() + excludedField.name.slice(1);
    output += `export const ${model.name}UpdateManyWithWhereWithout${excludedFieldCapitalized}InputSchema = v.lazy(() => v.object({
  where: v.lazy(() => ${model.name}WhereInputSchema),
  data: v.union([v.lazy(() => ${model.name}UpdateWithout${excludedFieldCapitalized}InputSchema), v.lazy(() => ${model.name}UncheckedUpdateWithout${excludedFieldCapitalized}InputSchema)]),
}));

`;
  }

  return output;
}
