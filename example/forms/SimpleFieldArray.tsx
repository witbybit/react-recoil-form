import * as React from 'react';
import { Results } from '..';
import { useForm, withFormProvider } from '../../src/FormProvider';
import { InputField, TableField, WatchField } from './Fields';

function SimpleFieldArray(props) {
  const { handleSubmit } = useForm({
    onSubmit: props.onSubmit,
    onError: props.onError,
    initialValues: { items: [{}] },
  });
  return (
    <React.Fragment>
      <form onSubmit={handleSubmit}>
        <InputField name="name" type="text" />
        <TableField
          name="items"
          fields={[
            { name: 'item', type: 'text' },
            { name: 'amount', type: 'number' },
          ]}
        />
        <WatchField
          name="totalAmount"
          names={['items/amount']}
          calculateFunc={values =>
            values.items.reduce((acc, val) => acc + (val?.amount ?? 0), 0)
          }
        />
        <div>
          <button type="submit">Submit</button>
        </div>
      </form>
      <Results />
    </React.Fragment>
  );
}

export default withFormProvider(SimpleFieldArray);
