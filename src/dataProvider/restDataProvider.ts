import { stringify } from 'query-string';
import { fetchUtils } from 'react-admin';
import type { CreateResult, DataProvider } from 'react-admin';
import lodashIsPlainObject from 'lodash.isplainobject';
import { removeTrailingSlash } from '../removeTrailingSlash.js';

// Based on https://github.com/marmelab/react-admin/blob/master/packages/ra-data-simple-rest/src/index.ts

const formatData = (data: Record<string, unknown>) => {
  const jsonData = data;
  let extraInformation: { hasFileField?: boolean } = {};
  if ('extraInformation' in jsonData) {
    if (jsonData.extraInformation) {
      extraInformation = jsonData.extraInformation;
    }
    delete jsonData.extraInformation;
  }

  const values = Object.values(jsonData);

  const containFile = (element: unknown): boolean =>
    Array.isArray(element)
      ? element.length > 0 && element.every((value) => containFile(value))
      : lodashIsPlainObject(element) &&
        Object.values(element as Record<string, unknown>).some(
          (value) => value instanceof File,
        );

  type ToJSONObject = { toJSON(): string };
  const hasToJSON = (element: string | ToJSONObject): element is ToJSONObject =>
    !!element &&
    typeof element !== 'string' &&
    typeof element.toJSON === 'function';

  if (
    !extraInformation.hasFileField &&
    !values.some((value) => containFile(value))
  ) {
    return JSON.stringify(jsonData);
  }

  const body = new FormData();
  Object.entries<string | ToJSONObject>(
    jsonData as Record<string, string | ToJSONObject>,
  ).forEach(([key, value]) => {
    // React-Admin FileInput format is an object containing a file.
    if (containFile(value)) {
      const findFile = (element: string | ToJSONObject): Blob =>
        Object.values(element).find((val) => val instanceof File);
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      Array.isArray(value)
        ? value
            .map((val) => findFile(val))
            .forEach((file) => {
              body.append(key.endsWith('[]') ? key : `${key}[]`, file);
            })
        : body.append(key, findFile(value));

      return;
    }
    if (hasToJSON(value)) {
      body.append(key, value.toJSON());
      return;
    }
    if (lodashIsPlainObject(value) || Array.isArray(value)) {
      body.append(key, JSON.stringify(value));
      return;
    }
    body.append(key, value);
  });

  return body;
};

export default (
  entrypoint: string,
  httpClient = fetchUtils.fetchJson,
): DataProvider => {
  const apiUrl = new URL(entrypoint, window.location.href);

  return {
    getList: async (resource, params) => {
      const { page, perPage } = params.pagination;
      const { field, order } = params.sort;

      const rangeStart = (page - 1) * perPage;
      const rangeEnd = page * perPage - 1;

      const query = {
        sort: JSON.stringify([field, order]),
        range: JSON.stringify([rangeStart, rangeEnd]),
        filter: JSON.stringify(params.filter),
      };
      const url = `${removeTrailingSlash(
        apiUrl.toString(),
      )}/${resource}?${stringify(query)}`;
      const { json } = await httpClient(url);

      return {
        data: json,
        pageInfo: {
          hasNextPage: true,
          hasPreviousPage: page > 1,
        },
      };
    },

    getOne: async (resource, params) => {
      const url = `${removeTrailingSlash(apiUrl.toString())}/${resource}/${
        params.id
      }`;
      const { json } = await httpClient(url);

      return {
        data: json,
      };
    },

    getMany: async (resource, params) => {
      const query = {
        filter: JSON.stringify({ id: params.ids }),
      };
      const url = `${removeTrailingSlash(
        apiUrl.toString(),
      )}/${resource}?${stringify(query)}`;
      const { json } = await httpClient(url);

      return {
        data: json,
      };
    },

    getManyReference: async (resource, params) => {
      const { page, perPage } = params.pagination;
      const { field, order } = params.sort;

      const rangeStart = (page - 1) * perPage;
      const rangeEnd = page * perPage - 1;

      const query = {
        sort: JSON.stringify([field, order]),
        range: JSON.stringify([rangeStart, rangeEnd]),
        filter: JSON.stringify({
          ...params.filter,
          [params.target]: params.id,
        }),
      };
      const url = `${removeTrailingSlash(
        apiUrl.toString(),
      )}/${resource}?${stringify(query)}`;
      const { json } = await httpClient(url);

      return {
        data: json,
        pageInfo: {
          hasNextPage: true,
          hasPreviousPage: page > 1,
        },
      };
    },

    update: async (resource, params) => {
      const url = `${removeTrailingSlash(apiUrl.toString())}/${resource}/${
        params.id
      }`;
      const { json } = await httpClient(url, {
        method: 'PUT',
        body: formatData(params.data),
      });

      return {
        data: json,
      };
    },

    updateMany: async (resource, params) => {
      const responses = await Promise.all(
        params.ids.map((id) => {
          const url = `${removeTrailingSlash(
            apiUrl.toString(),
          )}/${resource}/${id}`;

          return httpClient(url, {
            method: 'PUT',
            body: formatData(params.data),
          });
        }),
      );

      return { data: responses.map(({ json }) => json.id) };
    },

    create: async (resource, params) => {
      const url = `${removeTrailingSlash(apiUrl.toString())}/${resource}`;
      const { json } = await httpClient(url, {
        method: 'POST',
        body: formatData(params.data),
      });

      const result: CreateResult = {
        data: {
          ...params.data,
          id: json.id, // Add the id from the response JSON
        },
      };

      return result;
    },

    delete: async (resource, params) => {
      const url = `${removeTrailingSlash(apiUrl.toString())}/${resource}/${
        params.id
      }`;
      const { json } = await httpClient(url, {
        method: 'DELETE',
      });

      return {
        data: json,
      };
    },

    deleteMany: async (resource, params) => {
      const responses = await Promise.all(
        params.ids.map((id) => {
          const url = `${removeTrailingSlash(
            apiUrl.toString(),
          )}/${resource}/${id}`;

          return httpClient(url, {
            method: 'DELETE',
          });
        }),
      );

      return {
        data: responses.map(({ json }) => json.id),
      };
    },
  };
};
