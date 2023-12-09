import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  RecoilState,
  RecoilValue,
  useRecoilCallback,
  useRecoilTransaction_UNSTABLE,
} from 'recoil';
import { FormIdContext } from '../FormProvider';
import {
  combinedFieldAtomValues,
  fieldAtomFamily,
  formInitialValuesAtom,
  formValuesAtom,
  getFieldArrayDataAndExtraInfo,
} from '../utils/atoms';
import {
  IFieldAtomValue,
  IFieldError,
  IFormContextFieldInput,
  IFormProps,
} from '../utils/types';
import { getFormValues } from '../utils/atoms.utils';

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
