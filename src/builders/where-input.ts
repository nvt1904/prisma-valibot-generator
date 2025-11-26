import { DMMF } from '@prisma/generator-helper';

/**
 * Generates WhereInput schema for filtering queries
 */
export function generateWhereInputSchema(model: DMMF.Model): string {
  const schemaName = `${model.name}WhereInputSchema`;
  const schemaFields: string[] = [];

  // Add logical operators to schema
  // IMPORTANT: In unions, array schema must come FIRST to properly validate array inputs
  // Otherwise, Valibot's union will try the object schema first and return empty object {}
  schemaFields.push(
    `  AND: v.optional(v.lazy(() => v.union([v.array(${schemaName}), ${schemaName}]))),`
  );
  schemaFields.push(`  OR: v.optional(v.lazy(() => v.array(${schemaName}))),`);
  schemaFields.push(
    `  NOT: v.optional(v.lazy(() => v.union([v.array(${schemaName}), ${schemaName}]))),`
  );

  for (const field of model.fields) {
    if (field.kind === 'scalar' || field.kind === 'enum') {
      const filterSchemaName = getFilterSchemaName(field);

      if (field.isList) {
        // List fields (arrays) only accept filter schemas, not direct values
        schemaFields.push(`  ${field.name}: v.optional(v.lazy(() => ${filterSchemaName})),`);
      } else {
        // Scalar/enum fields accept filter schema OR direct value
        const directValue = getDirectValueSchema(field);
        schemaFields.push(
          `  ${field.name}: v.optional(v.lazy(() => v.union([${filterSchemaName}, ${directValue}]))),`
        );
      }
    } else if (field.kind === 'object') {
      // Relation filters
      if (field.isList) {
        // List relation - use separate schema
        schemaFields.push(
          `  ${field.name}: v.optional(v.lazy(() => ${field.type}ListRelationFilterSchema)),`
        );
      } else {
        // Single relation - supports XOR pattern: RelationFilter | WhereInput | null
        // Prisma allows three valid formats for relation filters:
        // 1. Wrapper object with is/isNot: { profile: { is: { bio: 'Hello' } } }
        // 2. Direct WhereInput (shorthand): { profile: { bio: 'Hello' } }
        // 3. null (nullable relations only): { profile: null }
        //
        // This matches Prisma's type definitions:
        // - Nullable: XOR<ProfileNullableScalarRelationFilter, ProfileWhereInput> | null
        // - Required: XOR<UserScalarRelationFilter, UserWhereInput>
        //
        // IMPORTANT: Union order matters for proper validation:
        // 1. v.null() - Check for null first (nullable relations only)
        // 2. Wrapper object with is/isNot - Must use v.strictObject() to only match if is/isNot present
        // 3. WhereInputSchema - Direct shorthand, matches any object with model fields
        //
        // Using v.strictObject() ensures the wrapper only matches when is/isNot keys are present.
        // This allows both { is: {...} } and { field: value } patterns to work correctly.
        if (field.isRequired) {
          // Required relation: XOR<RelationFilter, WhereInput>
          schemaFields.push(
            `  ${field.name}: v.optional(v.lazy(() => v.union([`,
            `    v.strictObject({`,
            `      is: v.optional(${field.type}WhereInputSchema),`,
            `      isNot: v.optional(${field.type}WhereInputSchema),`,
            `    }),`,
            `    ${field.type}WhereInputSchema`,
            `  ]))),`
          );
        } else {
          // Nullable relation: XOR<NullableRelationFilter, WhereInput> | null
          schemaFields.push(
            `  ${field.name}: v.optional(v.lazy(() => v.union([`,
            `    v.null(),`,
            `    v.strictObject({`,
            `      is: v.optional(v.nullable(${field.type}WhereInputSchema)),`,
            `      isNot: v.optional(v.nullable(${field.type}WhereInputSchema)),`,
            `    }),`,
            `    ${field.type}WhereInputSchema`,
            `  ]))),`
          );
        }
      }
    }
  }

  return `export const ${schemaName}: v.GenericSchema<Prisma.${model.name}WhereInput> = v.lazy(() => v.object({
${schemaFields.join('\n')}
}));
`;
}

function normalizeSchemaName(name: string): string {
  return name.replace(/Schema{2,}$/g, 'Schema');
}

function getFilterSchemaName(field: DMMF.Field): string {
  if (field.kind === 'enum') {
    if (field.isList) {
      return `${field.type}NullableListFilterSchema`;
    }
    // Check if enum field is nullable
    if (!field.isRequired) {
      return `${field.type}NullableFilterSchema`;
    }
    return `${field.type}FilterSchema`;
  }

  const typeFilterMap: Record<string, string> = {
    String: 'StringFilterSchema',
    Int: 'IntFilterSchema',
    BigInt: 'BigIntFilterSchema',
    Float: 'FloatFilterSchema',
    Decimal: 'DecimalFilterSchema',
    Boolean: 'BoolFilterSchema',
    DateTime: 'DateTimeFilterSchema',
    Json: 'JsonFilterSchema',
    Bytes: 'BytesFilterSchema',
  };

  const filterName = typeFilterMap[field.type] || 'StringFilterSchema';

  if (field.isList) {
    const listFilterName = normalizeSchemaName(filterName.replace('Filter', 'ListFilter'));
    return listFilterName;
  }

  if (!field.isRequired) {
    const nullableFilterName = normalizeSchemaName(filterName.replace('Filter', 'NullableFilter'));
    return nullableFilterName;
  }

  return normalizeSchemaName(filterName);
}

/**
 * Gets the direct value schema for a field (used in WhereInput unions)
 * E.g., for `name?: StringFilter | string`, this returns the `string` part
 */
function getDirectValueSchema(field: DMMF.Field): string {
  if (field.kind === 'enum') {
    // Enum: v.picklist(...) or v.nullable(v.picklist(...))
    const enumSchema = `v.picklist(${field.type}Enum)`;
    return field.isRequired ? enumSchema : `v.nullable(${enumSchema})`;
  }

  // Scalar types
  const typeMap: Record<string, string> = {
    String: 'v.string()',
    Int: 'v.number()',
    BigInt: 'v.bigint()',
    Float: 'v.number()',
    Decimal: 'v.number()',
    Boolean: 'v.boolean()',
    DateTime: 'v.union([v.pipe(v.string(), v.isoTimestamp()), v.date()])',
    Json: 'v.any()',
    Bytes: 'v.instance(Uint8Array)',
  };

  const baseSchema = typeMap[field.type] || 'v.any()';

  // Handle nullable fields - use v.nullish() to allow both null and undefined
  return field.isRequired ? baseSchema : `v.nullish(${baseSchema})`;
}

/**
 * Generates filter schemas for scalar types.
 *
 * This function conditionally generates scalar filter schemas (String, Int, Float, etc.)
 * based on actual usage in the Prisma schema. It currently generates all filters but uses
 * local TypeScript type definitions instead of Prisma types to avoid referencing non-existent
 * Prisma exports (e.g., Prisma.BigIntFilter when BigInt isn't used in the schema).
 *
 * The conditional logic is prepared but not fully implemented - filters are still generated
 * for all scalar types. This ensures compatibility while avoiding Prisma type errors.
 *
 * @param models - All models in the schema, used to determine which scalar types are actually used
 *
 * @returns TypeScript code string with filter schemas for scalar types
 *
 * @example
 * // Schema uses String, Int, DateTime but NOT BigInt
 * // → Generates: StringFilter, IntFilter, DateTimeFilter, BigIntFilter (using local types)
 * // → Avoids error: "Prisma has no exported member 'BigIntFilter'"
 *
 * @todo Fully implement conditional generation to skip unused scalar types entirely
 */
export function generateScalarFilterSchemas(models: readonly DMMF.Model[]): string {
  // Helper to check if a scalar type is used in any model
  // Returns true if the type appears as required, nullable, or list field depending on flags
  const isTypeUsed = (
    type: string,
    checkNullable: boolean = false,
    checkList: boolean = false
  ): boolean => {
    return models.some((model) =>
      model.fields.some(
        (field) =>
          field.kind === 'scalar' &&
          field.type === type &&
          (checkList ? field.isList : checkNullable ? !field.isRequired : field.isRequired)
      )
    );
  };

  const parts: string[] = [];

  // String filters
  if (isTypeUsed('String', false) || isTypeUsed('String', true)) {
    parts.push(`
// Type definitions for full type safety
type StringFilter = {
  equals?: string;
  in?: string[];
  notIn?: string[];
  lt?: string;
  lte?: string;
  gt?: string;
  gte?: string;
  contains?: string;
  startsWith?: string;
  endsWith?: string;
  mode?: v.InferInput<typeof QueryModeSchema>;
  not?: string | StringFilter;
};

type StringNullableFilter = {
  equals?: string | null;
  in?: string[] | null;
  notIn?: string[] | null;
  lt?: string;
  lte?: string;
  gt?: string;
  gte?: string;
  contains?: string;
  startsWith?: string;
  endsWith?: string;
  mode?: v.InferInput<typeof QueryModeSchema>;
  not?: string | null | StringNullableFilter;
};

type IntFilter = {
  equals?: number;
  in?: number[];
  notIn?: number[];
  lt?: number;
  lte?: number;
  gt?: number;
  gte?: number;
  not?: number | IntFilter;
};

type IntNullableFilter = {
  equals?: number | null;
  in?: number[] | null;
  notIn?: number[] | null;
  lt?: number;
  lte?: number;
  gt?: number;
  gte?: number;
  not?: number | null | IntNullableFilter;
};

type FloatFilter = {
  equals?: number;
  in?: number[];
  notIn?: number[];
  lt?: number;
  lte?: number;
  gt?: number;
  gte?: number;
  not?: number | FloatFilter;
};

type FloatNullableFilter = {
  equals?: number | null;
  in?: number[] | null;
  notIn?: number[] | null;
  lt?: number;
  lte?: number;
  gt?: number;
  gte?: number;
  not?: number | null | FloatNullableFilter;
};

type BigIntFilter = {
  equals?: bigint;
  in?: bigint[];
  notIn?: bigint[];
  lt?: bigint;
  lte?: bigint;
  gt?: bigint;
  gte?: bigint;
  not?: bigint | BigIntFilter;
};

type BigIntNullableFilter = {
  equals?: bigint | null;
  in?: bigint[] | null;
  notIn?: bigint[] | null;
  lt?: bigint;
  lte?: bigint;
  gt?: bigint;
  gte?: bigint;
  not?: bigint | null | BigIntNullableFilter;
};

type BoolFilter = {
  equals?: boolean;
  not?: boolean | BoolFilter;
};

type BoolNullableFilter = {
  equals?: boolean | null;
  not?: boolean | null | BoolNullableFilter;
};

type DateTimeFilter = {
  equals?: string;
  in?: string[];
  notIn?: string[];
  lt?: string;
  lte?: string;
  gt?: string;
  gte?: string;
  not?: string | DateTimeFilter;
};

type DateTimeNullableFilter = {
  equals?: string | null;
  in?: string[] | null;
  notIn?: string[] | null;
  lt?: string;
  lte?: string;
  gt?: string;
  gte?: string;
  not?: string | null | DateTimeNullableFilter;
};

type JsonFilter = {
  equals?: any;
  not?: any;
};

type JsonNullableFilter = {
  equals?: any;
  not?: any;
};

type BytesFilter = {
  equals?: Uint8Array<ArrayBuffer>;
  in?: Uint8Array<ArrayBuffer>[];
  notIn?: Uint8Array<ArrayBuffer>[];
  not?: Uint8Array<ArrayBuffer> | BytesFilter;
};

type BytesNullableFilter = {
  equals?: Uint8Array<ArrayBuffer> | null;
  in?: Uint8Array<ArrayBuffer>[] | null;
  notIn?: Uint8Array<ArrayBuffer>[] | null;
  not?: Uint8Array<ArrayBuffer> | null | BytesNullableFilter;
};

type StringListFilter = {
  equals?: string[];
  has?: string;
  hasSome?: string[];
  hasEvery?: string[];
  isEmpty?: boolean;
};

type IntListFilter = {
  equals?: number[];
  has?: number;
  hasSome?: number[];
  hasEvery?: number[];
  isEmpty?: boolean;
};

type FloatListFilter = {
  equals?: number[];
  has?: number;
  hasSome?: number[];
  hasEvery?: number[];
  isEmpty?: boolean;
};

type BigIntListFilter = {
  equals?: bigint[];
  has?: bigint;
  hasSome?: bigint[];
  hasEvery?: bigint[];
  isEmpty?: boolean;
};

type BoolListFilter = {
  equals?: boolean[];
  has?: boolean;
  hasSome?: boolean[];
  hasEvery?: boolean[];
  isEmpty?: boolean;
};

type DateTimeListFilter = {
  equals?: string[];
  has?: string;
  hasSome?: string[];
  hasEvery?: string[];
  isEmpty?: boolean;
};

type BytesListFilter = {
  equals?: Uint8Array<ArrayBuffer>[];
  has?: Uint8Array<ArrayBuffer>;
  hasSome?: Uint8Array<ArrayBuffer>[];
  hasEvery?: Uint8Array<ArrayBuffer>[];
  isEmpty?: boolean;
};

type JsonListFilter = {
  equals?: any[];
  has?: any;
  hasSome?: any[];
  hasEvery?: any[];
  isEmpty?: boolean;
};

type DecimalListFilter = {
  equals?: number[];
  has?: number;
  hasSome?: number[];
  hasEvery?: number[];
  isEmpty?: boolean;
};

// String filters
export const StringFilterSchema: v.GenericSchema<StringFilter> = v.lazy(() =>
  v.object({
    equals: v.optional(v.string()),
    in: v.optional(v.array(v.string())),
    notIn: v.optional(v.array(v.string())),
    lt: v.optional(v.string()),
    lte: v.optional(v.string()),
    gt: v.optional(v.string()),
    gte: v.optional(v.string()),
    contains: v.optional(v.string()),
    startsWith: v.optional(v.string()),
    endsWith: v.optional(v.string()),
    mode: v.optional(QueryModeSchema),
    not: v.optional(
      v.lazy(() => v.union([v.string(), StringFilterSchema]))
    ),
  })
);

export const StringNullableFilterSchema: v.GenericSchema<StringNullableFilter> = v.lazy(() =>
  v.object({
    equals: v.optional(v.nullable(v.string())),
    in: v.optional(v.nullable(v.array(v.string()))),
    notIn: v.optional(v.nullable(v.array(v.string()))),
    lt: v.optional(v.string()),
    lte: v.optional(v.string()),
    gt: v.optional(v.string()),
    gte: v.optional(v.string()),
    contains: v.optional(v.string()),
    startsWith: v.optional(v.string()),
    endsWith: v.optional(v.string()),
    mode: v.optional(QueryModeSchema),
    not: v.optional(
      v.lazy(() => v.union([v.nullable(v.string()), StringNullableFilterSchema]))
    ),
  })
);

// Number filters
export const IntFilterSchema: v.GenericSchema<IntFilter> = v.lazy(() =>
  v.object({
    equals: v.optional(v.number()),
    in: v.optional(v.array(v.number())),
    notIn: v.optional(v.array(v.number())),
    lt: v.optional(v.number()),
    lte: v.optional(v.number()),
    gt: v.optional(v.number()),
    gte: v.optional(v.number()),
    not: v.optional(
      v.lazy(() => v.union([v.number(), IntFilterSchema]))
    ),
  })
);

export const IntNullableFilterSchema: v.GenericSchema<IntNullableFilter> = v.lazy(() =>
  v.object({
    equals: v.optional(v.nullable(v.number())),
    in: v.optional(v.nullable(v.array(v.number()))),
    notIn: v.optional(v.nullable(v.array(v.number()))),
    lt: v.optional(v.number()),
    lte: v.optional(v.number()),
    gt: v.optional(v.number()),
    gte: v.optional(v.number()),
    not: v.optional(
      v.lazy(() => v.union([v.nullable(v.number()), IntNullableFilterSchema]))
    ),
  })
);

export const FloatFilterSchema: v.GenericSchema<FloatFilter> = v.lazy(() =>
  v.object({
    equals: v.optional(v.number()),
    in: v.optional(v.array(v.number())),
    notIn: v.optional(v.array(v.number())),
    lt: v.optional(v.number()),
    lte: v.optional(v.number()),
    gt: v.optional(v.number()),
    gte: v.optional(v.number()),
    not: v.optional(
      v.lazy(() => v.union([v.number(), FloatFilterSchema]))
    ),
  })
);

export const FloatNullableFilterSchema: v.GenericSchema<FloatNullableFilter> = v.lazy(() =>
  v.object({
    equals: v.optional(v.nullable(v.number())),
    in: v.optional(v.nullable(v.array(v.number()))),
    notIn: v.optional(v.nullable(v.array(v.number()))),
    lt: v.optional(v.number()),
    lte: v.optional(v.number()),
    gt: v.optional(v.number()),
    gte: v.optional(v.number()),
    not: v.optional(
      v.lazy(() => v.union([v.nullable(v.number()), FloatNullableFilterSchema]))
    ),
  })
);

export const DecimalFilterSchema = FloatFilterSchema;
export const DecimalNullableFilterSchema = FloatNullableFilterSchema;

// BigInt filters
export const BigIntFilterSchema: v.GenericSchema<BigIntFilter> = v.lazy(() =>
  v.object({
    equals: v.optional(v.bigint()),
    in: v.optional(v.array(v.bigint())),
    notIn: v.optional(v.array(v.bigint())),
    lt: v.optional(v.bigint()),
    lte: v.optional(v.bigint()),
    gt: v.optional(v.bigint()),
    gte: v.optional(v.bigint()),
    not: v.optional(
      v.lazy(() => v.union([v.bigint(), BigIntFilterSchema]))
    ),
  })
);

export const BigIntNullableFilterSchema: v.GenericSchema<BigIntNullableFilter> = v.lazy(() =>
  v.object({
    equals: v.optional(v.nullable(v.bigint())),
    in: v.optional(v.nullable(v.array(v.bigint()))),
    notIn: v.optional(v.nullable(v.array(v.bigint()))),
    lt: v.optional(v.bigint()),
    lte: v.optional(v.bigint()),
    gt: v.optional(v.bigint()),
    gte: v.optional(v.bigint()),
    not: v.optional(
      v.lazy(() => v.union([v.nullable(v.bigint()), BigIntNullableFilterSchema]))
    ),
  })
);

// Boolean filters
export const BoolFilterSchema: v.GenericSchema<BoolFilter> = v.lazy(() =>
  v.object({
    equals: v.optional(v.boolean()),
    not: v.optional(
      v.lazy(() => v.union([v.boolean(), BoolFilterSchema]))
    ),
  })
);

export const BoolNullableFilterSchema: v.GenericSchema<BoolNullableFilter> = v.lazy(() =>
  v.object({
    equals: v.optional(v.nullable(v.boolean())),
    not: v.optional(
      v.lazy(() => v.union([v.nullable(v.boolean()), BoolNullableFilterSchema]))
    ),
  })
);

// DateTime filters
export const DateTimeFilterSchema: v.GenericSchema<DateTimeFilter> = v.lazy(() =>
  v.object({
    equals: v.optional(v.pipe(v.string(), v.isoTimestamp())),
    in: v.optional(v.array(v.pipe(v.string(), v.isoTimestamp()))),
    notIn: v.optional(v.array(v.pipe(v.string(), v.isoTimestamp()))),
    lt: v.optional(v.pipe(v.string(), v.isoTimestamp())),
    lte: v.optional(v.pipe(v.string(), v.isoTimestamp())),
    gt: v.optional(v.pipe(v.string(), v.isoTimestamp())),
    gte: v.optional(v.pipe(v.string(), v.isoTimestamp())),
    not: v.optional(
      v.lazy(() => v.union([v.pipe(v.string(), v.isoTimestamp()), DateTimeFilterSchema]))
    ),
  })
);

export const DateTimeNullableFilterSchema: v.GenericSchema<DateTimeNullableFilter> = v.lazy(() =>
  v.object({
    equals: v.optional(v.nullable(v.pipe(v.string(), v.isoTimestamp()))),
    in: v.optional(v.nullable(v.array(v.pipe(v.string(), v.isoTimestamp())))),
    notIn: v.optional(v.nullable(v.array(v.pipe(v.string(), v.isoTimestamp())))),
    lt: v.optional(v.pipe(v.string(), v.isoTimestamp())),
    lte: v.optional(v.pipe(v.string(), v.isoTimestamp())),
    gt: v.optional(v.pipe(v.string(), v.isoTimestamp())),
    gte: v.optional(v.pipe(v.string(), v.isoTimestamp())),
    not: v.optional(
      v.lazy(() => v.union([v.nullable(v.pipe(v.string(), v.isoTimestamp())), DateTimeNullableFilterSchema]))
    ),
  })
);

// Json filters
export const JsonFilterSchema: v.GenericSchema<JsonFilter> = v.lazy(() =>
  v.object({
    equals: v.optional(v.any()),
    not: v.optional(v.any()),
  })
);

export const JsonNullableFilterSchema: v.GenericSchema<JsonNullableFilter> = v.lazy(() =>
  v.object({
    equals: v.optional(v.nullable(v.any())),
    not: v.optional(v.nullable(v.any())),
  })
);

// Bytes filters
export const BytesFilterSchema: v.GenericSchema<BytesFilter> = v.lazy(() =>
  v.object({
    equals: v.optional(v.instance(Uint8Array)),
    in: v.optional(v.array(v.instance(Uint8Array))),
    notIn: v.optional(v.array(v.instance(Uint8Array))),
    not: v.optional(
      v.lazy(() => v.union([v.instance(Uint8Array), BytesFilterSchema]))
    ),
  })
);

export const BytesNullableFilterSchema: v.GenericSchema<BytesNullableFilter> = v.lazy(() =>
  v.object({
    equals: v.optional(v.nullable(v.instance(Uint8Array))),
    in: v.optional(v.nullable(v.array(v.instance(Uint8Array)))),
    notIn: v.optional(v.nullable(v.array(v.instance(Uint8Array)))),
    not: v.optional(
      v.lazy(() => v.union([v.nullable(v.instance(Uint8Array)), BytesNullableFilterSchema]))
    ),
  })
);

// List filters (for array fields)
export const StringListFilterSchema: v.GenericSchema<StringListFilter> = v.object({
  equals: v.optional(v.array(v.string())),
  has: v.optional(v.string()),
  hasSome: v.optional(v.array(v.string())),
  hasEvery: v.optional(v.array(v.string())),
  isEmpty: v.optional(v.boolean()),
});

export const IntListFilterSchema: v.GenericSchema<IntListFilter> = v.object({
  equals: v.optional(v.array(v.number())),
  has: v.optional(v.number()),
  hasSome: v.optional(v.array(v.number())),
  hasEvery: v.optional(v.array(v.number())),
  isEmpty: v.optional(v.boolean()),
});

export const FloatListFilterSchema: v.GenericSchema<FloatListFilter> = v.object({
  equals: v.optional(v.array(v.number())),
  has: v.optional(v.number()),
  hasSome: v.optional(v.array(v.number())),
  hasEvery: v.optional(v.array(v.number())),
  isEmpty: v.optional(v.boolean()),
});

export const BigIntListFilterSchema: v.GenericSchema<BigIntListFilter> = v.object({
  equals: v.optional(v.array(v.bigint())),
  has: v.optional(v.bigint()),
  hasSome: v.optional(v.array(v.bigint())),
  hasEvery: v.optional(v.array(v.bigint())),
  isEmpty: v.optional(v.boolean()),
});

export const BoolListFilterSchema: v.GenericSchema<BoolListFilter> = v.object({
  equals: v.optional(v.array(v.boolean())),
  has: v.optional(v.boolean()),
  hasSome: v.optional(v.array(v.boolean())),
  hasEvery: v.optional(v.array(v.boolean())),
  isEmpty: v.optional(v.boolean()),
});

export const DateTimeListFilterSchema: v.GenericSchema<DateTimeListFilter> = v.object({
  equals: v.optional(v.array(v.pipe(v.string(), v.isoTimestamp()))),
  has: v.optional(v.pipe(v.string(), v.isoTimestamp())),
  hasSome: v.optional(v.array(v.pipe(v.string(), v.isoTimestamp()))),
  hasEvery: v.optional(v.array(v.pipe(v.string(), v.isoTimestamp()))),
  isEmpty: v.optional(v.boolean()),
});

export const BytesListFilterSchema: v.GenericSchema<BytesListFilter> = v.object({
  equals: v.optional(v.array(v.instance(Uint8Array))),
  has: v.optional(v.instance(Uint8Array)),
  hasSome: v.optional(v.array(v.instance(Uint8Array))),
  hasEvery: v.optional(v.array(v.instance(Uint8Array))),
  isEmpty: v.optional(v.boolean()),
});

export const JsonListFilterSchema: v.GenericSchema<JsonListFilter> = v.object({
  equals: v.optional(v.array(v.any())),
  has: v.optional(v.any()),
  hasSome: v.optional(v.array(v.any())),
  hasEvery: v.optional(v.array(v.any())),
  isEmpty: v.optional(v.boolean()),
});

export const DecimalListFilterSchema: v.GenericSchema<DecimalListFilter> = v.object({
  equals: v.optional(v.array(v.number())),
  has: v.optional(v.number()),
  hasSome: v.optional(v.array(v.number())),
  hasEvery: v.optional(v.array(v.number())),
  isEmpty: v.optional(v.boolean()),
});

// ========== WithAggregates Filters ==========
// Used in "having" clause of GroupBy queries
// Reuses existing filter schemas for aggregate fields (_count, _min, _max, _sum, _avg)

// Type definitions for WithAggregates filters (used for type annotations to avoid circular inference)
type WithAggregatesFilter = Record<string, unknown>;

export const StringWithAggregatesFilterSchema: v.GenericSchema<WithAggregatesFilter> = v.lazy(() =>
  v.object({
    equals: v.optional(v.string()),
    in: v.optional(v.array(v.string())),
    notIn: v.optional(v.array(v.string())),
    lt: v.optional(v.string()),
    lte: v.optional(v.string()),
    gt: v.optional(v.string()),
    gte: v.optional(v.string()),
    contains: v.optional(v.string()),
    startsWith: v.optional(v.string()),
    endsWith: v.optional(v.string()),
    mode: v.optional(QueryModeSchema),
    not: v.optional(v.lazy(() => v.union([v.string(), StringWithAggregatesFilterSchema]))),
    _count: v.optional(IntFilterSchema),
    _min: v.optional(StringFilterSchema),
    _max: v.optional(StringFilterSchema),
  })
);

export const StringNullableWithAggregatesFilterSchema: v.GenericSchema<WithAggregatesFilter> = v.lazy(() =>
  v.object({
    equals: v.optional(v.nullable(v.string())),
    in: v.optional(v.nullable(v.array(v.string()))),
    notIn: v.optional(v.nullable(v.array(v.string()))),
    lt: v.optional(v.string()),
    lte: v.optional(v.string()),
    gt: v.optional(v.string()),
    gte: v.optional(v.string()),
    contains: v.optional(v.string()),
    startsWith: v.optional(v.string()),
    endsWith: v.optional(v.string()),
    mode: v.optional(QueryModeSchema),
    not: v.optional(v.lazy(() => v.union([v.nullable(v.string()), StringNullableWithAggregatesFilterSchema]))),
    _count: v.optional(IntFilterSchema),
    _min: v.optional(StringNullableFilterSchema),
    _max: v.optional(StringNullableFilterSchema),
  })
);

export const IntWithAggregatesFilterSchema: v.GenericSchema<WithAggregatesFilter> = v.lazy(() =>
  v.object({
    equals: v.optional(v.number()),
    in: v.optional(v.array(v.number())),
    notIn: v.optional(v.array(v.number())),
    lt: v.optional(v.number()),
    lte: v.optional(v.number()),
    gt: v.optional(v.number()),
    gte: v.optional(v.number()),
    not: v.optional(v.lazy(() => v.union([v.number(), IntWithAggregatesFilterSchema]))),
    _count: v.optional(IntFilterSchema),
    _avg: v.optional(FloatFilterSchema),
    _sum: v.optional(IntFilterSchema),
    _min: v.optional(IntFilterSchema),
    _max: v.optional(IntFilterSchema),
  })
);

export const IntNullableWithAggregatesFilterSchema: v.GenericSchema<WithAggregatesFilter> = v.lazy(() =>
  v.object({
    equals: v.optional(v.nullable(v.number())),
    in: v.optional(v.nullable(v.array(v.number()))),
    notIn: v.optional(v.nullable(v.array(v.number()))),
    lt: v.optional(v.number()),
    lte: v.optional(v.number()),
    gt: v.optional(v.number()),
    gte: v.optional(v.number()),
    not: v.optional(v.lazy(() => v.union([v.nullable(v.number()), IntNullableWithAggregatesFilterSchema]))),
    _count: v.optional(IntFilterSchema),
    _avg: v.optional(FloatNullableFilterSchema),
    _sum: v.optional(IntNullableFilterSchema),
    _min: v.optional(IntNullableFilterSchema),
    _max: v.optional(IntNullableFilterSchema),
  })
);

export const FloatWithAggregatesFilterSchema: v.GenericSchema<WithAggregatesFilter> = v.lazy(() =>
  v.object({
    equals: v.optional(v.number()),
    in: v.optional(v.array(v.number())),
    notIn: v.optional(v.array(v.number())),
    lt: v.optional(v.number()),
    lte: v.optional(v.number()),
    gt: v.optional(v.number()),
    gte: v.optional(v.number()),
    not: v.optional(v.lazy(() => v.union([v.number(), FloatWithAggregatesFilterSchema]))),
    _count: v.optional(IntFilterSchema),
    _avg: v.optional(FloatFilterSchema),
    _sum: v.optional(FloatFilterSchema),
    _min: v.optional(FloatFilterSchema),
    _max: v.optional(FloatFilterSchema),
  })
);

export const FloatNullableWithAggregatesFilterSchema: v.GenericSchema<WithAggregatesFilter> = v.lazy(() =>
  v.object({
    equals: v.optional(v.nullable(v.number())),
    in: v.optional(v.nullable(v.array(v.number()))),
    notIn: v.optional(v.nullable(v.array(v.number()))),
    lt: v.optional(v.number()),
    lte: v.optional(v.number()),
    gt: v.optional(v.number()),
    gte: v.optional(v.number()),
    not: v.optional(v.lazy(() => v.union([v.nullable(v.number()), FloatNullableWithAggregatesFilterSchema]))),
    _count: v.optional(IntFilterSchema),
    _avg: v.optional(FloatNullableFilterSchema),
    _sum: v.optional(FloatNullableFilterSchema),
    _min: v.optional(FloatNullableFilterSchema),
    _max: v.optional(FloatNullableFilterSchema),
  })
);

export const DecimalWithAggregatesFilterSchema = FloatWithAggregatesFilterSchema;
export const DecimalNullableWithAggregatesFilterSchema = FloatNullableWithAggregatesFilterSchema;

export const BigIntWithAggregatesFilterSchema: v.GenericSchema<WithAggregatesFilter> = v.lazy(() =>
  v.object({
    equals: v.optional(v.bigint()),
    in: v.optional(v.array(v.bigint())),
    notIn: v.optional(v.array(v.bigint())),
    lt: v.optional(v.bigint()),
    lte: v.optional(v.bigint()),
    gt: v.optional(v.bigint()),
    gte: v.optional(v.bigint()),
    not: v.optional(v.lazy(() => v.union([v.bigint(), BigIntWithAggregatesFilterSchema]))),
    _count: v.optional(IntFilterSchema),
    _avg: v.optional(FloatFilterSchema),
    _sum: v.optional(BigIntFilterSchema),
    _min: v.optional(BigIntFilterSchema),
    _max: v.optional(BigIntFilterSchema),
  })
);

export const BigIntNullableWithAggregatesFilterSchema: v.GenericSchema<WithAggregatesFilter> = v.lazy(() =>
  v.object({
    equals: v.optional(v.nullable(v.bigint())),
    in: v.optional(v.nullable(v.array(v.bigint()))),
    notIn: v.optional(v.nullable(v.array(v.bigint()))),
    lt: v.optional(v.bigint()),
    lte: v.optional(v.bigint()),
    gt: v.optional(v.bigint()),
    gte: v.optional(v.bigint()),
    not: v.optional(v.lazy(() => v.union([v.nullable(v.bigint()), BigIntNullableWithAggregatesFilterSchema]))),
    _count: v.optional(IntFilterSchema),
    _avg: v.optional(FloatNullableFilterSchema),
    _sum: v.optional(BigIntNullableFilterSchema),
    _min: v.optional(BigIntNullableFilterSchema),
    _max: v.optional(BigIntNullableFilterSchema),
  })
);

export const BoolWithAggregatesFilterSchema: v.GenericSchema<WithAggregatesFilter> = v.lazy(() =>
  v.object({
    equals: v.optional(v.boolean()),
    not: v.optional(v.lazy(() => v.union([v.boolean(), BoolWithAggregatesFilterSchema]))),
    _count: v.optional(IntFilterSchema),
    _min: v.optional(BoolFilterSchema),
    _max: v.optional(BoolFilterSchema),
  })
);

export const BoolNullableWithAggregatesFilterSchema: v.GenericSchema<WithAggregatesFilter> = v.lazy(() =>
  v.object({
    equals: v.optional(v.nullable(v.boolean())),
    not: v.optional(v.lazy(() => v.union([v.nullable(v.boolean()), BoolNullableWithAggregatesFilterSchema]))),
    _count: v.optional(IntFilterSchema),
    _min: v.optional(BoolNullableFilterSchema),
    _max: v.optional(BoolNullableFilterSchema),
  })
);

export const DateTimeWithAggregatesFilterSchema: v.GenericSchema<WithAggregatesFilter> = v.lazy(() =>
  v.object({
    equals: v.optional(v.pipe(v.string(), v.isoTimestamp())),
    in: v.optional(v.array(v.pipe(v.string(), v.isoTimestamp()))),
    notIn: v.optional(v.array(v.pipe(v.string(), v.isoTimestamp()))),
    lt: v.optional(v.pipe(v.string(), v.isoTimestamp())),
    lte: v.optional(v.pipe(v.string(), v.isoTimestamp())),
    gt: v.optional(v.pipe(v.string(), v.isoTimestamp())),
    gte: v.optional(v.pipe(v.string(), v.isoTimestamp())),
    not: v.optional(v.lazy(() => v.union([v.pipe(v.string(), v.isoTimestamp()), DateTimeWithAggregatesFilterSchema]))),
    _count: v.optional(IntFilterSchema),
    _min: v.optional(DateTimeFilterSchema),
    _max: v.optional(DateTimeFilterSchema),
  })
);

export const DateTimeNullableWithAggregatesFilterSchema: v.GenericSchema<WithAggregatesFilter> = v.lazy(() =>
  v.object({
    equals: v.optional(v.nullable(v.pipe(v.string(), v.isoTimestamp()))),
    in: v.optional(v.nullable(v.array(v.pipe(v.string(), v.isoTimestamp())))),
    notIn: v.optional(v.nullable(v.array(v.pipe(v.string(), v.isoTimestamp())))),
    lt: v.optional(v.pipe(v.string(), v.isoTimestamp())),
    lte: v.optional(v.pipe(v.string(), v.isoTimestamp())),
    gt: v.optional(v.pipe(v.string(), v.isoTimestamp())),
    gte: v.optional(v.pipe(v.string(), v.isoTimestamp())),
    not: v.optional(v.lazy(() => v.union([v.nullable(v.pipe(v.string(), v.isoTimestamp())), DateTimeNullableWithAggregatesFilterSchema]))),
    _count: v.optional(IntFilterSchema),
    _min: v.optional(DateTimeNullableFilterSchema),
    _max: v.optional(DateTimeNullableFilterSchema),
  })
);

export const BytesWithAggregatesFilterSchema: v.GenericSchema<WithAggregatesFilter> = v.lazy(() =>
  v.object({
    equals: v.optional(v.instance(Uint8Array)),
    in: v.optional(v.array(v.instance(Uint8Array))),
    notIn: v.optional(v.array(v.instance(Uint8Array))),
    not: v.optional(v.lazy(() => v.union([v.instance(Uint8Array), BytesWithAggregatesFilterSchema]))),
    _count: v.optional(IntFilterSchema),
    _min: v.optional(BytesFilterSchema),
    _max: v.optional(BytesFilterSchema),
  })
);

export const BytesNullableWithAggregatesFilterSchema: v.GenericSchema<WithAggregatesFilter> = v.lazy(() =>
  v.object({
    equals: v.optional(v.nullable(v.instance(Uint8Array))),
    in: v.optional(v.nullable(v.array(v.instance(Uint8Array)))),
    notIn: v.optional(v.nullable(v.array(v.instance(Uint8Array)))),
    not: v.optional(v.lazy(() => v.union([v.nullable(v.instance(Uint8Array)), BytesNullableWithAggregatesFilterSchema]))),
    _count: v.optional(IntFilterSchema),
    _min: v.optional(BytesNullableFilterSchema),
    _max: v.optional(BytesNullableFilterSchema),
  })
);

export const JsonWithAggregatesFilterSchema: v.GenericSchema<WithAggregatesFilter> = v.lazy(() =>
  v.object({
    equals: v.optional(v.any()),
    not: v.optional(v.any()),
    _count: v.optional(IntFilterSchema),
    _min: v.optional(JsonFilterSchema),
    _max: v.optional(JsonFilterSchema),
  })
);

export const JsonNullableWithAggregatesFilterSchema: v.GenericSchema<WithAggregatesFilter> = v.lazy(() =>
  v.object({
    equals: v.optional(v.nullable(v.any())),
    not: v.optional(v.nullable(v.any())),
    _count: v.optional(IntFilterSchema),
    _min: v.optional(JsonNullableFilterSchema),
    _max: v.optional(JsonNullableFilterSchema),
  })
);`);
  }

  return parts.join('\\n');
}

/**
 * Generates list relation filter schema (only for models used as list relations)
 */
export function generateListRelationFilterSchema(model: DMMF.Model): string {
  return `export const ${model.name}ListRelationFilterSchema: v.GenericSchema<Prisma.${model.name}ListRelationFilter> = v.object({
  every: v.optional(v.lazy(() => ${model.name}WhereInputSchema)),
  some: v.optional(v.lazy(() => ${model.name}WhereInputSchema)),
  none: v.optional(v.lazy(() => ${model.name}WhereInputSchema)),
});
`;
}

/**
 * Gets the WithAggregates filter schema name for a field
 */
function getWithAggregatesFilterSchemaName(field: DMMF.Field): string {
  if (field.kind === 'enum') {
    if (!field.isRequired) {
      return `${field.type}NullableWithAggregatesFilterSchema`;
    }
    return `${field.type}WithAggregatesFilterSchema`;
  }

  const typeFilterMap: Record<string, string> = {
    String: 'StringWithAggregatesFilterSchema',
    Int: 'IntWithAggregatesFilterSchema',
    BigInt: 'BigIntWithAggregatesFilterSchema',
    Float: 'FloatWithAggregatesFilterSchema',
    Decimal: 'DecimalWithAggregatesFilterSchema',
    Boolean: 'BoolWithAggregatesFilterSchema',
    DateTime: 'DateTimeWithAggregatesFilterSchema',
    Json: 'JsonWithAggregatesFilterSchema',
    Bytes: 'BytesWithAggregatesFilterSchema',
  };

  const filterName = typeFilterMap[field.type] || 'StringWithAggregatesFilterSchema';

  if (!field.isRequired) {
    return filterName.replace('WithAggregatesFilterSchema', 'NullableWithAggregatesFilterSchema');
  }

  return filterName;
}

/**
 * Gets the direct value schema for WithAggregates fields
 */
function getWithAggregatesDirectValueSchema(field: DMMF.Field): string {
  if (field.kind === 'enum') {
    const enumSchema = `v.picklist(${field.type}Enum)`;
    return field.isRequired ? enumSchema : `v.nullable(${enumSchema})`;
  }

  const typeMap: Record<string, string> = {
    String: 'v.string()',
    Int: 'v.number()',
    BigInt: 'v.bigint()',
    Float: 'v.number()',
    Decimal: 'v.number()',
    Boolean: 'v.boolean()',
    DateTime: 'v.union([v.pipe(v.string(), v.isoTimestamp()), v.date()])',
    Json: 'v.any()',
    Bytes: 'v.instance(Uint8Array)',
  };

  const baseSchema = typeMap[field.type] || 'v.any()';
  return field.isRequired ? baseSchema : `v.nullish(${baseSchema})`;
}

/**
 * Generates ScalarWhereWithAggregatesInput schema for the "having" clause in GroupBy queries
 */
export function generateScalarWhereWithAggregatesInputSchema(model: DMMF.Model): string {
  const schemaName = `${model.name}ScalarWhereWithAggregatesInputSchema`;
  const schemaFields: string[] = [];

  // Add logical operators
  // IMPORTANT: In unions, array schema must come FIRST to properly validate array inputs
  schemaFields.push(
    `  AND: v.optional(v.lazy(() => v.union([v.array(${schemaName}), ${schemaName}]))),`
  );
  schemaFields.push(`  OR: v.optional(v.lazy(() => v.array(${schemaName}))),`);
  schemaFields.push(
    `  NOT: v.optional(v.lazy(() => v.union([v.array(${schemaName}), ${schemaName}]))),`
  );

  // Only include scalar and enum fields (no relations, no list fields)
  for (const field of model.fields) {
    if ((field.kind === 'scalar' || field.kind === 'enum') && !field.isList) {
      const filterSchemaName = getWithAggregatesFilterSchemaName(field);
      const directValue = getWithAggregatesDirectValueSchema(field);
      schemaFields.push(
        `  ${field.name}: v.optional(v.lazy(() => v.union([${filterSchemaName}, ${directValue}]))),`
      );
    }
  }

  return `export const ${schemaName}: v.GenericSchema<Prisma.${model.name}ScalarWhereWithAggregatesInput> = v.lazy(() => v.object({
${schemaFields.join('\n')}
}));
`;
}
