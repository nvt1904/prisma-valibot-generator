import { DMMF } from '@prisma/generator-helper';

/**
 * Generates OrderBy schema for sorting queries
 */
export function generateOrderBySchema(model: DMMF.Model): string {
  const schemaName = `${model.name}OrderByInputSchema`;
  const schemaFields: string[] = [];

  for (const field of model.fields) {
    if (field.kind === 'scalar' || field.kind === 'enum') {
      // For nullable fields, allow SortOrderInput (with nulls option)
      // For required fields, only allow SortOrderSchema
      if (field.isRequired) {
        schemaFields.push(`  ${field.name}: v.optional(SortOrderSchema),`);
      } else {
        schemaFields.push(
          `  ${field.name}: v.optional(v.union([SortOrderSchema, SortOrderInputSchema])),`
        );
      }
    } else if (field.kind === 'object') {
      if (field.isList) {
        schemaFields.push(
          `  ${field.name}: v.optional(v.lazy(() => ${field.type}OrderByRelationAggregateInputSchema)),`
        );
      } else {
        schemaFields.push(
          `  ${field.name}: v.optional(v.lazy(() => ${field.type}OrderByInputSchema)),`
        );
      }
    }
  }

  return `export const ${schemaName}: v.GenericSchema<Prisma.${model.name}OrderByWithRelationInput> = v.lazy(() => v.object({
${schemaFields.join('\n')}
}));
`;
}

/**
 * Generates OrderByRelationAggregate schema for list relations
 */
export function generateOrderByRelationAggregateSchema(model: DMMF.Model): string {
  const schemaName = `${model.name}OrderByRelationAggregateInputSchema`;

  return `export const ${schemaName}: v.GenericSchema<Prisma.${model.name}OrderByRelationAggregateInput> = v.object({
  _count: v.optional(SortOrderSchema),
});
`;
}

/**
 * Helper to check if a field type is numeric
 */
function isNumericType(type: string): boolean {
  return ['Int', 'Float', 'Decimal', 'BigInt'].includes(type);
}

/**
 * Generates OrderByWithAggregationInput schema for groupBy queries
 */
export function generateOrderByWithAggregationInputSchema(model: DMMF.Model): string {
  const schemaName = `${model.name}OrderByWithAggregationInputSchema`;
  const schemaFields: string[] = [];

  // Add scalar and enum fields
  for (const field of model.fields) {
    if (field.kind === 'scalar' || field.kind === 'enum') {
      if (field.isRequired) {
        schemaFields.push(`  ${field.name}: v.optional(SortOrderSchema),`);
      } else {
        schemaFields.push(
          `  ${field.name}: v.optional(v.union([SortOrderSchema, SortOrderInputSchema])),`
        );
      }
    }
  }

  // Add aggregate ordering fields
  schemaFields.push(`  _count: v.optional(${model.name}CountOrderByAggregateInputSchema),`);
  schemaFields.push(`  _max: v.optional(${model.name}MaxOrderByAggregateInputSchema),`);
  schemaFields.push(`  _min: v.optional(${model.name}MinOrderByAggregateInputSchema),`);

  const hasNumericFields = model.fields.some((f) => f.kind === 'scalar' && isNumericType(f.type));

  if (hasNumericFields) {
    schemaFields.push(`  _sum: v.optional(${model.name}SumOrderByAggregateInputSchema),`);
    schemaFields.push(`  _avg: v.optional(${model.name}AvgOrderByAggregateInputSchema),`);
  }

  return `export const ${schemaName} = v.lazy(() => v.object({
${schemaFields.join('\n')}
}));

`;
}

/**
 * Generates CountOrderByAggregateInput schema
 */
export function generateCountOrderByAggregateInputSchema(model: DMMF.Model): string {
  const schemaName = `${model.name}CountOrderByAggregateInputSchema`;
  const fields: string[] = [];

  for (const field of model.fields) {
    if (field.kind === 'scalar' || field.kind === 'enum') {
      fields.push(`  ${field.name}: v.optional(SortOrderSchema),`);
    }
  }

  return `export const ${schemaName} = v.object({
${fields.join('\n')}
});

`;
}

/**
 * Generates SumOrderByAggregateInput schema
 */
export function generateSumOrderByAggregateInputSchema(model: DMMF.Model): string {
  const schemaName = `${model.name}SumOrderByAggregateInputSchema`;
  const fields: string[] = [];

  for (const field of model.fields) {
    if (field.kind === 'scalar' && isNumericType(field.type)) {
      fields.push(`  ${field.name}: v.optional(SortOrderSchema),`);
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
 * Generates AvgOrderByAggregateInput schema
 */
export function generateAvgOrderByAggregateInputSchema(model: DMMF.Model): string {
  const schemaName = `${model.name}AvgOrderByAggregateInputSchema`;
  const fields: string[] = [];

  for (const field of model.fields) {
    if (field.kind === 'scalar' && isNumericType(field.type)) {
      fields.push(`  ${field.name}: v.optional(SortOrderSchema),`);
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
 * Generates MinOrderByAggregateInput schema
 */
export function generateMinOrderByAggregateInputSchema(model: DMMF.Model): string {
  const schemaName = `${model.name}MinOrderByAggregateInputSchema`;
  const fields: string[] = [];

  for (const field of model.fields) {
    if (field.kind === 'scalar' || field.kind === 'enum') {
      fields.push(`  ${field.name}: v.optional(SortOrderSchema),`);
    }
  }

  return `export const ${schemaName} = v.object({
${fields.join('\n')}
});

`;
}

/**
 * Generates MaxOrderByAggregateInput schema
 */
export function generateMaxOrderByAggregateInputSchema(model: DMMF.Model): string {
  const schemaName = `${model.name}MaxOrderByAggregateInputSchema`;
  const fields: string[] = [];

  for (const field of model.fields) {
    if (field.kind === 'scalar' || field.kind === 'enum') {
      fields.push(`  ${field.name}: v.optional(SortOrderSchema),`);
    }
  }

  return `export const ${schemaName} = v.object({
${fields.join('\n')}
});

`;
}
