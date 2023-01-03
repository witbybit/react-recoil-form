import React from 'react';

export default function MetaData(props: any) {
  const { formData } = props;
  return (
    <pre className="bg-gray-100 w-full rounded-lg p-4 whitespace-pre-wrap	">
      {JSON.stringify(formData, null, 2)}
    </pre>
  );
}
