import * as React from 'react';
import { useForm, withFormProvider } from '../../src';
import { FileField, InputField } from './Fields';
import { Results } from '..';

function ExtraInfoForm(props) {
  const { handleSubmit, resetInitialValues } = useForm({
    onSubmit: props.onSubmit,
    onError: props.onError,
  });
  return (
    <React.Fragment>
      <form onSubmit={handleSubmit}>
        <InputField name="name" type="text" />
        <FileField name="file" />
        <div>
          <button type="submit">Submit</button>
          <button type="button" onClick={() => resetInitialValues({})}>
            Reset
          </button>
        </div>
      </form>
      <Results />
    </React.Fragment>
  );
}

export default withFormProvider(ExtraInfoForm);
