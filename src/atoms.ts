import { atomFamily, RecoilState, RecoilValue, selectorFamily } from 'recoil';
import { gan, getNewRowId } from './atomUtils';
import {
  FinalValues,
  IAncestorInput,
  IChildFieldInfo,
  IFieldArrayAtomValue,
  IFieldArrayRowInput,
  IFieldAtomInput,
  IFieldAtomSelectorInput,
  IFieldAtomValue,
  IFieldError,
  IFormValidationAtomValue,
  IGetFieldArrayInput,
  InitialValues,
} from './types';
import { getPathInObj, isUndefined, setPathInObj } from './utils';

export const formValuesAtom = atomFamily<FinalValues, string>({
  key: gan('FormValues'),
  default: { values: {}, extraInfos: {} },
});

export const formValidationAtom = atomFamily<
IFormValidationAtomValue,
  string
>({
  key: gan('FormValidation'),
  default: { validate: null },
});

export const formInitialValuesAtom = atomFamily<InitialValues, string>({
  key: gan('FormInitialValues'),
  default: {
    values: {},
    version: 0,
    extraInfos: {},
    settings: {
      skipUnregister: undefined,
      skipUnusedInitialValues: undefined,
    },
  },
});

export const combinedFieldAtomValues: {
  [formId: string]: {
    fields: {
      [atomKey: string]: {
        atomValue: IFieldAtomValue;
        param: IFieldAtomSelectorInput;
      };
    };
    fieldArrays: {
      [atomKey: string]: {
        atomValue: IFieldArrayAtomValue;
        param: IFieldAtomSelectorInput;
      };
    };
  };
} = {};

export const fieldAtomFamily = atomFamily<
  IFieldAtomValue | IFieldArrayAtomValue,
  IFieldAtomSelectorInput
>({
  key: gan('FormFields'),
  default: (param) => {
    if (param.type === 'field') {
      return {
        initVer: 0,
        type: 'field',
      } as IFieldAtomValue;
    }
    return {
      fieldNames: [],
      initVer: 0,
      rowIds: [],
      type: 'field-array',
    } as IFieldArrayAtomValue;
  },
  // TODO: Rename to effects for recoil 0.6
  // effects_UNSTABLE is still supported and will allow older versions of recoil to work
  effects: (param) => [
    ({ onSet, node }) => {
      onSet((newValue) => {
        if (!combinedFieldAtomValues[param.formId]) {
          combinedFieldAtomValues[param.formId] = {
            fields: {},
            fieldArrays: {},
          };
        }
        const fieldsObj = combinedFieldAtomValues[param.formId].fields;
        const fieldArrObj = combinedFieldAtomValues[param.formId].fieldArrays;
        if (param.type === 'field') {
          fieldsObj[node.key] = {
            atomValue: newValue as IFieldAtomValue,
            param,
          };
        } else if (param.type === 'field-array') {
          fieldArrObj[node.key] = {
            atomValue: newValue as IFieldArrayAtomValue,
            param,
          };
        }
      });
    },
  ],
});

export function resetFieldArrayRow(
  formId: string,
  params: IFieldArrayRowInput,
  get: (val: RecoilValue<any>) => any,
  reset: (recoilVal: RecoilState<any>) => void
) {
  const fieldArrayValue = get(
    fieldAtomFamily({
      ancestors: params.ancestors,
      name: params.name,
      type: 'field-array',
      formId,
    })
  ) as IFieldArrayAtomValue;
  const fieldAncestors = params.ancestors?.length
    ? [...params.ancestors, { name: params.name, rowId: params.rowId }]
    : [{ name: params.name, rowId: params.rowId }];
  for (const field of fieldArrayValue.fieldNames) {
    if (typeof field === 'string') {
      reset(
        fieldAtomFamily({
          ancestors: fieldAncestors,
          name: field,
          type: 'field',
          formId,
        })
      );
    } else {
      if (field.type === 'field') {
        reset(
          fieldAtomFamily({
            ancestors: fieldAncestors,
            name: field.name,
            type: 'field',
            formId,
          })
        );
      } else {
        const fieldArrayValue = get(
          fieldAtomFamily({
            ancestors: fieldAncestors,
            name: field.name,
            type: 'field-array',
            formId,
          })
        ) as IFieldArrayAtomValue;
        for (const rowId of fieldArrayValue.rowIds) {
          resetFieldArrayRow(
            formId,
            { ancestors: fieldAncestors, name: field.name, rowId },
            get,
            reset
          );
        }
      }
    }
  }
}

interface IValidationParams {
  set: (
    recoilVal: RecoilState<IFieldAtomValue | IFieldArrayAtomValue>,
    valOrUpdater:
      | IFieldAtomValue
      | IFieldArrayAtomValue
      | ((
          currVal: IFieldAtomValue | IFieldArrayAtomValue
        ) => IFieldAtomValue | IFieldArrayAtomValue)
  ) => void;
  isValidation: boolean;
  skipFieldCheck?: boolean;
}

export function getFieldArrayDataAndExtraInfo(
  formId: string,
  params: IGetFieldArrayInput,
  get: (
    atom: RecoilValue<IFieldArrayAtomValue | IFieldAtomValue>
  ) => IFieldArrayAtomValue | IFieldAtomValue,
  validationParams?: IValidationParams,
  // relative ancestors are from the point of view of the root field array where getValue() was called
  relativeAncestors?: IAncestorInput[]
): {
  data: any[];
  extraInfo: any;
  errors?: IFieldError[];
} {
  const isValidation = validationParams?.isValidation;
  const set = validationParams?.set;
  const skipFieldCheck = validationParams?.skipFieldCheck;
  let { name } = params;
  const data: any[] = [];
  const extraInfo: any = [];
  const errors: IFieldError[] = [];
  const fieldArrayAtom = fieldAtomFamily({
    ancestors: params.ancestors,
    name: params.name,
    type: 'field-array',
    formId,
  });
  const fieldArrayAtomValue = get(fieldArrayAtom) as IFieldArrayAtomValue;
  let rowIdx = -1;
  // TODO: Add support for otherParams in field array validation
  for (const rowId of fieldArrayAtomValue.rowIds) {
    const fieldAncestors: IAncestorInput[] = params.ancestors?.length
      ? [...params.ancestors, { rowId, name: params.name }]
      : [{ rowId, name: params.name }];
    rowIdx++;
    const fieldRelativeAncestors: IAncestorInput[] = relativeAncestors
      ? [...relativeAncestors, { name, rowId }]
      : [{ name, rowId }];
    data.push({});
    extraInfo.push({});
    const filteredFieldNames = fieldArrayAtomValue.fieldNames.filter(
      (f) =>
        !params.fieldNames ||
        params.fieldNames.indexOf(typeof f === 'string' ? f : f.name) !== -1
    );
    for (const field of filteredFieldNames) {
      if (typeof field === 'string') {
        const fieldAtom = fieldAtomFamily({
          name: field,
          type: 'field',
          ancestors: fieldAncestors,
          formId,
        });
        const fieldValue = get(fieldAtom) as IFieldAtomValue;
        if (isValidation && !skipFieldCheck) {
          const error = fieldValue.validate?.(fieldValue.data);
          if (error) {
            errors.push({
              error,
              name: field,
              type: 'field',
              ancestors: fieldRelativeAncestors,
            });
            set?.(fieldAtom, (val) => ({
              ...val,
              error,
            }));
          }
        }
        setPathInObj(data[rowIdx], field, fieldValue.data);
        setPathInObj(extraInfo[rowIdx], field, fieldValue.extraInfo);
      } else {
        if (field.type === 'field') {
          const fieldAtom = fieldAtomFamily({
            name: field.name,
            type: 'field',
            ancestors: fieldAncestors,
            formId,
          });
          const fieldValue = get(fieldAtom) as IFieldAtomValue;
          if (isValidation && !skipFieldCheck) {
            const error = fieldValue.validate?.(fieldValue.data);
            if (error) {
              errors.push({
                error,
                name: field.name,
                type: 'field',
                ancestors: fieldRelativeAncestors,
              });
              set?.(fieldAtom, (val) => ({
                ...val,
                error,
              }));
            }
          }
          setPathInObj(data[rowIdx], field.name, fieldValue.data);
          setPathInObj(extraInfo[rowIdx], field.name, fieldValue.extraInfo);
        } else {
          const {
            data: fieldData,
            extraInfo: fieldExtraInfo,
            errors: fieldErrors,
          } = getFieldArrayDataAndExtraInfo(
            formId,
            {
              name: field.name,
              ancestors: fieldAncestors,
            },
            get,
            validationParams,
            fieldRelativeAncestors
          );
          if (fieldErrors?.length) {
            errors.push(...fieldErrors);
          }
          if (!isUndefined(fieldData)) {
            setPathInObj(data[rowIdx], field.name, fieldData);
          }
          if (!isUndefined(fieldExtraInfo)) {
            setPathInObj(extraInfo[rowIdx], field.name, fieldExtraInfo);
          }
        }
      }
    }
  }
  if (isValidation) {
    const error = fieldArrayAtomValue.validate?.(data);
    if (error) {
      errors.push({
        error,
        name: name,
        type: 'field-array',
        ancestors: relativeAncestors ?? [],
      });
      set?.(fieldArrayAtom, (val) => ({
        ...val,
        error,
      }));
    }
  }
  return { data, extraInfo, errors };
}

interface ISetFieldArrayParams {
  get: (recoilVal: RecoilValue<any>) => any;
  set: (
    recoilVal: RecoilState<IFieldAtomValue | IFieldArrayAtomValue>,
    valOrUpdater:
      | IFieldAtomValue
      | IFieldArrayAtomValue
      | ((
          currVal: IFieldAtomValue | IFieldArrayAtomValue
        ) => IFieldAtomValue | IFieldArrayAtomValue)
  ) => void;
  reset: (recoilVal: RecoilState<any>) => void;
  // value should be an array since field array is being set
  dataArr: any[];
  extraInfoArr?: any[];
  // initialValuesVer is only needed if fields are being initialized
  initialValuesVersion?: number;
  // Needed only for initializing the field array
  fieldNames?: IChildFieldInfo[];
  mode?: { type: 'set' } | { type: 'insert'; rowIndex?: number };
  skipRecursion?: boolean;
}

export function setFieldArrayDataAndExtraInfo(
  formId: string,
  params: IFieldAtomInput,
  setParams: ISetFieldArrayParams
) {
  let {
    get,
    set,
    reset,
    dataArr,
    extraInfoArr,
    initialValuesVersion,
    mode,
    fieldNames: childFields,
  } = setParams;
  if (!mode) {
    mode = { type: 'set' };
  }
  const fieldArrayParams: IFieldAtomSelectorInput = {
    ...params,
    formId,
    type: 'field-array',
  };
  const fieldArrayAtomValue = get(
    fieldAtomFamily(fieldArrayParams)
  ) as IFieldArrayAtomValue;
  if (fieldArrayAtomValue.type !== 'field-array') {
    throw new Error(
      'Please check the field type in field array since this seems to be a regular field but has been specified as a nested field array'
    );
  }
  const oldRowIds = fieldArrayAtomValue.rowIds;
  let dataRowsLength = dataArr?.length ?? 0;
  let rowIdsToRemove: number[] = [];
  let rowIds: number[] = [...oldRowIds];
  let startIndex = 0;
  if (!mode || mode.type === 'set') {
    if (oldRowIds.length > dataRowsLength) {
      rowIds = oldRowIds.slice(0, dataRowsLength);
      rowIdsToRemove = oldRowIds.slice(dataRowsLength, oldRowIds.length);
    } else if (oldRowIds.length < dataRowsLength) {
      const noOfElementsToAdd = dataRowsLength - oldRowIds.length;
      for (let i = 0; i < noOfElementsToAdd; i++) {
        rowIds.push(getNewRowId(rowIds));
      }
    }
    set(fieldAtomFamily(fieldArrayParams), (val) =>
      Object.assign({}, val, {
        rowIds,
        initVer: initialValuesVersion ?? val.initVer,
        fieldNames:
          initialValuesVersion && childFields?.length
            ? childFields
            : (val as IFieldArrayAtomValue).fieldNames,
      } as Partial<IFieldArrayAtomValue>)
    );
    for (const rowId of rowIdsToRemove) {
      resetFieldArrayRow(formId, { ...fieldArrayParams, rowId }, get, reset);
    }
  } else if (mode.type === 'insert') {
    rowIds = [...oldRowIds];
    if (!dataRowsLength) {
      dataRowsLength = 1;
    }
    if (mode.rowIndex !== undefined) {
      startIndex = mode.rowIndex;
      for (let i = startIndex; i < startIndex + dataRowsLength; i++) {
        rowIds.splice(i, 0, getNewRowId(rowIds));
      }
    } else {
      startIndex = rowIds.length;
      for (let i = 0; i < dataRowsLength; i++) {
        rowIds.push(getNewRowId(rowIds));
      }
    }
    set(fieldAtomFamily(fieldArrayParams), (val) =>
      Object.assign({}, val, {
        rowIds,
        initVer: initialValuesVersion ?? val.initVer,
      } as Partial<IFieldArrayAtomValue>)
    );
  }
  if (dataArr?.length) {
    for (
      let dataIdx = startIndex;
      dataIdx < startIndex + dataArr.length;
      dataIdx++
    ) {
      // Need to subtract startIndex because only the new data is passed during insert
      // For e.g. if startIndex is 1 and data is at index 0, we need to get the value at index 0 for row index 1.
      const fieldValues = dataArr[dataIdx - startIndex];
      const extraInfos = extraInfoArr?.[dataIdx - startIndex];
      const rowId = rowIds[dataIdx];
      const fieldAncestors = params.ancestors.length
        ? [...params.ancestors, { name: params.name, rowId }]
        : [{ name: params.name, rowId }];
      for (const field of fieldArrayAtomValue.fieldNames) {
        if (typeof field === 'string') {
          const data = getPathInObj(fieldValues, field);
          const extraInfo = getPathInObj(extraInfos, field);
          set(
            fieldAtomFamily({
              name: field,
              ancestors: fieldAncestors,
              type: 'field',
              formId,
            }),
            (existingValue) => {
              return Object.assign({}, existingValue, {
                data,
                extraInfo,
                initVer: initialValuesVersion ?? existingValue.initVer,
              } as Partial<IFieldAtomValue>);
            }
          );
        } else {
          if (field.type === 'field') {
            const data = getPathInObj(fieldValues, field.name);
            const extraInfo = getPathInObj(extraInfos, field.name);
            set(
              fieldAtomFamily({
                name: field.name,
                ancestors: fieldAncestors,
                type: 'field',
                formId,
              }),
              (existingValue) => {
                return Object.assign({}, existingValue, {
                  data,
                  extraInfo,
                  initVer: initialValuesVersion ?? existingValue.initVer,
                } as Partial<IFieldAtomValue>);
              }
            );
          } else if (field.type === 'field-array') {
            const data = getPathInObj(fieldValues, field.name);
            const extraInfo = getPathInObj(extraInfos, field.name);
            setFieldArrayDataAndExtraInfo(
              formId,
              { name: field.name, ancestors: fieldAncestors },
              {
                get,
                set,
                dataArr: data,
                reset,
                extraInfoArr: extraInfo,
                initialValuesVersion,
                // Use fieldNames only for initializing values workflow since the child atoms don't exist yet
                fieldNames: initialValuesVersion ? field.fieldNames : undefined,
                mode,
              }
            );
          }
        }
      }
    }
  }
}

/**
 * Gets the data for particular fields from the field array.
 * Note that it's assumed that user is listening to field in the lowest field array.
 * This method won't work correctly if the referenced field doesn't have data (i.e. is a field array)
 */
export const fieldArrayColAtomValueSelectorFamily = selectorFamily<
  { values: any[]; extraInfos: any[] },
  {
    formId: string;
    ancestors?: { name: string; rowId: number }[];
    fieldArrayName: string;
    fieldNames?: string[];
  }
>({
  key: gan('FieldArrayColAtomValueSelector'),
  get: ({ formId, ancestors, fieldArrayName, fieldNames }) => {
    return ({ get }) => {
      const { data, extraInfo } = getFieldArrayDataAndExtraInfo(
        formId,
        {
          ancestors: ancestors ?? [],
          name: fieldArrayName,
          fieldNames,
        },
        get
      );
      return { values: data, extraInfos: extraInfo };
    };
  },
});

export const multipleFieldsSelectorFamily = selectorFamily<
  { values: { [key: string]: any }; extraInfos: { [key: string]: any } },
  {
    formId: string;
    ancestors?: { name: string; rowId: number }[];
    name: string;
  }[]
>({
  key: gan('FormFieldsSelector'),
  get: (
    fieldNames: {
      formId: string;
      ancestors?: { name: string; rowId: number }[];
      name: string;
    }[]
  ) => {
    return ({ get }) => {
      if (!fieldNames?.length) {
        return { values: {}, extraInfos: {} };
      }
      const values: any = {};
      const extraInfos: any = {};
      const initialAtomVal = get(
        formInitialValuesAtom(fieldNames?.[0]?.formId)
      ) as InitialValues;
      for (const fieldInfo of fieldNames) {
        const fieldAtomVal = get(
          fieldAtomFamily({
            ancestors: fieldInfo.ancestors ?? [],
            name: fieldInfo.name,
            type: 'field',
            formId: fieldInfo.formId,
          })
        ) as IFieldAtomValue;
        setPathInObj(
          values,
          fieldInfo.name,
          fieldAtomVal?.data === undefined
            ? getPathInObj(initialAtomVal?.values ?? {}, fieldInfo.name)
            : fieldAtomVal?.data
        );
        setPathInObj(
          extraInfos,
          fieldInfo.name,
          fieldAtomVal?.extraInfo === undefined
            ? getPathInObj(initialAtomVal?.extraInfos ?? {}, fieldInfo.name)
            : fieldAtomVal?.extraInfo
        );
      }
      return { values, extraInfos };
    };
  },
});
