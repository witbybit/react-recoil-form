import React, { useState } from 'react';
import { useForm, withFormProvider } from '../../FormProvider';
import Button from '../utils/Button';
import { InputField } from '../utils/Fields';
import MetaData from '../utils/MetaData';

function SingleFieldsForm() {
  const [formData, setFormData] = useState({});

  const { handleSubmit, resetInitialValues } = useForm({
    onSubmit,
    reinitializeOnSubmit: true,
    initialValues: { name: 'Abc', email: '' },
  });

  function onSubmit(values: any, extra: any) {
    setFormData({ values, extra, time: new Date().toString() });
    return Promise.resolve(); // to not flicker while submitting
  }

  return (
    <div className="grid grid-cols-3 gap-8">
      <form onSubmit={handleSubmit} className="col-span-2">
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
          validate={(value) => {
            return !value ? 'Email has to be present' : null;
          }}
        />
        <br />

        <div className="flex gap-4">
          <Button type="submit" primary>
            Submit
          </Button>
          <Button type="button" onClick={() => resetInitialValues()}>
            Reset
          </Button>
        </div>

        <div className="bg-gray-100 rounded-md my-4 p-2 px-3 text-sm text-gray-600">
          Note that on submit, the values will be reinitialized back to original
          initial values as specified in useForm() props.
        </div>
      </form>

      <MetaData formData={formData} />
    </div>
  );
}

export default withFormProvider(SingleFieldsForm, { skipRecoilRoot: true });
