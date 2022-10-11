import React from 'react';

export default function Button(props: any) {
  const { children, primary, small, ...rest } = props;
  return (
    <button
      {...rest}
      className={`flex justify-center rounded-md shadow-sm text-sm font-medium  ${
        primary
          ? 'border border-transparent text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500'
          : 'border border-transparent  text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500'
      } ${small ? 'py-1 px-2' : 'py-2 px-4'}`}
    >
      {children}
    </button>
  );
}
