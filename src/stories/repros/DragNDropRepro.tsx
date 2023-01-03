import * as React from 'react';
import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd';
import { useFieldArray, useForm, withFormProvider } from '../../FormProvider';
import Button from '../utils/Button';
import { Checkbox, InputField } from '../utils/Fields';
import MetaData from '../utils/MetaData';

function DragNDropRepro() {
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
          sort: '',
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
    fieldNames: ['id', 'label', 'sort', 'hide'],
    name: 'groupBy',
  });

  function handleDragEnd(result: any) {
    const { destination, source } = result;
    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    )
      return;

    const fieldValues = getFieldArrayValue();

    // reorder logic
    const temp = [...fieldValues];
    const [item] = temp.splice(source.index, 1);
    temp.splice(destination.index, 0, item);

    setFieldArrayValue(temp);
  }

  return (
    <div className="grid grid-cols-3">
      <form className="col-span-2 overflow-auto" onSubmit={handleSubmit}>
        <InputField name="name" type="text" />

        <div>
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="droppable">
              {(provider) => (
                <table {...provider.droppableProps} ref={provider.innerRef}>
                  <tbody>
                    {fieldArrayProps.rowIds.map((r, idx) => {
                      return (
                        <GroupByField
                          key={r}
                          rowId={r}
                          index={idx}
                          onRemove={() => remove(idx)}
                        />
                      );
                    })}
                  </tbody>
                  {provider.placeholder}
                </table>
              )}
            </Droppable>
          </DragDropContext>

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
        </div>
      </form>

      <MetaData formData={formData} />
    </div>
  );
}

export default withFormProvider(DragNDropRepro);

function GroupByField(props: any) {
  const { index, rowId, onRemove } = props;

  return (
    <Draggable index={index} draggableId={rowId?.toString()}>
      {(provider) => (
        <tr key={rowId} {...provider.draggableProps} ref={provider.innerRef}>
          <td {...provider.dragHandleProps}>
            <span className="material-icons">drag_indicator</span>
          </td>
          <td className="px-2">
            <InputField
              ancestors={[{ name: 'groupBy', rowId }]}
              name="id"
              type="text"
              validate={(value) => (!value ? `Value missing` : '')}
            />
          </td>
          <td className="px-2">
            <InputField
              ancestors={[{ name: 'groupBy', rowId }]}
              name="label"
              type="text"
              validate={(value) => (!value ? `Value missing` : '')}
            />
          </td>
          <td className="px-2">
            <InputField
              ancestors={[{ name: 'groupBy', rowId }]}
              name="sort"
              type="text"
              validate={(value) => (!value ? `Value missing` : '')}
            />
          </td>
          <td>
            <Checkbox
              name="hide"
              label="Hide"
              ancestors={[{ name: 'groupBy', rowId }]}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
          </td>
          <td className="px-2">
            <div className="flex gap-2">
              <Button small color="red" type="button" onClick={onRemove}>
                Remove
              </Button>
            </div>
          </td>
        </tr>
      )}
    </Draggable>
  );
}
