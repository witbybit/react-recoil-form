import { useEffect, useState } from 'react';
import { useRecoilState } from 'recoil';
import { fieldsAtomFamily, IFieldAtomValue } from './FormProvider';

interface IRenderProps {
  value: any;
  onChange: (value: any) => void;
  error?: string | null;
}

interface IRules {
  validate: (value: any) => string | null;
}

interface IControllerProps {
  name: string;
  render: (renderProps: IRenderProps) => any;
  defaultValue: any;
  rules: IRules;
}

export function Controller(props: IControllerProps) {
  const { render, name, rules } = props;
  const [error, setError] = useState<string | null>(null);
  const [atomValue, setAtomValue] = useRecoilState<IFieldAtomValue>(
    fieldsAtomFamily(name)
  );
  const fieldValue = atomValue?.data;
  useEffect(() => {
    if (rules?.validate) {
      setError(rules?.validate(fieldValue));
    }
  }, [fieldValue, rules]);

  return render({
    value: fieldValue,
    onChange: val =>
      setAtomValue(atomVal => Object.assign({}, atomVal, { data: val })),
    error,
  });
}
