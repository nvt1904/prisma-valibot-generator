import { DMMF } from '@prisma/generator-helper';

/**
 * Generates AggregateArgs schema for aggregation operations
 */
export function generateAggregateArgsSchema(model: DMMF.Model): string {
  const schemaName = `${model.name}AggregateArgsSchema`;

  return `export const ${schemaName} = v.object({
  where: v.optional(${model.name}WhereInputSchema),
  orderBy: v.optional(v.union([${model.name}OrderByInputSchema, v.array(${model.name}OrderByInputSchema)])),
  cursor: v.optional(${model.name}WhereUniqueInputSchema),
  take: v.optional(v.number()),
  skip: v.optional(v.number()),
  _count: v.optional(v.union([v.literal(true), ${model.name}CountAggregateInputSchema])),
  _min: v.optional(${model.name}MinAggregateInputSchema),
  _max: v.optional(${model.name}MaxAggregateInputSchema),
  _avg: v.optional(${model.name}AvgAggregateInputSchema),
  _sum: v.optional(${model.name}SumAggregateInputSchema),
});

`;
}
