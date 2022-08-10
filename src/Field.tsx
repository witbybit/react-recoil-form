import React, { Fragment } from 'react';
import { useField } from './FormProvider';
import { IAncestorInput } from './types';

interface IRenderProps {
  value: any;
  onChange: (data: any, extraInfo?: any) => void;
  error: string | null | undefined;
}

interface IField {
  children?: any;
  name: string;
  required?: boolean;
  defaultValue?: any;
  handleChange?: (value?: any) => void;
  ancestors?: IAncestorInput[];
  render?: (props: IRenderProps) => void;
  validate?: (value?: any, otherParams?: any) => string | undefined;
}

export const Field = (props: IField) => {
  const {
    children,
    name,
    required,
    handleChange,
    defaultValue,
    ancestors,
    render,
    validate,
  } = props;
  const { fieldValue, setFieldValue, error } = useField({
    name,
    ancestors,
    defaultValue,
    validate: validate
      ? validate
      : (value) => {
          if (required) {
            if (!value) {
              return 'Required';
            }
          }
          return null;
        },
  });

  const fieldProps: any = {
    value: fieldValue ?? '',
    onChange: (e: any) => {
      const val = e?.target?.value;
      handleChange?.(val);
      setFieldValue(val);
    },
    error,
    // touched,
  };

  if (render) {
    return (
      <>{render({ value: fieldValue ?? '', onChange: setFieldValue, error })}</>
    );
  }

  const childrenWithProps = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, fieldProps);
    }
    return child;
  });
  return <Fragment>{childrenWithProps}</Fragment>;
};
