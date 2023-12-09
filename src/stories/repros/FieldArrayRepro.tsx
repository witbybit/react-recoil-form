import { shuffle } from 'lodash';
import * as React from 'react';
import { useFieldArray, useForm, withFormProvider } from '../../';
import Button from '../utils/Button';
import { InputField } from '../utils/Fields';
import MetaData from '../utils/MetaData';

function FieldArrayRepro() {
  const [formData, setFormData] = React.useState({});

  function onSubmit(values: any, extra: any) {
    setFormData({ values, extra, time: new Date().toString() });
    return Promise.resolve();
  }

  const { handleSubmit, resetInitialValues, validateFields } = useForm({
    onSubmit,
    onError: (error) => setFormData((value) => ({ ...value, error })),
    initialValues: {
      groupBy: [
        {
          id: 'customerId',
          label: 'Customer',
          sort: 'asc',
        },
        {
          id: 'itemId',
          label: 'Item',
          sort: 'desc',
        },
      ],
    },
  });

  const fields = ['id', 'label', 'sort'];

  const {
    fieldArrayProps,
    remove,
    append,
    error,
    getFieldArrayValue,
    setFieldArrayValue,
  } = useFieldArray({
    fieldNames: fields,
    name: 'groupBy',
  });

  function reorder() {
    const values = getFieldArrayValue();

    const temp = shuffle(values);

    setFieldArrayValue(temp);
  }

  return (
    <div className="grid grid-cols-3">
      <form className="col-span-2 overflow-auto" onSubmit={handleSubmit}>
        <InputField name="name" type="text" />

        <div>
          <table>
            <tbody>
              {fieldArrayProps.rowIds.map((r, idx) => {
                return (
                  <tr key={r}>
                    <React.Fragment>
                      {fields.map((f) => (
                        <td key={f} className="px-2">
                          <InputField
                            ancestors={[{ name: 'groupBy', rowId: r }]}
                            name={f}
                            type="text"
                            validate={(value) =>
                              !value ? `Value missing` : ''
                            }
                          />
                        </td>
                      ))}
                      <td className="px-2">
                        <div className="flex gap-2">
                          <Button
                            small
                            color="red"
                            type="button"
                            onClick={() => remove(idx)}
                          >
                            Remove
                          </Button>
                        </div>
                      </td>
                    </React.Fragment>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <Button small type="button" onClick={() => append()}>
            Add Row
          </Button>
          {error && <div style={{ color: 'red' }}>{error}</div>}
        </div>

        <br />

        <div className="flex gap-4">
          <Button type="submit" primary>
            Submit
          </Button>
          <Button type="button" onClick={() => resetInitialValues()}>
            Reset
          </Button>
          <Button
            type="button"
            onClick={() =>
              validateFields([{ name: 'items', type: 'field-array' }])
            }
          >
            Validate
          </Button>
          <Button onClick={reorder} color="green">
            Reorder
          </Button>
        </div>
      </form>

      <MetaData formData={formData} />
    </div>
  );
}

export default withFormProvider(FieldArrayRepro);
