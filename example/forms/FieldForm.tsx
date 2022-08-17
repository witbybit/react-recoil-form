import * as React from 'react';
import { Results } from '..';
import { Field, useForm, withFormProvider } from '../../src';

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
            {({ value, onChange }) => (
              <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                type="text"
                placeholder="Username"
              />
            )}
          </Field>

          <Field name="email">
            <input type="text" placeholder="Email" />
          </Field>

          <Field name="accept">
            {({ value, onChange }) => (
              <label>
                <input
                  checked={!!value}
                  onChange={(e) => onChange(!value)}
                  type="checkbox"
                />
                Do you accept?
              </label>
            )}
          </Field>
        </div>

        <br />
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
