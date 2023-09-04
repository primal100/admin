import type { Resource } from 'openapi-doc-parser';
import type { FilterParameter } from './types.js';

/**
 * @param schema The schema of a resource
 *
 * @returns The filter parameters
 */
export const resolveSchemaParameters = (schema: Resource) => {
  if (!schema.parameters || !schema.getParameters) {
    return Promise.resolve([]);
  }

  return !schema.parameters.length
    ? schema.getParameters()
    : Promise.resolve(schema.parameters);
};

const ORDER_MARKER = 'order[';
const NON_FILTER_MARKERS = [ORDER_MARKER, 'order_by', 'page_'];

/**
 * @param schema The schema of a resource
 *
 * @returns The order filter parameters
 */
export const getOrderParametersFromSchema = (
  schema: Resource,
): Promise<string[]> => {
  if (!schema.listFields && !schema.readableFields) {
    return Promise.resolve([]);
  }

  const authorizedFields =
    (schema.listFields ?? schema.readableFields)?.map((field) => field.name) ??
    [];
  return Promise.resolve(authorizedFields);
};

/**
 * @param schema The schema of a resource
 *
 * @returns The filter parameters without the order ones
 */
export const getFiltersParametersFromSchema = (
  schema: Resource,
): Promise<FilterParameter[]> => {
  if (!schema.fields) {
    return Promise.resolve([]);
  }

  const authorizedFields = schema.fields.map((field) => field.name);
  return resolveSchemaParameters(schema).then((parameters) =>
    parameters
      .map((filter) => ({
        name: filter.variable,
        isRequired: filter.required,
      }))
      .filter(
        (filter) =>
          !NON_FILTER_MARKERS.some((marker) => filter.name.includes(marker)),
      )
      .filter((filter) => authorizedFields.includes(filter.name)),
  );
};
