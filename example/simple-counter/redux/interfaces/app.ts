import { createTypesafeRedux } from '../../../../src';
import { AppActions } from './actions';
import { State } from './state';

const { path, selector, createApp, action } = createTypesafeRedux<State, AppActions>();

export { createApp, path, selector, action };
