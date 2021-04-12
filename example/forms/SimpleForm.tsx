import * as React from 'react';
import { useForm, withFormProvider } from '../../src/FormProvider';
import { InputField } from './Fields';
import { Results } from '../';

function SimpleForm(props) {
  const { handleSubmit } = useForm({
    onSubmit: props.onSubmit,
    onError: props.onError,
  });
  return (
    <React.Fragment>
      <form onSubmit={handleSubmit}>
        <InputField name="email" type="text" />
        <div>
          <button type="submit">Submit</button>
        </div>
      </form>
      <Results />
    </React.Fragment>
  );
}

export default withFormProvider(SimpleForm);
