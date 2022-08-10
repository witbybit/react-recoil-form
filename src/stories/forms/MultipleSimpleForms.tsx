import * as React from 'react';
import SimpleForm from './SingleFieldsForm';

function MultipleSimpleForms(props: any) {
  return (
    <div>
      <p>
        <SimpleForm {...props}></SimpleForm>
      </p>
      <p>
        <SimpleForm {...props}></SimpleForm>
      </p>
    </div>
  );
}

export default MultipleSimpleForms;
