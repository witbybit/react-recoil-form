export interface IAtomValueBase {
  initVer: number;
  touched?: boolean;
  validate?: (data: any, otherParams?: any) => string | undefined | null;
  error?: string | null;
  type: IFieldType;
}

export interface IFieldAtomValue<D = any, E = any> extends IAtomValueBase {
  data?: D;
  extraInfo?: E;
}

export interface IFieldArrayAtomValue extends IAtomValueBase {
  rowIds: number[];
  fieldNames: IChildFieldInfo[];
  skipUnregister?: boolean;
}

export interface InitialValues {
  values: any;
  extraInfos: any;
  version: number;
  settings?: { skipUnregister?: boolean; skipUnusedInitialValues?: boolean };
}

export interface FinalValues {
  values: any;
  extraInfos: any;
}

export interface IRemoveFieldParams {
  fieldNames: (
    | string
    | {
        ancestors?: { name: string; rowId: number }[];
        name: string;
        type?: 'field';
      }
  )[];
}

export interface IFieldWatchParams {
  fieldNames: (
    | string
    | { ancestors?: { name: string; rowId: number }[]; name: string }
  )[];
  /**
   * This is needed only for the advanced case of watching field outside the FormProvider hierarchy (assuming a formId was specified).
   * Ideally this should never be defined.
   */
  formId?: string;
}

export interface IFieldArrayColWatchParams {
  ancestors?: { name: string; rowId: number }[];
  fieldArrayName: string;
  fieldNames?: string[];
  /**
   * This is optional and needed only for watching field outside the FormProvider hierarchy (assuming a formId was specified).
   * Ideally this should never be defined.
   */
  formId?: string;
}

export type IFieldType = 'field' | 'field-array';

export interface IAncestorInput {
  name: string;
  rowId: number;
}

export interface IFieldProps<D> {
  /**
   * Only required if the field is part of field array
   */
  ancestors?: { name: string; rowId: number }[];
  name: string;
  defaultValue?: D;
  /**
   * validate is only allowed to be set once when useField() is invoked.
   * If you need to use some external state for validation, please use validateCallback instead
   */
  validate?: (value?: D, otherParams?: any) => string | undefined | null;
  /**
   * validateCallback will be a function wrapped in useCallback() and this will be updated
   * for internal state changes. Please be careful to make sure it has a fixed list of dependencies
   * and doesn't change all the time since that can cause an infinite loop.
   */
  validateCallback?: (
    value?: D,
    otherParams?: any
  ) => string | undefined | null;
  /**
   * Useful for referencing other fields in validation
   * */
  depFields?: (
    | string
    | { name: string; ancestors?: { name: string; rowId: number }[] }
  )[];
  skipUnregister?: boolean;
}

export type IChildFieldInfo =
  | string
  | { name: string; type: 'field' }
  | { name: string; type: 'field-array'; fieldNames: IChildFieldInfo[] };

export interface IFieldArrayProps {
  name: string;
  /**
   * Name of the fields for this field array.
   * Note that by default it's assumed to be of type 'field'
   */
  fieldNames: IChildFieldInfo[];
  // TODO: Implement validate here
  // Note that this should be memoized or kept outside a function component so that it doesn't change on every render.
  validate?: (values: any[], otherParams?: any[]) => string | undefined | null;
  depFields?: string[];
  skipUnregister?: boolean;
  ancestors?: IAncestorInput[];
  defaultValue?: any[];
}

export interface IFieldAtomInput {
  ancestors: IAncestorInput[];
  name: string;
}

export interface IGetFieldArrayInput extends IFieldAtomInput {
  fieldNames?: string[];
}

export interface IFieldArrayRowInput extends IFieldAtomInput {
  rowId: number;
}

export interface IFormContextFieldInput {
  type: IFieldType;
  ancestors?: IAncestorInput[];
  name: string;
}

export type IFieldAtomSelectorInput = {
  ancestors: { name: string; rowId: number }[];
  name: string;
  type: IFieldType;
  formId: string;
};

export interface IFieldError {
  ancestors: { name: string; rowId: number }[];
  name: string;
  type: IFieldType;
  error: string;
}

export interface IIsDirtyProps {
  preCompareUpdateFormValues?: (formValues: any) => any;
}

export interface IFormProps {
  onSubmit: (values: any, extraInfos?: any) => any;
  onError?: (
    errors?: IFieldError[] | null,
    formErrors?: any[] | null,
    values?: any
  ) => any;
  initialValues?: any;
  /**
   * Useful in cases where you want to show the errors at the form level rather than field level
   * To show field level errors, please use validate() function in useField instead
   */
  validate?: (data: any) => string[] | null | undefined;
  /**
   * Should data be preserved if a field unmounts?
   * By default, this is false
   */
  skipUnregister?: boolean;
  /**
   * Reinitialize the form after submit back to the specified initial or empty values.
   * E.g. After changing password, you want to clear all the input fields
   */
  reinitializeOnSubmit?: boolean;
  /**
   * If true, initial values not mapped to  form fields, will not come in the output
   */
  skipUnusedInitialValues?: boolean;
}

export interface IFormPropsOverrideAtomValue {
  validate: IFormProps['validate'] | null;
}
