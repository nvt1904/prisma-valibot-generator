import { DMMF } from '@prisma/generator-helper';

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

  return `export const ${schemaName}: v.GenericSchema<Prisma.${model.name}Include> = v.lazy(() => v.object({
${schemaFields.join('\n')}
}));
`;
}
