# Prisma Valibot Generator

A Prisma generator that creates Valibot validation schemas for all your Prisma models with full support for all operations (findFirst, findMany, create, update, delete, etc.) and relations.

## Installation

```bash
npm install @nvt1904/prisma-valibot-generator valibot

yarn add @nvt1904/prisma-valibot-generator valibot
```

## Usage

Add the generator to your `schema.prisma`:

```prisma
generator valibot {
  provider = "prisma-valibot-generator"
  output   = "../generated/valibot"
}

datasource db {
  provider = "postgresql"
  // Note: In Prisma 7+, the url is configured in prisma.config.ts
}
```

For Prisma 7+, create `prisma/prisma.config.ts`:

```typescript
import { defineConfig } from 'prisma/config';

export default defineConfig({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});
```

For Prisma 5-6, you can still use the traditional approach:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Generate schemas:

```bash
npx prisma generate
```

## Generated Schemas

The generator creates comprehensive Valibot schemas for:

- **Model schemas**: Base validation for model data
- **FindFirst/FindMany args**: With where, select, include, orderBy, skip, take, cursor, distinct
- **Create/Update/Upsert args**: With nested creates and updates
- **Delete/DeleteMany args**: With where filters
- **Relation support**: Full nested query support with circular reference handling

## Example Usage

```typescript
import * as v from 'valibot';
import {
  UserFindManyArgsSchema,
  UserCreateArgsSchema,
  PostIncludeSchema,
} from './generated/valibot';

// Validate findMany query
const findManyArgs = v.parse(UserFindManyArgsSchema, {
  where: {
    email: { contains: '@example.com' },
    posts: {
      some: {
        published: true,
      },
    },
  },
  include: {
    posts: {
      where: { published: true },
      orderBy: { createdAt: 'desc' },
    },
    profile: true,
  },
  take: 10,
});

// Validate create mutation
const createArgs = v.parse(UserCreateArgsSchema, {
  data: {
    email: 'user@example.com',
    name: 'John Doe',
    posts: {
      create: [{ title: 'First Post', content: 'Hello World' }],
    },
  },
});
```

## Features

- ✅ Full TypeScript type safety
- ✅ All Prisma operations supported
- ✅ Nested relation queries
- ✅ Circular reference handling with lazy schemas
- ✅ Enum validation
- ✅ Optional/nullable field handling
- ✅ List relations with filters
- ✅ Scalar filters (contains, startsWith, gt, lt, etc.)
- ✅ **Conditional schema generation** - only generates schemas for types actually used in your Prisma schema

## Conditional Schema Generation

The generator intelligently analyzes your Prisma schema and **only generates schemas that Prisma Client actually exports**. This prevents TypeScript errors and significantly reduces the generated file size.

### What Gets Generated Conditionally?

#### 1. Enum Filters

Only generates filter schemas for enums based on how they're actually used:

```prisma
enum UserRole {
  USER
  ADMIN
}

enum PaymentStatus {
  PENDING
  COMPLETED
}

model User {
  role   UserRole          // Required field
  status PaymentStatus?    // Nullable field
}
```

**Generated schemas:**

- ✅ `UserRoleFilterSchema` (base filter, because it's required)
- ✅ `PaymentStatusNullableFilterSchema` (nullable filter only)
- ❌ `PaymentStatusFilterSchema` (NOT generated - only used as nullable)

This prevents errors like:

```typescript
// Error: Namespace 'Prisma' has no exported member 'EnumPaymentStatusFilter'
```

#### 2. OrderByRelationAggregate

Only generates aggregate order schemas for models used as **list relations**:

```prisma
model User {
  posts Post[]      // List relation
}

model Post {
  author User       // Single relation
}

model Label {
  id String @id     // Not used in any relation
}
```

**Generated schemas:**

- ✅ `PostOrderByRelationAggregateInputSchema` (used as list: `posts Post[]`)
- ❌ `UserOrderByRelationAggregateInputSchema` (only used as single relation)
- ❌ `LabelOrderByRelationAggregateInputSchema` (not used in relations)

This prevents errors like:

```typescript
// Error: Namespace 'Prisma' has no exported member 'LabelOrderByRelationAggregateInput'
```

#### 3. Scalar Type Filters

Generates filter schemas based on actual scalar type usage (String, Int, BigInt, DateTime, etc.):

```prisma
model Product {
  name        String
  price       Float
  stock       Int
  // Note: BigInt, Bytes, Decimal are NOT used anywhere
}
```

Currently, all scalar filter schemas are generated using local TypeScript types to maintain compatibility, but the conditional logic is in place for future optimization.

### Benefits

1. **No TypeScript Errors**: Eliminates errors from referencing Prisma types that don't exist
2. **Smaller Output**: Reduces generated file size by excluding unnecessary schemas
3. **Perfect Type Alignment**: Generated schemas exactly match Prisma Client's exported types
4. **Automatic**: No configuration needed - works automatically based on your schema

## Development

### Building

The project uses [tsup](https://tsup.egoist.dev/) for fast, zero-config bundling:

```bash
# Build once
npm run build

# Watch mode for development
npm run dev
```

### Linting and Formatting

The project uses ESLint 9 with TypeScript support and Prettier for code formatting:

```bash
# Run ESLint
npm run lint

# Fix ESLint issues automatically
npm run lint:fix

# Format code with Prettier
npm run format

# Check formatting without modifying files
npm run format:check

# Type check without emitting files
npm run type-check
```

### Testing

After making changes, test the generator:

```bash
npm run build
npx prisma generate
```

### Project Structure

- `src/generator.ts` - Main generator entry point
- `src/builders/` - Schema builders for different Prisma operations
- `src/lib/` - Core generation logic
- `src/utils/` - Helper utilities

## Releasing New Versions

This package uses automated CI/CD with GitHub Actions to publish to npm.

### Prerequisites

1. **Set up NPM_TOKEN secret** in your GitHub repository:
   - Go to [npmjs.com](https://www.npmjs.com/) and generate an automation token
   - In your GitHub repo, go to Settings → Secrets and variables → Actions
   - Add a new repository secret named `NPM_TOKEN` with your npm token

### Release Process

1. **Update version** in `package.json`:

   ```bash
   # For patch releases (bug fixes)
   npm version patch

   # For minor releases (new features)
   npm version minor

   # For major releases (breaking changes)
   npm version major
   ```

2. **Push the version tag**:

   ```bash
   git push origin main --follow-tags
   ```

3. **Automatic publishing**: GitHub Actions will automatically:
   - Run tests (type-check, lint, build)
   - Publish to npm with provenance
   - Create a GitHub release

### CI/CD Workflows

- **CI** (`.github/workflows/ci.yml`): Runs on every push and PR
  - Tests on Node.js 18 and 20
  - Type checking, linting, building
  - Prisma schema generation test

- **Publish** (`.github/workflows/publish.yml`): Runs on version tags (`v*`)
  - Builds the package
  - Publishes to npm with provenance attestation
  - Requires `NPM_TOKEN` secret

## License

MIT
