# Prisma Valibot Generator - AI Agent Instructions

## Project Overview

This is a Prisma generator that creates Valibot validation schemas from Prisma models. It generates comprehensive schemas for all CRUD operations (findMany, create, update, delete) with full relation support, filters, and nested operations.

**Architecture Pattern**: Multi-pass code generation

- Pass 1: Base model schemas + scalar field enums
- Pass 2: Where/OrderBy/Select/Include schemas
- Pass 3: Create/Update input schemas
- Pass 4: Args schemas for all operations

This ordering ensures forward references work with Valibot's `v.lazy()` for circular dependencies.

## Key Files & Responsibilities

- `src/generator.ts` - Entry point: Prisma generator handler, orchestrates file generation
- `src/lib/generate-schemas.ts` - Core orchestration: 4-pass generation logic, single `index.ts` output
- `src/builders/` - Schema builders for specific operation types (where, create, update, etc.)
- `src/utils/type-mapping.ts` - Maps Prisma types → Valibot schemas (String → `v.string()`, DateTime → `v.pipe(v.string(), v.isoDateTime())`)

## Critical Patterns

### Circular Reference Handling

Always use `v.lazy()` for recursive/circular schemas:

```typescript
// Relations reference other models
${field.name}: v.optional(v.lazy(() => ${field.type}WhereInputSchema))

// Self-referential filters (NOT, nested where)
not: v.optional(v.lazy(() => v.union([v.string(), StringFilterSchema])))
```

### Nullable vs Optional Fields

- **Optional** (`?` in Prisma): Use `v.optional()`
- **Nullable** (no `@default` + optional): Wrap in `v.nullable()`
- Required fields: No wrapper

### Conditional Schema Generation

The generator intelligently analyzes the Prisma schema to **only generate schemas that Prisma Client actually exports**. This prevents TypeScript errors and reduces output size.

#### Enum Filters (Conditional)

**Rule**: Generate base/nullable enum filters ONLY if the enum is actually used as required/nullable in the schema.

```typescript
// In src/builders/enum-schema.ts
export function generateEnumFilterSchema(
  enumDef: DMMF.DatamodelEnum,
  models: readonly DMMF.Model[]
): string {
  // Check if enum is used as required field
  const hasRequiredUsage = models.some((model) =>
    model.fields.some(
      (field) => field.type === enumDef.name && field.kind === 'enum' && field.isRequired
    )
  );

  // Check if enum is used as nullable field
  const hasNullableUsage = models.some((model) =>
    model.fields.some(
      (field) => field.type === enumDef.name && field.kind === 'enum' && !field.isRequired
    )
  );

  // Generate base filter ONLY if enum is used as required
  if (hasRequiredUsage) {
    // Generate EnumNameFilterSchema
  }

  // Generate nullable filter ONLY if enum is used as nullable
  if (hasNullableUsage) {
    // Generate EnumNameNullableFilterSchema
  }
}
```

**Example**:

- `enum Status { ACTIVE, INACTIVE }` used as `status Status` → generates `StatusFilterSchema`
- `enum Role { USER, ADMIN }` used as `role Role?` → generates `RoleNullableFilterSchema` (NOT base filter)
- Both usages exist → generates both filters

#### OrderByRelationAggregate (Conditional)

**Rule**: Generate `ModelOrderByRelationAggregateInputSchema` ONLY for models used as list relations in other models.

```typescript
// In src/lib/generate-schemas.ts
const modelsUsedAsListRelations = new Set<string>();
for (const model of models) {
  for (const field of model.fields) {
    if (field.kind === 'object' && field.isList) {
      modelsUsedAsListRelations.add(field.type);
    }
  }
}

// Only generate for models in the set
if (modelsUsedAsListRelations.has(model.name)) {
  indexContent += generateOrderByRelationAggregateSchema(model);
}
```

**Example**:

- `User` has `posts Post[]` → generates `PostOrderByRelationAggregateInputSchema`
- `Profile` used as `profile Profile` (single relation) → does NOT generate aggregate schema

#### Scalar Type Filters (Conditional)

**Rule**: Generate scalar filter schemas based on actual usage in the schema.

```typescript
// In src/builders/where-input.ts
export function generateScalarFilterSchemas(models: readonly DMMF.Model[]): string {
  const isTypeUsed = (type: string, checkNullable: boolean, checkList: boolean): boolean => {
    return models.some((model) =>
      model.fields.some(
        (field) =>
          field.kind === 'scalar' &&
          field.type === type &&
          (checkList ? field.isList : checkNullable ? !field.isRequired : field.isRequired)
      )
    );
  };

  // Only generate if type is actually used
  if (isTypeUsed('BigInt', false)) {
    // Generate BigIntFilterSchema
  }
  if (isTypeUsed('BigInt', true)) {
    // Generate BigIntNullableFilterSchema
  }
}
```

**Why This Matters**:

- Prevents TypeScript errors from referencing non-existent Prisma types (e.g., `Prisma.BigIntFilter` when BigInt isn't in schema)
- Reduces generated file size significantly
- Perfect type alignment with Prisma Client exports

### Filter Schema Patterns

Each scalar type needs up to 3 schemas (generated conditionally):

1. `StringFilterSchema` - Required field filters (equals, in, contains, etc.)
2. `StringNullableFilterSchema` - Nullable field filters (adds nullable wrappers to equals/in)
3. `StringListFilterSchema` - Array field filters (has, hasSome, hasEvery, isEmpty)

### Prisma Type Alignment

**Always use Prisma's exported types** for GenericSchema type parameters:

```typescript
// ✅ Correct - uses Prisma types
export const UserWhereInputSchema: v.GenericSchema<Prisma.UserWhereInput> = ...
export const StatusFilterSchema: v.GenericSchema<Prisma.EnumStatusFilter> = ...

// ❌ Wrong - custom types cause misalignment
export const UserWhereInputSchema: v.GenericSchema<UserWhereInput> = ...
type UserWhereInput = { ... }
```

### Builder Function Signatures

All builders take `DMMF.Model` or `DMMF.Field` and return a string of TypeScript code:

```typescript
export function generateWhereInputSchema(model: DMMF.Model): string {
  // Returns complete schema definition as string
}

// Conditional generators also accept models array for analysis
export function generateEnumFilterSchema(
  enumDef: DMMF.DatamodelEnum,
  models: readonly DMMF.Model[]
): string {
  // Analyzes all models to determine what to generate
}
```

## Development Workflow

### Build & Test

```bash
npm run dev              # Watch mode: auto-rebuilds on changes
npm run build           # One-time build with tsup
npx prisma generate     # Test generator with prisma/schema.prisma
```

Output is in `dist/` as `.cjs` files (CommonJS) despite `"type": "module"` in package.json.

### Linting (ESLint 9 Flat Config)

```bash
npm run lint            # Check for issues
npm run lint:fix        # Auto-fix issues
npm run format          # Prettier formatting
npm run type-check      # TypeScript check without emit
```

Configuration in `eslint.config.js` (flat config), not `.eslintrc.json`.

### Testing Changes

1. Edit source in `src/builders/`
2. `npm run build` (or use watch mode)
3. `npx prisma generate` to regenerate schemas
4. Check `prisma/generated/valibot/index.ts` for output

## Common Tasks

### Adding a New Prisma Type

1. Add to `PrismaScalarType` in `src/types.ts`
2. Update `typeMap` in `src/utils/type-mapping.ts` → Valibot schema
3. Add filter schemas in `src/builders/where-input.ts` (base, nullable, list variants)
4. Test with a field of that type in `prisma/schema.prisma`

### Adding a New Operation Type

1. Create builder in `src/builders/` (e.g., `aggregate-args.ts`)
2. Import and call in `src/lib/generate-schemas.ts` in appropriate pass
3. Consider dependencies: if it references other schemas, add after they're generated

### Modifying Filter Logic

Edit `generateScalarFilterSchemas()` in `src/builders/where-input.ts`. Each filter type gets comparison operators (equals, gt, lt) + type-specific ops (contains for strings, etc.).

## Gotchas

- **Single output file**: Everything goes to `prisma/generated/valibot/index.ts`. Don't create separate files per model.
- **Schema name normalization**: `normalizeSchemaName()` prevents `SchemaSchema` duplication
- **Lazy evaluation required**: Relations and self-references MUST use `v.lazy()` or you'll get circular dependency errors
- **Conditional generation required**: Always check if types/enums are actually used before generating schemas to match Prisma's exports
- **Prisma type alignment**: Use `Prisma.ModelWhereInput` not custom types - prevents type mismatches
- **tsup config**: Don't enable tree-shaking (`treeshake: false`) - breaks Prisma generator imports
- **Bin path**: The generator binary is `dist/bin.cjs` (updated from `.js` after adding `"type": "module"`)

## Debugging Common Issues

### "Prisma has no exported member named 'XFilter'"

**Cause**: Generator is creating a filter schema for a type/enum not actually used in the schema.

**Solution**:

1. Check `generateEnumFilterSchema()` in `src/builders/enum-schema.ts` - ensure conditional checks work
2. For scalar types: Check `generateScalarFilterSchemas()` in `src/builders/where-input.ts`
3. Verify the field actually exists in `prisma/schema.prisma` with correct nullability

**Example Fix**:

```typescript
// Problem: Generating EnumStatusFilter when Status is only used as nullable
enum Status { ACTIVE, INACTIVE }
model User {
  status Status?  // Nullable!
}

// Solution: Only generate nullable filter
const hasRequiredUsage = models.some(...field.isRequired);
if (!hasRequiredUsage) {
  // Don't generate base StatusFilterSchema
}
```

### "Prisma has no exported member named 'ModelOrderByRelationAggregateInput'"

**Cause**: Generating aggregate input for models not used as list relations.

**Solution**: Check `modelsUsedAsListRelations` set in `src/lib/generate-schemas.ts` - only models used in `field[]` patterns should have this schema.

**Example**:

```typescript
// Model Label is not used as list relation anywhere
model Label {
  id String @id
}

// Should NOT generate LabelOrderByRelationAggregateInputSchema
// Only generate if another model has: labels Label[]
```

### Type Misalignment Errors

**Cause**: Using custom TypeScript types instead of Prisma's exported types.

**Solution**: Always use `v.GenericSchema<Prisma.TypeName>` not `v.GenericSchema<TypeName>`.

```typescript
// ❌ Wrong
type UserWhereInput = { ... }
export const UserWhereInputSchema: v.GenericSchema<UserWhereInput> = ...

// ✅ Correct
export const UserWhereInputSchema: v.GenericSchema<Prisma.UserWhereInput> = ...
```

## Code Style

- Use template literals for multi-line schema generation
- Indent generated code with 2 spaces for readability
- Add section comments in generated output: `// ======== ModelName Schemas ========`
- Keep builders pure functions (no side effects, just string generation)
- Use DMMF types from `@prisma/generator-helper` - don't redefine types

## Prisma DMMF Reference

Key properties used throughout:

- `model.fields` - All fields including relations
- `field.kind` - 'scalar' | 'enum' | 'object' (relation)
- `field.isList` - Array type
- `field.isRequired` - NOT NULL in DB
- `field.relationName` - For relation filtering

Refer to `prisma/schema.prisma` for test models demonstrating 1:1, 1:N, N:M relations.
