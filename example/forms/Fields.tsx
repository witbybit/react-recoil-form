import * as React from 'react';
import {
  useField,
  useFieldArray,
  useMultipleWatch,
  useWatch,
} from '../../src/FormProvider';

interface InputFieldProps {
  type: 'number' | 'text';
  name: string;
}

export function InputField(props: InputFieldProps) {
  const field = useField(props);
  return (
    <div>
      <label htmlFor={props.name}>{props.name}</label>
      <input
        id={props.name}
        type={props.type}
        name={props.name}
        onChange={evt => {
          if (props.type === 'number') {
            try {
              const val = parseInt(evt.target.value);
              field.setFieldValue(val);
            } catch (err) {}
          } else {
            field.setFieldValue(evt.target.value);
          }
        }}
        value={field.fieldValue}
        onBlur={field.onBlur}
      />
    </div>
  );
}

interface TableFieldProps {
  name: string;
  fields: InputFieldProps[];
}

export function TableField(props: TableFieldProps) {
  const tableField = useFieldArray({
    fieldNames: props.fields.map(f => f.name),
    name: props.name,
  });

  return (
    <div>
      <label htmlFor={props.name}>{props.name}</label>
      <table id={props.name}>
        {tableField.fieldArrayProps.rowIds.map((r, idx) => {
          return (
            <tr>
              <React.Fragment>
                {props.fields.map(f => (
                  <td key={f.name}>
                    <InputField
                      name={tableField.getFieldIdInArray(idx, f.name)}
                      type={f.type}
                    />
                  </td>
                ))}
                <td>
                  <button type="button" onClick={() => tableField.remove(idx)}>
                    Remove
                  </button>
                </td>
              </React.Fragment>
            </tr>
          );
        })}
      </table>
      <button type="button" onClick={() => tableField.append()}>
        Add Row
      </button>
    </div>
  );
}

interface WatchFieldProps {
  name: string;
  names: string[];
  calculateFunc?: (values: any) => string;
}

export function WatchField(props: WatchFieldProps) {
  const res = useMultipleWatch({
    names: props.names,
  });
  const value = props.calculateFunc
    ? props.calculateFunc(res.values)
    : JSON.stringify(res.values ?? {});
  return (
    <div>
      <label htmlFor={props.name}>{props.name}</label>
      <input id={props.name} type="text" disabled value={value} />
    </div>
  );
}
