import * as React from 'react';
import {
  useField,
  useFieldArray,
  useFieldArrayColumnWatch,
  useFieldWatch,
} from '../../src';

interface FileFieldProps {
  name: string;
}

interface IFileType {
  name: string;
  type: string;
}

interface InputFieldProps {
  type: 'number' | 'text' | 'date';
  fieldArrayName?: string;
  index?: number;
  name: string;
  validate?: (value: any, otherParams: any) => string | null;
  depFields?: string[];
}

export function FileField(props: FileFieldProps) {
  const field = useField<IFileType | null>({
    name: props.name,
    defaultValue: null,
  });
  return (
    <div>
      <input
        type="file"
        onChange={async evt => {
          const file = evt.currentTarget.files?.[0];
          if (file) {
            field.setFieldValue(
              {
                name: file.name,
                type: file.type,
              },
              { file }
            );
          } else {
            field.setFieldValue(null);
          }
        }}
      />
    </div>
  );
}

export function InputField(props: InputFieldProps) {
  const field = useField<string | number>({
    fieldArrayName: props.fieldArrayName,
    index: props.index,
    name: props.name,
    validate: props.validate,
    depFields: props.depFields,
  });
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
        value={field.fieldValue ?? ''}
        onBlur={field.onBlur}
      />
      {field.error && <div style={{ color: 'red' }}>{field.error}</div>}
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
        <tbody>
          {tableField.fieldArrayProps.rowIds.map((r, idx) => {
            return (
              <tr key={r}>
                <React.Fragment>
                  {props.fields.map(f => (
                    <td key={f.name}>
                      <InputField
                        fieldArrayName={props.name}
                        index={idx}
                        name={f.name}
                        type={f.type}
                        validate={value => (!value ? `Value missing` : '')}
                      />
                    </td>
                  ))}
                  <td>
                    <button
                      type="button"
                      onClick={() => tableField.remove(idx)}
                    >
                      Remove
                    </button>
                  </td>
                </React.Fragment>
              </tr>
            );
          })}
        </tbody>
      </table>
      <button type="button" onClick={() => tableField.append()}>
        Add Row
      </button>
    </div>
  );
}

interface WatchFieldProps {
  name: string;
  fieldArrayName: string;
  colNames: string[];
  calculateFunc?: (values: any) => string;
}

export function WatchField(props: WatchFieldProps) {
  const res = useFieldArrayColumnWatch({
    fieldArrayName: props.fieldArrayName,
    fieldNames: props.colNames,
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
