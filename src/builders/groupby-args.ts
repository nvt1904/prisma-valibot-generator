import { DMMF } from '@prisma/generator-helper';

/**
 * Generates GroupByArgs schema for aggregation queries
 * Uses a union to enforce Prisma's requirement that orderBy is required when using take/skip
 * This provides type safety at validation time, not just TypeScript compile time
 *
 * Prisma's GroupByArgs type structure:
 * - where?: WhereInput
 * - orderBy?: OrderByWithAggregationInput | OrderByWithAggregationInput[]
 * - by: ScalarFieldEnum[] | ScalarFieldEnum
 * - having?: ScalarWhereWithAggregatesInput
 * - take?: number
 * - skip?: number
 * - _count, _avg, _sum, _min, _max aggregate inputs
 */
export function generateGroupByArgsSchema(model: DMMF.Model): string {
  const schemaName = `${model.name}GroupByArgsSchema`;

  // Get scalar field names for the 'by' field (includes enums, excludes relations)
  const scalarFields = model.fields.filter((f) => f.kind !== 'object').map((f) => `'${f.name}'`);

  // Common fields shared between both variants
  // Uses ScalarFieldEnum array (e.g., ['id', 'email'] as const) for type-safe field validation
  // Accepts both single field and array of fields
  const byField = `by: v.union([v.array(v.picklist(${model.name}ScalarFieldEnum)), v.picklist(${model.name}ScalarFieldEnum)])`;
  const optionalFields = `
  where: v.optional(${model.name}WhereInputSchema),
  having: v.optional(${model.name}ScalarWhereWithAggregatesInputSchema),
  _count: v.optional(v.union([v.literal(true), ${model.name}CountAggregateInputSchema])),
  _avg: v.optional(${model.name}AvgAggregateInputSchema),
  _sum: v.optional(${model.name}SumAggregateInputSchema),
  _min: v.optional(${model.name}MinAggregateInputSchema),
  _max: v.optional(${model.name}MaxAggregateInputSchema)`;

  return `export const ${schemaName} = v.lazy(() => v.union([
  v.object({
  ${byField},${optionalFields},
  orderBy: v.optional(v.union([${model.name}OrderByWithAggregationInputSchema, v.array(${model.name}OrderByWithAggregationInputSchema)])),
  }),
  v.object({
  ${byField},${optionalFields},
  orderBy: v.union([${model.name}OrderByWithAggregationInputSchema, v.array(${model.name}OrderByWithAggregationInputSchema)]),
  take: v.optional(v.number()),
  skip: v.optional(v.number()),
  }),
]));

`;
}
