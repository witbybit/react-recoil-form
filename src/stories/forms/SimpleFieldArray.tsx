import * as React from 'react';
import { useForm, useFormContext, withFormProvider } from '../../FormProvider';
import Button from '../utils/Button';
import { InputField, TableField, WatchFieldArray } from '../utils/Fields';
import MetaData from '../utils/MetaData';

function SimpleFieldArray() {
  const [formData, setFormData] = React.useState({});

  function onSubmit(values: any, extra: any) {
    setFormData({ values, extra, time: new Date().toString() });
    return Promise.resolve();
  }

  const { handleSubmit, resetInitialValues, validateFields } = useForm({
    onSubmit,
    initialValues: {
      // items: [
      //   {
      //     item: {
      //       name: 'Test 1',
      //       desc: 'Desc',
      //     },
      //     amount: 1000,
      //     date: '2019-05-12',
      //   },
      // ],
    },
  });
  return (
    <div className="grid grid-cols-3">
      <form onSubmit={handleSubmit} className="col-span-2">
        <InputField
          name="name"
          type="text"
          validate={(val) => (!val ? 'Required' : null)}
        />

        <TableField
          name="items"
          fields={[
            {
              name: 'item.name',
              type: 'text',
              validate: (value) => (value ? null : 'Missing value'),
            },
            { name: 'item.desc', type: 'text' },
            { name: 'amount', type: 'number' },
            { name: 'date', type: 'date' },
          ]}
        />

        <WatchFieldArray
          name="totalAmount"
          fieldArrayName="items"
          colNames={['amount']}
          calculateFunc={(values) =>
            values.reduce(
              (acc: number, val: any) => acc + (val?.amount ?? 0),
              0
            )
          }
        />

        <div className="flex gap-4">
          <Button type="submit" primary>
            Submit
          </Button>
          <ResetButton />
          <Button
            type="button"
            onClick={() =>
              validateFields([{ name: 'items', type: 'field-array' }])
            }
          >
            Validate
          </Button>
        </div>
      </form>

      <MetaData formData={formData} />
    </div>
  );
}

function ResetButton() {
  const { resetInitialValues } = useFormContext();
  return (
    <Button
      type="button"
      onClick={() => resetInitialValues({ name: 'Reset using context' })}
    >
      Reset
    </Button>
  );
}

export default withFormProvider(SimpleFieldArray);
