import { withFormProvider, useForm, useIsDirty } from '../..';
import React, { useEffect, useState } from 'react';
import { InputField } from '../utils/Fields';
import MetaData from '../utils/MetaData';
import Button from '../utils/Button';

const allLevelInitialValues: any = {
  level1: {
    name: 'abc',
    age: '123',
  },
  level2: {},
  level3: {},
};

const levels = [
  {
    id: 'level1',
    title: 'Level 1',
  },
  {
    id: 'level2',
    title: 'Level 2',
  },
  {
    id: 'level3',
    title: 'Level 3',
  },
];

function DirtyCheckForm() {
  const [formData, setFormData] = useState({});
  const [data, setData] = useState({});
  const [currentLevel, setCurrentLevel] = useState('level1');
  const currentInitialValues = allLevelInitialValues?.[currentLevel];
  const isDirty = useIsDirty();

  const onSubmit = (values: any) => {
    setFormData(values);
    setData((d) => ({
      ...d,
      [currentLevel]: values,
    }));
    return Promise.resolve();
  };

  const { handleSubmit, resetInitialValues } = useForm({
    onSubmit,
    skipUnregister: true,
  });

  // reset user form
  useEffect(() => {
    console.log(currentInitialValues);
    resetInitialValues(currentInitialValues);
  }, [resetInitialValues, currentInitialValues]);

  return (
    <div className="grid grid-cols-3">
      <div className="col-span-2">
        <div>Dirty State</div>
        <div>
          <div className="flex gap-3 my-2">
            {levels.map((l) => (
              <span
                className="bg-blue-100 p-3 cursor-pointer py-1 rounded-lg"
                key={l.id}
                onClick={() => {
                  setCurrentLevel(l.id);
                }}
              >
                {l.title}
              </span>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            <div>
              <InputField name="name" label="Name" type="text" />
            </div>

            <div>
              <InputField name="age" label="Age" type="text" />
            </div>

            <div className="flex gap-4">
              <Button primary type="submit">
                Submit
              </Button>
              <Button
                onClick={() => resetInitialValues(currentInitialValues)}
                type="reset"
              >
                Reset
              </Button>
            </div>
          </form>
        </div>
      </div>

      <div>
        <MetaData
          formData={{
            isDirty,
            formData,
            currentInitialValues: currentInitialValues,
          }}
        />
      </div>
    </div>
  );
}

export default withFormProvider(DirtyCheckForm);
