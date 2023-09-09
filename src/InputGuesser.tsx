import React from 'react';
import PropTypes from 'prop-types';
import {
  ArrayInput,
  BooleanInput,
  DateInput,
  DateTimeInput,
  NumberInput,
  PasswordInput,
  ReferenceArrayInput,
  ReferenceInput,
  SelectArrayInput,
  SelectInput,
  SimpleFormIterator,
  TextInput,
  maxLength,
  maxValue,
  minLength,
  minValue,
  regex,
  required,
  useResourceContext,
  email,
} from 'react-admin';
import type {
  ArrayInputProps,
  BooleanInputProps,
  DateInputProps,
  DateTimeInputProps,
  NumberInputProps,
  PasswordInputProps,
  ReferenceArrayInputProps,
  ReferenceInputProps,
  SelectArrayInputProps,
  SelectInputProps,
  TextInputProps,
} from 'react-admin';
import isPlainObject from 'lodash.isplainobject';
import Introspecter from './Introspecter.js';
import getIdentifierValue, { isIdentifier } from './getIdentifierValue.js';
import type {
  InputGuesserProps,
  IntrospectedInputGuesserProps,
} from './types.js';

export const IntrospectedInputGuesser = ({
  fields,
  readableFields,
  writableFields,
  schema,
  schemaAnalyzer,
  validate,
  transformEnum,
  ...props
}: IntrospectedInputGuesserProps) => {
  const field = writableFields.find(({ name }) => name === props.source);
  if (!field) {
    // eslint-disable-next-line no-console
    console.error(
      `Field ${props.source} not present inside API description for the resource ${props.resource}`,
    );

    return null;
  }

  const guessedValidate = validate ?? [];
  if (!validate && Array.isArray(guessedValidate) && field.required)
    guessedValidate.push(required());

  if (field.reference !== null && typeof field.reference === 'object') {
    if (field.maxCardinality === 1) {
      const { filter, page, perPage, sort, enableGetChoices } =
        props as ReferenceInputProps;

      return (
        <ReferenceInput
          key={field.name}
          reference={field.reference.name}
          source={field.name}
          filter={filter}
          page={page}
          perPage={perPage}
          sort={sort}
          enableGetChoices={enableGetChoices}>
          <SelectInput
            optionText={schemaAnalyzer.getFieldNameFromSchema(field.reference)}
            validate={guessedValidate}
            {...(props as SelectInputProps)}
          />
        </ReferenceInput>
      );
    }

    const { filter, page, perPage, sort, enableGetChoices } =
      props as ReferenceArrayInputProps;

    return (
      <ReferenceArrayInput
        key={field.name}
        reference={field.reference.name}
        source={field.name}
        filter={filter}
        page={page}
        perPage={perPage}
        sort={sort}
        enableGetChoices={enableGetChoices}>
        <SelectArrayInput
          optionText={schemaAnalyzer.getFieldNameFromSchema(field.reference)}
          validate={guessedValidate}
          {...(props as SelectArrayInputProps)}
        />
      </ReferenceArrayInput>
    );
  }

  let format;
  let parse;
  const fieldType = schemaAnalyzer.getFieldType(field);
  if (field.enum) {
    const choices = Object.entries(field.enum).map(([k, v]) => ({
      id: v,
      name: transformEnum ? transformEnum(v) : k,
    }));
    return fieldType === 'array' ? (
      <SelectArrayInput
        validate={guessedValidate}
        choices={choices}
        {...(props as SelectArrayInputProps)}
      />
    ) : (
      <SelectInput
        validate={guessedValidate}
        choices={choices}
        {...(props as SelectInputProps)}
      />
    );
  }

  if (isIdentifier(field, fieldType)) {
    format = (value: string | number) =>
      getIdentifierValue(
        schemaAnalyzer,
        props.resource,
        writableFields,
        field.name,
        value,
      );
  }

  const formatEmbedded = (value: string | object | null) => {
    if (value === null) {
      return '';
    }
    if (typeof value === 'string') {
      return value;
    }

    return JSON.stringify(value);
  };
  const parseEmbedded = (value: string) => {
    try {
      const parsed = JSON.parse(value);
      if (!isPlainObject(parsed)) {
        return value;
      }
      return parsed;
    } catch (e) {
      return value;
    }
  };

  if (field.embedded !== null) {
    format = formatEmbedded;
    parse = parseEmbedded;
  }

  const { format: formatProp, parse: parseProp } = props;

  switch (fieldType) {
    case 'array':
      return (
        <ArrayInput
          key={field.name}
          validate={guessedValidate}
          {...(props as ArrayInputProps)}
          source={field.name}>
          <SimpleFormIterator>
            <TextInput
              source=""
              format={formatProp ?? format}
              parse={parseProp ?? parse}
            />
          </SimpleFormIterator>
        </ArrayInput>
      );

    case 'integer':
    case 'integer_id':
    case 'float':
      if (!validate && Array.isArray(guessedValidate)) {
        if (field.minimum) {
          guessedValidate.push(minValue(field.minimum));
        }
        if (field.maximum) {
          guessedValidate.push(maxValue(field.maximum));
        }
      }
      const additionalNumberProps =
        fieldType === 'float' ? { step: '0.1' } : {};
      return (
        <NumberInput
          key={field.name}
          validate={guessedValidate}
          {...(props as NumberInputProps)}
          format={formatProp ?? format}
          parse={parseProp ?? parse}
          source={field.name}
          {...additionalNumberProps}
        />
      );

    case 'boolean':
      return (
        <BooleanInput
          key={field.name}
          validate={guessedValidate}
          {...(props as BooleanInputProps)}
          format={formatProp ?? format}
          parse={parseProp ?? parse}
          source={field.name}
        />
      );

    case 'date':
      return (
        <DateInput
          key={field.name}
          validate={guessedValidate}
          {...(props as DateInputProps)}
          format={formatProp ?? format}
          parse={parseProp ?? parse}
          source={field.name}
        />
      );

    case 'dateTime':
      return (
        <DateTimeInput
          key={field.name}
          validate={guessedValidate}
          {...(props as DateTimeInputProps)}
          format={formatProp ?? format}
          parse={parseProp ?? parse}
          source={field.name}
        />
      );

    case 'password':
      return (
        <PasswordInput
          key={field.name}
          validate={guessedValidate}
          {...(props as PasswordInputProps)}
          format={formatProp ?? format}
          parse={parseProp ?? parse}
          source={field.name}
        />
      );

    default:
      if (!validate && Array.isArray(guessedValidate)) {
        if (field.minLength) {
          guessedValidate.push(minLength(field.minLength));
        }
        if (field.maxLength) {
          guessedValidate.push(maxLength(field.maxLength));
        }
        if (field.pattern) {
          guessedValidate.push(regex(field.pattern));
        }
        if (field.type === 'email') {
          guessedValidate.push(email());
        }
      }

      return (
        <TextInput
          key={field.name}
          validate={guessedValidate}
          {...(props as TextInputProps)}
          format={formatProp ?? format}
          parse={parseProp ?? parse}
          source={field.name}
          multiline={Boolean(field.multiline)}
        />
      );
  }
};

const InputGuesser = (props: InputGuesserProps) => {
  const resource = useResourceContext(props);

  return (
    <Introspecter
      component={IntrospectedInputGuesser}
      resource={resource}
      includeDeprecated
      {...props}
    />
  );
};

InputGuesser.propTypes = {
  source: PropTypes.string.isRequired,
  alwaysOn: PropTypes.bool,
};

export default InputGuesser;
