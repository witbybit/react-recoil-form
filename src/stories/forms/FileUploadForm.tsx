import * as React from 'react';
import { useForm, withFormProvider } from '../../';
import Button from '../utils/Button';
import { FileField, InputField } from '../utils/Fields';
import MetaData from '../utils/MetaData';

function FileUploadForm() {
  const [formData, setFormData] = React.useState({});

  const { handleSubmit, resetInitialValues } = useForm({
    onSubmit,
  });

  function onSubmit(values: any, extra: any) {
    setFormData({ values, extra, time: new Date().toString() });
    return Promise.resolve();
  }

  return (
    <div className="grid grid-cols-3 gap-8">
      <form onSubmit={handleSubmit} className="col-span-2">
        <InputField name="name" type="text" />
        <FileField name="file" />
        <br />
        <div className="flex gap-4">
          <Button primary type="submit">
            Submit
          </Button>
          <Button type="button" onClick={() => resetInitialValues({})}>
            Reset
          </Button>
        </div>
      </form>

      <MetaData formData={formData} />
    </div>
  );
}

export default withFormProvider(FileUploadForm);
