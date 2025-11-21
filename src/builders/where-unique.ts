import { DMMF } from '@prisma/generator-helper';

/**
 * Generates WhereUniqueInput schema for unique field constraints
 */
export function generateWhereUniqueInputSchema(model: DMMF.Model): string {
  const schemaName = `${model.name}WhereUniqueInputSchema`;
  const uniqueConstraints: string[] = [];

  // Find all unique fields and create separate object schemas for each
  for (const field of model.fields) {
    if (field.isId || field.isUnique) {
      if (field.kind === 'scalar' || field.kind === 'enum') {
        const fieldType =
          field.kind === 'enum' ? `v.picklist(${field.type}Enum)` : getScalarType(field.type);
        // Each unique field is its own constraint option
        uniqueConstraints.push(`v.object({ ${field.name}: ${fieldType} })`);
      }
    }
  }

  // Add compound unique fields
  if (model.uniqueIndexes) {
    for (const index of model.uniqueIndexes) {
      if (index.fields && index.fields.length > 1) {
        // Prisma generates a compound name like "field1_field2"
        const compoundName = index.fields.join('_');
        const compoundFields = index.fields
          .map((fieldName) => {
            const field = model.fields.find((f) => f.name === fieldName);
            if (!field) return '';
            const fieldType =
              field.kind === 'enum' ? `v.picklist(${field.type}Enum)` : getScalarType(field.type);
            return `${fieldName}: ${fieldType}`;
          })
          .filter(Boolean);

        // Wrap in nested object structure that Prisma expects
        uniqueConstraints.push(
          `v.object({ ${compoundName}: v.object({ ${compoundFields.join(', ')} }) })`
        );
      }
    }
  }

  // If only one constraint, use it directly; otherwise use union
  if (uniqueConstraints.length === 1) {
    return `export const ${schemaName}: v.GenericSchema<Prisma.${model.name}WhereUniqueInput> = ${uniqueConstraints[0]};
`;
  } else {
    return `export const ${schemaName}: v.GenericSchema<Prisma.${model.name}WhereUniqueInput> = v.union([
  ${uniqueConstraints.join(',\n  ')}
]);
`;
  }
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
