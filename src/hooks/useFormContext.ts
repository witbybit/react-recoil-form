import { useContext } from 'react';
import { FormIdContext } from '../FormProvider';
import {
  RecoilState,
  useRecoilCallback,
  useRecoilTransaction_UNSTABLE,
} from 'recoil';
import {
  combinedFieldAtomValues,
  fieldAtomFamily,
  formInitialValuesAtom,
  formValuesAtom,
  getFieldArrayDataAndExtraInfo,
  setFieldArrayDataAndExtraInfo,
} from '../utils/atoms';
import {
  IFieldAtomValue,
  IFormContextFieldInput,
  IIsDirtyProps,
  IRemoveFieldParams,
  InitialValues,
} from '../utils/types';
import { getFormValues, snapshotToGet } from '../utils/atoms.utils';
import { getPathInObj, isDeepEqual } from '../utils/utils';

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
