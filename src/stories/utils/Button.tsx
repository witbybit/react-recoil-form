import React from 'react';

export default function Button(props: any) {
  const { children, primary, small, color = 'blue', ...rest } = props;
  return (
    <button
      {...rest}
      className={`flex justify-center rounded-md shadow-sm text-sm font-medium  ${
        primary
          ? `border border-transparent text-white bg-${color}-600 hover:bg-${color}-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-${color}-500`
          : `border border-transparent  text-${color}-700 bg-${color}-100 hover:bg-${color}-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-${color}-500`
      } ${small ? 'py-1 px-2' : 'py-2 px-4'}`}
    >
      {children}
    </button>
  );
}
