import { DMMF } from '@prisma/generator-helper';

/**
 * Helper to check if a field type is numeric
 */
function isNumericType(type: string): boolean {
  return ['Int', 'Float', 'Decimal', 'BigInt'].includes(type);
}

/**
 * Generates CountAggregateInput schema
 */
export function generateCountAggregateInputSchema(model: DMMF.Model): string {
  const schemaName = `${model.name}CountAggregateInputSchema`;
  const fields: string[] = [];

  for (const field of model.fields) {
    if (field.kind === 'scalar' || field.kind === 'enum') {
      fields.push(`  ${field.name}: v.optional(v.literal(true)),`);
    }
  }

  fields.push(`  _all: v.optional(v.literal(true)),`);

  return `export const ${schemaName} = v.object({
${fields.join('\n')}
});

`;
}

/**
 * Generates SumAggregateInput schema
 */
export function generateSumAggregateInputSchema(model: DMMF.Model): string {
  const schemaName = `${model.name}SumAggregateInputSchema`;
  const fields: string[] = [];

  for (const field of model.fields) {
    if (field.kind === 'scalar' && isNumericType(field.type)) {
      fields.push(`  ${field.name}: v.optional(v.literal(true)),`);
    }
  }

  if (fields.length === 0) {
    return `export const ${schemaName} = v.never();

`;
  }

  return `export const ${schemaName} = v.object({
${fields.join('\n')}
});

`;
}

/**
 * Generates AvgAggregateInput schema
 */
export function generateAvgAggregateInputSchema(model: DMMF.Model): string {
  const schemaName = `${model.name}AvgAggregateInputSchema`;
  const fields: string[] = [];

  for (const field of model.fields) {
    if (field.kind === 'scalar' && isNumericType(field.type)) {
      fields.push(`  ${field.name}: v.optional(v.literal(true)),`);
    }
  }

  if (fields.length === 0) {
    return `export const ${schemaName} = v.never();

`;
  }

  return `export const ${schemaName} = v.object({
${fields.join('\n')}
});

`;
}

/**
 * Generates MinAggregateInput schema
 */
export function generateMinAggregateInputSchema(model: DMMF.Model): string {
  const schemaName = `${model.name}MinAggregateInputSchema`;
  const fields: string[] = [];

  for (const field of model.fields) {
    if (field.kind === 'scalar' || field.kind === 'enum') {
      fields.push(`  ${field.name}: v.optional(v.literal(true)),`);
    }
  }

  return `export const ${schemaName} = v.object({
${fields.join('\n')}
});

`;
}

/**
 * Generates MaxAggregateInput schema
 */
export function generateMaxAggregateInputSchema(model: DMMF.Model): string {
  const schemaName = `${model.name}MaxAggregateInputSchema`;
  const fields: string[] = [];

  for (const field of model.fields) {
    if (field.kind === 'scalar' || field.kind === 'enum') {
      fields.push(`  ${field.name}: v.optional(v.literal(true)),`);
    }
  }

  return `export const ${schemaName} = v.object({
${fields.join('\n')}
});

`;
}
