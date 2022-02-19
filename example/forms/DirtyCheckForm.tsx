import { withFormProvider, useForm, useIsDirty } from '../../src';
import InputField from './components/InputField';
import React, { useEffect, useState } from 'react';

const allLevelInitialValues = {
  level1: {
    name: 'abc',
    age: '123',
  },
  level2: {},
  level3: {}
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

function App() {
  const [formData, setFormData] = useState({});
  const [data, setData] = useState({});
  const [currentLevel, setCurrentLevel] = useState('level1');
  const currentInitialValues = allLevelInitialValues?.[currentLevel];
  const isDirty = useIsDirty();

  const onSubmit = (values: any) => {
    console.log(values);
    setFormData(values);
    setData((d) => ({
      ...d,
      [currentLevel]: values,
    }));
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
    <div>
      <div>
        Dirty State
      </div>
      <div>
        <div>
          {levels.map((l) => (
            <span
              key={l.id}
              onClick={() => {
                setCurrentLevel(l.id);
              }}
              style={{ cursor: 'pointer', marginLeft: '10px', marginBottom: '5px', textDecoration: 'underline', color: 'blue' }}
            >
              {l.title}
            </span>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div>
            <InputField required name="name" label="Name" type="text" />
          </div>

          <div>
            <InputField name="age" label="Age" type="text" />
          </div>

          <div>
            <button
              type="submit"
            >
              Submit
            </button>
            <button
              onClick={() => resetInitialValues(currentInitialValues)}
              type="reset"
            >
              Reset
            </button>
          </div>
        </form>
      </div>

      <div>
        <pre>
          {JSON.stringify(
            {
              isDirty,
              formData,
              currentInitialValues: currentInitialValues,
            },
            null,
            2
          )}
        </pre>
      </div>
    </div>
  );
}

export default withFormProvider(App);
