import { useContext, useRef, useEffect } from 'react';
import {
  useRecoilValue,
  useRecoilState,
  RecoilState,
  useRecoilTransaction_UNSTABLE,
  useRecoilCallback,
  RecoilValue,
} from 'recoil';
import { FormIdContext } from '../FormProvider';
import { snapshotToGet, getFullObjectPath } from '../utils/atoms.utils';
import {
  formInitialValuesAtom,
  fieldAtomFamily,
  setFieldArrayDataAndExtraInfo,
  getFieldArrayDataAndExtraInfo,
  resetFieldArrayRow,
} from '../utils/atoms';
import { IFieldArrayProps, IFieldArrayAtomValue } from '../utils/types';
import { isDeepEqual, getPathInObj } from '../utils/utils';
import { useFieldArrayColumnWatch } from './useFieldArrayColumnWatch';

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
        // Values are only initialized for fields or field arrays without ancestors
        if (!ancestors?.length && initialValue?.length) {
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
