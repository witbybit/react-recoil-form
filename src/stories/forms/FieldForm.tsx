import * as React from 'react';
import { Field } from '../../Field';
import { useForm, withFormProvider } from '../../FormProvider';

function ExtraInfoForm(props) {
  const { handleSubmit, resetInitialValues } = useForm({
    onSubmit: props.onSubmit,
    onError: props.onError,
  });
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
            <input type="text" placeholder="Username" />
          </Field>

          <Field name="email">
            <input type="text" placeholder="Email" />
          </Field>

          <Field
            name="accept"
            render={({ value, onChange }) => (
              <label>
                <input
                  checked={!!value}
                  onChange={(e) => onChange(!value)}
                  type="checkbox"
                />
                Do you accept?
              </label>
            )}
          ></Field>
        </div>

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
