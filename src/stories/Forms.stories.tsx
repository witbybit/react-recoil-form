import React from 'react';
import DirtyCheckForm from './forms/DirtyCheckForm';
import FieldForm from './forms/FieldForm';
import FieldValidateForm from './forms/FieldValidateForm';
import FileUploadForm from './forms/FileUploadForm';
import FormContext from './forms/FormContext';
import MultiStepForm from './forms/MultiStepForm';
import SimpleFieldArray from './forms/SimpleFieldArray';
import SingleFieldsForm from './forms/SingleFieldsForm';

export default {
  title: 'Forms',
};

export const SingleFieldsStory = () => {
  return <SingleFieldsForm />;
};

export const FieldArrayStory = () => {
  return <SimpleFieldArray />;
};

export const MultiStepStory = () => {
  return <MultiStepForm />;
};

export const FormContextStory = () => {
  return <FormContext />;
};

export const FileUploadStory = () => {
  return <FileUploadForm />;
};

export const FieldValidateStory = () => {
  return <FieldValidateForm />;
};

export const FieldStory = () => {
  return <FieldForm />;
};
export const DirtyCheckStory = () => {
  return <DirtyCheckForm />;
};
