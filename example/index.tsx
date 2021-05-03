import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {
  useFormValues,
  useIsDirty,
  withFormProvider,
} from '../src/FormProvider';
import MultiStepForm from './forms/MultiStepForm';
import SimpleFieldArray from './forms/SimpleFieldArray';
import SimpleForm from './forms/SimpleForm';
import './index.css';

const formExamples = [
  {
    id: 'simple-form',
    title: 'Simple Form',
    getComponent: props => <SimpleForm {...props} />,
  },
  {
    id: 'simple-field-array',
    title: 'Simple Field Array',
    getComponent: props => <SimpleFieldArray {...props} />,
  },
  {
    id: 'multi-step-form',
    title: 'Multi Step Form',
    getComponent: props => <MultiStepForm {...props} />,
  },
];

function App() {
  const [formId, setFormId] = React.useState('simple-form');
  const [result, setResult] = React.useState<any>({});

  function onSubmit(values) {
    setResult(values);
  }

  return (
    <div className="wrapper">
      <div className="left-nav">
        {formExamples.map(f => {
          return (
            <div
              key={f.id}
              className="left-nav-item"
              onClick={() => {
                setFormId(f.id);
              }}
            >
              {f.title}
            </div>
          );
        })}
      </div>
      <div className="form-panel">
        {formExamples.find(f => f.id === formId)?.getComponent({ onSubmit })}
      </div>
      <div className="result">{JSON.stringify(result, null, 2)}</div>
    </div>
  );
}

export function Results() {
  const values = useFormValues();
  const isDirty = useIsDirty();
  return (
    <React.Fragment>
      <div>{`values = ${JSON.stringify(values, null, 2)}`}</div>
      <div>{`isDirty = ${isDirty}`}</div>
    </React.Fragment>
  );
}

ReactDOM.render(<App />, document.getElementById('root'));
