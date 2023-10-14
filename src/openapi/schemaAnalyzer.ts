import type { Field, Resource } from 'openapi-doc-parser';
import {
  getFiltersParametersFromSchema,
  getOrderParametersFromSchema,
} from '../schemaAnalyzer.js';
import type { SchemaAnalyzer } from '../types.js';

/**
 * @param schema The schema of a resource
 *
 * @returns The name of the reference field
 */
const getFieldNameFromSchema = (schema: Resource) => {
  if (!schema.fields?.[0]) {
    return '';
  }

  // If "string repr" is found in field description use that field

  let field = schema.fields.find((schemaField) =>
    schemaField.description?.toLowerCase().includes('string repr'),
  );
  if (field) return field.name;

  // Use field name?
  field = schema.fields.find((schemaField) => schemaField.name === 'name');
  if (field) return field.name;

  // Use field which includes name?
  field = schema.fields.find((schemaField) =>
    schemaField.name.includes('name'),
  );
  if (field) return field.name;

  // Look for a string field to use?
  field = schema.fields.find((schemaField) => schemaField.type === 'string');
  if (field) return field.name;

  // Use field id
  field = schema.fields.find((schemaField) => schemaField.name === 'id');
  if (field) return field.name;

  // Use first field
  return schema.fields[0].name;
};

/**
 * @returns The type of the field
 */
const getFieldType = (field: Field) => {
  switch (field.type) {
    case 'array':
      return 'array';
    case 'string':
    case 'byte':
    case 'hexBinary':
    case 'base64Binary':
    case 'uuid':
      return 'text';
    case 'integer':
    case 'negativeInteger':
    case 'nonNegativeInteger':
    case 'positiveInteger':
    case 'nonPositiveInteger':
      return 'integer';
    case 'number':
    case 'decimal':
    case 'double':
    case 'float':
      return 'float';
    case 'boolean':
      return 'boolean';
    case 'date':
      return 'date';
    case 'dateTime':
    case 'duration':
    case 'time':
      return 'dateTime';
    case 'email':
      return 'email';
    case 'url':
      return 'url';
    case 'password':
      return 'password';
    case 'binary':
      return 'binary';
    default:
      return 'text';
  }
};

const getSubmissionErrors = () => null;

export default function schemaAnalyzer(): SchemaAnalyzer {
  return {
    getFieldNameFromSchema,
    getOrderParametersFromSchema,
    getFiltersParametersFromSchema,
    getFieldType,
    getSubmissionErrors,
  };
}
