# @nvt1904/prisma-valibot-generator

[![npm version](https://img.shields.io/npm/v/@nvt1904/prisma-valibot-generator.svg)](https://www.npmjs.com/package/@nvt1904/prisma-valibot-generator)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Downloads](https://img.shields.io/npm/dm/@nvt1904/prisma-valibot-generator.svg)](https://www.npmjs.com/package/@nvt1904/prisma-valibot-generator)

A **Prisma 7** generator that creates **[Valibot](https://valibot.dev)** validation schemas for every model in your schema.

The output mirrors Prisma's DMMF, providing fully type-safe validation for all Prisma operations: `find`, `create`, `update`, `upsert`, `delete`, `aggregate`, `groupBy`, and more.

## Table of Contents

- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Usage](#usage)
- [Configuration](#configuration)
- [Generated Schemas](#generated-schemas)
- [Type Mappings](#type-mappings)
- [Type Safety Features](#type-safety-features)
  - [DateTime Flexibility](#datetime-flexibility)
  - [Nullable Fields](#nullable-fields)
  - [WhereInput Unions](#whereinput-unions)
  - [Relation Filters (XOR Pattern)](#relation-filters-xor-pattern)
  - [Logical Operators (AND/OR/NOT)](#logical-operators-andornot)
  - [ScalarFieldEnum Pattern](#scalarfieldenum-pattern)
  - [Required Relations](#required-relations)
  - [Relation Counting with _count](#relation-counting-with-_count)
  - [Optimized Schema Structure](#optimized-schema-structure)
- [Advanced Usage Patterns](#advanced-usage-patterns)
- [Contributing / Scripts](#contributing--scripts)
- [License](#license)

## Features

### 🚀 Complete CRUD Coverage
Generates comprehensive validation schemas for all Prisma operations:
- **Query Operations**: `findMany`, `findFirst`, `findUnique`, `count`, `aggregate`, `groupBy`
- **Mutation Operations**: `create`, `createMany`, `update`, `updateMany`, `upsert`, `delete`, `deleteMany`
- **Input Schemas**: `CreateInput`, `UpdateInput`, `WhereInput`, `WhereUniqueInput`, `OrderByInput`
- **Relation Helpers**: Nested create, connect, update, upsert, disconnect, and delete operations
- **Aggregate Inputs**: Count, sum, avg, min, max for numeric fields
- **Relation Counting**: `_count` field in `select` and `include` for counting related records

### 🧠 Smart Type Alignment
Perfect parity with Prisma's type system:
- **Flexible WhereInput**: Accepts both filter objects (`{ contains: "John" }`) AND direct values (`"John"`)
- **XOR Relation Filters**: Supports wrapper objects with `is`/`isNot`, direct `WhereInput`, or `null` (for nullable relations) with proper union ordering
- **Array/Object Union Handling**: Correctly validates both array and single object inputs for `AND`, `OR`, `NOT`, `orderBy`, and relation operations
- **DateTime Handling**: Accepts both `Date` objects and ISO timestamp strings
- **Nullable Fields**: Uses `v.nullish()` for model schemas, `v.nullable()` for input schemas
- **Required Relations**: Correctly typed without unnecessary `v.optional()` wrappers
- **ScalarFieldEnum**: Consistent array pattern (`['id', 'email'] as const`) matching regular enums

### ⚡ Optimized Schema Generation
- **Minimal Lazy Evaluation**: Removes redundant `v.lazy()` wrappers inside already-lazy contexts for cleaner, more efficient schemas
- **Conditional Generation**: Only generates filter schemas, aggregate inputs, and relation helpers when actually used
- **Local Type Definitions**: Provides full type safety for scalar filters without relying on potentially missing Prisma exports
- **Context-Specific Schemas**: Generates `WithoutX` input schemas for circular relation handling

### 📦 Single File Output
- Emits one `index.ts` that imports `Prisma` types directly
- Maintains perfect parity with your Prisma schema
- Zero runtime dependencies beyond Valibot

### 🛠️ Zero Configuration
Ships as a standard Prisma generator - just add to `schema.prisma` and run `prisma generate`.

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
    import { PrismaClient } from '@prisma/client';
    import {
      UserCreateInputSchema,
      UserUpdateInputSchema,
      UserFindManyArgsSchema,
      UserAggregateArgsSchema,
      UserGroupByArgsSchema,
    } from '../generated/valibot';

    const prisma = new PrismaClient();

    // ========== Create Operations ==========
    // Validates create input including nested relations
    const newUser = v.parse(UserCreateInputSchema, {
      email: 'user@example.com',
      name: 'John Doe',
      createdAt: new Date(),           // Date object
      profile: {
        create: {                       // Nested create
          bio: 'Software Engineer',
        },
      },
      posts: {
        create: [                       // Nested create many
          { title: 'First Post', content: 'Hello World' },
          { title: 'Second Post', content: 'More content' },
        ],
      },
    });
    await prisma.user.create({ data: newUser });

    // ========== Update Operations ==========
    // Validates update input with optional fields
    const updateData = v.parse(UserUpdateInputSchema, {
      name: 'Jane Doe',
      profile: {
        update: {                       // Nested update
          bio: 'Senior Engineer',
        },
      },
    });
    await prisma.user.update({
      where: { id: 1 },
      data: updateData,
    });

    // ========== Query Operations ==========
    // Flexible filtering with type-safe validation
    const query = v.parse(UserFindManyArgsSchema, {
      where: {
        email: 'user@example.com',     // Direct value
        name: { contains: 'John' },     // Filter object
        createdAt: {
          gte: new Date('2024-01-01'),  // Date in filter
        },
        profile: {
          is: { bio: { contains: 'Engineer' } } // Relation filter
        },
        posts: {
          some: { published: true },    // List relation filter
        },
      },
      include: {
        profile: true,
        posts: { where: { published: true } },
        _count: {                        // Count relations
          select: {
            posts: true,                 // Count all posts
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      skip: 0,
    });
    const users = await prisma.user.findMany(query);

    // ========== Aggregate & GroupBy ==========
    const aggregateQuery = v.parse(UserAggregateArgsSchema, {
      where: { isActive: true },
      _count: { id: true },
      _avg: { age: true },
      _max: { createdAt: true },
    });
    const stats = await prisma.user.aggregate(aggregateQuery);

    const groupQuery = v.parse(UserGroupByArgsSchema, {
      by: ['role'],
      _count: { id: true },
      having: {
        role: { _count: { gt: 5 } },
      },
    });
    const groups = await prisma.user.groupBy(groupQuery);
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
| `UserSelectSchema` | Schema for `select` arguments (includes `_count` for models with list relations) |
| `UserIncludeSchema` | Schema for `include` arguments (includes `_count` for models with list relations) |
| `UserCountOutputTypeSelectSchema` | Schema for selecting specific relation counts (only for models with list relations) |
| `UserCountOutputTypeDefaultArgsSchema` | Schema for `_count` field arguments (only for models with list relations) |
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

DateTime fields accept both `Date` objects and ISO strings for maximum flexibility:

```ts
// Both are valid and equivalent
const user = {
  createdAt: new Date(),                      // Date object
  updatedAt: '2024-01-01T00:00:00.000Z',     // ISO string
};

// In filters too!
where: {
  createdAt: { gte: new Date('2024-01-01') }, // Date object
  updatedAt: { lt: '2024-12-31T23:59:59.999Z' }, // ISO string
}
```

### Nullable Fields

Nullable fields use appropriate schemas based on context:

```ts
// Model schema - accepts value, null, or undefined
description: v.nullish(v.string()); // string | null | undefined

// CreateInput schema - optional with nullable value
description: v.optional(v.nullable(v.string())); // Can omit, pass null, or string

// UpdateInput schema - optional with nullable value
description: v.optional(v.nullable(v.string())); // Can omit, pass null, or string
```

### WhereInput Unions

Filter fields accept either a filter object OR a direct value for convenience:

```ts
where: {
  name: 'John',                    // Direct value (shorthand)
  email: { contains: '@example' }, // Filter object
  age: { gte: 18, lt: 65 },       // Multiple conditions
  isActive: true,                  // Boolean shorthand
}
```

### Relation Filters (XOR Pattern)

Relation filters support Prisma's XOR pattern with three valid formats:

```ts
// 1. Wrapper object with is/isNot (explicit filtering)
where: {
  profile: { is: { bio: 'Hello' } },        // Match condition
  profile: { isNot: { bio: null } },        // Negation
  store: { is: { status: 'ACTIVE' } },      // Works correctly!
}

// 2. Direct WhereInput (shorthand)
where: {
  profile: { bio: 'Hello' },                 // Same as { is: { bio: 'Hello' } }
  posts: { some: { published: true } },      // List relation
}

// 3. Null (for nullable relations only)
where: {
  profile: null,                             // Match null relations
}
```

**Implementation Details**:
- Uses `v.strictObject()` for the `is`/`isNot` wrapper to ensure it only matches when these keys are present
- Places `v.null()` first for nullable relations (fast-fail on null check)
- Direct `WhereInputSchema` comes last as the fallback for shorthand syntax
- This ordering ensures both wrapper and shorthand formats work correctly

### Logical Operators (AND/OR/NOT)

These operators accept both arrays and single objects:

```ts
where: {
  // Array syntax (multiple conditions)
  AND: [
    { status: 'ACTIVE' },
    { store: { is: { status: 'ACTIVE' } } },
    {
      OR: [
        { category: { slug: 'electronics' } },
        { category: { parent: { slug: 'electronics' } } }
      ]
    }
  ],

  // Object syntax (single condition)
  AND: { status: 'ACTIVE' },

  // Deeply nested combinations work!
  OR: [
    { name: 'A' },
    {
      AND: [
        { price: { gte: 100 } },
        { stock: { gt: 0 } }
      ]
    }
  ]
}
```

**Implementation**: Array schemas are placed **first** in unions (`v.union([v.array(...), object])`) to ensure arrays are correctly validated before attempting object matching.

### ScalarFieldEnum Pattern

ScalarFieldEnum follows the same array pattern as regular enums for consistency:

```ts
// Generated for each model
export const UserScalarFieldEnum = ['id', 'email', 'name', 'createdAt'] as const;

// Used in GroupBy, orderBy, and select operations
const result = await prisma.user.groupBy({
  by: ['email'],              // Type-safe field names
  _count: { id: true },
  having: {
    email: { _count: { gt: 1 } }
  }
});
```

### Required Relations

Required relations in `CreateInput` are correctly typed without unnecessary optionals:

```ts
// Account model has required User relation
export const AccountCreateInputSchema = v.object({
  user: UserCreateNestedOneInputSchema,      // Required (no v.optional!)
  provider: v.string(),
  providerAccountId: v.string(),
});

// But you can still connect or create
await prisma.account.create({
  data: {
    provider: 'github',
    providerAccountId: '12345',
    user: { connect: { id: userId } },        // Connect to existing
    // OR
    user: { create: { email: 'new@example.com' } }, // Create new
  }
});
```

### Relation Counting with _count

Models with list relations automatically include a `_count` field in their `Select` and `Include` schemas, allowing you to count related records efficiently:

```ts
// Count all related records
const users = await prisma.user.findMany({
  select: {
    id: true,
    name: true,
    _count: true,  // Returns count of all list relations (posts, comments, etc.)
  }
});
// Result: [{ id: '1', name: 'John', _count: { posts: 5, comments: 12 } }]

// Count specific relations
const users = await prisma.user.findMany({
  select: {
    id: true,
    _count: {
      select: {
        posts: true,  // Only count posts
      }
    }
  }
});
// Result: [{ id: '1', _count: { posts: 5 } }]

// Count with filters
const users = await prisma.user.findMany({
  include: {
    posts: true,
    _count: {
      select: {
        posts: { where: { published: true } },  // Count only published posts
      }
    }
  }
});
// Result: [{ id: '1', posts: [...], _count: { posts: 3 } }]
```

**Implementation Details**:
- Only models with **list relations** (one-to-many or many-to-many) get the `_count` field
- Models with only singular relations (one-to-one) do not have `_count`
- Each relation can be counted with optional `where` filters
- Generated schemas include:
  - `ModelCountOutputTypeSelectSchema` - Select which relations to count
  - `ModelCountOutputTypeDefaultArgsSchema` - Arguments for the `_count` field
  - `ModelCountOutputTypeCount[Relation]ArgsSchema` - Filter arguments for each relation count

### Optimized Schema Structure

Generated schemas use minimal lazy evaluation for better performance:

```ts
// Outer lazy for circular references
export const UserCreateNestedOneInputSchema = v.lazy(() => v.object({
  create: v.optional(UserCreateInputSchema),           // Direct reference (no extra lazy!)
  connectOrCreate: v.optional(UserCreateOrConnectInputSchema), // Direct reference
  connect: v.optional(UserWhereUniqueInputSchema),     // Direct reference
}));

// This avoids unnecessary function wrapping while maintaining type safety
```

## Advanced Usage Patterns

### API Route Validation

Use generated schemas to validate API inputs with full type safety:

```ts
// app/api/users/route.ts (Next.js App Router)
import { NextRequest, NextResponse } from 'next/server';
import * as v from 'valibot';
import { prisma } from '@/lib/prisma';
import { UserCreateInputSchema, UserFindManyArgsSchema } from '@/generated/valibot';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = v.parse(UserCreateInputSchema, body);

    const user = await prisma.user.create({ data: validatedData });
    return NextResponse.json(user);
  } catch (error) {
    if (v.isValiError(error)) {
      return NextResponse.json(
        { error: 'Validation failed', issues: v.flatten(error.issues) },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = v.parse(UserFindManyArgsSchema, {
      where: JSON.parse(searchParams.get('where') || '{}'),
      take: parseInt(searchParams.get('take') || '10'),
      skip: parseInt(searchParams.get('skip') || '0'),
    });

    const users = await prisma.user.findMany(query);
    return NextResponse.json(users);
  } catch (error) {
    // Handle validation errors...
  }
}
```

### Form Validation with React Hook Form

Integrate with form libraries using Valibot's resolver:

```ts
import { useForm } from 'react-hook-form';
import { valibotResolver } from '@hookform/resolvers/valibot';
import * as v from 'valibot';
import { UserCreateInputSchema } from '@/generated/valibot';

// Extract just the fields you need for the form
const UserFormSchema = v.object({
  email: v.pipe(v.string(), v.email()),
  name: v.pipe(v.string(), v.minLength(2)),
  role: v.picklist(['USER', 'ADMIN']),
});

function UserForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: valibotResolver(UserFormSchema),
  });

  const onSubmit = async (data: v.InferOutput<typeof UserFormSchema>) => {
    // data is fully validated and typed
    await fetch('/api/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('email')} />
      {errors.email && <span>{errors.email.message}</span>}

      <input {...register('name')} />
      {errors.name && <span>{errors.name.message}</span>}

      <select {...register('role')}>
        <option value="USER">User</option>
        <option value="ADMIN">Admin</option>
      </select>

      <button type="submit">Create User</button>
    </form>
  );
}
```

### Server Actions (Next.js)

Use with server actions for type-safe mutations:

```ts
'use server';

import * as v from 'valibot';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { UserCreateInputSchema } from '@/generated/valibot';

export async function createUser(formData: FormData) {
  try {
    const data = v.parse(UserCreateInputSchema, {
      email: formData.get('email'),
      name: formData.get('name'),
      role: formData.get('role'),
    });

    const user = await prisma.user.create({ data });

    revalidatePath('/users');
    return { success: true, user };
  } catch (error) {
    if (v.isValiError(error)) {
      return { success: false, errors: v.flatten(error.issues) };
    }
    return { success: false, error: 'Failed to create user' };
  }
}
```

### tRPC Integration

Perfect for building type-safe APIs:

```ts
import { initTRPC } from '@trpc/server';
import * as v from 'valibot';
import { prisma } from './prisma';
import {
  UserFindManyArgsSchema,
  UserCreateInputSchema,
  UserUpdateInputSchema,
} from './generated/valibot';

const t = initTRPC.create();

export const appRouter = t.router({
  users: t.router({
    list: t.procedure
      .input((raw) => v.parse(UserFindManyArgsSchema, raw))
      .query(({ input }) => prisma.user.findMany(input)),

    create: t.procedure
      .input((raw) => v.parse(UserCreateInputSchema, raw))
      .mutation(({ input }) => prisma.user.create({ data: input })),

    update: t.procedure
      .input((raw) => v.parse(
        v.object({
          where: UserWhereUniqueInputSchema,
          data: UserUpdateInputSchema,
        }),
        raw
      ))
      .mutation(({ input }) =>
        prisma.user.update({ where: input.where, data: input.data })
      ),
  }),
});

export type AppRouter = typeof appRouter;
```

### Custom Schema Composition

Compose generated schemas with custom validation:

```ts
import * as v from 'valibot';
import { UserCreateInputSchema } from '@/generated/valibot';

// Add custom validation on top of generated schema
const UserRegistrationSchema = v.pipe(
  UserCreateInputSchema,
  v.check(
    (data) => data.email.endsWith('@company.com'),
    'Email must be from company domain'
  ),
  v.check(
    (data) => data.name.length >= 5,
    'Name must be at least 5 characters'
  )
);

// Create a subset schema for specific use cases
const UserProfileUpdateSchema = v.pick(UserUpdateInputSchema, [
  'name',
  'bio',
  'avatar',
]);

// Add additional fields not in Prisma schema
const UserRegistrationWithPasswordSchema = v.object({
  ...v.parse(v.object({}), UserCreateInputSchema).entries,
  password: v.pipe(v.string(), v.minLength(8)),
  confirmPassword: v.pipe(v.string(), v.minLength(8)),
});
```

## Technical Implementation Notes

### Union Ordering for Correct Validation

This generator carefully orders union types to ensure Valibot validates inputs correctly:

#### Arrays vs Objects (AND/OR/NOT, orderBy, etc.)
```typescript
// ✅ CORRECT - Array schema first
v.union([v.array(Schema), Schema])

// ❌ WRONG - Would return {} for array inputs
v.union([Schema, v.array(Schema)])
```

When an array `[{...}, {...}]` is passed to a union with the object schema first, Valibot's lazy evaluation can cause it to partially match the object schema and return an empty object instead of properly failing and trying the array schema.

**Affected fields**:
- `AND`, `OR`, `NOT` in where clauses
- `orderBy` in queries and aggregations
- `distinct` in queries
- Relation operation arrays (create, connect, update, etc.)
- `data` in CreateMany operations

#### Relation Filters (is/isNot vs Direct)
```typescript
// ✅ CORRECT - For nullable relations
v.union([
  v.null(),                           // 1. Fast-fail on null
  v.strictObject({                    // 2. Match wrapper {is/isNot}
    is: v.optional(...),
    isNot: v.optional(...)
  }),
  WhereInputSchema                    // 3. Fallback to shorthand
])

// ✅ CORRECT - For required relations
v.union([
  v.strictObject({                    // 1. Match wrapper {is/isNot}
    is: v.optional(...),
    isNot: v.optional(...)
  }),
  WhereInputSchema                    // 2. Fallback to shorthand
])
```

Using `v.strictObject()` ensures the wrapper only matches when `is` or `isNot` keys are actually present. This allows both patterns to work:
- Wrapper: `{ is: { field: value } }`
- Direct: `{ field: value }`

### Performance Considerations

The generator optimizes for both validation performance and bundle size:

1. **Minimal lazy wrapping**: Only uses `v.lazy()` where circular references require it
2. **Union order optimization**: Places most common cases first (e.g., null before complex objects)
3. **Strict object matching**: Uses `v.strictObject()` only where needed to distinguish between similar object shapes
4. **Conditional generation**: Only generates schemas that are actually used in your Prisma schema

## Contributing / Scripts

Local development uses `tsup` for builds. Helpful commands:

```bash
yarn build        # emit dist
yarn lint         # run eslint
yarn type-check   # ensure type safety
```

## License

[MIT](LICENSE)
