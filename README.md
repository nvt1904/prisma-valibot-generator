# @nvt1904/prisma-valibot-generator

A Prisma 7 generator that creates [Valibot](https://valibot.dev) validation schemas for every model in your schema. The output mirrors Prisma's DMMF so you can validate `find`, `create`, `update`, and `delete` operations with the same type safety you already get from `@prisma/client`.

## Features

- **Complete CRUD Coverage**: Generates model schemas plus all Prisma args (find, create, update, upsert, delete, many operations, and relation inputs)
- **Smart Type Alignment**:
  - WhereInput accepts both filter objects AND direct values (e.g., `name: "John"` or `name: { contains: "John" }`)
  - DateTime fields accept both `Date` objects and ISO strings
  - Nullable fields use `v.nullish()` to accept `null | undefined`
  - Required relations in CreateInput are properly typed (no unnecessary `v.optional()`)
- **Intelligent Conditional Generation**: Only generates filter schemas, aggregate inputs, and relation helpers when Prisma actually uses them, avoiding "has no exported member" errors
- **Single File Output**: Emits one `index.ts` that imports `Prisma` types directly, keeping perfect parity with your schema
- **Zero Configuration**: Ships as a standard Prisma generator - just add to `schema.prisma` and run `prisma generate`

## Requirements

- Node.js `>=20.19.0 || >=22.12.0 || >=24.0.0`
- Prisma `>=7.0.0`
- Valibot `>=0.42.0`

## Installation

Add the generator (dev) dependency along with the required peers:

```bash
# yarn
yarn add -D @nvt1904/prisma-valibot-generator valibot

# npm
npm install -D @nvt1904/prisma-valibot-generator valibot

# pnpm
pnpm add -D @nvt1904/prisma-valibot-generator valibot
```

Make sure `@prisma/client` and `prisma` are already part of your project so the generator can reference Prisma's types.

## Usage

1. Add a generator block to `schema.prisma`:

   ```prisma
   generator client {
     provider = "prisma-client-js"
   }

   generator valibot {
     provider = "prisma-valibot-generator"
     output   = "../generated/valibot" // optional, defaults to ../generated/valibot
   }
   ```

2. Run Prisma generate whenever your schema changes:

   ```bash
   npx prisma generate
   ```

The generator removes the output folder before emitting a new `index.ts`. The file imports `@prisma/client` types and exports every Valibot schema that corresponds to your Prisma models.

### Importing the schemas

Use the generated helpers anywhere you would normally call Prisma:

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

// WhereInput for custom queries
const filter = v.parse(UserWhereInputSchema, {
  OR: [
    { email: { endsWith: '@example.com' } },
    { role: 'ADMIN' }, // Direct enum value
  ],
});
```

Because the generator re-uses Prisma's DMMF, every schema stays aligned with your relations, nested inputs, conditional filters, and enums.

### Type Safety Features

#### DateTime Flexibility

DateTime fields accept both `Date` objects and ISO strings:

```ts
// Both are valid
createdAt: new Date();
createdAt: '2024-01-01T00:00:00.000Z';
```

#### Nullable Fields

Nullable fields use `v.nullish()` to accept `null`, `undefined`, or a value:

```ts
// Model schema
description: v.nullish(v.string()); // string | null | undefined

// CreateInput schema
description: v.optional(v.nullable(v.string())); // Can omit or set null
```

#### WhereInput Unions

Filter fields accept either a filter object OR a direct value:

```ts
where: {
  name: 'John',                    // Direct string
  email: { contains: '@example' }, // Filter object
  age: { gte: 18 },                // Comparison
}
```

#### Required Relations

Required relations in CreateInput are properly typed:

```ts
// Account model has required User relation
AccountCreateInputSchema = v.object({
  user: v.lazy(() => UserCreateNestedOneInputSchema), // Required, not optional!
  // ... other fields
});
```

### Customizing the output path

The `output` argument inside the generator block accepts a relative or absolute path. Example:

```prisma
output = "./src/prisma/valibot"
```

Whatever path you choose, import from the generated `index.ts` file.

## Contributing / Scripts

Local development uses `tsup` for builds. Helpful commands:

```bash
yarn build        # emit dist
yarn lint         # run eslint
yarn type-check   # ensure type safety
```

## License

[MIT](LICENSE)
