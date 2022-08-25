import * as React from 'react';
import { useField, useForm, withFormProvider } from '../../src';
import { InputFieldProps } from './components/Fields';
import { Results } from '..';
import { useState } from 'react';

function FieldValidateForm(props) {
  const [max, setMax] = useState(2);

  return (
    <React.Fragment>
      <div>
        <p>Max allowed: {max}</p>
        <button type="button" onClick={() => setMax((n) => --n)}>
          -
        </button>
        <button type="button" onClick={() => setMax((n) => ++n)}>
          +
        </button>
      </div>
      <FormWrapper max={max} />
    </React.Fragment>
  );
}

export default withFormProvider(FieldValidateForm, { skipRecoilRoot: true });

function FormWrapper({ max }) {
  const { handleSubmit } = useForm({
    onSubmit: (vals) => console.log('submitted', vals),
    onError: (err) => console.log('error', err),
    skipUnregister: true,
    initialValues: {},
  });

  return (
    <React.Fragment>
      <form onSubmit={handleSubmit}>
        <InputField name="number" type="number" disabled={false} max={max} />
        <button>submit</button>
      </form>
      <Results />
    </React.Fragment>
  );
}

function InputField(props: InputFieldProps) {
  const field = useField<string | number>({
    name: props.name,
    validate: (value: any) => {
      console.log('validate max:', props.max);
      if (props.max && value > props.max) {
        return `Input cannot be more than ${props.max}`;
      }
      return '';
    },
    defaultValue: props.defaultValue,
  });

  return (
    <div>
      <label htmlFor={props.name}>{props.label ?? props.name}</label>
      <input
        id={props.name}
        type={props.type}
        name={props.name}
        disabled={props.disabled}
        onChange={(evt) => {
          try {
            const val = parseInt(evt.target.value);
            field.setFieldValue(val);
          } catch (err) {}
        }}
        value={field.fieldValue ?? ''}
        onBlur={field.onBlur}
      />
      {field.error && <div style={{ color: 'red' }}>{field.error}</div>}
    </div>
  );
}
