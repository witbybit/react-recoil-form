import * as React from 'react';
import { useForm, useFormContext, withFormProvider } from '../../src';
import { InputField, InputFieldProps } from './components/Fields';
import { Results } from '../';

function FormContext(props) {
  const { handleSubmit, resetInitialValues } = useForm({
    onSubmit: props.onSubmit,
    onError: props.onError,
    initialValues: props.initialValues ?? { name: 'Abc' },
  });
  return (
    <React.Fragment>
      <form onSubmit={handleSubmit}>
        <ContextField name="name" type="text" />
        <InputField
          label="Email (Resets when name changes)"
          name="email"
          type="text"
        />
        <br />
        <div>
          <button type="submit">Submit</button>
          <button type="button" onClick={() => resetInitialValues()}>
            Reset
          </button>
        </div>
      </form>
      <Results />
    </React.Fragment>
  );
}

function ContextField(props: InputFieldProps) {
  const { setValue } = useFormContext();

  return (
    <InputField
      {...props}
      onChange={(value) => {
        setValue(
          { ancestors: [], name: 'email', type: 'field' },
          { value: '' }
        );
      }}
    />
  );
}

export default withFormProvider(FormContext);
