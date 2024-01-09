import React, { ReactElement } from 'react';
import { useField } from './FormProvider';
import { IAncestorInput } from './types';

interface IRenderProps {
  value: any;
  onChange: (data: any, extraInfo?: any) => void;
  onBlur: () => void;
  error: string | null | undefined;
  touched: boolean | undefined;
  extraInfo: any | undefined;
}

type RenderProps = (props: IRenderProps) => void;

interface IField {
  children?: RenderProps | ReactElement;
  name: string;
  required?: boolean;
  defaultValue?: any;
  handleChange?: (value?: any) => void;
  ancestors?: IAncestorInput[];
  validate?: (value?: any, otherParams?: any) => string | null | undefined;
  depFields?: (
    | string
    | { name: string; ancestors?: { name: string; rowId: number }[] }
  )[];
}

export const Field = (props: IField) => {
  const {
    children,
    name,
    required,
    handleChange,
    defaultValue,
    ancestors,
    validate,
    depFields,
  } = props;
  const { fieldValue, setFieldValue, error, onBlur, touched, extraInfo } =
    useField({
      name,
      ancestors,
      defaultValue,
      depFields,
      validate: validate
        ? validate
        : (value) => {
            if (required && !value) {
              return 'Required';
            }
            return null;
          },
    });

  const fieldProps = {
    value: fieldValue ?? '',
    onChange: (e: any) => {
      const val = e?.target?.value;
      setFieldValue(val);
      handleChange?.(val);
    },
    onBlur,
    error,
    touched,
    extraInfo,
  };

  if (typeof children === 'function') {
    return (
      <>
        {children({
          value: fieldValue ?? '',
          onChange: setFieldValue,
          onBlur,
          error,
          touched,
          extraInfo,
        })}
      </>
    );
  } else {
    const childrenWithProps = React.Children.map(children, (child) => {
      if (React.isValidElement(child)) {
        return React.cloneElement(child, fieldProps);
      }
      return child;
    });
    return <>{childrenWithProps}</>;
  }
};
