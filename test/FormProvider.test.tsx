import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { FormProvider } from '../src';

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
});
