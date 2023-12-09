import * as React from 'react';

import { useState } from 'react';
import { withFormProvider, useForm, useField } from '../../';
import Button from '../utils/Button';
import { InputFieldProps } from '../utils/Fields';
import MetaData from '../utils/MetaData';

function FieldValidateForm() {
  const [max, setMax] = useState(2);

  return (
    <React.Fragment>
      <div>
        <p>Max allowed: {max}</p>

        <div className="flex gap-2">
          <Button small type="button" onClick={() => setMax((n) => --n)}>
            -
          </Button>
          <Button small type="button" onClick={() => setMax((n) => ++n)}>
            +
          </Button>
        </div>
      </div>
      <FormWrapper max={max} />
    </React.Fragment>
  );
}

export default withFormProvider(FieldValidateForm, { skipRecoilRoot: true });

function FormWrapper({ max }: { max: number }) {
  const [formData, setFormData] = useState({});

  const { handleSubmit } = useForm({
    onSubmit,
    onError: (err) => console.log('Error', err),
    skipUnregister: true,
    initialValues: {},
  });

  function onSubmit(values: any, extra: any) {
    setFormData({ values, extra, time: new Date().toString() });
    return Promise.resolve();
  }

  return (
    <div className="grid grid-cols-3">
      <form onSubmit={handleSubmit} className="col-span-2">
        <InputField name="number" type="number" disabled={false} max={max} />
        <Button primary>submit</Button>
      </form>

      <MetaData formData={formData} />
    </div>
  );
}

function InputField(props: InputFieldProps) {
  const field = useField<string | number>({
    name: props.name,
    validateCallback: React.useCallback(
      (value: any) => {
        console.log('validate max:', props.max);
        if (props.max && value > props.max) {
          return `Input cannot be more than ${props.max}`;
        }
        return '';
      },
      [props.max]
    ),
    defaultValue: props.defaultValue,
  });

  return (
    <div className="my-4">
      <label
        className="block text-sm font-medium text-gray-700 capitalize mb-1"
        htmlFor={props.name}
      >
        {props.label ?? props.name}
      </label>
      <input
        id={props.name}
        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block sm:text-sm border-gray-300 rounded-md"
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
