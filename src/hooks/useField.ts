import { useContext, useRef, useEffect, useCallback } from 'react';
import {
  useRecoilValue,
  useRecoilState,
  RecoilState,
  useRecoilTransaction_UNSTABLE,
} from 'recoil';
import { FormIdContext } from '../FormProvider';
import {
  formInitialValuesAtom,
  fieldAtomFamily,
  multipleFieldsSelectorFamily,
} from '../utils/atoms';
import { IFieldProps, IFieldAtomValue } from '../utils/types';
import { getPathInObj, isDeepEqual } from '../utils/utils';

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
