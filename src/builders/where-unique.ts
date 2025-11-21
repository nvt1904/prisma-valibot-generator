import { DMMF } from '@prisma/generator-helper';

/**
 * Generates WhereUniqueInput schema for unique field constraints
 */
export function generateWhereUniqueInputSchema(model: DMMF.Model): string {
  const schemaName = `${model.name}WhereUniqueInputSchema`;
  const uniqueFields: string[] = [];

  // Find all unique fields
  for (const field of model.fields) {
    if (field.isId || field.isUnique) {
      if (field.kind === 'scalar' || field.kind === 'enum') {
        const fieldType =
          field.kind === 'enum' ? `v.picklist(${field.type}Enum)` : getScalarType(field.type);
        uniqueFields.push(`  ${field.name}: v.optional(${fieldType}),`);
      }
    }
  }

  // Add compound unique fields
  if (model.uniqueIndexes) {
    for (const index of model.uniqueIndexes) {
      if (index.fields && index.fields.length > 1) {
        const compoundName = index.fields.join('_');
        const compoundFields = index.fields
          .map((fieldName) => {
            const field = model.fields.find((f) => f.name === fieldName);
            if (!field) return '';
            const fieldType =
              field.kind === 'enum' ? `v.picklist(${field.type}Enum)` : getScalarType(field.type);
            return `    ${fieldName}: ${fieldType},`;
          })
          .filter(Boolean);

        uniqueFields.push(`  ${compoundName}: v.optional(v.object({
${compoundFields.join('\n')}
  })),`);
      }
    }
  }

  return `export const ${schemaName} = v.object({
${uniqueFields.join('\n')}
});
`;
}

function getScalarType(type: string): string {
  const typeMap: Record<string, string> = {
    String: 'v.string()',
    Int: 'v.number()',
    BigInt: 'v.bigint()',
    Float: 'v.number()',
    Decimal: 'v.number()',
    Boolean: 'v.boolean()',
    DateTime: 'v.pipe(v.string(), v.isoDateTime())',
    Json: 'v.any()',
    Bytes: 'v.instance(Buffer)',
  };

  return typeMap[type] || 'v.any()';
}
