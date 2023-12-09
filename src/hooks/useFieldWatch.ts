import { useContext } from 'react';
import { IFieldWatchParams } from '../utils/types';
import { FormIdContext } from '../FormProvider';
import { multipleFieldsSelectorFamily } from '../utils/atoms';
import { useRecoilValue } from 'recoil';

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
