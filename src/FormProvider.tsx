import React, {
  useCallback,
  useEffect,
  useState,
  Fragment,
  useRef,
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
  getFormId,
  multipleFieldsSelectorFamily,
  resetFieldArrayRow,
  setFieldArrayDataAndExtraInfo,
} from './atoms';
import { generateFormId, getFullObjectPath, snapshotToGet } from './atomUtils';
import {
  IFieldArrayAtomValue,
  IFieldArrayColWatchParams,
  IFieldArrayProps,
  IFieldAtomSelectorInput,
  IFieldAtomValue,
  IFieldError,
  IFieldProps,
  IFieldWatchParams,
  IFormContextFieldInput,
  IIsDirtyProps,
  InitialValues,
} from './types';
import {
  getPathInObj,
  setPathInObj,
  isDeepEqual,
  isUndefined,
  cloneDeep,
} from './utils';

function FormValuesObserver() {
  const setFormValues = useSetRecoilState(formValuesAtom);
  const [localFormValues, setLocalFormValues] = useState<any>({
    values: {},
    extraInfo: {},
  });

  useEffect(() => {
    setFormValues(localFormValues);
  }, [localFormValues, setFormValues]);

  useRecoilTransactionObserver_UNSTABLE(({ snapshot }) => {
    const get = (atom: RecoilValue<any>) => snapshot.getLoadable(atom).contents;
    const newValues = getFormValues(get);
    if (!isDeepEqual(newValues, localFormValues)) {
      setLocalFormValues(newValues);
    }
  });
  return null;
}

// TODO: Check if useField should be rendered again when same params are passed again
export function useField<D = any, E = any>(props: IFieldProps<D>) {
  const { ancestors, name, validate, defaultValue, depFields, skipUnregister } =
    props;
  const initialValues = useRecoilValue(formInitialValuesAtom);
  const [atomValue, setAtomValue] = useRecoilState(
    fieldAtomFamily({
      ancestors: ancestors ?? [],
      name,
      type: 'field',
      formId: initialValues.formId,
    }) as RecoilState<IFieldAtomValue<D, E>>
  );
  const oldOtherParamsRef = useRef<any>(null);
  const { data: fieldValue, extraInfo, error, touched } = atomValue;

  // TODO: Memoize or change the params so that this hook doesn't render everytime useField is rendered
  const otherParams = useRecoilValue(
    multipleFieldsSelectorFamily(depFields ?? [])
  );

  const initializeFieldValue = useRecoilTransaction_UNSTABLE(
    ({ set, get }) =>
      () => {
        const initialValues = get(formInitialValuesAtom);
        const fieldAtom = fieldAtomFamily({
          ancestors: ancestors ?? [],
          name,
          type: 'field',
          formId: initialValues.formId,
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
              data: initialValue ?? defaultValue ?? undefined,
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
          !initialValues.skipUnregister &&
          !ancestors?.length
        ) {
          reset(
            fieldAtomFamily({
              name,
              ancestors: ancestors ?? [],
              type: 'field',
              formId: initialValues.formId,
            })
          );
        }
      },
    [skipUnregister, name, initialValues, ancestors]
  );

  useEffect(() => {
    if (atomValue.initVer < initialValues.version) {
      initializeFieldValue();
    } else if (validate && !atomValue.validate) {
      setAtomValue((val) =>
        Object.assign({}, val, {
          validate,
        } as Partial<IFieldAtomValue>)
      );
    } else if (atomValue.initVer === initialValues.version && defaultValue) {
      // Useful for setting field value as default value inside field array
      setAtomValue((val) => {
        if (!val.data) {
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
    atomValue.validate,
    setAtomValue,
  ]);

  useEffect(() => {
    return () => {
      resetField();
    };
  }, [resetField]);

  useEffect(() => {
    if (
      !oldOtherParamsRef.current ||
      !isDeepEqual(oldOtherParamsRef.current, otherParams)
    ) {
      oldOtherParamsRef.current = otherParams;
      setAtomValue((val) =>
        Object.assign({}, val, {
          error: validate ? validate(val.data, otherParams) : undefined,
        })
      );
    }
  }, [otherParams, validate, setAtomValue]);

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
            error: validate ? validate(data, otherParams) : undefined,
          } as Partial<IFieldAtomValue>)
        );
      },
      [otherParams, validate, setAtomValue]
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
  const { fieldNames } = props;
  const selector = multipleFieldsSelectorFamily(fieldNames);
  const { values, extraInfos } = useRecoilValue(selector);
  return { values, extraInfos };
}

export function useFieldArrayColumnWatch(props: IFieldArrayColWatchParams) {
  const { fieldArrayName, fieldNames } = props;
  const selector = fieldArrayColAtomValueSelectorFamily({
    fieldArrayName,
    fieldNames,
  });
  const { values, extraInfos } = useRecoilValue(selector);
  return { values, extraInfos };
}

export function useIsDirty(options?: IIsDirtyProps) {
  const { values: formValues } = useRecoilValue(formValuesAtom);
  const { values: initialValues } = useRecoilValue(formInitialValuesAtom);
  const updatedFormValues = options?.preCompareUpdateFormValues
    ? options.preCompareUpdateFormValues(cloneDeep(formValues))
    : formValues;
  return !isDeepEqual(initialValues, updatedFormValues);
}

export function useFormValues() {
  const { values: formValues } = useRecoilValue(formValuesAtom);
  return formValues;
}

export function useFormContext() {
  const setValue = useRecoilCallback(
    ({ set, snapshot, reset }) =>
      (
        key: IFormContextFieldInput,
        newValue: { value?: any; extraInfo?: any }
      ) => {
        const get = snapshotToGet(snapshot);
        const formId = getFormId(get);
        const newAtomData = {} as Partial<IFieldAtomValue>;
        if (newValue.value !== undefined) {
          newAtomData.data = newValue.value;
        }
        if (newValue.extraInfo !== undefined) {
          newAtomData.extraInfo = newValue.extraInfo;
        }
        if (key.type === 'field') {
          set(
            fieldAtomFamily({
              ancestors: key.ancestors ?? [],
              name: key.name,
              type: key.type,
              formId,
            }),
            (atomValue) => Object.assign({}, atomValue, newAtomData)
          );
        } else if (key.type === 'field-array') {
          setFieldArrayDataAndExtraInfo(
            {
              ancestors: key.ancestors ?? [],
              name: key.name,
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
    []
  );

  const getValue = useRecoilCallback(
    ({ snapshot }) =>
      (key: IFormContextFieldInput) => {
        const get = snapshotToGet(snapshot);
        const formId = getFormId(get);
        if (key.type === 'field') {
          const fieldAtom = get(
            fieldAtomFamily({
              ancestors: key.ancestors ?? [],
              name: key.name,
              type: key.type,
              formId,
            })
          ) as IFieldAtomValue;
          return { value: fieldAtom.data, extraInfo: fieldAtom.extraInfo };
        } else if (key.type === 'field-array') {
          const { data, extraInfo } = getFieldArrayDataAndExtraInfo(
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
    []
  );

  const getValues = useRecoilCallback<any, any>(
    ({ snapshot }) =>
      () => {
        const get = snapshotToGet(snapshot);
        return getFormValues(get);
      },
    []
  );

  const checkIsDirty = useRecoilCallback<any, any>(
    ({ snapshot }) =>
      (options?: IIsDirtyProps) => {
        const get = snapshotToGet(snapshot);
        const { values } = getFormValues(get);
        const initialValues = get(formInitialValuesAtom)?.values;
        const updatedFormValues = options?.preCompareUpdateFormValues
          ? options.preCompareUpdateFormValues(values)
          : values;
        return !isDeepEqual(initialValues, updatedFormValues);
      }
  );

  return { getValue, setValue, getValues, checkIsDirty };
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
  const initialValues = useRecoilValue(formInitialValuesAtom);
  const fieldArrayProps = useRecoilValue(
    fieldAtomFamily({
      name,
      ancestors: ancestors ?? [],
      type: 'field-array',
      formId: initialValues.formId,
    }) as RecoilState<IFieldArrayAtomValue>
  );

  // const otherParams = useMultipleWatch({ names: depFields ?? [] })

  const setFieldArrayValue = useRecoilTransaction_UNSTABLE(
    ({ get, set, reset }) =>
      (fieldValues: any[]) => {
        setFieldArrayDataAndExtraInfo(
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
        const get = (atom: RecoilValue<any>) =>
          snapshot.getLoadable(atom).contents;
        const { errors } = getFieldArrayDataAndExtraInfo(
          { name, ancestors: ancestors ?? [] },
          get,
          {
            set,
            isValidation: true,
          }
        );
        return { errors, isValid: !errors?.length };
      },
    [name, fieldArrayProps]
  );

  const getFieldArrayValue = useRecoilCallback(
    ({ snapshot }) =>
      () => {
        const get = snapshotToGet(snapshot);
        return getFieldArrayDataAndExtraInfo(
          { name, ancestors: ancestors ?? [] },
          get
        ).data;
      },
    [name, ancestors]
  );

  const remove = useRecoilTransaction_UNSTABLE(
    ({ set, get, reset }) =>
      (index: number) => {
        const formId = getFormId(get);
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
    [name, ancestors]
  );

  const removeAll = useRecoilTransaction_UNSTABLE(
    ({ get, set, reset }) =>
      () => {
        const formId = getFormId(get);
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
    [name, ancestors]
  );

  const append = useRecoilTransaction_UNSTABLE(
    ({ set, get, reset }) =>
      (...rows: any[]) => {
        setFieldArrayDataAndExtraInfo(
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
    [name, fieldNames]
  );

  const insert = useRecoilTransaction_UNSTABLE(
    ({ set, get, reset }) =>
      (index: number, ...rows: any[]) => {
        setFieldArrayDataAndExtraInfo(
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
    [fieldArrayProps.rowIds, name]
  );

  const initializeFieldArrayValue = useRecoilTransaction_UNSTABLE(
    ({ set, get, reset }) =>
      () => {
        const initialValues = get(formInitialValuesAtom);
        const objPath = getFullObjectPath(
          {
            name,
            ancestors: ancestors ?? [],
            type: 'field-array',
            formId: initialValues.formId,
          },
          get
        );
        const initialValue =
          getPathInObj(initialValues.values, objPath) ?? defaultValue;
        const extraInfo = getPathInObj(initialValues.extraInfos, objPath);
        set(
          fieldAtomFamily({
            name,
            ancestors: ancestors ?? [],
            type: 'field-array',
            formId: initialValues.formId,
          }),
          (val) =>
            Object.assign({}, val, {
              validate,
              fieldNames,
              initVer: initialValues.version,
              skipUnregister,
            } as Partial<IFieldArrayAtomValue>)
        );
        // Values are only initialized for fields or field arrays without ancestors
        if (!ancestors?.length && initialValue?.length) {
          setFieldArrayDataAndExtraInfo(
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
    [name, validate, fieldNames, ancestors, skipUnregister]
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
              formId: initialValues.formId,
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
          formId: initialValues.formId,
        });
        const value = get(fieldArrayAtom);
        const fieldArrayAtomValue = value as IFieldArrayAtomValue;
        if (!skipUnregister && !initialValues.skipUnregister) {
          for (const rowId of fieldArrayAtomValue.rowIds) {
            resetFieldArrayRow(
              { name, ancestors: ancestors ?? [], rowId },
              get,
              reset
            );
          }
          reset(fieldArrayAtom);
        }
      },
    [skipUnregister, initialValues]
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
}

const getFormValues = (get: (val: RecoilValue<any>) => any) => {
  const values: any = {};
  const extraInfos: any = {};
  const initialValues = get(formInitialValuesAtom) as InitialValues;
  const formId = initialValues.formId;
  const fieldArrays = combinedFieldAtomValues[formId]
    ? Object.values(combinedFieldAtomValues[formId].fieldArrays)
    : [];
  const fields = combinedFieldAtomValues[formId]
    ? Object.values(combinedFieldAtomValues[formId].fields)
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
                f.param.ancestors[j].name !== ancestors[j].name ||
                f.param.ancestors[j].rowId !== ancestors[j].rowId
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
  const { initialValues, onError, onSubmit, skipUnregister, validate } = props;
  const [formState, setFormState] = useState<{ isSubmitting: boolean }>({
    isSubmitting: false,
  });
  const initValuesVer = useRef(0);

  function resetDataAtoms(
    reset: (val: RecoilState<any>) => void,
    get: (val: RecoilValue<any>) => any
  ) {
    const formId = getFormId(get);
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
    ({ reset, get }) =>
      (deleteFormId: boolean = false) => {
        resetDataAtoms(reset, get);
        if (deleteFormId) {
          const formId = getFormId(get);
          delete combinedFieldAtomValues[formId];
        }
      },
    []
  );

  useEffect(() => {
    return () => {
      handleReset(true);
    };
  }, [handleReset]);

  const updateInitialValues = useRecoilTransaction_UNSTABLE(
    ({ set, get }) =>
      (
        values?: any,
        skipUnregister?: boolean,
        extraInfos?: any,
        formId?: string
      ) => {
        // if (!skipUnregister) {
        //   resetDataAtoms(reset, get);
        // }
        initValuesVer.current = initValuesVer.current + 1;
        const existingVal = get(formInitialValuesAtom);
        const newValues = values ?? existingVal.values;
        const newExtraInfos = extraInfos ?? existingVal.extraInfos;
        set(formInitialValuesAtom, () =>
          Object.assign({}, existingVal, {
            formId: formId ?? existingVal.formId,
            values: newValues,
            extraInfos: newExtraInfos,
            version: initValuesVer.current,
            skipUnregister: skipUnregister ?? existingVal.skipUnregister,
          })
        );
        set(formValuesAtom, { values: newValues, extraInfos: newExtraInfos });
      },
    []
  );

  const resetInitialValues = useCallback((values?: any, extraInfos?: any) => {
    updateInitialValues(values, undefined, extraInfos, undefined);
  }, []);

  useEffect(() => {
    // DEVNOTE: Version is 0 when initial values are not set
    if (!initValuesVer.current) {
      let formId = generateFormId();
      while (combinedFieldAtomValues[formId]) {
        formId = generateFormId();
      }
      combinedFieldAtomValues[formId] = { fields: {}, fieldArrays: {} };
      updateInitialValues(
        initialValues ?? {},
        skipUnregister,
        undefined,
        formId
      );
    }
  }, [updateInitialValues, skipUnregister, initialValues]);

  const getValuesAndExtraInfo = (get: (val: RecoilValue<any>) => any) =>
    getFormValues(get);

  const getValues = (get: (val: RecoilValue<any>) => any) =>
    getFormValues(get).values;

  const validateFields = useRecoilCallback(
    ({ snapshot, set }) =>
      (fieldNames?: (string | IFieldAtomSelectorInput)[]) => {
        const get = (atom: RecoilValue<any>) =>
          snapshot.getLoadable(atom).contents;
        const values = getValues(get);
        const formId = getFormId(get);
        const errors: IFieldError[] = [];
        if (fieldNames?.length) {
          for (const fieldName of fieldNames) {
            if (typeof fieldName === 'string' || fieldName.type === 'field') {
              const name =
                typeof fieldName === 'string' ? fieldName : fieldName.name;
              const ancestors =
                typeof fieldName === 'string' ? [] : fieldName.ancestors;
              const fieldAtom = fieldAtomFamily({
                name,
                type: 'field',
                ancestors,
                formId,
              });
              const formFieldData = get(fieldAtom) as IFieldAtomValue;
              const errorMsg = formFieldData.validate?.(
                formFieldData.data,
                values
              );
              if (errorMsg) {
                set(fieldAtom, (val) =>
                  Object.assign({}, val, { error: errorMsg, touched: true })
                );
                errors.push({
                  error: errorMsg,
                  ancestors,
                  name,
                  type: 'field',
                });
              }
            } else {
              const { errors: fieldArrayErrors } =
                getFieldArrayDataAndExtraInfo(fieldName, get, {
                  isValidation: true,
                  set,
                });
              if (fieldArrayErrors?.length) {
                errors.push(...fieldArrayErrors);
              }
            }
          }
        }
        return errors;
      },
    []
  );

  const validateAllFields = useRecoilCallback(
    ({ snapshot, set }) =>
      (values: any, extraInfos: any) => {
        const get = (atom: RecoilValue<any>) =>
          snapshot.getLoadable(atom).contents;
        const formId = getFormId(get);
        const errors: IFieldError[] = [];
        for (const fieldAtomInfo of Object.values(
          combinedFieldAtomValues[formId].fields
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
          combinedFieldAtomValues[formId].fieldArrays
        )) {
          const { errors: fieldArrayErrors } = getFieldArrayDataAndExtraInfo(
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
    []
  );

  const handleSubmit = useRecoilCallback(
    ({ snapshot }) =>
      (e?: React.FormEvent<HTMLFormElement>) => {
        if (e && e.preventDefault) {
          e.preventDefault();
        }
        if (e && e.stopPropagation) {
          e.stopPropagation();
        }
        const get = (atom: RecoilValue<any>) =>
          snapshot.getLoadable(atom).contents;
        const { values, extraInfos } = getValuesAndExtraInfo(get);
        const errors = validateAllFields(values, extraInfos);
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
            .then(() => {
              // Make initial values same as final values in order to set isDirty as false after submit
              updateInitialValues(values, skipUnregister, extraInfos);
            })
            .catch((err: any) => {
              console.warn(
                `Warning: An unhandled error was caught from onSubmit()`,
                err
              );
            })
            .finally(() => {
              setFormState({ isSubmitting: false });
            });
        } else {
          setFormState({ isSubmitting: false });
          updateInitialValues(values, skipUnregister, extraInfos);
        }
        return res;
      },
    [
      validateAllFields,
      onSubmit,
      onError,
      validate,
      updateInitialValues,
      skipUnregister,
    ]
  );

  return {
    handleSubmit,
    formState,
    handleReset,
    resetInitialValues,
    validateFields,
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
}

export function FormProvider(props: {
  children: any;
  options?: FormProviderOptions;
}) {
  return (
    <RecoilRoot override={!props.options?.skipRecoilRoot}>
      {props.options?.skipValuesObserver ? null : <FormValuesObserver />}
      <RecoilFormProvider {...props} />
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
