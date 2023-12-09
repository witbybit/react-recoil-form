import { RecoilValue, Snapshot } from 'recoil';
import {
  combinedFieldAtomValues,
  fieldAtomFamily,
  formInitialValuesAtom,
} from './atoms';
import {
  IAncestorInput,
  IFieldArrayAtomValue,
  IFieldAtomSelectorInput,
  InitialValues,
} from './types';
import { cloneDeep, isUndefined, setPathInObj } from './utils';

export function gan(atomName: string) {
  return `WitForm_${atomName}`;
}

export function getNewRowId(rowIds: number[]) {
  let val = Math.floor(Math.random() * 10000);
  while (rowIds.indexOf(val) !== -1) {
    val++;
  }
  return val;
}

export function generateFormId() {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}

export function snapshotToGet(snapshot: Snapshot) {
  return (atom: RecoilValue<any>) => snapshot.getLoadable(atom).contents;
}

export function getFullObjectPath(
  params: IFieldAtomSelectorInput,
  get: (val: RecoilValue<any>) => any
) {
  let path = '';
  let prevAncestors: IAncestorInput[] = [];
  for (const ancestor of params.ancestors) {
    const ancestorValue = get(
      fieldAtomFamily({
        formId: params.formId,
        ancestors: prevAncestors,
        name: ancestor.name,
        type: 'field-array',
      })
    ) as IFieldArrayAtomValue;
    const rowIndex = ancestorValue.rowIds.indexOf(ancestor.rowId);
    path = path + `${ancestor.name}[${rowIndex}].`;
    prevAncestors.push(ancestor);
  }
  path = path + params.name;
  return path;
}

export const getFormValues = (
  formId: string,
  get: (val: RecoilValue<any>) => any
) => {
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
