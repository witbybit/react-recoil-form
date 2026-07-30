/**
 * @jest-environment jsdom
 */

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import { useSetRecoilState } from 'recoil';
import { describe, expect, it } from 'vitest';
import { formInitialValuesAtom } from '../src/atoms';
import { FormProvider, useField, useFieldArray, useForm } from '../src';

const flushEffects = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('it', () => {
  it('renders without crashing', () => {
    const div = document.createElement('div');
    ReactDOM.render(
      <FormProvider>
        <div></div>
      </FormProvider>,
      div
    );
    ReactDOM.unmountComponentAtNode(div);
  });

  it('reconciles a mounted field array when initial values reset to an explicit empty array', async () => {
    const div = document.createElement('div');
    const formId = 'field-array-empty-reset';
    const initialValues = {
      items: [{ name: 'first' }, { name: 'second' }],
    };
    let bumpInitialValues: (values: any) => void = () => {};
    let getFieldArrayValue: () => any[] = () => [];

    function FieldArrayRow(props: { rowId: number }) {
      const { fieldValue } = useField({
        ancestors: [{ name: 'items', rowId: props.rowId }],
        name: 'name',
      });

      return <div data-testid="field-array-row">{fieldValue}</div>;
    }

    function InitialValuesUpdater() {
      const setInitialValues = useSetRecoilState(formInitialValuesAtom(formId));

      React.useEffect(() => {
        bumpInitialValues = (values: any) => {
          setInitialValues((current) => ({
            ...current,
            values,
            version: current.version + 1,
          }));
        };
      }, [setInitialValues]);

      return null;
    }

    function Form() {
      useForm({
        initialValues,
        onSubmit: () => undefined,
        skipUnregister: true,
      });
      const fieldArray = useFieldArray({
        fieldNames: ['name'],
        name: 'items',
      });
      getFieldArrayValue = fieldArray.getFieldArrayValue;

      return (
        <>
          <InitialValuesUpdater />
          {fieldArray.fieldArrayProps.rowIds.map((rowId) => (
            <FieldArrayRow key={rowId} rowId={rowId} />
          ))}
        </>
      );
    }

    await act(async () => {
      ReactDOM.render(
        <FormProvider options={{ formId }}>
          <Form />
        </FormProvider>,
        div
      );
      await flushEffects();
    });

    expect(
      div.querySelectorAll('[data-testid="field-array-row"]')
    ).toHaveLength(2);
    expect(getFieldArrayValue()).toEqual([
      { name: 'first' },
      { name: 'second' },
    ]);

    // This targets the mounted reinitialization path: an explicit [] must still
    // reconcile rowIds instead of preserving stale row data.
    await act(async () => {
      bumpInitialValues({ items: [] });
      await flushEffects();
      await flushEffects();
    });

    expect(
      div.querySelectorAll('[data-testid="field-array-row"]')
    ).toHaveLength(0);
    expect(getFieldArrayValue()).toEqual([]);

    ReactDOM.unmountComponentAtNode(div);
  });
});
