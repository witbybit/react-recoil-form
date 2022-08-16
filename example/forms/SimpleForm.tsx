import * as React from 'react';
import { useForm, withFormProvider } from '../../src';
import { InputField } from './components/Fields';
import { Results } from '../';

function SimpleForm(props) {
  const { handleSubmit, resetInitialValues } = useForm({
    onSubmit: props.onSubmit,
    onError: props.onError,
    reinitializeOnSubmit: true,
    initialValues: props.initialValues ?? { name: 'Abc', email: '' },
  });
  return (
    <React.Fragment>
      <form onSubmit={handleSubmit}>
        <InputField name="name" type="text" disabled={false} />
        <InputField
          name="value"
          type="number"
          disabled={false}
          defaultValue={100}
        />
        <InputField
          name="email"
          type="text"
          depFields={['name']}
          validate={(value, otherValues) => {
            return !value ? 'email has to be present' : null;
          }}
        />
        <br />
        <div>
          <button type="submit">Submit</button>
          <button type="button" onClick={() => resetInitialValues()}>
            Reset
          </button>
          <button
            type="button"
            onClick={() => resetInitialValues({ name: 'Def' })}
          >
            Change Initial Values
          </button>
        </div>
        <div>
          Note that on submit, the values will be reinitialized back to original
          initial values as specified in useForm() props.
        </div>
      </form>
      <Results />
    </React.Fragment>
  );
}

export default withFormProvider(SimpleForm, { skipRecoilRoot: true });
