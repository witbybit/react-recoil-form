import * as React from 'react';
import { useForm, withFormProvider } from '../../src';
import { InputField } from './Fields';
import { Results } from '../';

function MultiStepForm(props) {
  const { handleSubmit, resetInitialValues, validateFields } = useForm({
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
        {step === 0 && (
          <InputField
            name="email"
            type="text"
            validate={value => (!!value ? null : 'Missing value')}
          />
        )}
        {step === 1 && (
          <InputField
            name="name"
            type="text"
            validate={value => (!!value ? null : 'Missing value')}
          />
        )}
        {step === 2 && (
          <InputField
            name="address"
            type="text"
            validate={value => (!!value ? null : 'Missing value')}
          />
        )}
        <br/>
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
                let errorMsgs = validateFields(
                  step === 0 ? ['email'] : step === 1 ? ['name'] : ['address']
                );
                if (!errorMsgs.length) {
                  setStep(step + 1);
                }
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
