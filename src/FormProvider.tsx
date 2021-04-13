import React, {
  useCallback,
  useEffect,
  useState,
  Fragment,
  useRef,
} from 'react';
import {
  atom,
  atomFamily,
  RecoilRoot,
  selectorFamily,
  Snapshot,
  useRecoilCallback,
  useRecoilState,
  useRecoilTransactionObserver_UNSTABLE,
  useRecoilValue,
  useSetRecoilState,
} from 'recoil';
import produce from 'immer';
import { getPathInObj, setPathInObj, isDeepEqual, cloneDeep } from './utils';

function gan(atomName: string) {
  return `WitForm_${atomName}`;
}

// Excluding __fallback atoms
function getNameFromAtomFamilyKey(name: string) {
  const matches = name.match(/WitForm_FormFields__"(.*)"(?!__)/);
  return matches?.length ? matches[1] : null;
}

// Excluding __fallback atoms
function getNameFromFieldArrayAtomFamilyKey(name: string) {
  const matches = name.match(/WitForm_FormFieldArrays__"(.*)"(?!__)/);
  return matches?.length ? matches[1] : null;
}

// TODO: Use better logic to ignore selector for reset
function isResettableAtom(name: string) {
  return (
    name.startsWith('WitForm_') &&
    name.toLowerCase().indexOf('selectorfamily') === -1
  );
}

// abc.sdsdsd/123/sdd.def.deded
// Break it using / as the delimiter. Last part is the field name
// ASSUMPTION: / can't used by user in field name
export interface IFieldAtomValue {
  data?: any;
  extraInfo?: any;
  error?: string | null;
  validate?: (data: any, otherParams?: any) => string | undefined | null;
  touched?: boolean;
  initVer: number;
}

interface IFieldArrayAtomValue {
  rowIds: number[];
  fieldNames: string[];
  error?: string | null;
  initVer: number;
  validate?: (data: any, values?: any) => string | undefined | null;
}

interface InitialValues {
  values: any;
  version: number;
  skipUnregister?: boolean;
}

interface FinalValues {
  values: any;
  extraInfos: any;
}

function getFieldArrayParts(fieldName: string) {
  if (!fieldName) {
    return null;
  }
  const parts = fieldName.split('/');
  if (parts.length === 3) {
    let rowId = 0;
    try {
      rowId = parseInt(parts[1]);
    } catch (err) {
      return null;
    }
    return { rowId, fieldArrayName: parts[0], fieldName: parts[2] };
  }
  return null;
}

export const fieldsAtomFamily = atomFamily<IFieldAtomValue, string>({
  key: gan('FormFields'),
  default: {
    data: undefined,
    error: undefined,
    initVer: 0,
    touched: undefined,
  },
});

export const formValuesAtom = atom<FinalValues>({
  key: gan('FormValues'),
  default: { values: {}, extraInfos: {} },
});

export const formInitialValuesAtom = atom<InitialValues>({
  key: gan('FormInitialValues'),
  default: { values: {}, version: 0 },
});

export const fieldArraysAtomFamily = atomFamily<IFieldArrayAtomValue, string>({
  key: gan('FormFieldArrays'),
  default: { rowIds: [], fieldNames: [], initVer: 0 },
});

export const fieldsAtomSelectorFamily = selectorFamily<
  { values: { [key: string]: any }; extraInfos: { [key: string]: any } },
  string[]
>({
  key: gan('FormFieldsSelector'),
  get: (fieldNames: string[]) => {
    return ({ get }) => {
      if (!fieldNames?.length) {
        return { values: {}, extraInfos: {} };
      }
      const values: any = {};
      const extraInfos: any = {};
      for (const fieldName of fieldNames) {
        const fieldArrayParts = fieldName.split('/');
        if (fieldArrayParts.length === 1) {
          const fieldAtomVal = get(fieldsAtomFamily(fieldName));
          setPathInObj(values, fieldName, fieldAtomVal?.data);
          setPathInObj(extraInfos, fieldName, fieldAtomVal?.extraInfo);
        } else {
          const fieldArrayFields = fieldArrayParts.slice(1);
          const fieldArrayName = fieldArrayParts[0];
          const fieldArrayAtom = fieldArraysAtomFamily(fieldArrayName);
          const fieldArrayInfo = get(fieldArrayAtom);
          setPathInObj(values, fieldArrayName, []);
          setPathInObj(extraInfos, fieldArrayName, []);
          for (let i = 0; i < fieldArrayInfo.rowIds.length; i++) {
            const rowId = fieldArrayInfo.rowIds[i];
            let fieldValues: any = {};
            const extraInfoValues: any = {};
            for (const field of fieldArrayFields) {
              const fieldId = getIdForArrayField(fieldArrayName, rowId, field);
              if (fieldId) {
                const fieldAtom = fieldsAtomFamily(fieldId);
                const fieldData = get(fieldAtom);
                setPathInObj(fieldValues, field, fieldData.data);
                setPathInObj(extraInfoValues, field, fieldData.extraInfo);
              }
            }
            getPathInObj(values, fieldArrayName).push(fieldValues);
            getPathInObj(extraInfos, fieldArrayName).push(extraInfoValues);
          }
        }
      }
      return { values, extraInfos };
    };
  },
});

function FormValuesObserver() {
  // TODO: Capture overall errors here
  const setFormValues = useSetRecoilState(formValuesAtom);

  useRecoilTransactionObserver_UNSTABLE(({ snapshot }) => {
    setFormValues(values => {
      const newValues = getFormValues(snapshot);
      if (isDeepEqual(newValues, values)) {
        return values;
      }
      return newValues;
    });
    // DEVNOTE: The approach below will be more efficient since it only deals with modified atoms.
    // However since there were some minor differences between the values here and the final values on submit,
    // we are temporarily using the simple solution of going through all atoms via getFormValues().
    // const modifiedAtoms = (snapshot as any).getNodes_UNSTABLE({
    //   isModified: true,
    // });
    // const formFieldAtoms: any[] = [];
    // let modifiedAtomIt = modifiedAtoms.next();
    // const fieldArrayPathsToRemove: {
    //   index: number;
    //   fieldArrayPath: string | null;
    // }[] = [];
    // while (modifiedAtomIt && !modifiedAtomIt.done) {
    //   const modifiedAtom = modifiedAtomIt.value;
    //   const fieldName = getNameFromAtomFamilyKey(modifiedAtom.key);
    //   const fieldArrayName = getNameFromFieldArrayAtomFamilyKey(
    //     modifiedAtom.key
    //   );
    //   if (fieldName) {
    //     formFieldAtoms.push(modifiedAtom);
    //   } else if (fieldArrayName) {
    //     const newFieldArrayAtom = snapshot.getLoadable<IFieldArrayAtomValue>(
    //       modifiedAtom
    //     );
    //     const prevFieldArrayAtom = previousSnapshot.getLoadable<
    //       IFieldArrayAtomValue
    //     >(modifiedAtom);
    //     if (
    //       prevFieldArrayAtom.state === 'hasValue' &&
    //       newFieldArrayAtom.state === 'hasValue'
    //     ) {
    //       const prevRowIds = prevFieldArrayAtom.contents?.rowIds ?? [];
    //       const newRowIds = newFieldArrayAtom.contents?.rowIds ?? [];
    //       const fieldArrayName = getNameFromFieldArrayAtomFamilyKey(
    //         modifiedAtom.key
    //       );
    //       if (prevRowIds.length > newRowIds.length) {
    //         let prevRowIndex = -1;
    //         for (const prevRowId of prevRowIds) {
    //           prevRowIndex++;
    //           if (newRowIds.indexOf(prevRowId) === -1) {
    //             fieldArrayPathsToRemove.push({
    //               fieldArrayPath: fieldArrayName,
    //               index: prevRowIndex,
    //             });
    //           }
    //         }
    //       }
    //     }
    //   }
    //   modifiedAtomIt = modifiedAtoms.next();
    // }
    // if (formFieldAtoms.length || fieldArrayPathsToRemove.length) {
    //   setFormValues(values => {
    //     const newFormValues = produce(values, draftValues => {
    //       for (const fieldArrPathRemove of fieldArrayPathsToRemove) {
    //         if (fieldArrPathRemove.fieldArrayPath) {
    //           getPathInObj(
    //             draftValues.values,
    //             fieldArrPathRemove.fieldArrayPath
    //           )?.splice?.(fieldArrPathRemove.index, 1);
    //           getPathInObj(
    //             draftValues.extraInfos,
    //             fieldArrPathRemove.fieldArrayPath
    //           )?.splice?.(fieldArrPathRemove.index, 1);
    //         }
    //       }
    //       for (const modifiedAtom of formFieldAtoms) {
    //         const atomLoadable = snapshot.getLoadable<IFieldAtomValue>(
    //           modifiedAtom
    //         );
    //         if (atomLoadable.state === 'hasValue') {
    //           // const atomValue = atomLoadable.contents;
    //           // if (atomValue?.data !== undefined) {
    //           const fieldName = getNameFromAtomFamilyKey(modifiedAtom.key);
    //           if (fieldName) {
    //             const fieldArrayParts = getFieldArrayParts(fieldName);
    //             if (fieldArrayParts) {
    //               const fieldArrayLoadable = snapshot.getLoadable<
    //                 IFieldArrayAtomValue
    //               >(fieldArraysAtomFamily(fieldArrayParts.fieldArrayName));
    //               if (fieldArrayLoadable.state === 'hasValue') {
    //                 const rowIndex = fieldArrayLoadable.contents.rowIds.indexOf(
    //                   fieldArrayParts.rowId
    //                 );
    //                 const fieldPathInValues = `${fieldArrayParts.fieldArrayName}[${rowIndex}].${fieldArrayParts.fieldName}`;
    //                 if (atomLoadable.contents.data !== undefined) {
    //                   setPathInObj(
    //                     draftValues.values,
    //                     fieldPathInValues,
    //                     cloneDeep(atomLoadable.contents.data)
    //                   );
    //                 }
    //                 if (atomLoadable.contents.extraInfo !== undefined) {
    //                   setPathInObj(
    //                     draftValues.extraInfos,
    //                     fieldPathInValues,
    //                     cloneDeep(atomLoadable.contents.extraInfo)
    //                   );
    //                 }
    //               }
    //             } else {
    //               setPathInObj(
    //                 draftValues.values,
    //                 fieldName,
    //                 cloneDeep(atomLoadable.contents.data)
    //               );
    //               setPathInObj(
    //                 draftValues.extraInfos,
    //                 fieldName,
    //                 cloneDeep(atomLoadable.contents.extraInfo)
    //               );
    //             }
    //             // }
    //           } else {
    //             // TODO: Delete from final data
    //           }
    //         }
    //       }
    //     });
    //     return newFormValues;
    //   });
    // }
  });
  return null;
}

interface IWatchParams {
  name: string;
  defaultValue?: any;
}

interface IMultipleWatchParams {
  names: string[];
}

export interface IFieldProps {
  name: string;
  defaultValue?: any;
  validate?: (value: any, otherParams?: any) => string | undefined | null;
  /**
   * Useful for referencing other fields in validation
   * */
  depFields?: string[];
  skipUnregister?: boolean;
}

interface IFieldArrayProps {
  name: string;
  fieldNames: string[];
  // TODO: Implement validate here
  // Note that this should be memoized or kept outside a function component so that it doesn't change on every render.
  validate?: (values: any[], otherParams?: any) => string | undefined | null;
  depFields?: string[];
  skipUnregister?: boolean;
}

// TODO: Check if useField should be rendered again when same params are passed again
export function useField(props: IFieldProps) {
  const { name, validate, defaultValue, depFields, skipUnregister } = props;
  const [atomValue, setAtomValue] = useRecoilState<IFieldAtomValue>(
    fieldsAtomFamily(name)
  );
  const { data: fieldValue, extraInfo, error, touched } = atomValue;
  const initialValues = useRecoilValue(formInitialValuesAtom);

  // TODO: Memoize or change the params so that this hook doesn't render everytime useField is rendered
  const otherParams = fieldsAtomSelectorFamily(depFields ?? []);

  const initializeFieldValue = useRecoilCallback(
    ({ set, snapshot }) => () => {
      const initialValues = snapshot.getLoadable(formInitialValuesAtom)
        .contents as InitialValues;
      if (initialValues.values) {
        const fieldArrayParts = getFieldArrayParts(name);
        //TODO: Add field array atoms depending on initial values
        if (!fieldArrayParts) {
          const initialValue = getPathInObj(initialValues.values, name);
          set(fieldsAtomFamily(name), {
            data: initialValue ?? defaultValue ?? undefined,
            error: undefined,
            validate,
            initVer: initialValues.version,
            touched: false,
          });
        } else {
          // Initialize validation function for fields inside field array
          set(fieldsAtomFamily(name), state =>
            Object.assign({}, state, {
              validate,
              initVer: initialValues.version,
            })
          );
        }
      }
    },
    [name, defaultValue]
  );

  const resetField = useRecoilCallback(
    ({ reset }) => () => {
      // DEVNOTE: Not resetting the field if it is part of field array
      // since field array reset will reset those fields
      if (
        !skipUnregister &&
        !initialValues.skipUnregister &&
        !getFieldArrayParts(name)
      ) {
        reset(fieldsAtomFamily(name));
      }
    },
    [skipUnregister, name]
  );

  useEffect(() => {
    if (atomValue.initVer < initialValues.version) {
      initializeFieldValue();
    } else if (validate && !atomValue.validate) {
      setAtomValue(val => Object.assign({}, val, { validate }));
    }
  }, [
    initializeFieldValue,
    initialValues,
    atomValue.initVer,
    setAtomValue,
    validate,
    atomValue.validate,
  ]);

  useEffect(() => {
    return () => {
      resetField();
    };
  }, [resetField]);

  return {
    fieldValue,
    extraInfo,
    setFieldValue: useCallback(
      (data: any, extraInfo?: any) => {
        setAtomValue(val =>
          produce(val, draft => {
            draft.data = data;
            draft.extraInfo = extraInfo;
            draft.error = validate ? validate(data, otherParams) : undefined;
          })
        );
      },
      [otherParams, validate, setAtomValue]
    ),
    error: touched ? error : undefined,
    onBlur: useCallback(
      () =>
        setAtomValue(val =>
          val.touched ? val : Object.assign({}, val, { touched: true })
        ),
      [setAtomValue]
    ),
    touched,
  };
}

// TODO: Support field array for useWatch
export function useWatch(props: IWatchParams) {
  const { name, defaultValue } = props;
  const selector = fieldsAtomSelectorFamily([name]);
  const { values, extraInfos } = useRecoilValue(selector);
  return {
    value: values ? getPathInObj(values, name) : defaultValue,
    extraInfo: getPathInObj(extraInfos, name),
  };
}

export function useMultipleWatch(props: IMultipleWatchParams) {
  const { names } = props;
  const selector = fieldsAtomSelectorFamily(names);
  const { values, extraInfos } = useRecoilValue(selector);
  return { values, extraInfos };
}

export function useIsDirty() {
  const { values: formValues } = useRecoilValue(formValuesAtom);
  const { values: initialValues } = useRecoilValue(formInitialValuesAtom);
  return !isDeepEqual(initialValues, formValues);
}

export function useFormValues() {
  const { values: formValues } = useRecoilValue(formValuesAtom);
  return formValues;
}

// TODO: Can consider renaming this in the future. The name was chosen to make it compatible with react-hook-form
export function useFormContext() {
  // TODO: setFieldValue is probably a better name here since we can't set value for table fields here.
  // setValue is currently used for consistency with react-hook-form
  const setValue = useRecoilCallback<any, any>(
    ({ set }) => (key: string, value: any) => {
      set(fieldsAtomFamily(key), value);
    },
    []
  );
  // TODO: getFieldValue is probably a better name here since we can't get value for table fields here
  // getValue is currently used for consistency with react-hook-form
  const getValue = useRecoilCallback<any, any>(
    ({ snapshot }) => (key: string) => {
      return snapshot.getLoadable(fieldsAtomFamily(key))?.contents;
    },
    []
  );
  const getValues = useRecoilCallback<any, any>(
    ({ snapshot }) => () => {
      return getFormValues(snapshot).values;
    },
    []
  );
  return { getValue, setValue, getValues };
}

function getIdForArrayField(
  fieldArrayName: string,
  rowId: number,
  fieldName: string
) {
  if (!rowId) {
    throw new Error('getIdForArrayField() called with invalid rowId');
  }
  return `${fieldArrayName}/${rowId}/${fieldName}`;
}

// DEVNOTE: useFieldArray will be triggerred only if no. of rows change
// TODO: Need to add support for unregister for unmount (has to be a user choice)
export function useFieldArray(props: IFieldArrayProps) {
  const { name, fieldNames, validate, skipUnregister } = props;
  const [fieldArrayProps, setFieldArrayProps] = useRecoilState(
    fieldArraysAtomFamily(name)
  );
  const initialValues = useRecoilValue(formInitialValuesAtom);

  // const otherParams = useMultipleWatch({ names: depFields ?? [] })

  const getFieldIdInArray = useCallback(
    (rowIndex: number, fieldName: string) => {
      if (fieldArrayProps.rowIds.length > rowIndex) {
        return getIdForArrayField(
          name,
          fieldArrayProps.rowIds[rowIndex],
          fieldName
        );
      }
      throw new Error('rowIndex is out of bounds in getFieldIdInArray');
    },
    [name, fieldArrayProps]
  );

  const setFieldArrayValue = useRecoilCallback(
    ({ snapshot, set, reset }) => (fieldValues: any[]) => {
      const fieldArrayAtom = fieldArraysAtomFamily(name);
      const fieldArrayLoadable = snapshot.getLoadable(fieldArrayAtom);
      if (fieldArrayLoadable.state === 'hasValue') {
        let oldRowIds = fieldArrayLoadable.contents.rowIds;
        const rowsLength = fieldValues.length;
        let updatedAtomValue = fieldArrayLoadable.contents;
        // Set the no. of rows as per given values
        let rowIdsToRemove: number[] = [];
        if (oldRowIds.length !== rowsLength) {
          updatedAtomValue = produce(fieldArrayLoadable.contents, draft => {
            if (oldRowIds.length > rowsLength) {
              draft.rowIds = oldRowIds.slice(0, rowsLength);
              rowIdsToRemove = oldRowIds.slice(rowsLength, oldRowIds.length);
            } else if (oldRowIds.length < rowsLength) {
              const noOfElementsToAdd = rowsLength - oldRowIds.length;
              for (let i = 0; i < noOfElementsToAdd; i++) {
                const val = Math.floor(Math.random() * 10000);
                if (draft.rowIds.indexOf(val) === -1) {
                  draft.rowIds.push(val);
                }
              }
            }
            oldRowIds = draft.rowIds;
          });
          set(fieldArraysAtomFamily(name), updatedAtomValue);
          for (const rowId of rowIdsToRemove) {
            for (const fieldName of fieldNames) {
              const fieldId = getIdForArrayField(name, rowId, fieldName);
              if (fieldId) {
                // TODO: Check if this can cause any issue with existing selector
                reset(fieldsAtomFamily(fieldId));
              }
            }
          }
        }
        for (let i = 0; i < fieldValues.length; i++) {
          const fieldRow = fieldValues[i];
          for (const fieldName of fieldNames) {
            const fieldId = getIdForArrayField(
              name,
              updatedAtomValue.rowIds[i],
              fieldName
            );
            if (fieldId) {
              set(fieldsAtomFamily(fieldId), currValue =>
                produce(currValue, draft => {
                  draft.data = getPathInObj(fieldRow, fieldName);
                })
              );
            }
          }
        }
      }
    }
  );

  const validateData = useRecoilCallback(
    ({ snapshot, set }) => () => {
      const errors: any = [];
      for (const rowId of fieldArrayProps.rowIds) {
        for (const fieldName of fieldArrayProps.fieldNames) {
          const fieldId = getIdForArrayField(name, rowId, fieldName);
          if (fieldId) {
            const fieldAtom = fieldsAtomFamily(fieldId);
            const atomLoadable = snapshot.getLoadable(fieldAtom);
            if (atomLoadable.state === 'hasValue') {
              const formFieldData = atomLoadable.contents as IFieldAtomValue;
              const errorMsg = formFieldData.validate?.(formFieldData.data);
              if (errorMsg) {
                errors.push({ fieldName, error: errorMsg, type: 'field' });
              }
              set(fieldAtom, val =>
                Object.assign({}, val, { error: errorMsg, touched: true })
              );
            }
          }
        }
      }
      if (fieldArrayProps.validate) {
        const result: any[] = [];
        for (let index = 0; index < fieldArrayProps.rowIds.length; index++) {
          const rowId = fieldArrayProps.rowIds[index];
          result.push({});
          for (let j = 0; j < fieldArrayProps.fieldNames.length; j++) {
            const fieldArrayFieldName = fieldArrayProps.fieldNames[j];
            const fieldId = getIdForArrayField(
              name,
              rowId,
              fieldArrayFieldName
            );
            if (fieldId) {
              const fieldLoadable = snapshot.getLoadable(
                fieldsAtomFamily(fieldId)
              );
              if (fieldLoadable.state === 'hasValue') {
                setPathInObj(
                  result[index],
                  fieldArrayFieldName,
                  fieldLoadable.contents?.data
                );
              }
            }
          }
        }
        const errorMsg = fieldArrayProps.validate?.(result);
        if (errorMsg) {
          errors.push({
            fieldName: name,
            error: errorMsg,
            type: 'field-array',
          });
        }
        set(fieldArraysAtomFamily(name), val =>
          Object.assign({}, val, { error: errorMsg })
        );
      }
      return { errors, isValid: !errors?.length };
    },
    [name, fieldArrayProps]
  );

  const getFieldArrayValue = useRecoilCallback(
    ({ snapshot }) => () => {
      let index = -1;
      const result: any = [];
      for (const rowId of fieldArrayProps.rowIds) {
        index++;
        result.push({});
        for (const fieldName of fieldNames) {
          const fieldId = getIdForArrayField(name, rowId, fieldName);
          if (fieldId) {
            const fieldLoadable = snapshot.getLoadable(
              fieldsAtomFamily(fieldId)
            );
            if (fieldLoadable.state === 'hasValue') {
              setPathInObj(
                result[index],
                fieldName,
                fieldLoadable.contents?.data
              );
            }
          }
        }
      }
      return result;
    },
    [fieldArrayProps]
  );

  const append = useRecoilCallback(
    ({ set, snapshot }) => (row?: any) => {
      let newRowId: number = 0;
      const val = Math.floor(Math.random() * 10000) + 1;
      const faAtom = snapshot.getLoadable(fieldArraysAtomFamily(name));
      const faValue = faAtom.contents as IFieldArrayAtomValue;
      if (faValue.rowIds.indexOf(val) === -1) {
        newRowId = val;
      }
      if (newRowId !== 0) {
        set(fieldArraysAtomFamily(name), currVal => {
          return produce(currVal, draft => {
            draft.rowIds.push(newRowId);
          });
        });
        if (row) {
          for (const fieldName of fieldNames) {
            const rowVal = getPathInObj(row, fieldName);
            if (rowVal !== undefined && rowVal !== null) {
              const fieldNameInArr = getIdForArrayField(
                name,
                newRowId,
                fieldName
              );
              if (fieldNameInArr) {
                set(fieldsAtomFamily(fieldNameInArr), currVal => {
                  return produce(currVal, draft => {
                    draft.data = rowVal;
                  });
                });
              }
            }
          }
        }
      }
    },
    [name, fieldNames]
  );

  const remove = useRecoilCallback(
    ({ set, reset }) => (index: number) => {
      let rowIdToRemove: number | null = null;
      set(fieldArraysAtomFamily(name), currVal => {
        rowIdToRemove = currVal.rowIds[index];
        return produce(currVal, draft => {
          draft.rowIds?.splice(index, 1);
        });
      });
      if (rowIdToRemove !== null) {
        for (const fieldName of fieldNames) {
          const fieldIdArr = getFieldIdInArray(rowIdToRemove, fieldName);
          if (fieldIdArr) {
            reset(fieldsAtomFamily(fieldIdArr));
          }
        }
      }
    },
    []
  );

  const removeAll = useRecoilCallback(
    ({ snapshot, set, reset }) => () => {
      const fieldArrayLoadable = snapshot.getLoadable(
        fieldArraysAtomFamily(name)
      );
      if (fieldArrayLoadable.state === 'hasValue') {
        const rowIds = fieldArrayLoadable.contents.rowIds;
        set(fieldArraysAtomFamily(name), currVal => {
          return produce(currVal, draft => {
            for (const rowId of rowIds) {
              for (const fieldName of fieldNames) {
                const fieldIdArr = getFieldIdInArray(rowId, fieldName);
                if (fieldIdArr) {
                  reset(fieldsAtomFamily(fieldIdArr));
                }
              }
              draft.rowIds?.splice(currVal.rowIds.indexOf(rowId), 1);
            }
          });
        });
      }
    },
    []
  );

  const insert = useRecoilCallback(
    ({ set }) => (index: number, value?: any) => {
      let rowId = Math.floor(Math.random() * 10000);
      while (fieldArrayProps.rowIds.indexOf(rowId) !== -1) {
        rowId = Math.floor(Math.random() * 10000);
      }
      set(fieldArraysAtomFamily(name), currVal => {
        return produce(currVal, draft => {
          draft.rowIds?.splice(index + 1, 0, rowId);
        });
      });
      if (value && typeof value === 'object') {
        for (const key of fieldNames) {
          if (value[key] !== undefined && value[key] !== null) {
            const fieldId = getIdForArrayField(name, rowId, key);
            if (fieldId) {
              set(fieldsAtomFamily(fieldId), value[key]);
            }
          }
        }
      }
    },
    [fieldArrayProps.rowIds, name]
  );

  const initializeFieldArrayValue = useRecoilCallback(
    ({ set, snapshot }) => () => {
      const initialValues = snapshot.getLoadable(formInitialValuesAtom)
        .contents as InitialValues;
      if (initialValues.values) {
        const initialValue = getPathInObj(initialValues.values, name);
        if (initialValue?.length) {
          let rowIds: number[] = [];
          for (let i = 0; i < initialValue.length; i++) {
            // TODO: Try random number multiple times in case it fails to generate a unique id
            const val = Math.floor(Math.random() * 10000);
            if (rowIds.indexOf(val) === -1) {
              rowIds.push(val);
            }
          }
          for (let j = 0; j < initialValue.length; j++) {
            const obj = initialValue[j];
            for (const fieldName of fieldNames) {
              const fieldAtomName = getIdForArrayField(
                name,
                rowIds[j],
                fieldName
              );
              if (fieldAtomName) {
                set(fieldsAtomFamily(fieldAtomName), value =>
                  Object.assign({}, value, {
                    data: getPathInObj(obj, fieldName),
                    initVer: initialValues.version,
                  } as Partial<IFieldAtomValue>)
                );
              }
            }
          }
          set(fieldArraysAtomFamily(name), currVal => {
            return produce(currVal, draft => {
              draft.rowIds = rowIds;
              draft.initVer = initialValues.version;
              draft.validate = validate;
              draft.fieldNames = fieldNames;
            });
          });
        } else {
          set(fieldArraysAtomFamily(name), {
            rowIds: [],
            initVer: initialValues.version,
            validate,
            fieldNames,
          });
        }
      }
    },
    [name]
  );

  const resetFieldArray = useRecoilCallback(
    ({ reset, snapshot }) => (name: string) => {
      const fieldArrayAtom = fieldArraysAtomFamily(name);
      const fieldArrayAtomValue = snapshot.getLoadable(fieldArrayAtom)
        .contents as IFieldArrayAtomValue;
      if (!skipUnregister && !initialValues.skipUnregister) {
        reset(fieldArrayAtom);
        for (const rowId of fieldArrayAtomValue.rowIds) {
          for (const fieldName of fieldArrayAtomValue.fieldNames) {
            const fieldId = getIdForArrayField(name, rowId, fieldName);
            if (fieldId) {
              reset(fieldsAtomFamily(fieldId));
            }
          }
        }
      }
    },
    [skipUnregister]
  );

  useEffect(() => {
    // DEVNOTE: Need to check for isInit prop here since same field array hook could be used in different components
    // And we want to avoid overwriting the user value unless it is intentional
    if (fieldArrayProps.initVer < initialValues.version) {
      initializeFieldArrayValue();
    }
    if (validate && !fieldArrayProps.validate) {
      setFieldArrayProps(val => Object.assign({}, val, { validate }));
    }
  }, [
    initializeFieldArrayValue,
    initialValues,
    fieldArrayProps.initVer,
    setFieldArrayProps,
    validate,
    fieldArrayProps.validate,
  ]);

  useEffect(() => {
    return () => {
      resetFieldArray(name);
    };
  }, [name, resetFieldArray]);

  return {
    append,
    remove,
    fieldArrayProps,
    insert,
    validateData,
    getFieldIdInArray,
    removeAll,
    getFieldArrayValue,
    setFieldArrayValue,
    error: null,
  };
}

interface IFormProps {
  submitForm?: (values: any, extraInfos?: any) => any;
  // DEVNOTE: Make onSubmit mandatory after submitForm is removed from usage
  onSubmit?: (values: any, extraInfos?: any) => any;
  onError?: (errors?: IFieldError[] | null, formErrors?: any[] | null) => any;
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
}

interface IFieldError {
  fieldName: string;
  error: string;
  type: 'field' | 'field-array';
}

function getFormValues(snapshot: Snapshot) {
  const atoms = (snapshot as any).getNodes_UNSTABLE();
  const values: any = {};
  const extraInfos: any = {};
  let formFieldAtomsIt = atoms.next();
  while (formFieldAtomsIt && !formFieldAtomsIt.done) {
    const atom = formFieldAtomsIt.value;
    const fieldName = getNameFromAtomFamilyKey(atom.key);
    if (fieldName) {
      const atomLoadable = snapshot.getLoadable(atom);
      const fieldArrayParts = getFieldArrayParts(fieldName);
      const formFieldData = atomLoadable.contents as IFieldAtomValue;
      if (fieldArrayParts) {
        const fieldArrayLoadable = snapshot.getLoadable<IFieldArrayAtomValue>(
          fieldArraysAtomFamily(fieldArrayParts.fieldArrayName)
        );
        if (fieldArrayLoadable.state === 'hasValue') {
          const rowIndex = fieldArrayLoadable.contents.rowIds.indexOf(
            fieldArrayParts.rowId
          );
          if (rowIndex >= 0) {
            const fieldPathInValues = `${fieldArrayParts.fieldArrayName}[${rowIndex}].${fieldArrayParts.fieldName}`;
            setPathInObj(
              values,
              fieldPathInValues,
              cloneDeep(formFieldData.data)
            );
            setPathInObj(
              extraInfos,
              fieldPathInValues,
              cloneDeep(formFieldData.extraInfo)
            );
          }
        }
      } else {
        setPathInObj(values, fieldName, cloneDeep(formFieldData.data));
        setPathInObj(extraInfos, fieldName, cloneDeep(formFieldData.extraInfo));
      }
    }
    formFieldAtomsIt = atoms.next();
  }
  return { values, extraInfos };
}

export function useForm(props: IFormProps) {
  // DEVNOTE: submitForm is deprecated
  const {
    submitForm,
    initialValues,
    onError,
    onSubmit,
    skipUnregister,
    validate,
  } = props;
  const [formState, setFormState] = useState<{ isSubmitting: boolean }>({
    isSubmitting: false,
  });
  const setFormInitialValues = useSetRecoilState(formInitialValuesAtom);
  const initValuesVer = useRef(0);

  const handleReset = useRecoilCallback(
    ({ snapshot, reset }) => () => {
      // Resetting initial values version to allow it to be re-initialized
      initValuesVer.current = 0;
      const atoms = (snapshot as any).getNodes_UNSTABLE();
      let atomIt = atoms.next();
      while (atomIt && !atomIt.done) {
        const atom = atomIt.value;
        try {
          if (isResettableAtom(atom.key)) {
            reset(atom);
          }
        } catch (err) {
          // console.error(err)
        }
        atomIt = atoms.next();
      }
      setFormState({ isSubmitting: false });
    },
    []
  );

  useEffect(() => {
    return () => {
      // DEVNOTE: Perhaps we only need this if RecoilRoot is outside the form library
      handleReset();
    };
  }, [handleReset]);

  const updateInitialValues = useCallback(
    (values, skipUnregister?) => {
      initValuesVer.current = initValuesVer.current + 1;
      setFormInitialValues(init => {
        if (skipUnregister === undefined) {
          return {
            values,
            version: init.version + 1,
            skipUnregister: init.skipUnregister,
          };
        }
        return { values, version: init.version + 1, skipUnregister };
      });
    },
    [setFormInitialValues]
  );

  useEffect(() => {
    // DEVNOTE: Version is 0 when initial values are not set
    if (initialValues && !initValuesVer.current) {
      updateInitialValues(initialValues ?? {}, skipUnregister);
    }
  }, [initialValues, updateInitialValues, skipUnregister]);

  const getValues = useRecoilCallback(
    ({ snapshot }) => () => {
      return getFormValues(snapshot).values;
    },
    []
  );

  const getExtraInfos = useRecoilCallback(
    ({ snapshot }) => () => {
      return getFormValues(snapshot).extraInfos;
    },
    []
  );

  const validateAllFields = useRecoilCallback(
    ({ snapshot, set }) => (values: any) => {
      const atoms = (snapshot as any).getNodes_UNSTABLE();
      const errors: IFieldError[] = [];
      let formFieldAtomsIt = atoms.next();
      while (formFieldAtomsIt && !formFieldAtomsIt.done) {
        const atom = formFieldAtomsIt.value;
        const fieldName = getNameFromAtomFamilyKey(atom.key);
        const fieldArrayName = getNameFromFieldArrayAtomFamilyKey(atom.key);
        if (fieldName) {
          const atomLoadable = snapshot.getLoadable(atom);
          if (atomLoadable.state === 'hasValue') {
            const formFieldData = atomLoadable.contents as IFieldAtomValue;
            const errorMsg = formFieldData.validate?.(
              formFieldData.data,
              values
            );
            if (errorMsg) {
              errors.push({ fieldName, error: errorMsg, type: 'field' });
            }
            set(atom, val =>
              Object.assign({}, val, { error: errorMsg, touched: true })
            );
          }
        } else if (fieldArrayName) {
          const atomLoadable = snapshot.getLoadable(atom);
          if (atomLoadable.state === 'hasValue') {
            const fieldArrayData = atomLoadable.contents as IFieldArrayAtomValue;
            if (fieldArrayData.validate) {
              const result: any[] = [];
              for (
                let index = 0;
                index < fieldArrayData.rowIds.length;
                index++
              ) {
                const rowId = fieldArrayData.rowIds[index];
                result.push({});
                for (let j = 0; j < fieldArrayData.fieldNames.length; j++) {
                  const fieldArrayFieldName = fieldArrayData.fieldNames[j];
                  const fieldId = getIdForArrayField(
                    fieldArrayName,
                    rowId,
                    fieldArrayFieldName
                  );
                  if (fieldId) {
                    const fieldLoadable = snapshot.getLoadable(
                      fieldsAtomFamily(fieldId)
                    );
                    if (fieldLoadable.state === 'hasValue') {
                      setPathInObj(
                        result[index],
                        fieldArrayFieldName,
                        fieldLoadable.contents?.data
                      );
                    }
                  }
                }
              }
              const errorMsg = fieldArrayData.validate?.(result, values);
              if (errorMsg) {
                errors.push({
                  fieldName: fieldArrayName,
                  error: errorMsg,
                  type: 'field-array',
                });
              }
              set(atom, val => Object.assign({}, val, { error: errorMsg }));
            } else if (fieldArrayData.error) {
              set(atom, val => Object.assign({}, val, { error: null }));
            }
          }
        }
        formFieldAtomsIt = atoms.next();
      }
      return errors;
    },
    []
  );

  const handleSubmit = useCallback(
    (e?: React.FormEvent<HTMLFormElement>) => {
      if (e && e.preventDefault) {
        e.preventDefault();
      }
      if (e && e.stopPropagation) {
        e.stopPropagation();
      }
      const values = getValues();
      const extraInfos = getExtraInfos();
      const errors = validateAllFields(values);
      const formErrors = validate?.(values);
      if (errors.length || formErrors?.length) {
        if (onError) {
          onError(errors, formErrors);
        }
        return;
      }
      setFormState({ isSubmitting: true });
      const res = submitForm
        ? submitForm(values, extraInfos)
        : onSubmit?.(values, extraInfos);
      if (res && res.then) {
        return res
          .then(() => {
            // DEVNOTE: Not resetting here and instead relying on the form component to be unmounted for reset
            // handleReset()
          })
          .catch(() => {
            // console.warn(`Warning: An unhandled error was caught from submitForm()`, reason)
          })
          .finally(() => {
            setFormState({ isSubmitting: false });
          });
      } else {
        // DEVNOTE: Not resetting here and instead relying on the form component to be unmounted for reset
        // handleReset()
        setFormState({ isSubmitting: false });
      }
      return res;
    },
    [
      submitForm,
      getValues,
      getExtraInfos,
      validateAllFields,
      onSubmit,
      onError,
      validate,
    ]
  );

  return {
    handleSubmit,
    formState,
    handleReset,
    resetInitialValues: updateInitialValues,
  };
}

function RecoilFormProvider(props: { children: any }) {
  // TODO: Add values to be passed into onSubmit
  return <Fragment>{props.children}</Fragment>;
}

interface FormProviderOptions {
  /**
   * Use this option only if you already have another <RecoilRoot> in your application
   */
  skipRecoilRoot?: boolean;
}

export function FormProvider(props: {
  children: any;
  options?: FormProviderOptions;
}) {
  if (props.options?.skipRecoilRoot) {
    return (
      <Fragment>
        <FormValuesObserver />
        <RecoilFormProvider {...props} />
      </Fragment>
    );
  }
  return (
    <RecoilRoot>
      <FormValuesObserver />
      <RecoilFormProvider {...props} />
    </RecoilRoot>
  );
}

export const withFormProvider = (
  Component: any,
  options?: FormProviderOptions
) => ({ ...props }) => (
  <FormProvider options={options}>
    <Component {...props} />
  </FormProvider>
);
