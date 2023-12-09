import * as React from 'react';
import { useForm, withFormProvider } from '../../';
import Button from '../utils/Button';
import { InputField, WatchField } from '../utils/Fields';
import MetaData from '../utils/MetaData';

function MultiStepForm() {
  const [formData, setFormData] = React.useState({});
  const [step, setStep] = React.useState(0);

  const { handleSubmit, resetInitialValues, validateFields } = useForm({
    skipUnregister: true,
    onSubmit,
    initialValues: {},
  });

  function onSubmit(values: any, extra: any) {
    setFormData({ values, extra, time: new Date().toString() });
    return Promise.resolve();
  }

  return (
    <div className="grid grid-cols-3 gap-8">
      <form onSubmit={handleSubmit} autoComplete="off" className="col-span-2">
        <div>Step {step}</div>
        {step === 0 && (
          <InputField
            name="email"
            type="text"
            validate={(value) => (!!value ? null : 'Missing value')}
          />
        )}
        {step === 1 && (
          <InputField
            name="name"
            type="text"
            validate={(value) => (!!value ? null : 'Missing value')}
          />
        )}
        {step === 2 && (
          <>
            <InputField
              name="address"
              type="text"
              validate={(value) => (!!value ? null : 'Missing value')}
            />
            <WatchField fieldId="email" />
          </>
        )}
        <br />
        <div className="flex gap-4">
          <Button
            type="button"
            onClick={() => {
              if (step > 0) {
                setStep(step - 1);
              }
            }}
          >
            Prev
          </Button>
          <Button
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
          </Button>
          <Button type="submit">Submit</Button>
          <Button type="button" onClick={() => resetInitialValues()}>
            Reset
          </Button>
        </div>
      </form>

      <MetaData formData={formData} />
    </div>
  );
}

export default withFormProvider(MultiStepForm);
