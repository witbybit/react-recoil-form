import { useContext } from 'react';
import { useRecoilValue } from 'recoil';
import { FormIdContext } from '../FormProvider';
import { formValuesAtom, formInitialValuesAtom } from '../utils/atoms';
import { IIsDirtyProps } from '../utils/types';
import { cloneDeep, isDeepEqual } from '../utils/utils';

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
