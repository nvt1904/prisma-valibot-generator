import { DMMF } from '@prisma/generator-helper';
import { PrismaScalarType } from '../types';

/**
 * Maps Prisma scalar types to Valibot schema constructors
 */
export function getValibotType(fieldType: string, isList: boolean = false): string {
  if (fieldType === 'DateTime' && isList) {
    return 'v.union([v.array(v.pipe(v.string(), v.isoTimestamp())), v.array(v.date())])';
  }
  const baseType = getBaseValibotType(fieldType);
  return isList ? `v.array(${baseType})` : baseType;
}

function getBaseValibotType(fieldType: string): string {
  const typeMap: Record<PrismaScalarType, string> = {
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

  return typeMap[fieldType as PrismaScalarType] || 'v.any()';
}

/**
 * Wraps a schema with optional() if the field is not required
 */
export function wrapOptional(schema: string, isRequired: boolean): string {
  return isRequired ? schema : `v.optional(${schema})`;
}

/**
 * Wraps a schema with nullable() if needed
 */
export function wrapNullable(schema: string, isNullable: boolean): string {
  return isNullable ? `v.nullable(${schema})` : schema;
}

/**
 * Gets the TypeScript type for a Prisma field
 */
export function getTypeScriptType(field: DMMF.Field): string {
  let baseType: string;

  if (field.kind === 'scalar') {
    const scalarMap: Record<string, string> = {
      String: 'string',
      Int: 'number',
      BigInt: 'bigint',
      Float: 'number',
      Decimal: 'number',
      Boolean: 'boolean',
      DateTime: 'Date',
      Json: 'any',
      Bytes: 'Buffer',
    };
    baseType = scalarMap[field.type] || 'any';
  } else if (field.kind === 'enum') {
    baseType = field.type;
  } else {
    baseType = field.type;
  }

  if (field.isList) {
    baseType = `${baseType}[]`;
  }

  if (!field.isRequired) {
    baseType = `${baseType} | null`;
  }

  return baseType;
}

/**
 * Converts a model name to camelCase for variable names
 */
export function toCamelCase(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

/**
 * Converts a string to PascalCase
 */
export function toPascalCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
