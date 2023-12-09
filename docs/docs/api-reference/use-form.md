---
sidebar_position: 2
---

# useForm

`useForm` is a custom hook to initialize form.

## Example

```jsx
function LoginForm() {
  const { handleSubmit } = useForm({
    onSubmit,
  });

  function onSubmit() {}

  return (
    <form onSubmit={handleSubmit}>
      <Field name="email">
        <InputField label="Email Id" />
      </Field>
      <Field name="password">
        <InputField label="Password" />
      </Field>
    </form>
  );
}

export default withFormProvider(LoginForm);
```

## Props

### initialValues

`initialValues: any`

### onSubmit

`onSubmit?: () => void`

## Return value

### handleSubmit

`handleSubmit: any`

### resetInitialValues

`resetInitialValues: any`
