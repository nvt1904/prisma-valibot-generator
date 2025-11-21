export type PrismaScalarType =
  | 'String'
  | 'Int'
  | 'BigInt'
  | 'Float'
  | 'Decimal'
  | 'Boolean'
  | 'DateTime'
  | 'Json'
  | 'Bytes';

export interface GeneratedFile {
  [filename: string]: string;
}

export interface FieldInfo {
  name: string;
  type: string;
  isRequired: boolean;
  isList: boolean;
  isEnum: boolean;
  relationName?: string;
  relationFromFields?: string[];
  relationToFields?: string[];
}

export interface ModelInfo {
  name: string;
  fields: FieldInfo[];
  uniqueFields: string[][];
  primaryKey: string | null;
}
