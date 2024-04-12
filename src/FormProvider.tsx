import React, {
  useCallback,
  useEffect,
  useState,
  Fragment,
  useRef,
  useContext,
} from 'react';
import {
  RecoilRoot,
  RecoilState,
  useRecoilTransaction_UNSTABLE,
  useRecoilState,
  useRecoilTransactionObserver_UNSTABLE,
  useRecoilValue,
  useSetRecoilState,
  useRecoilCallback,
  RecoilValue,
} from 'recoil';
import {
  combinedFieldAtomValues,
  fieldArrayColAtomValueSelectorFamily,
  fieldAtomFamily,
  formInitialValuesAtom,
  formValuesAtom,
  getFieldArrayDataAndExtraInfo,
  multipleFieldsSelectorFamily,
  resetFieldArrayRow,
  setFieldArrayDataAndExtraInfo,
} from './atoms';
import { generateFormId, getFullObjectPath, snapshotToGet } from './atomUtils';
import {
  IFieldArrayAtomValue,
  IFieldArrayColWatchParams,
  IFieldArrayProps,
  IFieldAtomValue,
  IFieldError,
  IFieldProps,
  IFieldWatchParams,
  IFormContextFieldInput,
  IIsDirtyProps,
  InitialValues,
  IRemoveFieldParams,
} from './types';
import {
  getPathInObj,
  setPathInObj,
  isDeepEqual,
  isUndefined,
  cloneDeep,
} from './utils';

function FormValuesObserver() {
  const formId = useContext(FormIdContext);
  const setFormValues = useSetRecoilState(formValuesAtom(formId));
  const [localFormValues, setLocalFormValues] = useState<any>({
    values: {},
    extraInfo: {},
  });

  useEffect(() => {
    setFormValues(localFormValues);
  }, [localFormValues, setFormValues]);

  useRecoilTransactionObserver_UNSTABLE(({ snapshot }) => {
    const get = (atom: RecoilValue<any>) => snapshot.getLoadable(atom).contents;
    const newValues = getFormValues(formId, get);
    if (!isDeepEqual(newValues, localFormValues)) {
      setLocalFormValues(newValues);
    }
  });
  return null;
}

// TODO: Check if useField should be rendered again when same params are passed again
export function useField<D = any, E = any>(props: IFieldProps<D>) {
  const {
    ancestors,
    name,
    validate,
    validateCallback,
    defaultValue,
    depFields,
    skipUnregister,
  } = props;
  const formId = useContext(FormIdContext);
  const initialValues = useRecoilValue(formInitialValuesAtom(formId));
  const [atomValue, setAtomValue] = useRecoilState(
    fieldAtomFamily({
      ancestors: ancestors ?? [],
      name,
      type: 'field',
      formId,
    }) as RecoilState<IFieldAtomValue<D, E>>
  );
  const oldOtherParamsRef = useRef<any>(null);
  const oldValueRef = useRef<any>(null);
  const oldTouchedRef = useRef<any>(false);
  const { data: fieldValue, extraInfo, error, touched } = atomValue;
  const depObjFields =
    depFields?.map((f) =>
      typeof f === 'string' ? { name: f, formId } : { ...f, formId }
    ) ?? [];
  // TODO: Memoize or change the params so that this hook doesn't render everytime useField is rendered
  const otherParams = useRecoilValue(
    multipleFieldsSelectorFamily(depObjFields)
  );

  const initializeFieldValue = useRecoilTransaction_UNSTABLE(
    ({ set, get }) =>
      () => {
        const initialValues = get(formInitialValuesAtom(formId));
        const fieldAtom = fieldAtomFamily({
          ancestors: ancestors ?? [],
          name,
          type: 'field',
          formId,
        });
        set(fieldAtom, (val) =>
          Object.assign({}, val, {
            validate,
            initVer: initialValues.version,
          } as Partial<IFieldAtomValue>)
        );
        if (initialValues.values) {
          //TODO: Add field array atoms depending on initial values
          if (!ancestors?.length) {
            const initialValue = getPathInObj(initialValues.values, name);
            const extraInfo = getPathInObj(initialValues.extraInfos, name);
            set(fieldAtom, {
              data: initialValue === undefined ? defaultValue : initialValue,
              error: undefined,
              extraInfo,
              validate,
              initVer: initialValues.version,
              touched: false,
              type: 'field',
            });
          }
        }
      },
    [name, defaultValue, validate, ancestors]
  );

  const resetField = useRecoilTransaction_UNSTABLE(
    ({ reset }) =>
      () => {
        // DEVNOTE: Not resetting the field if it is part of field array
        // since field array reset will reset those fields
        if (
          !skipUnregister &&
          !initialValues.settings?.skipUnregister &&
          !ancestors?.length
        ) {
          reset(
            fieldAtomFamily({
              name,
              ancestors: ancestors ?? [],
              type: 'field',
              formId,
            })
          );
        }
      },
    [skipUnregister, name, initialValues, ancestors]
  );

  useEffect(() => {
    if (atomValue.initVer < initialValues.version) {
      initializeFieldValue();
    } else if (validate && !atomValue.validate && !validateCallback) {
      setAtomValue((val) =>
        Object.assign({}, val, {
          validate,
        } as Partial<IFieldAtomValue>)
      );
    } else if (validateCallback && atomValue.validate !== validateCallback) {
      setAtomValue((val) =>
        Object.assign({}, val, {
          validate: validateCallback,
        } as Partial<IFieldAtomValue>)
      );
    } else if (
      atomValue.initVer === initialValues.version &&
      defaultValue !== undefined
    ) {
      // Useful for setting field value as default value inside field array
      setAtomValue((val) => {
        // null, '' and 0 are valid values so only if it's undefined, we set it as default value.
        if (val.data === undefined) {
          return Object.assign({}, val, { data: defaultValue });
        }
        return val;
      });
    }
  }, [
    initializeFieldValue,
    initialValues.version,
    atomValue.initVer,
    defaultValue,
    validate,
    validateCallback,
    atomValue.validate,
    setAtomValue,
  ]);

  useEffect(() => {
    return () => {
      resetField();
    };
  }, [resetField]);

  // Trigger field validation when value changes (for e.g. setValue)
  useEffect(() => {
    if (
      !isDeepEqual(oldOtherParamsRef.current, otherParams) ||
      !isDeepEqual(oldValueRef.current, fieldValue) ||
      (!oldTouchedRef.current && touched)
    ) {
      oldOtherParamsRef.current = otherParams;
      oldValueRef.current = fieldValue;
      oldTouchedRef.current = true;
      setAtomValue((val) => {
        const validateFn = validateCallback ?? val.validate;
        return Object.assign({}, val, {
          error: validateFn ? validateFn(fieldValue, otherParams) : undefined,
        });
      });
    }
  }, [fieldValue, otherParams, setAtomValue, validateCallback, touched]);

  return {
    fieldValue,
    initValueVer: atomValue.initVer,
    extraInfo,
    setFieldValue: useCallback(
      (data: D, extraInfo?: E) => {
        setAtomValue((val) =>
          Object.assign({}, val, {
            data,
            extraInfo,
          } as Partial<IFieldAtomValue>)
        );
      },
      [setAtomValue]
    ),
    error: touched ? error : undefined,
    onBlur: useCallback(
      () =>
        setAtomValue((val) =>
          val.touched ? val : Object.assign({}, val, { touched: true })
        ),
      [setAtomValue]
    ),
    touched,
  };
}

export function useFieldWatch(props: IFieldWatchParams) {
  const { fieldNames, formId: extFormId } = props;
  const contextFormId = useContext(FormIdContext);
  const formId = extFormId ?? contextFormId;
  const fieldNameParams =
    fieldNames?.map((f) =>
      typeof f === 'string' ? { name: f, formId } : { ...f, formId }
    ) ?? [];
  const selector = multipleFieldsSelectorFamily(fieldNameParams);
  const { values, extraInfos } = useRecoilValue(selector);
  return { values, extraInfos };
}

export function useFieldArrayColumnWatch(props: IFieldArrayColWatchParams) {
  const { fieldArrayName, fieldNames, formId: extFormId, ancestors } = props;
  const contextFormId = useContext(FormIdContext);
  const formId = extFormId ?? contextFormId;
  const selector = fieldArrayColAtomValueSelectorFamily({
    formId,
    ancestors,
    fieldArrayName,
    fieldNames,
  });
  const { values, extraInfos } = useRecoilValue(selector);
  return { values, extraInfos };
}

export function useIsDirty(options?: IIsDirtyProps) {
  const formId = useContext(FormIdContext);
  const { values: formValues } = useRecoilValue(formValuesAtom(formId));
  const { values: initialValues } = useRecoilValue(
    formInitialValuesAtom(formId)
  );
  const updatedFormValues = options?.preCompareUpdateFormValues
    ? options.preCompareUpdateFormValues(cloneDeep(formValues))
    : formValues;
  return !isDeepEqual(initialValues, updatedFormValues);
}

export function useFormValues(params?: { formId?: string }) {
  const { formId: overrideFormId } = params ?? {};
  const defaultFormId = useContext(FormIdContext);
  const formId = overrideFormId ?? defaultFormId;
  const { values: formValues } = useRecoilValue(formValuesAtom(formId));
  return formValues;
}

export function useFormValuesAndExtraInfos(params?: { formId?: string }) {
  const { formId: overrideFormId } = params ?? {};
  const defaultFormId = useContext(FormIdContext);
  const formId = overrideFormId ?? defaultFormId;
  const { values, extraInfos } = useRecoilValue(formValuesAtom(formId));
  return { values, extraInfos };
}

export function useInitialValues(params?: { formId?: string }) {
  const { formId: overrideFormId } = params ?? {};
  const defaultFormId = useContext(FormIdContext);
  const formId = overrideFormId ?? defaultFormId;
  const { values } = useRecoilValue(formInitialValuesAtom(formId));
  return values;
}

export function useFormContext(params?: { formId?: string }) {
  const { formId: overrideFormId } = params ?? {};
  const defaultFormId = useContext(FormIdContext);
  const formId = overrideFormId ?? defaultFormId;

  /**
   * This is helpful for setting multiple fields
   * Please note this does not include field array and it only works for fields without ancestors
   */
  const setFieldValues = useRecoilTransaction_UNSTABLE(
    ({ set, get }) =>
      (
        fieldValues: {
          name: string;
          value: any;
          extraInfo?: any;
        }[]
      ) => {
        for (const field of fieldValues) {
          const initialValues = get(
            formInitialValuesAtom(formId)
          ) as InitialValues;
          const newAtomData = {} as Partial<IFieldAtomValue>;
          if (field.value !== undefined) {
            newAtomData.data = field.value;
          }
          if (field.extraInfo !== undefined) {
            newAtomData.extraInfo = field.extraInfo;
          }
          const fieldKey: IFormContextFieldInput = {
            type: 'field',
            name: field.name,
            ancestors: [],
          };
          set(
            fieldAtomFamily({
              ancestors: fieldKey.ancestors ?? [],
              name: fieldKey.name,
              type: fieldKey.type,
              formId,
            }),
            (atomValue) => {
              const updatedAtomData = Object.assign({}, atomValue, newAtomData);
              // If field has not been mounted, this part will ensure that the setValue is not overridden by old initial values
              if (initialValues.version > updatedAtomData.initVer) {
                updatedAtomData.initVer = initialValues.version;
              }
              return updatedAtomData;
            }
          );
        }
      },
    []
  );

  const setValue = useRecoilCallback(
    ({ set, snapshot, reset }) =>
      (
        key: string | IFormContextFieldInput,
        newValue: { value?: any; extraInfo?: any }
      ) => {
        const get = snapshotToGet(snapshot);
        const initialValues = get(
          formInitialValuesAtom(formId)
        ) as InitialValues;
        const newAtomData = {} as Partial<IFieldAtomValue>;
        if (newValue.value !== undefined) {
          newAtomData.data = newValue.value;
        }
        if (newValue.extraInfo !== undefined) {
          newAtomData.extraInfo = newValue.extraInfo;
        }
        const fieldKey: IFormContextFieldInput =
          typeof key === 'string'
            ? { type: 'field', name: key, ancestors: [] }
            : key;
        // Note that validation will be triggered within the useField hook
        if (fieldKey.type === 'field') {
          set(
            fieldAtomFamily({
              ancestors: fieldKey.ancestors ?? [],
              name: fieldKey.name,
              type: fieldKey.type,
              formId,
            }),
            (atomValue) => {
              const updatedAtomData = Object.assign({}, atomValue, newAtomData);
              // If field has not been mounted, this part will ensure that the setValue is not overridden by old initial values
              if (initialValues.version > updatedAtomData.initVer) {
                updatedAtomData.initVer = initialValues.version;
              }
              return updatedAtomData;
            }
          );
        } else if (fieldKey.type === 'field-array') {
          setFieldArrayDataAndExtraInfo(
            formId,
            {
              ancestors: fieldKey.ancestors ?? [],
              name: fieldKey.name,
            },
            {
              get,
              set,
              reset,
              dataArr: newValue.value,
              extraInfoArr: newValue.extraInfo,
            }
          );
        }
      },
    [formId]
  );

  const getValue = useRecoilCallback(
    ({ snapshot }) =>
      (key: IFormContextFieldInput) => {
        const get = snapshotToGet(snapshot);
        if (key.type === 'field') {
          const fieldAtom = get(
            fieldAtomFamily({
              ancestors: key.ancestors ?? [],
              name: key.name,
              type: key.type,
              formId,
            })
          ) as IFieldAtomValue;
          const initialValuesAtom = get(
            formInitialValuesAtom(formId)
          ) as InitialValues;
          let value = fieldAtom.data;
          let extraInfo = fieldAtom.extraInfo;
          // Using initial value if field has not been mounted/initialized yet
          if (
            !key.ancestors?.length &&
            value === undefined &&
            fieldAtom.initVer < initialValuesAtom.version
          ) {
            value = getPathInObj(initialValuesAtom.values, key.name);
            extraInfo = getPathInObj(initialValuesAtom.extraInfos, key.name);
          }
          return { value, extraInfo };
        } else if (key.type === 'field-array') {
          const { data, extraInfo } = getFieldArrayDataAndExtraInfo(
            formId,
            {
              ancestors: key.ancestors ?? [],
              name: key.name,
            },
            get
          );
          return { value: data, extraInfo };
        }
        return null;
      },
    [formId]
  );

  const getValues = useRecoilCallback(
    ({ snapshot }) =>
      () => {
        const get = snapshotToGet(snapshot);
        return getFormValues(formId, get);
      },
    [formId]
  );

  const checkIsDirty = useRecoilCallback(
    ({ snapshot }) =>
      (options?: IIsDirtyProps) => {
        const get = snapshotToGet(snapshot);
        const { values } = getFormValues(formId, get);
        const initialValues = get(formInitialValuesAtom(formId))?.values;
        const updatedFormValues = options?.preCompareUpdateFormValues
          ? options.preCompareUpdateFormValues(values)
          : values;
        return !isDeepEqual(initialValues, updatedFormValues);
      },
    [formId]
  );

  const removeFields = useRecoilCallback(
    ({ reset }) =>
      (params: IRemoveFieldParams) => {
        for (const fieldName of params.fieldNames) {
          if (typeof fieldName === 'string') {
            reset(
              fieldAtomFamily({
                ancestors: [],
                formId,
                name: fieldName,
                type: 'field',
              })
            );
          } else {
            reset(
              fieldAtomFamily({
                ancestors: fieldName.ancestors ?? [],
                formId,
                name: fieldName.name,
                type: 'field',
              })
            );
          }
        }
      },
    [formId]
  );

  function resetDataAtoms(reset: (val: RecoilState<any>) => void) {
    if (formId) {
      if (combinedFieldAtomValues?.[formId]?.fields) {
        for (const field of Object.values(
          combinedFieldAtomValues[formId]?.fields ?? {}
        )) {
          reset(fieldAtomFamily(field.param));
        }
        combinedFieldAtomValues[formId].fields = {};
      }

      if (combinedFieldAtomValues?.[formId]?.fieldArrays) {
        for (const fieldArray of Object.values(
          combinedFieldAtomValues[formId]?.fieldArrays ?? {}
        )) {
          reset(fieldAtomFamily(fieldArray.param));
        }
        combinedFieldAtomValues[formId].fieldArrays = {};
      }
    }
  }

  const resetInitialValues = useRecoilTransaction_UNSTABLE(
    ({ set, get, reset }) =>
      (values?: any, extraInfos?: any) => {
        resetDataAtoms(reset);
        const existingVal = get(formInitialValuesAtom(formId));
        const newValues = values ?? existingVal.values;
        const newExtraInfos = extraInfos ?? existingVal.extraInfos;
        set(
          formInitialValuesAtom(formId),
          Object.assign({}, existingVal, {
            values: newValues,
            extraInfos: newExtraInfos,
            version: (existingVal.version ?? 0) + 1,
          })
        );
        set(formValuesAtom(formId), {
          values: newValues,
          extraInfos: newExtraInfos,
        });
      },
    [formId]
  );

  return {
    getValue,
    setValue,
    setFieldValues,
    getValues,
    checkIsDirty,
    removeFields,
    resetInitialValues,
  };
}

export function useFieldArray(props: IFieldArrayProps) {
  const {
    name,
    fieldNames,
    validate,
    skipUnregister,
    ancestors,
    defaultValue,
  } = props;
  const formId = useContext(FormIdContext);
  const initialValues = useRecoilValue(formInitialValuesAtom(formId));
  const prevFieldArrayValue = useRef<any>(null);
  const [fieldArrayProps, setFieldArrayProps] = useRecoilState(
    fieldAtomFamily({
      name,
      ancestors: ancestors ?? [],
      type: 'field-array',
      formId,
    }) as RecoilState<IFieldArrayAtomValue>
  );
  const fieldArrayValueForValidation = useFieldArrayColumnWatch({
    fieldArrayName: name,
    ancestors: ancestors ?? [],
    // undefined means all fields
    fieldNames: validate ? undefined : [],
  });
  // const otherParams = useMultipleWatch({ names: depFields ?? [] })

  const setFieldArrayValue = useRecoilTransaction_UNSTABLE(
    ({ get, set, reset }) =>
      (fieldValues: any[]) => {
        setFieldArrayDataAndExtraInfo(
          formId,
          { name, ancestors: ancestors ?? [] },
          {
            get,
            set,
            reset,
            dataArr: fieldValues,
          }
        );
      }
  );

  const validateData = useRecoilCallback(
    ({ snapshot, set }) =>
      () => {
        const get = (atom: RecoilValue<any>) => {
          return snapshot.getLoadable(atom).contents;
        };
        const { errors } = getFieldArrayDataAndExtraInfo(
          formId,
          { name, ancestors: ancestors ?? [] },
          get,
          {
            set,
            isValidation: true,
          }
        );
        if (errors) {
          for (const error of errors) {
            set(
              fieldAtomFamily({
                ancestors: error.ancestors,
                formId,
                name: error.name,
                type: error.type,
              }),
              (value) => {
                const updatedValue = Object.assign({}, value, {
                  error: error.error,
                  touched: true,
                });
                return updatedValue;
              }
            );
          }
        }
        return { errors, isValid: !errors?.length };
      },
    [name, fieldArrayProps, formId]
  );

  useEffect(() => {
    if (
      validate &&
      fieldArrayProps.initVer &&
      !isDeepEqual(
        fieldArrayValueForValidation?.values,
        prevFieldArrayValue.current?.values
      )
    ) {
      prevFieldArrayValue.current = fieldArrayValueForValidation;
      const error = validate(fieldArrayValueForValidation?.values ?? []);
      setFieldArrayProps((d) => Object.assign({}, d, { error }));
    }
  }, [
    fieldArrayValueForValidation,
    setFieldArrayProps,
    validate,
    fieldArrayProps.initVer,
  ]);

  const getFieldArrayValue = useRecoilCallback(
    ({ snapshot }) =>
      () => {
        const get = snapshotToGet(snapshot);
        return getFieldArrayDataAndExtraInfo(
          formId,
          { name, ancestors: ancestors ?? [] },
          get
        ).data;
      },
    [name, ancestors, formId]
  );

  const remove = useRecoilTransaction_UNSTABLE(
    ({ set, get, reset }) =>
      (index: number) => {
        const fieldArrayAtomValue = get(
          fieldAtomFamily({
            ancestors: ancestors ?? [],
            name,
            type: 'field-array',
            formId,
          })
        ) as IFieldArrayAtomValue;
        let rowIdToRemove = fieldArrayAtomValue.rowIds[index];
        if (rowIdToRemove !== null) {
          resetFieldArrayRow(
            formId,
            { name, rowId: rowIdToRemove, ancestors: ancestors ?? [] },
            get,
            reset
          );
          const tempRowIds = [...fieldArrayAtomValue.rowIds];
          tempRowIds.splice(index, 1);
          set(
            fieldAtomFamily({
              ancestors: ancestors ?? [],
              name,
              type: 'field-array',
              formId,
            }),
            (existingValue) =>
              Object.assign({}, existingValue, {
                rowIds: tempRowIds,
              })
          );
        }
      },
    [name, ancestors, formId]
  );

  const removeAll = useRecoilTransaction_UNSTABLE(
    ({ get, set, reset }) =>
      () => {
        const fieldArrayAtomValue = get(
          fieldAtomFamily({
            name,
            ancestors: ancestors ?? [],
            type: 'field-array',
            formId,
          })
        ) as IFieldArrayAtomValue;
        const rowIds = fieldArrayAtomValue.rowIds;
        for (const rowId of rowIds) {
          resetFieldArrayRow(
            formId,
            { name, rowId, ancestors: ancestors ?? [] },
            get,
            reset
          );
        }
        set(
          fieldAtomFamily({
            name,
            ancestors: ancestors ?? [],
            type: 'field-array',
            formId,
          }),
          Object.assign({}, fieldArrayAtomValue, {
            rowIds: [],
          })
        );
      },
    [name, ancestors, formId]
  );

  const append = useRecoilTransaction_UNSTABLE(
    ({ set, get, reset }) =>
      (...rows: any[]) => {
        setFieldArrayDataAndExtraInfo(
          formId,
          { name, ancestors: ancestors ?? [] },
          {
            get,
            set,
            reset,
            dataArr: rows,
            mode: { type: 'insert' },
          }
        );
      },
    [name, fieldNames, formId]
  );

  const insert = useRecoilTransaction_UNSTABLE(
    ({ set, get, reset }) =>
      (index: number, ...rows: any[]) => {
        setFieldArrayDataAndExtraInfo(
          formId,
          { name, ancestors: ancestors ?? [] },
          {
            get,
            set,
            reset,
            dataArr: rows,
            mode: { type: 'insert', rowIndex: index },
          }
        );
      },
    [fieldArrayProps.rowIds, name, formId]
  );

  const initializeFieldArrayValue = useRecoilTransaction_UNSTABLE(
    ({ set, get, reset }) =>
      () => {
        const initialValues = get(formInitialValuesAtom(formId));
        const objPath = getFullObjectPath(
          {
            name,
            ancestors: ancestors ?? [],
            type: 'field-array',
            formId,
          },
          get
        );
        const initialValue =
          getPathInObj(initialValues.values, objPath) ?? defaultValue;
        const extraInfo = getPathInObj(initialValues.extraInfos, objPath);
        prevFieldArrayValue.current = {
          values: initialValue ?? [],
          extraInfos: extraInfo ?? [],
        };
        set(
          fieldAtomFamily({
            name,
            ancestors: ancestors ?? [],
            type: 'field-array',
            formId,
          }),
          (val) =>
            Object.assign({}, val, {
              validate,
              fieldNames,
              initVer: initialValues.version,
              skipUnregister,
            } as Partial<IFieldArrayAtomValue>)
        );
        if (initialValue?.length) {
          setFieldArrayDataAndExtraInfo(
            formId,
            { name, ancestors: ancestors ?? [] },
            {
              get,
              set,
              reset,
              dataArr: initialValue,
              extraInfoArr: extraInfo,
              initialValuesVersion: initialValues.version,
              skipRecursion: true,
            }
          );
        }
      },
    [name, validate, fieldNames, ancestors, skipUnregister, formId]
  );

  const resetFieldArray = useRecoilTransaction_UNSTABLE(
    ({ reset, get }) =>
      (name: string) => {
        const topAncestor = ancestors?.[0];
        if (topAncestor) {
          const topAncestorVal = get(
            fieldAtomFamily({
              ancestors: [],
              name: topAncestor.name,
              type: 'field-array',
              formId,
            })
          ) as IFieldArrayAtomValue;
          if (topAncestorVal.skipUnregister) {
            // If top field array has skip unregister, then all field arrays/fields below should follow
            return;
          }
        }
        const fieldArrayAtom = fieldAtomFamily({
          ancestors: ancestors ?? [],
          name,
          type: 'field-array',
          formId,
        });
        const value = get(fieldArrayAtom);
        const fieldArrayAtomValue = value as IFieldArrayAtomValue;
        if (!skipUnregister && !initialValues.settings?.skipUnregister) {
          for (const rowId of fieldArrayAtomValue.rowIds) {
            resetFieldArrayRow(
              formId,
              { name, ancestors: ancestors ?? [], rowId },
              get,
              reset
            );
          }
          reset(fieldArrayAtom);
        }
      },
    [skipUnregister, initialValues, formId]
  );

  useEffect(() => {
    if (fieldArrayProps.initVer < initialValues.version) {
      initializeFieldArrayValue();
    }
  }, [initializeFieldArrayValue, initialValues, fieldArrayProps.initVer]);

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
    removeAll,
    getFieldArrayValue,
    setFieldArrayValue,
    error: fieldArrayProps?.error,
  };
}

interface IFormProps {
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

const getFormValues = (formId: string, get: (val: RecoilValue<any>) => any) => {
  const initialValues = get(formInitialValuesAtom(formId)) as InitialValues;
  const values: any =
    !initialValues.settings?.skipUnusedInitialValues && initialValues.values
      ? cloneDeep(initialValues.values)
      : {};
  const extraInfos: any =
    !initialValues.settings?.skipUnusedInitialValues && initialValues.extraInfos
      ? cloneDeep(initialValues.extraInfos)
      : {};
  const fieldArrays = combinedFieldAtomValues[formId]
    ? Object.values(combinedFieldAtomValues[formId]?.fieldArrays ?? {})
    : [];
  // Don't preserve initial values for top level field arrays.
  // One problem with preserving initial values here is that removed rows come back.
  for (const fieldArray of fieldArrays) {
    if (!fieldArray.param.ancestors?.length) {
      setPathInObj(values, fieldArray.param.name, undefined);
    }
  }
  const fields = combinedFieldAtomValues[formId]
    ? Object.values(combinedFieldAtomValues[formId]?.fields ?? {})
    : [];
  for (const fieldAtomValue of fields) {
    const ancestors = fieldAtomValue.param.ancestors;
    let pathAncestors: { name: string; index: number }[] = [];
    if (ancestors.length) {
      for (let i = 0; i < ancestors.length; i++) {
        const fieldArray = fieldArrays.find((f) => {
          if (f.param.name === ancestors[i].name) {
            for (let j = 0; j < i; j++) {
              if (
                f.param.ancestors?.[j]?.name !== ancestors[j].name ||
                f.param.ancestors?.[j]?.rowId !== ancestors[j].rowId
              ) {
                return false;
              }
            }
            return true;
          }
          return false;
        });
        if (fieldArray) {
          pathAncestors.push({
            name: fieldArray.param.name,
            index: fieldArray.atomValue.rowIds.findIndex(
              (rid) => ancestors[i].rowId === rid
            ),
          });
        }
      }
    }
    const data = fieldAtomValue.atomValue.data;
    const extraInfo = fieldAtomValue.atomValue.extraInfo;
    if (!isUndefined(data)) {
      setPathInObj(values, fieldAtomValue.param.name, data, pathAncestors);
    }
    if (!isUndefined(extraInfo)) {
      setPathInObj(
        extraInfos,
        fieldAtomValue.param.name,
        extraInfo,
        pathAncestors
      );
    }
  }
  return { values, extraInfos };
};

export function useForm(props: IFormProps) {
  const {
    initialValues,
    onError,
    onSubmit,
    skipUnregister,
    validate,
    skipUnusedInitialValues,
  } = props;
  const [formState, setFormState] = useState<{ isSubmitting: boolean }>({
    isSubmitting: false,
  });
  const formId = useContext(FormIdContext);
  const initValuesVer = useRef(0);
  const isFormMounted = useRef(false);

  function resetDataAtoms(reset: (val: RecoilState<any>) => void) {
    if (formId) {
      if (combinedFieldAtomValues?.[formId]?.fields) {
        for (const field of Object.values(
          combinedFieldAtomValues[formId]?.fields ?? {}
        )) {
          reset(fieldAtomFamily(field.param));
        }
        combinedFieldAtomValues[formId].fields = {};
      }

      if (combinedFieldAtomValues?.[formId]?.fieldArrays) {
        for (const fieldArray of Object.values(
          combinedFieldAtomValues[formId]?.fieldArrays ?? {}
        )) {
          reset(fieldAtomFamily(fieldArray.param));
        }
        combinedFieldAtomValues[formId].fieldArrays = {};
      }
    }
  }

  const handleReset = useRecoilTransaction_UNSTABLE(
    ({ reset }) =>
      () => {
        resetDataAtoms(reset);
      },
    [formId]
  );

  useEffect(() => {
    isFormMounted.current = true;
    return () => {
      isFormMounted.current = false;
      handleReset();
    };
  }, [handleReset]);

  const updateInitialValues = useRecoilTransaction_UNSTABLE(
    ({ set, get, reset }) =>
      (
        values?: any,
        settings?: {
          skipUnregister?: boolean;
          skipUnusedInitialValues?: boolean;
        },
        extraInfos?: any
      ) => {
        resetDataAtoms(reset);
        const existingVal = get(formInitialValuesAtom(formId));
        initValuesVer.current = (existingVal.version ?? 0) + 1;
        const newValues = values ?? existingVal.values;
        const newExtraInfos = extraInfos ?? existingVal.extraInfos;
        set(
          formInitialValuesAtom(formId),
          Object.assign({}, existingVal, {
            values: newValues,
            extraInfos: newExtraInfos,
            version: (existingVal?.version ?? 0) + 1,
            settings: {
              skipUnregister:
                settings?.skipUnregister ??
                existingVal.settings?.skipUnregister,
              skipUnusedInitialValues:
                settings?.skipUnusedInitialValues ??
                existingVal.settings?.skipUnusedInitialValues,
            },
          })
        );
        set(formValuesAtom(formId), {
          values: newValues,
          extraInfos: newExtraInfos,
        });
      },
    [formId]
  );

  const resetInitialValues = useCallback(
    (values?: any, extraInfos?: any) => {
      updateInitialValues(values, undefined, extraInfos);
    },
    [updateInitialValues]
  );

  useEffect(() => {
    // DEVNOTE: Version is 0 when initial values are not set
    if (!initValuesVer.current) {
      updateInitialValues(
        initialValues ?? {},
        { skipUnregister, skipUnusedInitialValues },
        undefined
      );
    }
  }, [
    updateInitialValues,
    skipUnregister,
    skipUnusedInitialValues,
    initialValues,
  ]);

  const getValuesAndExtraInfo = useRecoilCallback(
    ({ snapshot }) =>
      () => {
        const get = (atom: RecoilValue<any>) =>
          snapshot.getLoadable(atom).contents;
        return getFormValues(formId, get);
      },
    []
  );

  const validateFields = useRecoilCallback(
    ({ set, snapshot }) =>
      (fieldNames?: (string | IFormContextFieldInput)[]) => {
        const extValues = getValuesAndExtraInfo();
        const errors: IFieldError[] = [];
        const get = (atom: RecoilValue<any>) =>
          snapshot.getLoadable(atom).contents;
        const combinedFieldArrays = Object.values(
          combinedFieldAtomValues[formId]?.fieldArrays ?? {}
        );
        if (fieldNames?.length) {
          for (const fieldName of fieldNames) {
            let field: IFormContextFieldInput | null = null;
            if (typeof fieldName === 'string') {
              const fieldArr = combinedFieldArrays.find(
                (c) => c.param.name === fieldName && !c.param.ancestors.length
              );
              if (fieldArr) {
                field = {
                  name: fieldName,
                  ancestors: [],
                  type: 'field-array',
                };
              } else {
                field = {
                  name: fieldName,
                  ancestors: [],
                  type: 'field',
                };
              }
            } else {
              field = fieldName;
            }
            if (field.type === 'field') {
              const name = field.name;
              const ancestors = field.ancestors ?? [];
              const fieldAtom = fieldAtomFamily({
                name,
                type: 'field',
                ancestors: ancestors ?? [],
                formId,
              });
              const formFieldData = get(fieldAtom) as IFieldAtomValue;
              const errorMsg = formFieldData.validate?.(
                formFieldData.data,
                extValues
              );
              if (errorMsg) {
                set(fieldAtom, (val) =>
                  Object.assign({}, val, { error: errorMsg, touched: true })
                );
                errors.push({
                  error: errorMsg,
                  ancestors: ancestors ?? [],
                  name,
                  type: 'field',
                });
              }
            } else {
              const { errors: fieldArrayErrors } =
                getFieldArrayDataAndExtraInfo(
                  formId,
                  {
                    ancestors: field.ancestors ?? [],
                    name: field.name,
                  },
                  get,
                  {
                    isValidation: true,
                    set,
                  }
                );
              if (fieldArrayErrors?.length) {
                errors.push(...fieldArrayErrors);
                for (const errorInfo of fieldArrayErrors) {
                  if (errorInfo.type === 'field') {
                    const fieldAtom = fieldAtomFamily({
                      name: errorInfo.name,
                      type: 'field',
                      ancestors: errorInfo.ancestors ?? [],
                      formId,
                    });
                    set(fieldAtom, (val) =>
                      Object.assign({}, val, {
                        error: errorInfo.error,
                        touched: true,
                      })
                    );
                  }
                }
              }
            }
          }
        }
        return errors;
      },
    [formId]
  );

  const validateAllFieldsInternal = useRecoilCallback(
    ({ snapshot, set }) =>
      (values: any, extraInfos: any) => {
        const get = (atom: RecoilValue<any>) =>
          snapshot.getLoadable(atom).contents;
        const errors: IFieldError[] = [];
        for (const fieldAtomInfo of Object.values(
          combinedFieldAtomValues[formId]?.fields ?? {}
        )) {
          const fieldAtom = fieldAtomFamily(fieldAtomInfo.param);
          const formFieldData = get(fieldAtom) as IFieldAtomValue;
          const errorMsg = formFieldData.validate?.(formFieldData.data, {
            values,
            extraInfos,
          });
          if (errorMsg) {
            set(fieldAtom, (val) =>
              Object.assign({}, val, { error: errorMsg, touched: true })
            );
            errors.push({
              error: errorMsg,
              ancestors: fieldAtomInfo.param.ancestors,
              name: fieldAtomInfo.param.name,
              type: 'field',
            });
          }
        }
        for (const fieldArrayAtomInfo of Object.values(
          combinedFieldAtomValues[formId]?.fieldArrays ?? {}
        )) {
          const { errors: fieldArrayErrors } = getFieldArrayDataAndExtraInfo(
            formId,
            fieldArrayAtomInfo.param,
            get,
            {
              isValidation: true,
              set,
              skipFieldCheck: true,
            }
          );
          if (fieldArrayErrors?.length) {
            errors.push(...fieldArrayErrors);
          }
        }
        return errors;
      },
    [formId]
  );

  const handleSubmit = useCallback(
    (e?: React.FormEvent<HTMLFormElement>) => {
      if (e && e.preventDefault) {
        e.preventDefault();
      }
      if (e && e.stopPropagation) {
        e.stopPropagation();
      }
      const { values, extraInfos } = getValuesAndExtraInfo();
      const errors = validateAllFieldsInternal(values, extraInfos);
      const formErrors = validate?.(values);
      if (errors.length || formErrors?.length) {
        if (onError) {
          onError(errors, formErrors, values);
        }
        return;
      }
      setFormState({ isSubmitting: true });
      const res = onSubmit?.(values, extraInfos);
      if (res && res.then) {
        return res
          .then((isSuccess?: boolean) => {
            if (isFormMounted.current) {
              // Assuming isSuccess to be true by default
              if (isSuccess !== false) {
                // Make initial values same as final values in order to set isDirty as false after submit
                updateInitialValues(
                  props?.reinitializeOnSubmit ? initialValues ?? {} : values,
                  { skipUnregister, skipUnusedInitialValues },
                  props?.reinitializeOnSubmit ? {} : extraInfos
                );
              }
              setFormState({ isSubmitting: false });
            }
          })
          .catch(() => {
            if (isFormMounted) {
              setFormState({ isSubmitting: false });
              // console.warn(
              //   `Warning: An unhandled error was caught from onSubmit()`,
              //   err
              // );
            }
          });
      } else {
        setFormState({ isSubmitting: false });
        updateInitialValues(
          props?.reinitializeOnSubmit ? initialValues ?? {} : values,
          { skipUnregister, skipUnusedInitialValues },
          props?.reinitializeOnSubmit ? {} : extraInfos
        );
      }
      return res;
    },
    [
      validateAllFieldsInternal,
      onSubmit,
      onError,
      validate,
      updateInitialValues,
      skipUnregister,
      formId,
      getValuesAndExtraInfo,
    ]
  );

  const validateAllFields = useCallback(() => {
    const { values, extraInfos } = getValuesAndExtraInfo();
    const errors = validateAllFieldsInternal(values, extraInfos);
    return errors;
  }, [getValuesAndExtraInfo, validateAllFieldsInternal]);

  return {
    handleSubmit,
    formState,
    handleReset,
    resetInitialValues,
    validateFields,
    validateAllFields,
    getValues: getValuesAndExtraInfo,
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
  /**
   * Skip dirty check and real-time observer for form values. This can result in better performance in some cases.
   */
  skipValuesObserver?: boolean;
  /**
   * This only needs to be specified for advanced cases where you want to watch fields outside the current hierarchy.
   * Note that skipRecoilRoot should also be set to true for this use case.
   */
  formId?: string;
}

const FormIdContext = React.createContext('');

export function FormProvider(props: {
  children: any;
  options?: FormProviderOptions;
}) {
  const formId = useRef<string>(props?.options?.formId ?? generateFormId());

  useEffect(() => {
    const currentFormId = formId.current;
    return () => {
      delete combinedFieldAtomValues[currentFormId];
    };
  }, []);

  return (
    <RecoilRoot override={!props.options?.skipRecoilRoot}>
      <FormIdContext.Provider value={formId.current}>
        {props.options?.skipValuesObserver ? null : <FormValuesObserver />}
        <RecoilFormProvider {...props} />
      </FormIdContext.Provider>
    </RecoilRoot>
  );
}

export const withFormProvider =
  (Component: any, options?: FormProviderOptions) =>
  ({ ...props }) =>
    (
      <FormProvider options={options}>
        <Component {...props} />
      </FormProvider>
    );
