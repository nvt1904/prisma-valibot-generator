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
  data: v.union([${model.name}CreateInputSchema, ${model.name}UncheckedCreateInputSchema]),
});
`;
}

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
 * Generates CreateInput schema (with nested relations)
 */
export function generateCreateInputSchema(
  model: DMMF.Model,
  allModels: readonly DMMF.Model[]
): string {
  const schemaName = `${model.name}CreateInputSchema`;
  const fields: string[] = [];

  for (const field of model.fields) {
    if (field.kind === 'object') {
      // Relation fields - use reverse field name for context-specific schemas
      const reverseFieldName = findReverseRelationFieldName(model, field, allModels);
      const reverseFieldCapitalized =
        reverseFieldName.charAt(0).toUpperCase() + reverseFieldName.slice(1);

      if (field.isList) {
        fields.push(
          `  ${field.name}: v.optional(v.lazy(() => ${field.type}CreateNestedManyWithout${reverseFieldCapitalized}InputSchema)),`
        );
      } else {
        // Single relation - check if required
        const nestedSchema = `v.lazy(() => ${field.type}CreateNestedOneWithout${reverseFieldCapitalized}InputSchema)`;
        const wrappedSchema = field.isRequired ? nestedSchema : `v.optional(${nestedSchema})`;
        fields.push(`  ${field.name}: ${wrappedSchema},`);
      }
    } else {
      // Skip foreign key fields if there's a corresponding relation
      const isRelationForeignKey = model.fields.some(
        (f) => f.kind === 'object' && f.relationFromFields?.includes(field.name)
      );
      if (isRelationForeignKey) continue;

      // Scalar/enum fields
      let valibotType =
        field.kind === 'enum'
          ? field.isList
            ? `v.array(v.picklist(${field.type}Enum))`
            : `v.picklist(${field.type}Enum)`
          : getValibotType(field.type, field.isList);

      // Wrap with v.nullable() if field is nullable (not required and no default)
      if (!field.isRequired && !field.hasDefaultValue) {
        valibotType = `v.nullable(${valibotType})`;
      }

      const wrappedType = wrapOptional(valibotType, field.isRequired && !field.hasDefaultValue);
      fields.push(`  ${field.name}: ${wrappedType},`);
    }
  }

  return `export const ${schemaName}: v.GenericSchema<Prisma.${model.name}CreateInput> = v.object({
${fields.join('\n')}
});
`;
}

/**
 * Generates UncheckedCreateInput schema (with foreign key IDs instead of relations)
 */
export function generateUncheckedCreateInputSchema(
  model: DMMF.Model,
  allModels: readonly DMMF.Model[]
): string {
  const schemaName = `${model.name}UncheckedCreateInputSchema`;
  const fields: string[] = [];

  for (const field of model.fields) {
    if (field.kind === 'object') {
      // For UncheckedCreateInput, include list relations (they can have nested creates)
      // but exclude single relations (use foreign key instead)
      if (field.isList) {
        // Find reverse field name in the related model
        const reverseFieldName = findReverseRelationFieldName(model, field, allModels);
        const reverseFieldCapitalized =
          reverseFieldName.charAt(0).toUpperCase() + reverseFieldName.slice(1);
        fields.push(
          `  ${field.name}: v.optional(v.lazy(() => ${field.type}UncheckedCreateNestedManyWithout${reverseFieldCapitalized}InputSchema)),`
        );
      }
      continue;
    }

    // Scalar/enum fields (including foreign keys)
    let valibotType =
      field.kind === 'enum'
        ? field.isList
          ? `v.array(v.picklist(${field.type}Enum))`
          : `v.picklist(${field.type}Enum)`
        : getValibotType(field.type, field.isList);

    // Wrap with v.nullable() if field is nullable (not required and no default)
    if (!field.isRequired && !field.hasDefaultValue) {
      valibotType = `v.nullable(${valibotType})`;
    }

    const wrappedType = wrapOptional(valibotType, field.isRequired && !field.hasDefaultValue);
    fields.push(`  ${field.name}: ${wrappedType},`);
  }

  return `export const ${schemaName}: v.GenericSchema<Prisma.${model.name}UncheckedCreateInput> = v.object({
${fields.join('\n')}
});
`;
}

/**
 * Generates UncheckedCreateNestedMany input schema for list relations in unchecked mode
 */
export function generateUncheckedCreateNestedManyInputSchema(model: DMMF.Model): string {
  return `export const ${model.name}UncheckedCreateNestedManyInputSchema = v.lazy(() => v.object({
  create: v.optional(v.union([v.lazy(() => ${model.name}UncheckedCreateInputSchema), v.array(v.lazy(() => ${model.name}UncheckedCreateInputSchema))])),
  connectOrCreate: v.optional(v.union([v.lazy(() => ${model.name}CreateOrConnectInputSchema), v.array(v.lazy(() => ${model.name}CreateOrConnectInputSchema))])),
  connect: v.optional(v.union([${model.name}WhereUniqueInputSchema, v.array(${model.name}WhereUniqueInputSchema)])),
}));
`;
}

/**
 * Generates CreateNestedMany input schema for list relations
 */
export function generateCreateNestedManyInputSchema(model: DMMF.Model): string {
  return `export const ${model.name}CreateNestedManyInputSchema = v.lazy(() => v.object({
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
  return `export const ${model.name}CreateNestedOneInputSchema = v.lazy(() => v.object({
  create: v.optional(v.lazy(() => ${model.name}CreateInputSchema)),
  connectOrCreate: v.optional(v.lazy(() => ${model.name}CreateOrConnectInputSchema)),
  connect: v.optional(${model.name}WhereUniqueInputSchema),
}));
`;
}

/**
 * Generates context-specific CreateNestedOne input schemas for each relation
 * Example: ProductSEOCreateNestedOneWithoutProductInput
 */
export function generateCreateNestedOneWithoutInputSchemas(
  model: DMMF.Model,
  allModels: readonly DMMF.Model[]
): string {
  let output = '';

  // For each model that has a relation TO this model, generate a WithoutX schema
  for (const otherModel of allModels) {
    for (const field of otherModel.fields) {
      if (field.kind === 'object' && field.type === model.name && !field.isList) {
        // Find the reverse field in current model that points back to otherModel
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

        output += `export const ${model.name}CreateNestedOneWithout${reverseFieldCapitalized}InputSchema = v.lazy(() => v.object({
  create: v.optional(v.union([v.lazy(() => ${model.name}CreateWithout${reverseFieldCapitalized}InputSchema), v.lazy(() => ${model.name}UncheckedCreateWithout${reverseFieldCapitalized}InputSchema)])),
  connectOrCreate: v.optional(v.lazy(() => ${model.name}CreateOrConnectWithout${reverseFieldCapitalized}InputSchema)),
  connect: v.optional(${model.name}WhereUniqueInputSchema),
}));

`;
      }
    }
  }

  return output;
}

/**
 * Generates context-specific CreateNestedMany input schemas for each relation
 * Example: ProductSKUCreateNestedManyWithoutProductInput
 */
export function generateCreateNestedManyWithoutInputSchemas(
  model: DMMF.Model,
  allModels: readonly DMMF.Model[]
): string {
  let output = '';

  // For each model that has a relation TO this model, generate a WithoutX schema
  for (const otherModel of allModels) {
    for (const field of otherModel.fields) {
      if (field.kind === 'object' && field.type === model.name && field.isList) {
        // Find the reverse field in current model that points back to otherModel
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

        output += `export const ${model.name}CreateNestedManyWithout${reverseFieldCapitalized}InputSchema = v.lazy(() => v.object({
  create: v.optional(v.union([v.lazy(() => ${model.name}CreateWithout${reverseFieldCapitalized}InputSchema), v.lazy(() => ${model.name}UncheckedCreateWithout${reverseFieldCapitalized}InputSchema), v.array(v.lazy(() => ${model.name}CreateWithout${reverseFieldCapitalized}InputSchema)), v.array(v.lazy(() => ${model.name}UncheckedCreateWithout${reverseFieldCapitalized}InputSchema))])),
  connectOrCreate: v.optional(v.union([v.lazy(() => ${model.name}CreateOrConnectWithout${reverseFieldCapitalized}InputSchema), v.array(v.lazy(() => ${model.name}CreateOrConnectWithout${reverseFieldCapitalized}InputSchema))])),
  createMany: v.optional(v.lazy(() => ${model.name}CreateMany${reverseFieldCapitalized}InputEnvelopeSchema)),
  connect: v.optional(v.union([${model.name}WhereUniqueInputSchema, v.array(${model.name}WhereUniqueInputSchema)])),
}));

`;
      }
    }
  }

  return output;
}

/**
 * Generates CreateWithout input schemas for each relation context
 * Example: ProductSEOCreateWithoutProductInput
 */
export function generateCreateWithoutInputSchemas(
  model: DMMF.Model,
  allModels: readonly DMMF.Model[]
): string {
  let output = '';

  // Find all relation fields in this model
  const relationFields = model.fields.filter((f) => f.kind === 'object');

  if (relationFields.length === 0) {
    return output;
  }

  // Generate a CreateWithout schema for each relation
  for (const excludedField of relationFields) {
    const fields: string[] = [];

    for (const field of model.fields) {
      // Skip the excluded relation field
      if (field.name === excludedField.name) continue;

      if (field.kind === 'object') {
        // Other relation fields - use reverse field name for context
        const reverseFieldName = findReverseRelationFieldName(model, field, allModels);
        const reverseFieldCapitalized =
          reverseFieldName.charAt(0).toUpperCase() + reverseFieldName.slice(1);

        if (field.isList) {
          fields.push(
            `  ${field.name}: v.optional(v.lazy(() => ${field.type}CreateNestedManyWithout${reverseFieldCapitalized}InputSchema)),`
          );
        } else {
          const nestedSchema = `v.lazy(() => ${field.type}CreateNestedOneWithout${reverseFieldCapitalized}InputSchema)`;
          const wrappedSchema = field.isRequired ? nestedSchema : `v.optional(${nestedSchema})`;
          fields.push(`  ${field.name}: ${wrappedSchema},`);
        }
      } else {
        // Skip foreign key fields if there's a corresponding relation
        const isRelationForeignKey = model.fields.some(
          (f) => f.kind === 'object' && f.relationFromFields?.includes(field.name)
        );
        if (isRelationForeignKey) continue;

        // Scalar/enum fields
        let valibotType =
          field.kind === 'enum'
            ? field.isList
              ? `v.array(v.picklist(${field.type}Enum))`
              : `v.picklist(${field.type}Enum)`
            : getValibotType(field.type, field.isList);

        if (!field.isRequired && !field.hasDefaultValue) {
          valibotType = `v.nullable(${valibotType})`;
        }

        const wrappedType = wrapOptional(valibotType, field.isRequired && !field.hasDefaultValue);
        fields.push(`  ${field.name}: ${wrappedType},`);
      }
    }

    const excludedFieldCapitalized =
      excludedField.name.charAt(0).toUpperCase() + excludedField.name.slice(1);
    output += `export const ${model.name}CreateWithout${excludedFieldCapitalized}InputSchema: v.GenericSchema<Prisma.${model.name}CreateWithout${excludedFieldCapitalized}Input> = v.object({
${fields.join('\n')}
});

`;
  }

  return output;
}

/**
 * Generates UncheckedCreateWithout input schemas for each relation context
 * Example: ProductSEOUncheckedCreateWithoutProductInput
 */
export function generateUncheckedCreateWithoutInputSchemas(
  model: DMMF.Model,
  allModels: readonly DMMF.Model[]
): string {
  let output = '';

  // Find all relation fields in this model
  const relationFields = model.fields.filter((f) => f.kind === 'object');

  if (relationFields.length === 0) {
    return output;
  }

  // Generate an UncheckedCreateWithout schema for each relation
  for (const excludedField of relationFields) {
    const fields: string[] = [];

    for (const field of model.fields) {
      // Skip the excluded relation field
      if (field.name === excludedField.name) continue;

      if (field.kind === 'object') {
        // Only include list relations in unchecked mode
        if (field.isList) {
          // Find reverse field name in the related model
          const reverseFieldName = findReverseRelationFieldName(model, field, allModels);
          const reverseFieldCapitalized =
            reverseFieldName.charAt(0).toUpperCase() + reverseFieldName.slice(1);
          fields.push(
            `  ${field.name}: v.optional(v.lazy(() => ${field.type}UncheckedCreateNestedManyWithout${reverseFieldCapitalized}InputSchema)),`
          );
        }
        continue;
      }

      // Scalar/enum fields (including foreign keys)
      let valibotType =
        field.kind === 'enum'
          ? field.isList
            ? `v.array(v.picklist(${field.type}Enum))`
            : `v.picklist(${field.type}Enum)`
          : getValibotType(field.type, field.isList);

      if (!field.isRequired && !field.hasDefaultValue) {
        valibotType = `v.nullable(${valibotType})`;
      }

      const wrappedType = wrapOptional(valibotType, field.isRequired && !field.hasDefaultValue);
      fields.push(`  ${field.name}: ${wrappedType},`);
    }

    const excludedFieldCapitalized =
      excludedField.name.charAt(0).toUpperCase() + excludedField.name.slice(1);
    output += `export const ${model.name}UncheckedCreateWithout${excludedFieldCapitalized}InputSchema: v.GenericSchema<Prisma.${model.name}UncheckedCreateWithout${excludedFieldCapitalized}Input> = v.object({
${fields.join('\n')}
});

`;
  }

  return output;
}

/**
 * Generates CreateOrConnectWithout input schemas for each relation context
 * Example: ProductSEOCreateOrConnectWithoutProductInput
 */
export function generateCreateOrConnectWithoutInputSchemas(model: DMMF.Model): string {
  let output = '';

  // Find all relation fields in this model
  const relationFields = model.fields.filter((f) => f.kind === 'object');

  for (const excludedField of relationFields) {
    const excludedFieldCapitalized =
      excludedField.name.charAt(0).toUpperCase() + excludedField.name.slice(1);
    output += `export const ${model.name}CreateOrConnectWithout${excludedFieldCapitalized}InputSchema = v.lazy(() => v.object({
  where: ${model.name}WhereUniqueInputSchema,
  create: v.union([v.lazy(() => ${model.name}CreateWithout${excludedFieldCapitalized}InputSchema), v.lazy(() => ${model.name}UncheckedCreateWithout${excludedFieldCapitalized}InputSchema)]),
}));

`;
  }

  return output;
}

/**
 * Generates CreateMany envelope schemas for batch creation
 * Example: ProductSKUCreateManyProductInputEnvelope
 */
export function generateCreateManyInputEnvelopeSchemas(
  model: DMMF.Model,
  allModels: readonly DMMF.Model[]
): string {
  let output = '';

  // For each model that has a list relation TO this model, generate an envelope schema
  for (const otherModel of allModels) {
    for (const field of otherModel.fields) {
      if (field.kind === 'object' && field.type === model.name && field.isList) {
        // Find reverse field
        const reverseField = model.fields.find(
          (f) =>
            f.kind === 'object' &&
            f.type === otherModel.name &&
            f.relationName === field.relationName
        );
        const reverseFieldName = reverseField ? reverseField.name : otherModel.name;
        const reverseFieldCapitalized =
          reverseFieldName.charAt(0).toUpperCase() + reverseFieldName.slice(1);

        output += `export const ${model.name}CreateMany${reverseFieldCapitalized}InputEnvelopeSchema = v.lazy(() => v.object({
  data: v.union([v.lazy(() => ${model.name}CreateMany${reverseFieldCapitalized}InputSchema), v.array(v.lazy(() => ${model.name}CreateMany${reverseFieldCapitalized}InputSchema))]),
  skipDuplicates: v.optional(v.boolean()),
}));

`;
      }
    }
  }

  return output;
}

/**
 * Generates CreateMany input schemas for batch creation (without parent relation)
 * Example: ProductSKUCreateManyProductInput
 */
export function generateCreateManyWithoutInputSchemas(
  model: DMMF.Model,
  allModels: readonly DMMF.Model[]
): string {
  let output = '';

  // For each model that has a list relation TO this model, generate a CreateMany schema
  for (const otherModel of allModels) {
    for (const field of otherModel.fields) {
      if (field.kind === 'object' && field.type === model.name && field.isList) {
        const fields: string[] = [];

        for (const modelField of model.fields) {
          // Skip all relation fields in createMany
          if (modelField.kind === 'object') continue;

          const valibotType =
            modelField.kind === 'enum'
              ? modelField.isList
                ? `v.array(v.picklist(${modelField.type}Enum))`
                : `v.picklist(${modelField.type}Enum)`
              : getValibotType(modelField.type, modelField.isList);

          const wrappedType = wrapOptional(
            valibotType,
            modelField.isRequired && !modelField.hasDefaultValue
          );
          fields.push(`  ${modelField.name}: ${wrappedType},`);
        }

        // Find reverse field
        const reverseField = model.fields.find(
          (f) =>
            f.kind === 'object' &&
            f.type === otherModel.name &&
            f.relationName === field.relationName
        );
        const reverseFieldName = reverseField ? reverseField.name : otherModel.name;
        const reverseFieldCapitalized =
          reverseFieldName.charAt(0).toUpperCase() + reverseFieldName.slice(1);

        output += `export const ${model.name}CreateMany${reverseFieldCapitalized}InputSchema = v.object({
${fields.join('\n')}
});

`;
      }
    }
  }

  return output;
}

/**
 * Generates UncheckedCreateNestedMany input schemas for list relations
 */
export function generateUncheckedCreateNestedManyWithoutInputSchemas(
  model: DMMF.Model,
  allModels: readonly DMMF.Model[]
): string {
  let output = '';

  // For each model that has a list relation TO this model, generate WithoutX schema
  for (const otherModel of allModels) {
    for (const field of otherModel.fields) {
      if (field.kind === 'object' && field.type === model.name && field.isList) {
        // Find reverse field
        const reverseField = model.fields.find(
          (f) =>
            f.kind === 'object' &&
            f.type === otherModel.name &&
            f.relationName === field.relationName
        );
        const reverseFieldName = reverseField ? reverseField.name : otherModel.name;
        const reverseFieldCapitalized =
          reverseFieldName.charAt(0).toUpperCase() + reverseFieldName.slice(1);

        output += `export const ${model.name}UncheckedCreateNestedManyWithout${reverseFieldCapitalized}InputSchema = v.lazy(() => v.object({
  create: v.optional(v.union([v.lazy(() => ${model.name}CreateWithout${reverseFieldCapitalized}InputSchema), v.lazy(() => ${model.name}UncheckedCreateWithout${reverseFieldCapitalized}InputSchema), v.array(v.lazy(() => ${model.name}CreateWithout${reverseFieldCapitalized}InputSchema)), v.array(v.lazy(() => ${model.name}UncheckedCreateWithout${reverseFieldCapitalized}InputSchema))])),
  connectOrCreate: v.optional(v.union([v.lazy(() => ${model.name}CreateOrConnectWithout${reverseFieldCapitalized}InputSchema), v.array(v.lazy(() => ${model.name}CreateOrConnectWithout${reverseFieldCapitalized}InputSchema))])),
  createMany: v.optional(v.lazy(() => ${model.name}CreateMany${reverseFieldCapitalized}InputEnvelopeSchema)),
  connect: v.optional(v.union([${model.name}WhereUniqueInputSchema, v.array(${model.name}WhereUniqueInputSchema)])),
}));

`;
      }
    }
  }

  return output;
}

/**
 * Generates CreateOrConnect input schema
 */
export function generateCreateOrConnectInputSchema(model: DMMF.Model): string {
  return `export const ${model.name}CreateOrConnectInputSchema = v.lazy(() => v.object({
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
        ? field.isList
          ? `v.array(v.picklist(${field.type}Enum))`
          : `v.picklist(${field.type}Enum)`
        : getValibotType(field.type, field.isList);

    const wrappedType = wrapOptional(valibotType, field.isRequired && !field.hasDefaultValue);
    fields.push(`  ${field.name}: ${wrappedType},`);
  }

  return `export const ${schemaName} = v.object({
${fields.join('\n')}
});
`;
}
