import * as React from 'react';
import {
  useField,
  useFieldArray,
  useFieldArrayColumnWatch,
  useFieldWatch,
} from '../../FormProvider';
import Button from './Button';

interface FileFieldProps {
  name: string;
}

interface IFileType {
  name: string;
  type: string;
}

export interface InputFieldProps {
  type: 'number' | 'text' | 'date';
  ancestors?: { name: string; rowId: number }[];
  name: string;
  label?: string;
  validate?: (value: any, otherParams: any) => string | null;
  depFields?: string[];
  disabled?: boolean;
  onChange?: (value: any) => void;
  defaultValue?: number | string;
  max?: number;
}
interface SelectFieldProps extends Omit<InputFieldProps, 'type'> {
  options: {
    label: string;
    value: string;
  }[];
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
        onChange={async (evt) => {
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
    ancestors: props.ancestors,
    name: props.name,
    validate: props.validate,
    defaultValue: props.defaultValue,
    depFields: props.depFields,
  });
  return (
    <div className="flex flex-col items-start mb-4">
      <label
        htmlFor={props.name}
        className="block text-sm font-medium text-gray-700 capitalize mb-1"
      >
        {props.label ?? props.name}
      </label>
      <input
        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block sm:text-sm border-gray-300 rounded-md"
        id={props.name}
        type={props.type}
        name={props.name}
        disabled={props.disabled}
        onChange={(evt) => {
          if (props.type === 'number') {
            try {
              const val = parseInt(evt.target.value);
              field.setFieldValue(val);
            } catch (err) {}
          } else {
            field.setFieldValue(evt.target.value);
          }
          props.onChange?.(evt.target.value);
        }}
        value={field.fieldValue ?? ''}
        onBlur={field.onBlur}
      />
      {field.error && <div className="text-red-500 text-sm">{field.error}</div>}
    </div>
  );
}

interface WatchFieldProps {
  fieldId: string;
}

export function WatchField(props: WatchFieldProps) {
  const field = useFieldWatch({
    fieldNames: [props.fieldId],
  });
  return (
    <div>{`Value for watching field id: ${props.fieldId} = ${JSON.stringify(
      field.values ?? {}
    )}`}</div>
  );
}

export function SelectField(props: SelectFieldProps) {
  const field = useField<string | number>({
    ancestors: props.ancestors,
    name: props.name,
    validate: props.validate,
    defaultValue: props.defaultValue,
    depFields: props.depFields,
  });
  return (
    <div className="flex flex-col items-start mb-4">
      <label
        htmlFor={props.name}
        className="block text-sm font-medium text-gray-700 capitalize mb-1"
      >
        {props.label ?? props.name}
      </label>

      <select
        id={props.name}
        name={props.name}
        disabled={props.disabled}
        onChange={(evt) => {
          field.setFieldValue(evt.target.value);
          props.onChange?.(evt.target.value);
        }}
        value={field.fieldValue ?? ''}
        onBlur={field.onBlur}
        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block sm:text-sm border-gray-300 rounded-md"
        // className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
      >
        {props.options?.map((opt, idx) => (
          <option key={idx} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {field.error && <div className="text-red-500 text-sm">{field.error}</div>}
    </div>
  );
}

interface TableFieldProps {
  name: string;
  fields: InputFieldProps[];
}

export function TableField(props: TableFieldProps) {
  const tableField = useFieldArray({
    fieldNames: props.fields.map((f) => f.name),
    name: props.name,
    // If validate function is removed, only the particular field inside field array will render
    // For real-time validation, we need to listen to all fields inside the field array to pass data to validate function.
    validate: (value) =>
      value?.length <= 1 ? 'Need at least two rows' : undefined,
  });

  return (
    <div>
      <label htmlFor={props.name} className="capitalize">
        {props.name}
      </label>
      <table id={props.name}>
        <tbody>
          {tableField.fieldArrayProps.rowIds.map((r, idx) => {
            return (
              <tr key={r}>
                <React.Fragment>
                  {props.fields.map((f) => (
                    <td key={f.name} className="px-2">
                      <InputField
                        ancestors={[{ name: props.name, rowId: r }]}
                        name={f.name}
                        type={f.type}
                        validate={(value) => (!value ? `Value missing` : '')}
                      />
                    </td>
                  ))}
                  <td className="px-2">
                    <div className="flex gap-2">
                      <Button
                        small
                        color="red"
                        type="button"
                        onClick={() => tableField.remove(idx)}
                      >
                        Remove
                      </Button>
                      <Button
                        small
                        type="button"
                        color="emerald"
                        onClick={() =>
                          tableField.insert(
                            idx + 1,
                            tableField.getFieldArrayValue()[idx]
                          )
                        }
                      >
                        Duplicate Row
                      </Button>
                    </div>
                  </td>
                </React.Fragment>
              </tr>
            );
          })}
        </tbody>
      </table>
      <Button small type="button" onClick={() => tableField.append()}>
        Add Row
      </Button>
      {tableField?.error && (
        <div style={{ color: 'red' }}>{tableField.error}</div>
      )}
    </div>
  );
}

interface WatchFieldArrayProps {
  name: string;
  fieldArrayName: string;
  colNames: string[];
  calculateFunc?: (values: any) => string;
}

export function WatchFieldArray(props: WatchFieldArrayProps) {
  const res = useFieldArrayColumnWatch({
    fieldArrayName: props.fieldArrayName,
    fieldNames: props.colNames,
  });
  const value = props.calculateFunc
    ? props.calculateFunc(res.values)
    : JSON.stringify(res.values ?? {});
  return (
    <div className="flex gap-2 items-center my-4">
      <label htmlFor={props.name} className="capitalize">
        {props.name}
      </label>
      <input
        className="bg-gray-200 border-0 rounded-lg"
        id={props.name}
        type="text"
        disabled
        value={value}
      />
    </div>
  );
}
