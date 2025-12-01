import { DMMF } from '@prisma/generator-helper';

/**
 * Generates CountOutputType Select schema for relation counting
 */
export function generateCountOutputTypeSelectSchema(model: DMMF.Model): string | null {
  // Only include list relations (one-to-many or many-to-many)
  const listRelationFields = model.fields.filter((f) => f.kind === 'object' && f.isList);

  if (listRelationFields.length === 0) {
    return null;
  }

  const schemaName = `${model.name}CountOutputTypeSelectSchema`;
  const schemaFields: string[] = [];

  for (const field of listRelationFields) {
    schemaFields.push(
      `  ${field.name}: v.optional(v.union([v.boolean(), v.lazy(() => ${model.name}CountOutputTypeCount${field.name.charAt(0).toUpperCase() + field.name.slice(1)}ArgsSchema)])),`
    );
  }

  return `export const ${schemaName}: v.GenericSchema<Prisma.${model.name}CountOutputTypeSelect> = v.lazy(() => v.object({
${schemaFields.join('\n')}
}));
`;
}

/**
 * Generates CountOutputType DefaultArgs schema for relation counting
 */
export function generateCountOutputTypeDefaultArgsSchema(model: DMMF.Model): string | null {
  // Only include list relations (one-to-many or many-to-many)
  const listRelationFields = model.fields.filter((f) => f.kind === 'object' && f.isList);

  if (listRelationFields.length === 0) {
    return null;
  }

  const schemaName = `${model.name}CountOutputTypeDefaultArgsSchema`;

  return `export const ${schemaName}: v.GenericSchema<Prisma.${model.name}CountOutputTypeDefaultArgs> = v.lazy(() => v.object({
  select: v.optional(${model.name}CountOutputTypeSelectSchema),
}));
`;
}

/**
 * Generates CountOutputType Count[Relation]Args schemas for each relation
 */
export function generateCountOutputTypeCountArgsSchemas(model: DMMF.Model): string[] {
  // Only include list relations (one-to-many or many-to-many)
  const listRelationFields = model.fields.filter((f) => f.kind === 'object' && f.isList);

  if (listRelationFields.length === 0) {
    return [];
  }

  const schemas: string[] = [];

  for (const field of listRelationFields) {
    const capitalizedFieldName = field.name.charAt(0).toUpperCase() + field.name.slice(1);
    const schemaName = `${model.name}CountOutputTypeCount${capitalizedFieldName}ArgsSchema`;

    schemas.push(
      `export const ${schemaName}: v.GenericSchema<Prisma.${model.name}CountOutputTypeCount${capitalizedFieldName}Args> = v.lazy(() => v.object({
  where: v.optional(${field.type}WhereInputSchema),
}));
`
    );
  }

  return schemas;
}

/**
 * Generates Select schema for field selection
 */
export function generateSelectSchema(model: DMMF.Model): string {
  const schemaName = `${model.name}SelectSchema`;
  const schemaFields: string[] = [];

  for (const field of model.fields) {
    if (field.kind === 'object') {
      // Relation fields can have nested select/include
      if (field.isList) {
        schemaFields.push(
          `  ${field.name}: v.optional(v.union([v.boolean(), v.lazy(() => ${field.type}FindManyArgsSchema)])),`
        );
      } else {
        schemaFields.push(
          `  ${field.name}: v.optional(v.union([v.boolean(), v.lazy(() => ${field.type}ArgsSchema)])),`
        );
      }
    } else {
      // Scalar fields are just boolean
      schemaFields.push(`  ${field.name}: v.optional(v.boolean()),`);
    }
  }

  // Add _count field if the model has any list relations
  const hasListRelations = model.fields.some((f) => f.kind === 'object' && f.isList);
  if (hasListRelations) {
    schemaFields.push(
      `  _count: v.optional(v.union([v.boolean(), v.lazy(() => ${model.name}CountOutputTypeDefaultArgsSchema)])),`
    );
  }

  return `export const ${schemaName}: v.GenericSchema<Prisma.${model.name}Select> = v.lazy(() => v.object({
${schemaFields.join('\n')}
}));
`;
}

/**
 * Generates Include schema for relation inclusion
 */
export function generateIncludeSchema(model: DMMF.Model): string {
  const schemaName = `${model.name}IncludeSchema`;
  const relationFields = model.fields.filter((f) => f.kind === 'object');

  if (relationFields.length === 0) {
    return `export const ${schemaName} = v.never();`;
  }

  const schemaFields: string[] = [];

  for (const field of relationFields) {
    if (field.isList) {
      schemaFields.push(
        `  ${field.name}: v.optional(v.union([v.boolean(), v.lazy(() => ${field.type}FindManyArgsSchema)])),`
      );
    } else {
      schemaFields.push(
        `  ${field.name}: v.optional(v.union([v.boolean(), v.lazy(() => ${field.type}ArgsSchema)])),`
      );
    }
  }

  // Add _count field if the model has any list relations
  const hasListRelations = model.fields.some((f) => f.kind === 'object' && f.isList);
  if (hasListRelations) {
    schemaFields.push(
      `  _count: v.optional(v.union([v.boolean(), v.lazy(() => ${model.name}CountOutputTypeDefaultArgsSchema)])),`
    );
  }

  return `export const ${schemaName}: v.GenericSchema<Prisma.${model.name}Include> = v.lazy(() => v.object({
${schemaFields.join('\n')}
}));
`;
}
