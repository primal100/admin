import React from 'react';
import PropTypes from 'prop-types';
import {
  ArrayField,
  BooleanField,
  ChipField,
  DateField,
  EmailField,
  FileField,
  ImageField,
  NumberField,
  ReferenceArrayField,
  ReferenceField,
  SimpleList,
  SingleFieldList,
  TextField,
  UrlField,
  useResourceContext,
} from 'react-admin';
import type {
  ArrayFieldProps,
  BooleanFieldProps,
  DateFieldProps,
  EmailFieldProps,
  FileFieldProps,
  ImageFieldProps,
  NumberFieldProps,
  ReferenceArrayFieldProps,
  ReferenceFieldProps,
  TextFieldProps,
  UrlFieldProps,
} from 'react-admin';
import type { Field, Resource } from 'openapi-doc-parser';

import { containsImageorPhotoRegex } from './InputGuesser.js';
import Introspecter from './Introspecter.js';
import EnumField from './EnumField.js';
import type {
  EnumFieldProps,
  FieldGuesserProps,
  FieldProps,
  IntrospectedFieldGuesserProps,
  SchemaAnalyzer,
} from './types.js';

const isFieldSortable = (field: Field, schema: Resource) =>
  !!schema.parameters &&
  schema.parameters.filter((parameter) => parameter.variable === field.name)
    .length > 0 &&
  schema.parameters.filter(
    (parameter) => parameter.variable === `order[${field.name}]`,
  ).length > 0;

export const isImageFileUrl = /\bimage\b.*\burl\b|\burl\b.*\bimage\b/i;

export const isFileUrlRegex = /\bfile\b.*\burl\b|\burl\b.*\bfile\b/i;

const renderField = (
  field: Field,
  schemaAnalyzer: SchemaAnalyzer,
  props: FieldProps,
  detailed = false,
) => {
  if (field.reference !== null && typeof field.reference === 'object') {
    if (field.maxCardinality === 1) {
      return (
        <ReferenceField
          {...(props as ReferenceFieldProps)}
          reference={field.reference.name}>
          <ChipField
            source={schemaAnalyzer.getFieldNameFromSchema(field.reference)}
          />
        </ReferenceField>
      );
    }

    const fieldName = schemaAnalyzer.getFieldNameFromSchema(field.reference);
    return (
      <ReferenceArrayField
        {...(props as ReferenceArrayFieldProps)}
        reference={field.reference.name}>
        <SingleFieldList>
          <ChipField source={fieldName} key={fieldName} />
        </SingleFieldList>
      </ReferenceArrayField>
    );
  }

  if (field.embedded !== null && field.maxCardinality !== 1) {
    return (
      <ArrayField {...(props as ArrayFieldProps)}>
        <SimpleList
          primaryText={(record) => JSON.stringify(record)}
          linkType={false}
          // Workaround for forcing the list to display underlying data.
          total={2}
        />
      </ArrayField>
    );
  }

  if (field.enum) {
    return (
      <EnumField
        transformEnum={(value) =>
          Object.entries(field.enum ?? {}).find(([, v]) => v === value)?.[0] ??
          value
        }
        {...(props as EnumFieldProps)}
      />
    );
  }

  const fieldType = schemaAnalyzer.getFieldType(field);

  switch (fieldType) {
    case 'email':
      return <EmailField {...(props as EmailFieldProps)} />;

    case 'url':
      return <UrlField {...(props as UrlFieldProps)} />;

    case 'integer':
    case 'integer_id':
    case 'float':
      return <NumberField {...(props as NumberFieldProps)} />;

    case 'boolean':
      return <BooleanField {...(props as BooleanFieldProps)} />;

    case 'date':
      return <DateField {...(props as DateFieldProps)} />;
    case 'dateTime':
      return <DateField {...(props as DateFieldProps)} showTime={detailed} />;
    case 'binary':
      if (
        field.description &&
        containsImageorPhotoRegex.test(field.description)
      ) {
        return (
          <ImageField src="path" title="path" {...(props as ImageFieldProps)} />
        );
      }
      return (
        <FileField src="path" title="path" {...(props as FileFieldProps)} />
      );
    default:
      if (field.description) {
        if (isImageFileUrl.test(field.description)) {
          return (
            <ImageField
              src="path"
              title="path"
              {...(props as ImageFieldProps)}
            />
          );
        }
        if (isFileUrlRegex.test(field.description)) {
          return (
            <FileField src="path" title="path" {...(props as FileFieldProps)} />
          );
        }
      }
      return <TextField {...(props as TextFieldProps)} />;
  }
};

export const IntrospectedFieldGuesser = ({
  fields,
  readableFields,
  writableFields,
  schema,
  schemaAnalyzer,
  detailed,
  ...props
}: IntrospectedFieldGuesserProps) => {
  const field = fields.find((f) => f.name === props.source);

  if (!field) {
    // eslint-disable-next-line no-console
    console.error(
      `Field "${props.source}" not present inside API description for the resource "${props.resource}"`,
    );

    return null;
  }

  return renderField(
    field,
    schemaAnalyzer,
    {
      sortable: isFieldSortable(field, schema),
      ...props,
    },
    detailed,
  );
};

const FieldGuesser = (props: FieldGuesserProps) => {
  const resource = useResourceContext(props);

  return (
    <Introspecter
      component={IntrospectedFieldGuesser}
      resource={resource}
      includeDeprecated
      {...props}
    />
  );
};

FieldGuesser.propTypes = {
  source: PropTypes.string.isRequired,
  resource: PropTypes.string,
  sortable: PropTypes.bool,
  sortBy: PropTypes.string,
};

export default FieldGuesser;
