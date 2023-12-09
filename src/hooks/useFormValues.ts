import { useContext } from 'react';
import { FormIdContext } from '../FormProvider';
import { useRecoilValue } from 'recoil';
import { formValuesAtom } from '../utils/atoms';

export function useFormValues() {
  const formId = useContext(FormIdContext);
  const { values: formValues } = useRecoilValue(formValuesAtom(formId));
  return formValues;
}
