import * as React from 'react';
import { Results } from '..';
import { useForm, withFormProvider } from '../../src';
import { InputField, TableField, WatchField } from './components/Fields';

function SimpleFieldArray(props) {
  const { handleSubmit, resetInitialValues } = useForm({
    onSubmit: props.onSubmit,
    onError: props.onError,
    initialValues: {
      items: [
        {
          item: {
            name: 'Test 1',
            desc: 'Desc',
          },
          amount: 1000,
          date: '2019-05-12',
        },
      ],
    },
  });
  return (
    <React.Fragment>
      <form onSubmit={handleSubmit}>
        <InputField
          name="name"
          type="text"
          validate={(val) => (!val ? 'Required' : null)}
        />
        <TableField
          name="items"
          fields={[
            { name: 'item.name', type: 'text' },
            { name: 'item.desc', type: 'text' },
            { name: 'amount', type: 'number' },
            { name: 'date', type: 'date' },
          ]}
        />
        <WatchField
          name="totalAmount"
          fieldArrayName="items"
          colNames={['amount']}
          calculateFunc={(values) =>
            values.reduce((acc, val) => acc + (val?.amount ?? 0), 0)
          }
        />
        <br />
        <div>
          <button type="submit">Submit</button>
          <button type="button" onClick={() => resetInitialValues()}>
            Reset
          </button>
        </div>
      </form>
      <Results />
    </React.Fragment>
  );
}

export default withFormProvider(SimpleFieldArray);
