import React, {
  Fragment,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  RecoilRoot,
  RecoilValue,
  useRecoilTransactionObserver_UNSTABLE,
  useSetRecoilState,
} from 'recoil';
import { combinedFieldAtomValues, formValuesAtom } from './utils/atoms';
import { generateFormId, getFormValues } from './utils/atoms.utils';
import { isDeepEqual } from './utils/utils';

function FormValuesObserver() {
  const formId = useContext(FormIdContext);
  const setFormValues = useSetRecoilState(formValuesAtom(formId));
  const [localFormValues, setLocalFormValues] = useState<any>({
    values: {},
    extraInfo: {},
  });

  useEffect(() => {
    setFormValues(localFormValues);
  }, [localFormValues, setFormValues]);

  useRecoilTransactionObserver_UNSTABLE(({ snapshot }) => {
    const get = (atom: RecoilValue<any>) => snapshot.getLoadable(atom).contents;
    const newValues = getFormValues(formId, get);
    if (!isDeepEqual(newValues, localFormValues)) {
      setLocalFormValues(newValues);
    }
  });
  return null;
}

function RecoilFormProvider(props: { children: any }) {
  // TODO: Add values to be passed into onSubmit
  return <Fragment>{props.children}</Fragment>;
}

interface FormProviderOptions {
  /**
   * Use this option only if you already have another <RecoilRoot> in your application
   */
  skipRecoilRoot?: boolean;
  /**
   * Skip dirty check and real-time observer for form values. This can result in better performance in some cases.
   */
  skipValuesObserver?: boolean;
  /**
   * This only needs to be specified for advanced cases where you want to watch fields outside the current hierarchy.
   * Note that skipRecoilRoot should also be set to true for this use case.
   */
  formId?: string;
}

export const FormIdContext = createContext<string>('');

export function FormProvider(props: {
  children: any;
  options?: FormProviderOptions;
}) {
  const formId = useRef<string>(props?.options?.formId ?? generateFormId());

  useEffect(() => {
    const currentFormId = formId.current;
    return () => {
      delete combinedFieldAtomValues[currentFormId];
    };
  }, []);

  return (
    <RecoilRoot override={!props.options?.skipRecoilRoot}>
      <FormIdContext.Provider value={formId.current}>
        {props.options?.skipValuesObserver ? null : <FormValuesObserver />}
        <RecoilFormProvider {...props} />
      </FormIdContext.Provider>
    </RecoilRoot>
  );
}

export const withFormProvider =
  (Component: any, options?: FormProviderOptions) =>
  ({ ...props }) =>
    (
      <FormProvider options={options}>
        <Component {...props} />
      </FormProvider>
    );
