# React Recoil Form

The idea behind ths library is to use Recoil for managing a form and treat state of every field like an atom. The main motivation for this library was to handle large forms with ease such that typing in one field doesn't lead to a re-render of the entire form. We have the following features so far:-
- useForm: Initializes the form with onSubmit and onError handlers
- useField - To be used in field components for capturing change, getting value and for validation
- useFieldArray - This is an efficient way of managing field arrays where you need to use a table or something similar for data entry. This allows you to append rows, remove rows, etc. Sticking to the philosophy of this library, only those fields/cells will render which are being modified.
- useFieldWatch / useFieldArrayColumnWatch - This allows you to watch other fields in the form and so this component renders only when the dependent fields render.
- useFormValues - Listen to the form values in real-time but the best part here is that only this particular component will render again. Hence you can get all values without a re-render of the entire form
- useIsDirty - This allows you to track if the form has been modified.

It is already being used in production in multiple internal projects. However, we don't have enough examples and documentation for this yet but we will add that soon. To get started for now, you can look at the examples already added.

# Install
`yarn add react-recoil-form recoil`
