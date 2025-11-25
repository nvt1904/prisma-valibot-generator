import { DMMF } from '@prisma/generator-helper';
import { GeneratedFile } from '../types';
import { generateEnumSchema, generateEnumFilterSchema } from '../builders/enum-schema';
import { generateModelSchema, generateScalarFieldEnum } from '../builders/model-schema';
import {
  generateWhereInputSchema,
  generateScalarFilterSchemas,
  generateListRelationFilterSchema,
  generateScalarWhereWithAggregatesInputSchema,
} from '../builders/where-input';
import { generateWhereUniqueInputSchema } from '../builders/where-unique';
import {
  generateOrderBySchema,
  generateOrderByRelationAggregateSchema,
  generateOrderByWithAggregationInputSchema,
  generateCountOrderByAggregateInputSchema,
  generateSumOrderByAggregateInputSchema,
  generateAvgOrderByAggregateInputSchema,
  generateMinOrderByAggregateInputSchema,
  generateMaxOrderByAggregateInputSchema,
} from '../builders/orderby-input';
import { generateSelectSchema, generateIncludeSchema } from '../builders/select-include';
import {
  generateFindManyArgsSchema,
  generateFindFirstArgsSchema,
  generateFindUniqueArgsSchema,
  generateArgsSchema,
} from '../builders/query-args';
import {
  generateCreateArgsSchema,
  generateCreateInputSchema,
  generateUncheckedCreateInputSchema,
  generateCreateNestedManyInputSchema,
  generateUncheckedCreateNestedManyInputSchema,
  generateCreateNestedOneInputSchema,
  generateCreateOrConnectInputSchema,
  generateCreateManyArgsSchema,
  generateCreateManyInputSchema,
  generateCreateNestedOneWithoutInputSchemas,
  generateCreateNestedManyWithoutInputSchemas,
  generateCreateWithoutInputSchemas,
  generateUncheckedCreateWithoutInputSchemas,
  generateCreateOrConnectWithoutInputSchemas,
  generateCreateManyInputEnvelopeSchemas,
  generateCreateManyWithoutInputSchemas,
  generateUncheckedCreateNestedManyWithoutInputSchemas,
} from '../builders/create-args';
import {
  generateUpdateArgsSchema,
  generateUpdateInputSchema,
  generateUncheckedUpdateInputSchema,
  generateUpdateManyNestedInputSchema,
  generateUpdateOneNestedInputSchema,
  generateUpsertWithWhereUniqueInputSchema,
  generateUpsertInputSchema,
  generateUpdateWithWhereUniqueInputSchema,
  generateUpdateManyWithWhereInputSchema,
  generateUpdateManyArgsSchema,
  generateUpdateManyMutationInputSchema,
  generateUpsertArgsSchema,
  generateUpdateWithoutInputSchemas,
  generateUncheckedUpdateWithoutInputSchemas,
  generateUpdateOneNestedWithoutInputSchemas,
  generateUpdateManyNestedWithoutInputSchemas,
  generateUpsertWithoutInputSchemas,
  generateUpsertWithWhereUniqueWithoutInputSchemas,
  generateUpdateWithWhereUniqueWithoutInputSchemas,
  generateUpdateManyWithWhereWithoutInputSchemas,
} from '../builders/update-args';
import { generateDeleteArgsSchema, generateDeleteManyArgsSchema } from '../builders/delete-args';
import {
  generateCountAggregateInputSchema,
  generateSumAggregateInputSchema,
  generateAvgAggregateInputSchema,
  generateMinAggregateInputSchema,
  generateMaxAggregateInputSchema,
} from '../builders/aggregate-schema';
import { generateGroupByArgsSchema } from '../builders/groupby-args';
import { generateAggregateArgsSchema } from '../builders/aggregate-args';
import { generateValibotGroupByArgsGenericType } from '../builders/utils';

/**
 * Main function to generate all Valibot schemas from Prisma DMMF
 */
export function generateSchemas(dmmf: DMMF.Document): GeneratedFile {
  const files: GeneratedFile = {};

  // Generate index file with all exports
  let indexContent = `import * as v from 'valibot';
import { Prisma } from '@prisma/client';

`;

  // Add reusable sort order schema
  indexContent += `// Reusable sort order schema\n`;
  indexContent += `export const SortOrderSchema = v.picklist(['asc', 'desc']);\n\n`;

  // Add reusable query mode schema
  indexContent += `// Reusable query mode schema\n`;
  indexContent += `export const QueryModeSchema = v.picklist(['default', 'insensitive']);\n\n`;

  // Add nulls order schema
  indexContent += `// Nulls order schema\n`;
  indexContent += `export const NullsOrderSchema = v.picklist(['first', 'last']);\n\n`;

  // Add sort order input schema
  indexContent += `// Sort order input schema\n`;
  indexContent += `export const SortOrderInputSchema = v.object({\n`;
  indexContent += `  sort: SortOrderSchema,\n`;
  indexContent += `  nulls: v.optional(NullsOrderSchema),\n`;
  indexContent += `});\n\n`;

  // Generate enums first
  const enumsContent: string[] = [];
  for (const enumDef of dmmf.datamodel.enums) {
    enumsContent.push(generateEnumSchema(enumDef));
    enumsContent.push(generateEnumFilterSchema(enumDef, dmmf.datamodel.models));
  }

  // Add scalar filter schemas (conditional based on usage)
  enumsContent.push(generateScalarFilterSchemas(dmmf.datamodel.models));

  indexContent += enumsContent.join('\n');

  // Generate schemas for each model
  const models = dmmf.datamodel.models;

  // First pass: Generate base schemas and scalar field enums
  for (const model of models) {
    indexContent += `\n// ========================================\n`;
    indexContent += `// ${model.name} Schemas\n`;
    indexContent += `// ========================================\n\n`;

    indexContent += generateModelSchema(model);
    indexContent += generateScalarFieldEnum(model);
  }

  // Find models that are used as list relations (need OrderByRelationAggregate)
  // Prisma only generates OrderByRelationAggregateInput types for models that appear
  // in list relation fields (e.g., posts Post[]). This prevents TypeScript errors
  // from referencing non-existent Prisma types.
  //
  // Example:
  //   User has `posts Post[]` → PostOrderByRelationAggregateInputSchema IS generated
  //   Profile used as `profile Profile` → ProfileOrderByRelationAggregateInputSchema NOT generated
  const modelsUsedAsListRelations = new Set<string>();
  for (const model of models) {
    for (const field of model.fields) {
      if (field.kind === 'object' && field.isList) {
        modelsUsedAsListRelations.add(field.type);
      }
    }
  }

  // Second pass: Generate where, orderby, select, include schemas
  for (const model of models) {
    indexContent += `\n// ${model.name} Where & OrderBy\n`;
    indexContent += generateWhereUniqueInputSchema(model);
    indexContent += generateWhereInputSchema(model);
    // Only generate ListRelationFilter for models used as list relations
    if (modelsUsedAsListRelations.has(model.name)) {
      indexContent += generateListRelationFilterSchema(model);
    }
    indexContent += generateOrderBySchema(model);
    // Only generate OrderByRelationAggregate for models used as list relations
    if (modelsUsedAsListRelations.has(model.name)) {
      indexContent += generateOrderByRelationAggregateSchema(model);
    }
    indexContent += generateSelectSchema(model);
    indexContent += generateIncludeSchema(model);
  }

  // Third pass: Generate create/update input schemas
  for (const model of models) {
    indexContent += `\n// ${model.name} Create/Update Inputs\n`;
    indexContent += generateCreateInputSchema(model, models);
    indexContent += generateUncheckedCreateInputSchema(model, models);

    // Context-specific CreateWithout schemas
    indexContent += generateCreateWithoutInputSchemas(model, models);
    indexContent += generateUncheckedCreateWithoutInputSchemas(model, models);
    indexContent += generateCreateOrConnectWithoutInputSchemas(model);

    // Context-specific nested schemas
    indexContent += generateCreateNestedOneWithoutInputSchemas(model, models);
    indexContent += generateCreateNestedManyWithoutInputSchemas(model, models);
    indexContent += generateUncheckedCreateNestedManyWithoutInputSchemas(model, models);

    // CreateMany envelope and input schemas
    indexContent += generateCreateManyInputEnvelopeSchemas(model, models);
    indexContent += generateCreateManyWithoutInputSchemas(model, models);

    // Generic schemas (keep for backward compatibility if needed)
    indexContent += generateCreateNestedManyInputSchema(model);
    indexContent += generateUncheckedCreateNestedManyInputSchema(model);
    indexContent += generateCreateNestedOneInputSchema(model);
    indexContent += generateCreateOrConnectInputSchema(model);
    indexContent += generateCreateManyInputSchema(model);

    // Update input schemas
    indexContent += generateUpdateInputSchema(model, models);
    indexContent += generateUncheckedUpdateInputSchema(model);

    // Context-specific UpdateWithout schemas
    indexContent += generateUpdateWithoutInputSchemas(model, models);
    indexContent += generateUncheckedUpdateWithoutInputSchemas(model);

    // Context-specific nested update schemas
    indexContent += generateUpdateOneNestedWithoutInputSchemas(model, models);
    indexContent += generateUpdateManyNestedWithoutInputSchemas(model, models);

    // Context-specific upsert schemas
    indexContent += generateUpsertWithoutInputSchemas(model);
    indexContent += generateUpsertWithWhereUniqueWithoutInputSchemas(model);

    // Context-specific update with where schemas
    indexContent += generateUpdateWithWhereUniqueWithoutInputSchemas(model);
    indexContent += generateUpdateManyWithWhereWithoutInputSchemas(model);

    // Generic update schemas
    indexContent += generateUpdateManyNestedInputSchema(model);
    indexContent += generateUpdateOneNestedInputSchema(model);
    indexContent += generateUpsertWithWhereUniqueInputSchema(model);
    indexContent += generateUpsertInputSchema(model);
    indexContent += generateUpdateWithWhereUniqueInputSchema(model);
    indexContent += generateUpdateManyWithWhereInputSchema(model);
    indexContent += generateUpdateManyMutationInputSchema(model);
  }

  // Fourth pass: Generate args schemas for all operations
  for (const model of models) {
    indexContent += `\n// ${model.name} Args\n`;
    indexContent += generateArgsSchema(model);
    indexContent += generateFindManyArgsSchema(model);
    indexContent += generateFindFirstArgsSchema(model);
    indexContent += generateFindUniqueArgsSchema(model);
    indexContent += generateCreateArgsSchema(model);
    indexContent += generateCreateManyArgsSchema(model);
    indexContent += generateUpdateArgsSchema(model);
    indexContent += generateUpdateManyArgsSchema(model);
    indexContent += generateUpsertArgsSchema(model);
    indexContent += generateDeleteArgsSchema(model);
    indexContent += generateDeleteManyArgsSchema(model);

    // Aggregate orderBy schemas (needed before groupBy)
    indexContent += generateCountOrderByAggregateInputSchema(model);
    indexContent += generateSumOrderByAggregateInputSchema(model);
    indexContent += generateAvgOrderByAggregateInputSchema(model);
    indexContent += generateMinOrderByAggregateInputSchema(model);
    indexContent += generateMaxOrderByAggregateInputSchema(model);
    indexContent += generateOrderByWithAggregationInputSchema(model);

    // Aggregate schemas
    indexContent += generateCountAggregateInputSchema(model);
    indexContent += generateSumAggregateInputSchema(model);
    indexContent += generateAvgAggregateInputSchema(model);
    indexContent += generateMinAggregateInputSchema(model);
    indexContent += generateMaxAggregateInputSchema(model);

    // ScalarWhereWithAggregates (for GroupBy having clause)
    indexContent += generateScalarWhereWithAggregatesInputSchema(model);

    // GroupBy args
    indexContent += generateGroupByArgsSchema(model);

    // Aggregate args
    indexContent += generateAggregateArgsSchema(model);
  }

  // Generate utils
  indexContent += generateValibotGroupByArgsGenericType();

  files['index.ts'] = indexContent;

  return files;
}
