---
sidebar_position: 1
---

# <Field />

`<Field />` will automatically call `useField` internally and lets you reuse the component.

## Example

```jsx
<Field name="username">
  <input type="text" label="Username" />
</Field>
```

This will inject value, onChange and error into your component. But if you want full control you can use render props.

```jsx
<Field name="username">
  {({ value, onChange, error }) => (
    <input type="text" label="Username" value={value} onChange={onChange} />
  )}
</Field>
```

## Props

### name

`name: string`
Field name for form state

### required

`required?: boolean`

### validate

`validate?: (value?: any, otherParams?: any) => string | null | undefined;`

### ancestors

`ancestors?: IAncestorInput[];`
