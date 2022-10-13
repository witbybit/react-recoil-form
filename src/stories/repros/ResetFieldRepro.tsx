import React, { useState } from 'react';
import {
  useFieldWatch,
  useForm,
  useFormContext,
  withFormProvider,
} from '../../FormProvider';
import Button from '../utils/Button';
import { InputField, SelectField } from '../utils/Fields';
import MetaData from '../utils/MetaData';

const filterOptions = [
  {
    label: 'Relative',
    value: 'relative',
  },
  {
    label: 'Exact',
    value: 'exact',
  },
];

function ResetFieldRepro() {
  const [formData, setFormData] = useState({});
  const { removeFields } = useFormContext();

  const { handleSubmit } = useForm({
    onSubmit,
    initialValues: { values: [{ from: '31st oct' }] },
  });

  function onSubmit(values: any, extra: any) {
    setFormData({ values, extra, time: new Date().toString() });
  }

  const watchValues = useFieldWatch({
    fieldNames: ['filter'],
  }).values;

  return (
    <div className="grid grid-cols-3 gap-8">
      <form onSubmit={handleSubmit} className="col-span-2">
        <SelectField
          name="filter"
          options={filterOptions}
          disabled={false}
          onChange={() =>
            removeFields({
              fieldNames: [
                { name: `values[0].from`, type: 'field' },
                { name: `values[0].to`, type: 'field' },
                { name: `values[0]`, type: 'field' },
              ],
            })
          }
        />

        {watchValues?.filter === 'exact' ? (
          <InputField name="values[0]" type="text" disabled={false} />
        ) : (
          <>
            <InputField name="values[0].from" type="text" disabled={false} />
            <InputField name="values[0].to" type="text" disabled={false} />
          </>
        )}

        <br />

        <div className="flex gap-4">
          <Button type="submit" primary>
            Submit
          </Button>
        </div>
      </form>

      <MetaData formData={formData} />
    </div>
  );
}

export default withFormProvider(ResetFieldRepro, { skipRecoilRoot: true });
