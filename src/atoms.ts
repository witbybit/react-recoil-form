import {
  atom,
  atomFamily,
  RecoilState,
  RecoilValue,
  selectorFamily,
} from 'recoil';
import { gan, getNewRowId } from './atomUtils';
import {
  FinalValues,
  IAncestorInput,
  IFieldArrayAtomValue,
  IFieldArrayRowInput,
  IFieldAtomInput,
  IFieldAtomSelectorInput,
  IFieldAtomValue,
  IFieldError,
  IFieldType,
  InitialValues,
} from './types';
import { getPathInObj, setPathInObj } from './utils';

export const formValuesAtom = atom<FinalValues>({
  key: gan('FormValues'),
  default: { values: {}, extraInfos: {} },
});

export const formInitialValuesAtom = atom<InitialValues>({
  key: gan('FormInitialValues'),
  default: {
    values: {},
    version: 0,
    extraInfos: {},
    skipUnregister: undefined,
  },
});

export const combinedFieldAtomValues: {
  fields: {
    [atomKey: string]: {
      atomValue: IFieldAtomValue;
      param: {
        name: string;
        type: IFieldType;
        ancestors: { name: string; rowId: number }[];
      };
    };
  };
  fieldArrays: {
    [atomKey: string]: {
      atomValue: IFieldArrayAtomValue;
      param: {
        name: string;
        type: IFieldType;
        ancestors: { name: string; rowId: number }[];
      };
    };
  };
} = { fields: {}, fieldArrays: {} };

export const fieldAtomFamily = atomFamily<
  IFieldAtomValue | IFieldArrayAtomValue,
  {
    name: string;
    type: IFieldType;
    ancestors: { name: string; rowId: number }[];
  }
>({
  key: gan('FormFields'),
  default: (param) => {
    if (param.type === 'field') {
      return {
        type: 'field',
        initVer: 0,
        name: param.name,
        ancestors: param.ancestors,
      } as IFieldAtomValue;
    }
    return {
      type: 'field-array',
      fieldNames: [],
      ancestors: param.ancestors,
      initVer: 0,
      name: param.name,
      rowIds: [],
    } as IFieldArrayAtomValue;
  },
  effects_UNSTABLE: (param) => [
    ({ onSet, node }) => {
      onSet((newValue) => {
        if (param.type === 'field') {
          combinedFieldAtomValues.fields[node.key] = {
            atomValue: newValue as IFieldAtomValue,
            param,
          };
        } else if (param.type === 'field-array') {
          combinedFieldAtomValues.fieldArrays[node.key] = {
            atomValue: newValue as IFieldArrayAtomValue,
            param,
          };
        }
      });
    },
  ],
});

export function resetFieldArrayRow(
  params: IFieldArrayRowInput,
  get: (val: RecoilValue<any>) => any,
  reset: (recoilVal: RecoilState<any>) => void
) {
  const fieldArrayValue = get(
    fieldAtomFamily({
      ancestors: params.ancestors,
      name: params.name,
      type: 'field-array',
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
        })
      );
    } else {
      if (field.type === 'field') {
        reset(
          fieldAtomFamily({
            ancestors: fieldAncestors,
            name: field.name,
            type: 'field',
          })
        );
      } else {
        const fieldArrayValue = get(
          fieldAtomFamily({
            ancestors: fieldAncestors,
            name: field.name,
            type: 'field-array',
          })
        ) as IFieldArrayAtomValue;
        for (const rowId of fieldArrayValue.rowIds) {
          resetFieldArrayRow(
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
  params: IFieldAtomInput,
  get: (
    atom: RecoilValue<IFieldArrayAtomValue | IFieldAtomValue>
  ) => IFieldArrayAtomValue | IFieldAtomValue,
  validationParams?: IValidationParams,
  // relative ancestors are from the point of view of the root field array where getValue() was called
  relativeAncestors?: IAncestorInput[]
): {
  data: any;
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
  const fieldArrayAtom = fieldAtomFamily({ ...params, type: 'field-array' });
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
    for (const field of fieldArrayAtomValue.fieldNames) {
      if (typeof field === 'string') {
        const fieldAtom = fieldAtomFamily({
          name: field,
          type: 'field',
          ancestors: params.ancestors,
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
            ancestors: params.ancestors,
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
          setPathInObj(data[rowIdx], field.name, fieldData);
          setPathInObj(extraInfo[rowIdx], field.name, fieldExtraInfo);
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
  mode?: { type: 'set' } | { type: 'insert'; rowIndex?: number };
}

export function setFieldArrayDataAndExtraInfo(
  params: IFieldAtomInput,
  setParams: ISetFieldArrayParams
) {
  let { get, set, reset, dataArr, extraInfoArr, initialValuesVersion, mode } =
    setParams;
  if (!mode) {
    mode = { type: 'set' };
  }
  const fieldArrayParams: IFieldAtomSelectorInput = {
    ...params,
    type: 'field-array',
  };
  const fieldArrayAtomValue = get(fieldAtomFamily(fieldArrayParams));
  if (fieldArrayAtomValue.type !== 'field-array') {
    throw new Error(
      'Please check the field type in field array since this seems to be a regular field but has been specified as a nested field array'
    );
  }
  const oldRowIds = fieldArrayAtomValue.rowIds;
  let dataRowsLength = dataArr.length;
  let rowIdsToRemove: number[] = [];
  let rowIds: number[] = [];
  let startIndex = 0;
  if ((!mode || mode.type === 'set') && oldRowIds.length !== dataRowsLength) {
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
      } as Partial<IFieldArrayAtomValue>)
    );
    for (const rowId of rowIdsToRemove) {
      resetFieldArrayRow({ ...fieldArrayParams, rowId }, get, reset);
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
      const fieldValues = dataArr[dataIdx];
      const extraInfos = extraInfoArr?.[dataIdx];
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
            const data = getPathInObj(fieldValues, field.name);
            const extraInfo = getPathInObj(extraInfos, field.name);
            setFieldArrayDataAndExtraInfo(
              { name: field.name, ancestors: fieldAncestors },
              {
                get,
                set,
                dataArr: data,
                reset,
                extraInfoArr: extraInfo,
                initialValuesVersion,
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
  { values: { [key: string]: any }; extraInfos: { [key: string]: any } },
  {
    ancestors?: { name: string; rowId: number }[];
    fieldArrayName: string;
    fieldNames: string[];
  }
>({
  key: gan('FieldArrayColAtomValueSelector'),
  get: ({ ancestors, fieldArrayName, fieldNames }) => {
    return ({ get }) => {
      if (!fieldNames?.length) {
        return { values: {}, extraInfos: {} };
      }
      const values: any = {};
      const extraInfos: any = {};
      const fieldArrayAtom = fieldAtomFamily({
        ancestors: ancestors ?? [],
        name: fieldArrayName,
        type: 'field-array',
      });
      const fieldArrayInfo = get(fieldArrayAtom) as IFieldArrayAtomValue;
      setPathInObj(values, fieldArrayName, []);
      setPathInObj(extraInfos, fieldArrayName, []);
      for (let i = 0; i < fieldArrayInfo.rowIds.length; i++) {
        let fieldValues: any = {};
        const extraInfoValues: any = {};
        const rowId = fieldArrayInfo.rowIds[i];
        const fieldAncestors = ancestors?.length
          ? [...ancestors, { name: fieldArrayName, rowId }]
          : [{ name: fieldArrayName, rowId }];
        for (const fieldName of fieldNames) {
          const fieldAtom = fieldAtomFamily({
            ancestors: fieldAncestors,
            name: fieldName,
            type: 'field',
          });
          const fieldData = get(fieldAtom) as IFieldAtomValue;
          setPathInObj(fieldValues, fieldName, fieldData.data);
          setPathInObj(extraInfoValues, fieldName, fieldData.extraInfo);
        }
        getPathInObj(values, fieldArrayName).push(fieldValues);
        getPathInObj(extraInfos, fieldArrayName).push(extraInfoValues);
      }
      return { values, extraInfos };
    };
  },
});

export const multipleFieldsSelectorFamily = selectorFamily<
  { values: { [key: string]: any }; extraInfos: { [key: string]: any } },
  (string | { ancestors?: { name: string; rowId: number }[]; name: string })[]
>({
  key: gan('FormFieldsSelector'),
  get: (
    fieldNames: (
      | string
      | { ancestors?: { name: string; rowId: number }[]; name: string }
    )[]
  ) => {
    return ({ get }) => {
      if (!fieldNames?.length) {
        return { values: {}, extraInfos: {} };
      }
      const values: any = {};
      const extraInfos: any = {};
      for (const fieldInfo of fieldNames) {
        if (typeof fieldInfo === 'string') {
          const fieldAtomVal = get(
            fieldAtomFamily({ name: fieldInfo, type: 'field', ancestors: [] })
          ) as IFieldAtomValue;
          setPathInObj(values, fieldInfo, fieldAtomVal?.data);
          setPathInObj(extraInfos, fieldInfo, fieldAtomVal?.extraInfo);
        } else {
          const fieldAtomVal = get(
            fieldAtomFamily({
              ancestors: fieldInfo.ancestors ?? [],
              name: fieldInfo.name,
              type: 'field',
            })
          ) as IFieldAtomValue;
          setPathInObj(values, fieldInfo.name, fieldAtomVal?.data);
          setPathInObj(extraInfos, fieldInfo.name, fieldAtomVal?.extraInfo);
        }
      }
      return { values, extraInfos };
    };
  },
});
