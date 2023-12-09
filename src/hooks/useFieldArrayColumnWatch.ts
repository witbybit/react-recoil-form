import { useContext } from 'react';
import { FormIdContext } from '../FormProvider';
import { IFieldArrayColWatchParams } from '../utils/types';
import { fieldArrayColAtomValueSelectorFamily } from '../utils/atoms';
import { useRecoilValue } from 'recoil';

export function useFieldArrayColumnWatch(props: IFieldArrayColWatchParams) {
  const { fieldArrayName, fieldNames, formId: extFormId } = props;
  const contextFormId = useContext(FormIdContext);
  const formId = extFormId ?? contextFormId;
  const selector = fieldArrayColAtomValueSelectorFamily({
    formId,
    fieldArrayName,
    fieldNames,
  });
  const { values, extraInfos } = useRecoilValue(selector);
  return { values, extraInfos };
}
