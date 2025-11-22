import { DMMF } from '@prisma/generator-helper';
import { getValibotType, wrapOptional } from '../utils/type-mapping';

/**
 * Generates the base model schema for a Prisma model
 */
export function generateModelSchema(model: DMMF.Model): string {
  const schemaName = `${model.name}Schema`;
  const fields: string[] = [];

  for (const field of model.fields) {
    // Skip relation fields in base schema
    if (field.kind === 'object') continue;

    let valibotType =
      field.kind === 'enum'
        ? `v.picklist(${field.type}Enum)`
        : getValibotType(field.type, field.isList);

    // For nullable fields, use v.nullish() to accept both null and undefined
    if (!field.isRequired) {
      valibotType = `v.nullish(${valibotType})`;
    }

    fields.push(`  ${field.name}: ${valibotType},`);
  }

  return `export const ${schemaName} = v.object({
${fields.join('\n')}
});

export type ${model.name} = v.InferOutput<typeof ${schemaName}>;
`;
}

/**
 * Generates schemas for all scalar fields (used in select, etc.)
 */
export function generateScalarFieldEnum(model: DMMF.Model): string {
  const scalarFields = model.fields
    .filter((f) => f.kind !== 'object')
    .map((f) => `  ${f.name}: true,`);

  return `export const ${model.name}ScalarFieldEnum = {
${scalarFields.join('\n')}
} as const;
`;
}
