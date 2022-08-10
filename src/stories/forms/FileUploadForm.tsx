import * as React from 'react';
import { useForm, withFormProvider } from '../../FormProvider';
import { FileField, InputField } from '../utils/Fields';

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
        <br />
        <div>
          <button type="submit">Submit</button>
          <button type="button" onClick={() => resetInitialValues({})}>
            Reset
          </button>
        </div>
      </form>
    </React.Fragment>
  );
}

export default withFormProvider(ExtraInfoForm);
