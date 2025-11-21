import { DMMF } from '@prisma/generator-helper';

/**
 * Generates OrderBy schema for sorting queries
 */
export function generateOrderBySchema(model: DMMF.Model): string {
  const schemaName = `${model.name}OrderByInputSchema`;
  const schemaFields: string[] = [];

  for (const field of model.fields) {
    if (field.kind === 'scalar' || field.kind === 'enum') {
      // Allow either simple sort order or sort order with nulls
      schemaFields.push(
        `  ${field.name}: v.optional(v.union([SortOrderSchema, SortOrderInputSchema])),`
      );
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
