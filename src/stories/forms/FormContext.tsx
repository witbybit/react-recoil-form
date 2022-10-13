import * as React from 'react';
import { useForm, useFormContext, withFormProvider } from '../../FormProvider';
import Button from '../utils/Button';
import { InputField, InputFieldProps } from '../utils/Fields';
import MetaData from '../utils/MetaData';

function FormContext() {
  const [formData, setFormData] = React.useState({});

  function onSubmit(values: any, extra: any) {
    setFormData({ values, extra, time: new Date().toString() });
    return Promise.resolve();
  }

  const { handleSubmit, resetInitialValues } = useForm({
    onSubmit,
    initialValues: { name: 'Abc' },
  });
  return (
    <div className="grid grid-cols-3 gap-8">
      <form onSubmit={handleSubmit} className="col-span-2">
        <ContextField name="name" type="text" />
        <InputField
          label="Email (Resets when name changes)"
          name="email"
          type="text"
        />
        <br />
        <div className="flex gap-4">
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
