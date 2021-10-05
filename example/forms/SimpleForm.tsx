import * as React from 'react';
import { useForm, withFormProvider } from '../../src';
import { InputField } from './Fields';
import { Results } from '../';

function SimpleForm(props) {
  const { handleSubmit, resetInitialValues } = useForm({
    onSubmit: props.onSubmit,
    onError: props.onError,
    initialValues: {name: "Abc"}
  });
  return (
    <React.Fragment>
      <form onSubmit={handleSubmit}>
        <InputField name="name" type="text" />
        <InputField name="email" type="text" depFields={['name']} validate={(value, otherValues) => {
          return !otherValues.values?.name ? 'Name has to be present': null
        }}/>
        <br/>
        <div>
          <button type="submit">Submit</button>
          <button type="button" onClick={() => resetInitialValues()}>Reset</button>
        </div>
      </form>
      <Results />
    </React.Fragment>
  );
}

export default withFormProvider(SimpleForm);
