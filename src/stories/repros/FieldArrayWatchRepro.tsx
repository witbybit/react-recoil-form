import { shuffle } from 'lodash';
import * as React from 'react';
import {
  useFieldArray,
  useFieldArrayColumnWatch,
  useForm,
  withFormProvider,
} from '../../FormProvider';
import Button from '../utils/Button';
import { InputField } from '../utils/Fields';
import MetaData from '../utils/MetaData';

function FieldArrayWatchRepro() {
  const [formData, setFormData] = React.useState({});

  function onSubmit(values: any, extra: any) {
    setFormData({ values, extra, time: new Date().toString() });
    return Promise.resolve();
  }

  const { handleSubmit, validateFields, handleReset } = useForm({
    onSubmit,
    reinitializeOnSubmit: false,
    onError: (error) => setFormData((value) => ({ ...value, error })),
    initialValues: {
      filters: [
        {
          name: 'Customer',
          age: 48,
        },
      ],
    },
  });

  const {
    fieldArrayProps,
    remove,
    append,
    error,
    getFieldArrayValue,
    setFieldArrayValue,
  } = useFieldArray({
    fieldNames: ['name', 'age', 'type'],
    name: 'filters',
  });

  const watchValues = useFieldArrayColumnWatch({
    fieldArrayName: 'filters',
    fieldNames: ['type'],
  }).values;

  function reorder() {
    const values = getFieldArrayValue();

    const temp = shuffle(values);

    setFieldArrayValue(temp);
  }

  return (
    <div className="grid grid-cols-3">
      <form className="col-span-2 overflow-auto" onSubmit={handleSubmit}>
        <div>
          <div>
            {fieldArrayProps.rowIds.map((r, idx) => {
              const type = watchValues?.[idx]?.type;
              if (type === 'group') {
                return (
                  <FieldGroup
                    ancestors={[{ name: 'filters', rowId: r }]}
                    onRemove={() => remove(idx)}
                  />
                );
              } else
                return (
                  <div className="flex gap-3" key={r}>
                    <React.Fragment>
                      <div className="px-2">
                        <InputField
                          ancestors={[{ name: 'filters', rowId: r }]}
                          name="name"
                          type="text"
                          // validate={(value) => (!value ? `Value missing` : '')}
                        />
                      </div>
                      <div className="px-2">
                        <InputField
                          ancestors={[{ name: 'filters', rowId: r }]}
                          name="age"
                          type="number"
                          // validate={(value) => (!value ? `Value missing` : '')}
                        />
                      </div>
                      <div className="px-2">
                        <div className="flex gap-2 mt-6">
                          <Button
                            small
                            color="red"
                            type="button"
                            onClick={() => remove(idx)}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    </React.Fragment>
                  </div>
                );
            })}
          </div>

          <div className="flex items-center gap-2">
            <Button small type="button" onClick={() => append()}>
              Add Row
            </Button>
            <Button
              small
              type="button"
              onClick={() =>
                append({
                  type: 'group',
                })
              }
              color="yellow"
            >
              Add Group
            </Button>
          </div>
          {error && <div style={{ color: 'red' }}>{error}</div>}
        </div>

        <br />

        <div className="flex gap-4">
          <Button type="submit" primary>
            Submit
          </Button>
          <Button type="button" onClick={() => handleReset()}>
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

export default withFormProvider(FieldArrayWatchRepro);

const FieldGroup = ({ ancestors, onRemove }: any) => {
  const { fieldArrayProps, remove, append } = useFieldArray({
    fieldNames: ['name', 'age', 'type'],
    name: 'groupFilters',
    ancestors,
  });

  const watchValues = useFieldArrayColumnWatch({
    ancestors,
    fieldArrayName: 'groupFilters',
    fieldNames: ['name', 'age'],
  }).values;

  console.log('Watch nested field group = ', watchValues);

  return (
    <div className="border p-4 rounded m-4">
      {fieldArrayProps.rowIds.map((r, idx) => {
        const groupAncestors = (ancestors ?? [])?.concat([
          { name: 'groupFilters', rowId: r },
        ]);

        return (
          <div className="flex gap-3" key={r}>
            <React.Fragment>
              <div className="px-2">
                <InputField
                  ancestors={groupAncestors}
                  name="name"
                  type="text"
                  // validate={(value) => (!value ? `Value missing` : '')}
                />
              </div>
              <div className="px-2">
                <InputField
                  ancestors={groupAncestors}
                  name="age"
                  type="number"
                  // validate={(value) => (!value ? `Value missing` : '')}
                />
              </div>
              <div className="px-2">
                <div className="flex gap-2 mt-6">
                  <Button
                    small
                    color="red"
                    type="button"
                    onClick={() => remove(idx)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </React.Fragment>
          </div>
        );
      })}

      <div className="flex gap-4">
        <Button small type="button" onClick={() => append()}>
          Add Filter
        </Button>
        <Button small color="red" type="button" onClick={onRemove}>
          Remove
        </Button>
      </div>
    </div>
  );
};
