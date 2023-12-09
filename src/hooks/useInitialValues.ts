import { useContext } from 'react';
import { useRecoilValue } from 'recoil';
import { formInitialValuesAtom } from '../utils/atoms';
import { FormIdContext } from '../FormProvider';

export function useInitialValues() {
  const formId = useContext(FormIdContext);
  const { values } = useRecoilValue(formInitialValuesAtom(formId));
  return values;
}
