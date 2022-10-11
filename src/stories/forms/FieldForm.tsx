import * as React from 'react';
import { Field } from '../../Field';
import { useForm, withFormProvider } from '../../FormProvider';
import Button from '../utils/Button';
import MetaData from '../utils/MetaData';

function FieldForm() {
  const [formData, setFormData] = React.useState({});

  const { handleSubmit, resetInitialValues } = useForm({
    onSubmit,
  });

  function onSubmit(values: any, extra: any) {
    setFormData({ values, extra, time: new Date().toString() });
  }
  return (
    <React.Fragment>
      <form onSubmit={handleSubmit}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            alignItems: 'flex-start',
          }}
        >
          <Field name="username">
            {({ value, onChange }) => (
              <input
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block sm:text-sm border-gray-300 rounded-md"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                type="text"
                placeholder="Username"
              />
            )}
          </Field>

          <Field name="email">
            <input
              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block sm:text-sm border-gray-300 rounded-md"
              type="text"
              placeholder="Email"
            />
          </Field>

          <Field name="accept">
            {({ value, onChange }) => (
              <label className="flex items-center gap-2">
                <input
                  checked={!!value}
                  onChange={(e) => onChange(!value)}
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Do you accept?</span>
              </label>
            )}
          </Field>
        </div>

        <br />
        <div className="flex gap-4">
          <Button primary type="submit">
            Submit
          </Button>
          <Button type="button" onClick={() => resetInitialValues({})}>
            Reset
          </Button>
        </div>
      </form>

      <br />

      <MetaData formData={formData} />
    </React.Fragment>
  );
}

export default withFormProvider(FieldForm);
