---
sidebar_position: 1
---

# Introduction

The idea behind this library is to use Recoil for managing a form and treat state of every field like an atom. The main motivation for this library was to handle large forms with ease such that typing in one field doesn't lead to a re-render of the entire form.

## Installation

```shell
yarn add react-recoil-form recoil
```

## Get Started

When constructing a form, we will think in terms of fields like an singular atom. It has its own seperate state. It will get updated when needed. But that will not trigger full form re-render. This gives us the power to manage large size forms with ease.

Here, we have a custom input field component that can manage its own states.

```jsx
import React from 'react';
import { useField } from 'react-recoil-form';

export default function InputField(props) {
  const { name } = props;
  const { fieldValue, setFieldValue } = useField({
    name,
  });

  return (
    <input
      id={name}
      value={fieldValue}
      onChange={(e) => setFieldValue(e.target.value)}
    />
  );
}
```

Now we use the input field inside our form.

```jsx
import React from 'react';
import { useForm } from 'react-recoil-form';

export default function MyForm() {
  function onSubmit(data) {
    console.log(data);
  }

  const { handleSubmit } = useForm({
    onSubmit,
    initialValues: {
      name: '',
      age: '',
    },
  });

  return (
    <form onSubmit={handleSubmit}>
      <InputField name="name" />
      <InputField name="age" />
      <button>Submit</button>
    </form>
  );
}
```

Also you have to keep the form inside `RecoilRoot`

```jsx
import { RecoilRoot } from 'recoil';

export default function App() {
  return (
    <RecoilRoot>
      <MyForm />
    </RecoilRoot>
  );
}
```
