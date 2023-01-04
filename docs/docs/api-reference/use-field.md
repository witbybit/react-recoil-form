---
sidebar_position: 2
---

# useField

`useField` is a custom hook to initialize fields. You should build wrapper around this to reuse in your app.

## Example

```jsx
export default function InputField(props) {
  const { name } = props;
  const { fieldValue, setFieldValue } = useField({
    name,
  });
  return (
    <input
      type="text"
      name={name}
      value={fieldValue}
      onChange={(e) => setFieldValue(e.target.value)}
    />
  );
}
```

## Props

### name

`name: string`

Field name for form state

### validate

`validate?: (value?: any, otherParams?: any) => string | null | undefined;`

### ancestors

`ancestors?: IAncestorInput[];`

## Return value

### fieldValue

`fieldValue: any`

### setFieldValue

`setFieldValue: any`

### error

`error: any`
