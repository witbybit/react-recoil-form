import { shuffle } from 'lodash';
import * as React from 'react';
import {
  useFieldArray,
  useFieldWatch,
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
              return <FilterFieldArrayRow ancestors={[{ name: 'filters', rowId: r }]} idx={idx} remove={remove}/>;
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

function FilterFieldArrayRow(props: {
  ancestors: { name: string; rowId: number }[];
  remove: any;
  idx: number;
}) {
  const { ancestors, idx, remove } = props;
  const {values} = useFieldWatch({
    fieldNames: [{ancestors, name: 'type'}],
  })

  if (values.type === 'group') {
    return <FieldGroup ancestors={ancestors} onRemove={() => remove(idx)} />;
  } else
    return (
      <div className="flex gap-3" key={idx}>
        <React.Fragment>
          <div className="px-2">
            <InputField
              ancestors={ancestors}
              name="name"
              type="text"
              // validate={(value) => (!value ? `Value missing` : '')}
            />
          </div>
          <div className="px-2">
            <InputField
              ancestors={ancestors}
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
}

export default withFormProvider(FieldArrayWatchRepro);

const FieldGroup = ({ ancestors, onRemove }: any) => {
  const fieldArrName = 'filters';
  const { fieldArrayProps, remove, append } = useFieldArray({
    fieldNames: ['name', 'age', 'type'],
    name: fieldArrName,
    ancestors,
  });

  return (
    <div className="border p-4 rounded m-4">
      {fieldArrayProps.rowIds.map((r, idx) => {
        const groupAncestors = (ancestors ?? [])?.concat([
          { name: fieldArrName, rowId: r },
        ]);
        return <NestedFilterFieldRow ancestors={groupAncestors} idx={idx} remove={remove} key={r}/>
      })}

       

      <div className="flex gap-4">
        <Button small type="button" onClick={() => append()}>
          Add Filter
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
        <Button small color="red" type="button" onClick={onRemove}>
          Remove
        </Button>
      </div>
    </div>
  );
};

function NestedFilterFieldRow(props: {
  ancestors: { name: string; rowId: number }[];
  remove: any;
  idx: number;
}) {
  const { ancestors, idx, remove } = props;
  const {values} = useFieldWatch({
    fieldNames: [{ancestors, name: 'type'}],
  });
  if (values?.type === 'group') {
    if (ancestors?.length < 3) {
      return (
        <FieldGroup
          ancestors={ancestors}
          onRemove={() => remove(idx)}
        />
      );
    }
    return null;
  }

  return (
    <div className="flex gap-3" key={idx}>
      <React.Fragment>
        <div className="px-2">
          <InputField
            ancestors={ancestors}
            name="name"
            type="text"
            // validate={(value) => (!value ? `Value missing` : '')}
          />
        </div>
        <div className="px-2">
          <InputField
            ancestors={ancestors}
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
}
