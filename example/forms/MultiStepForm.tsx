import * as React from 'react';
import { useForm, withFormProvider } from '../../src';
import { InputField } from './Fields';
import { Results } from '../';

function MultiStepForm(props) {
  const { handleSubmit, resetInitialValues } = useForm({
    skipUnregister: true,
    onSubmit: props.onSubmit,
    onError: props.onError,
    initialValues: {},
  });
  const [step, setStep] = React.useState(0);
  return (
    <React.Fragment>
      <form onSubmit={handleSubmit} autoComplete="off">
        <div>Step {step}</div>
        {step === 0 && <InputField name="email" type="text" />}
        {step === 1 && <InputField name="name" type="text" />}
        {step === 2 && <InputField name="address" type="text" />}
        <div>
          <button
            type="button"
            onClick={() => {
              if (step > 0) {
                setStep(step - 1);
              }
            }}
          >
            Prev
          </button>
          <button
            type="button"
            onClick={() => {
              if (step < 2) {
                setStep(step + 1);
              }
            }}
          >
            Next
          </button>
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

export default withFormProvider(MultiStepForm);
