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
  fieldNames: (string | { name: string; type: IFieldType })[];
  skipUnregister?: boolean;
}

export interface InitialValues {
  formId: string;
  values: any;
  extraInfos: any;
  version: number;
  skipUnregister?: boolean;
}

export interface FinalValues {
  values: any;
  extraInfos: any;
}

export interface IFieldWatchParams {
  fieldNames: (
    | string
    | { ancestors?: { name: string; rowId: number }[]; name: string }
  )[];
}

export interface IFieldArrayColWatchParams {
  ancestors?: { name: string; rowId: number }[];
  fieldArrayName: string;
  fieldNames?: string[];
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
  validate?: (value?: D, otherParams?: any) => string | undefined | null;
  /**
   * Useful for referencing other fields in validation
   * */
  depFields?: (
    | string
    | { name: string; ancestors?: { name: string; rowId: number }[] }
  )[];
  skipUnregister?: boolean;
}

export interface IFieldArrayProps {
  name: string;
  /**
   * Name of the fields for this field array.
   * Note that by default it's assumed to be of type 'field'
   */
  fieldNames: (string | { name: string; type: IFieldType })[];
  // TODO: Implement validate here
  // Note that this should be memoized or kept outside a function component so that it doesn't change on every render.
  validate?: (values: any[], otherParams?: any) => string | undefined | null;
  depFields?: string[];
  skipUnregister?: boolean;
  ancestors?: IAncestorInput[];
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
