import { useField } from '../../../src';
import { IAncestorInput } from '../../../src/types';
import { isValidEmail, isValidPhone } from '../utils';
import * as React from 'react';

interface IFieldProps {
  name: string;
  type: string;
  label?: string;
  required?: boolean;
  isEmail?: boolean;
  isPhone?: boolean;
  ancestors?: IAncestorInput[];
}

export default function InputField(props: IFieldProps) {
  const { name, type, label, required, isEmail, isPhone, ancestors } = props;
  const { fieldValue, setFieldValue, error } = useField({
    ancestors,
    name,
    validate: (value) => {
      if (required && !value) {
        return 'This field is required';
      }
      if (value) {
        if (isEmail) {
          if (!isValidEmail(value)) {
            return 'Invalid email address';
          }
        }
        if (isPhone) {
          if (!isValidPhone(value)) {
            return 'Invalid phone number';
          }
        }
      }
    },
  });

  return (
    <div id={name}>
      <label>{label}</label>
      <input
        type={type}
        value={fieldValue || ''}
        onChange={(e) => setFieldValue(e.target.value)}
      />
      {error && <span>{error}</span>}
    </div>
  );
}
