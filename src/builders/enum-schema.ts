import { DMMF } from '@prisma/generator-helper';

/**
 * Generates enum schemas
 */
export function generateEnumSchema(enumDef: DMMF.DatamodelEnum): string {
  const values = enumDef.values.map((v) => `'${v.name}'`).join(', ');

  return `export const ${enumDef.name}Enum = [${values}] as const;

export const ${enumDef.name}Schema = v.picklist(${enumDef.name}Enum);

export type ${enumDef.name} = typeof ${enumDef.name}Enum[number];
`;
}

/**
 * Generates filter schema for enum types.
 *
 * This function conditionally generates enum filter schemas based on actual usage in the Prisma schema.
 * Prisma Client only exports filter types for enums that are actually used in specific ways:
 * - EnumNameFilter is only exported if the enum is used as a required field
 * - EnumNameNullableFilter is only exported if the enum is used as a nullable field
 *
 * This prevents TypeScript errors from referencing non-existent Prisma types.
 *
 * @param enumDef - The enum definition from Prisma DMMF
 * @param models - All models in the schema, used to determine enum usage patterns
 *
 * @returns TypeScript code string with conditionally generated filter schemas
 *
 * @example
 * // Enum used as required field: `status Status`
 * // → Generates: EnumStatusFilterSchema
 *
 * @example
 * // Enum used as nullable field: `role Role?`
 * // → Generates: EnumRoleNullableFilterSchema (NOT base filter)
 *
 * @example
 * // Enum used both ways
 * // → Generates: Both EnumStatusFilter and EnumStatusNullableFilter
 */
export function generateEnumFilterSchema(
  enumDef: DMMF.DatamodelEnum,
  models: readonly DMMF.Model[]
): string {
  // Check if this enum is used as a required field in any model
  const hasRequiredUsage = models.some((model) =>
    model.fields.some(
      (field) => field.type === enumDef.name && field.kind === 'enum' && field.isRequired
    )
  );

  // Check if this enum is used as a nullable field in any model
  const hasNullableUsage = models.some((model) =>
    model.fields.some(
      (field) => field.type === enumDef.name && field.kind === 'enum' && !field.isRequired
    )
  );

  // Check if this enum is used as a list field in any model
  const hasListUsage = models.some((model) =>
    model.fields.some(
      (field) => field.type === enumDef.name && field.kind === 'enum' && field.isList
    )
  );

  let result = '';

  // Only generate base filter if the enum is actually used as required field
  if (hasRequiredUsage) {
    result += `export const ${enumDef.name}FilterSchema: v.GenericSchema<Prisma.Enum${enumDef.name}Filter> = v.lazy(() =>
  v.object({
    equals: v.optional(${enumDef.name}Schema),
    in: v.optional(v.array(${enumDef.name}Schema)),
    notIn: v.optional(v.array(${enumDef.name}Schema)),
    not: v.optional(
      v.lazy(() => v.union([${enumDef.name}Schema, ${enumDef.name}FilterSchema]))
    ),
  })
);
`;
  }

  // Only generate nullable filter if the enum is actually used as nullable field
  if (hasNullableUsage) {
    result += `
export const ${enumDef.name}NullableFilterSchema: v.GenericSchema<Prisma.Enum${enumDef.name}NullableFilter> = v.lazy(() =>
  v.object({
    equals: v.optional(v.nullable(${enumDef.name}Schema)),
    in: v.optional(v.nullable(v.array(${enumDef.name}Schema))),
    notIn: v.optional(v.nullable(v.array(${enumDef.name}Schema))),
    not: v.optional(
      v.lazy(() => v.union([v.nullable(${enumDef.name}Schema), ${enumDef.name}NullableFilterSchema]))
    ),
  })
);
`;
  }

  // Only generate list filter if the enum is actually used as a list field
  if (hasListUsage) {
    result += `
export const ${enumDef.name}NullableListFilterSchema: v.GenericSchema<Prisma.Enum${enumDef.name}NullableListFilter> = v.object({
  equals: v.optional(v.array(${enumDef.name}Schema)),
  has: v.optional(${enumDef.name}Schema),
  hasSome: v.optional(v.array(${enumDef.name}Schema)),
  hasEvery: v.optional(v.array(${enumDef.name}Schema)),
  isEmpty: v.optional(v.boolean()),
});
`;
  }

  // Generate WithAggregates filter if enum is used as required field (for GroupBy having clause)
  if (hasRequiredUsage) {
    result += `
export const ${enumDef.name}WithAggregatesFilterSchema: v.GenericSchema<Prisma.Enum${enumDef.name}WithAggregatesFilter> = v.lazy(() =>
  v.object({
    equals: v.optional(${enumDef.name}Schema),
    in: v.optional(v.array(${enumDef.name}Schema)),
    notIn: v.optional(v.array(${enumDef.name}Schema)),
    not: v.optional(
      v.lazy(() => v.union([${enumDef.name}Schema, ${enumDef.name}WithAggregatesFilterSchema]))
    ),
    _count: v.optional(IntFilterSchema),
    _min: v.optional(${enumDef.name}FilterSchema),
    _max: v.optional(${enumDef.name}FilterSchema),
  })
);
`;
  }

  // Generate NullableWithAggregates filter if enum is used as nullable field
  if (hasNullableUsage) {
    result += `
export const ${enumDef.name}NullableWithAggregatesFilterSchema: v.GenericSchema<Prisma.Enum${enumDef.name}NullableWithAggregatesFilter> = v.lazy(() =>
  v.object({
    equals: v.optional(v.nullable(${enumDef.name}Schema)),
    in: v.optional(v.nullable(v.array(${enumDef.name}Schema))),
    notIn: v.optional(v.nullable(v.array(${enumDef.name}Schema))),
    not: v.optional(
      v.lazy(() => v.union([v.nullable(${enumDef.name}Schema), ${enumDef.name}NullableWithAggregatesFilterSchema]))
    ),
    _count: v.optional(IntFilterSchema),
    _min: v.optional(${enumDef.name}NullableFilterSchema),
    _max: v.optional(${enumDef.name}NullableFilterSchema),
  })
);
`;
  }

  return result;
}
