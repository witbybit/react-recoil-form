import React from 'react';

export default function Button(props: any) {
  const { children, primary, ...rest } = props;
  return (
    <button
      {...rest}
      className={`flex justify-center py-2 px-4 rounded-md shadow-sm text-sm font-medium  ${
        primary
          ? 'border border-transparent text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500'
          : 'border border-transparent  text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500'
      }`}
    >
      {children}
    </button>
  );
}
