# @nvt1904/prisma-valibot-generator

[![npm version](https://img.shields.io/npm/v/@nvt1904/prisma-valibot-generator.svg)](https://www.npmjs.com/package/@nvt1904/prisma-valibot-generator)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Downloads](https://img.shields.io/npm/dm/@nvt1904/prisma-valibot-generator.svg)](https://www.npmjs.com/package/@nvt1904/prisma-valibot-generator)

A **Prisma 7** generator that creates **[Valibot](https://valibot.dev)** validation schemas for every model in your schema.

The output mirrors Prisma's DMMF, allowing you to validate `find`, `create`, `update`, and `delete` operations with the same type safety you already get from `@prisma/client`.

## Table of Contents

- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Usage](#usage)
- [Configuration](#configuration)
- [Generated Schemas](#generated-schemas)
- [Type Mappings](#type-mappings)
- [Type Safety Features](#type-safety-features)
- [Contributing](#contributing--scripts)
- [License](#license)

## Features

- **🚀 Complete CRUD Coverage**: Generates model schemas plus all Prisma args (`find`, `create`, `update`, `upsert`, `delete`, `many` operations, and relation inputs).
- **🧠 Smart Type Alignment**:
  - `WhereInput` accepts both filter objects AND direct values (e.g., `name: "John"` or `name: { contains: "John" }`).
  - Relation filters support Prisma's XOR pattern: wrapper objects with `is`/`isNot`, direct `WhereInput`, or `null` (for nullable relations).
  - `DateTime` fields accept both `Date` objects and ISO strings.
  - Nullable fields use `v.nullish()` to accept `null | undefined`.
  - Required relations in `CreateInput` are properly typed (no unnecessary `v.optional()`).
  - `ScalarFieldEnum` uses array pattern (e.g., `['id', 'email'] as const`) consistent with regular enums.
- **⚡ Intelligent Conditional Generation**:
  - Only generates filter schemas, aggregate inputs, and relation helpers when Prisma actually uses them.
  - Generates local type definitions for scalar filters (e.g., `StringFilter`, `IntFilter`) to ensure full type safety without relying on potentially missing Prisma exports.
  - Prevents "has no exported member" errors when using a subset of Prisma features.
- **📦 Single File Output**: Emits one `index.ts` that imports `Prisma` types directly, keeping perfect parity with your schema.
- **🛠️ Zero Configuration**: Ships as a standard Prisma generator - just add to `schema.prisma` and run `prisma generate`.

## Requirements

- **Node.js**: `>=20.19.0 || >=22.12.0 || >=24.0.0`
- **Prisma**: `>=7.0.0`
- **Valibot**: `>=0.42.0`

## Installation

Install the generator as a dev dependency and `valibot` as a production dependency:

```bash
# yarn
yarn add valibot
yarn add -D @nvt1904/prisma-valibot-generator

# npm
npm install valibot
npm install -D @nvt1904/prisma-valibot-generator

# pnpm
pnpm add valibot
pnpm add -D @nvt1904/prisma-valibot-generator
```

> **Note**: Make sure `@prisma/client` and `prisma` are already part of your project so the generator can reference Prisma's types.

## Usage

1.  **Add the generator to your `schema.prisma`**:

    ```prisma
    generator client {
      provider = "prisma-client-js"
    }

    generator valibot {
      provider = "prisma-valibot-generator"
      // output = "../generated/valibot" // optional, defaults to ../generated/valibot
    }
    ```

2.  **Run Prisma Generate**:

    ```bash
    npx prisma generate
    ```

    The generator removes the output folder before emitting a new `index.ts`.

3.  **Import and Use**:

    ```ts
    import * as v from 'valibot';
    import {
      UserCreateInputSchema,
      UserFindManyArgsSchema,
      UserWhereInputSchema,
    } from '../generated/valibot';

    // Create operations - accepts Date objects or ISO strings
    const payload = v.parse(UserCreateInputSchema, {
      email: 'user@example.com',
      name: 'John Doe',
      createdAt: new Date(), // Date object works!
      profile: null, // Nullable fields accept null
    });
    await prisma.user.create({ data: payload });

    // Query operations - flexible filtering
    const query = v.parse(UserFindManyArgsSchema, {
      where: {
        email: 'user@example.com', // Direct value
        name: { contains: 'John' }, // Or filter object
        createdAt: { gte: new Date('2024-01-01') }, // Date object in filters
      },
      take: 10,
    });
    const users = await prisma.user.findMany(query);
    ```

## Configuration

The generator supports the following options in `schema.prisma`:

| Option | Default | Description |
| :--- | :--- | :--- |
| `output` | `../generated/valibot` | The output directory for the generated schemas, relative to `schema.prisma`. |

Example:

```prisma
generator valibot {
  provider = "prisma-valibot-generator"
  output   = "./src/schemas"
}
```

## Generated Schemas

For each model in your `schema.prisma` (e.g., `User`), the following schemas are generated:

| Schema Name | Description |
| :--- | :--- |
| `UserSchema` | Base model validation |
| `UserCreateInputSchema` | Input for `create` operations |
| `UserUncheckedCreateInputSchema` | Unchecked input for `create` operations |
| `UserUpdateInputSchema` | Input for `update` operations |
| `UserUncheckedUpdateInputSchema` | Unchecked input for `update` operations |
| `UserWhereInputSchema` | Filters for `where` clauses (supports recursion) |
| `UserWhereUniqueInputSchema` | Unique identifiers for `where` clauses |
| `UserSelectSchema` | Schema for `select` arguments |
| `UserIncludeSchema` | Schema for `include` arguments |
| `UserFindManyArgsSchema` | Arguments for `findMany` |
| `UserFindFirstArgsSchema` | Arguments for `findFirst` |
| `UserFindUniqueArgsSchema` | Arguments for `findUnique` |
| `UserCreateArgsSchema` | Arguments for `create` |
| `UserUpdateArgsSchema` | Arguments for `update` |
| `UserDeleteArgsSchema` | Arguments for `delete` |
| `UserUpsertArgsSchema` | Arguments for `upsert` |
| `UserDeleteManyArgsSchema` | Arguments for `deleteMany` |
| `UserUpdateManyArgsSchema` | Arguments for `updateMany` |
| `UserGroupByArgsSchema` | Arguments for `groupBy` |
| `UserAggregateArgsSchema` | Arguments for `aggregate` |
| `UserCountAggregateInputSchema` | Count aggregation input |
| `UserMinAggregateInputSchema` | Min aggregation input |
| `UserMaxAggregateInputSchema` | Max aggregation input |
| `UserAvgAggregateInputSchema` | Avg aggregation input |
| `UserSumAggregateInputSchema` | Sum aggregation input |

## Type Mappings

The generator maps Prisma types to Valibot schemas as follows:

| Prisma Type | Valibot Schema | Notes |
| :--- | :--- | :--- |
| `String` | `v.string()` | |
| `Int` | `v.number()` | |
| `Float` | `v.number()` | |
| `Decimal` | `v.number()` | Mapped to number for easier handling in JS/TS |
| `BigInt` | `v.bigint()` | |
| `Boolean` | `v.boolean()` | |
| `DateTime` | `v.union([v.pipe(v.string(), v.isoTimestamp()), v.date()])` | Accepts Date objects or ISO timestamp strings |
| `Json` | `v.any()` | |
| `Bytes` | `v.instance(Buffer)` | |
| `Enum` | `v.picklist(Enum)` | |

## Type Safety Features

### DateTime Flexibility

DateTime fields accept both `Date` objects and ISO strings:

```ts
// Both are valid
createdAt: new Date();
createdAt: '2024-01-01T00:00:00.000Z';
```

### Nullable Fields

Nullable fields use `v.nullish()` to accept `null`, `undefined`, or a value:

```ts
// Model schema
description: v.nullish(v.string()); // string | null | undefined

// CreateInput schema
description: v.optional(v.nullable(v.string())); // Can omit or set null
```

### WhereInput Unions

Filter fields accept either a filter object OR a direct value:

```ts
where: {
  name: 'John',                    // Direct string
  email: { contains: '@example' }, // Filter object
  age: { gte: 18 },                // Comparison
}
```

### Relation Filters (XOR Pattern)

Relation filters support Prisma's XOR pattern with three valid formats:

```ts
// 1. Wrapper object with is/isNot
where: {
  profile: { is: { bio: 'Hello' } },
  profile: { isNot: { bio: null } },
}

// 2. Direct WhereInput (shorthand)
where: {
  profile: { bio: 'Hello' },
}

// 3. Null (for nullable relations only)
where: {
  profile: null,
}
```

### ScalarFieldEnum Pattern

ScalarFieldEnum follows the same array pattern as regular enums:

```ts
// Generated for each model
export const UserScalarFieldEnum = ['id', 'email', 'name'] as const;

// Used in GroupBy and other operations
const result = await prisma.user.groupBy({
  by: ['email'], // Type-safe field names
  _count: true,
});
```

### Required Relations

Required relations in `CreateInput` are properly typed:

```ts
// Account model has required User relation
AccountCreateInputSchema = v.object({
  user: v.lazy(() => UserCreateNestedOneInputSchema), // Required, not optional!
  // ... other fields
});
```

## Contributing / Scripts

Local development uses `tsup` for builds. Helpful commands:

```bash
yarn build        # emit dist
yarn lint         # run eslint
yarn type-check   # ensure type safety
```

## License

[MIT](LICENSE)
