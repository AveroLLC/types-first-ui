import { createTypesafeRedux, ActionCreator } from '../../../../src';
import { AppActions, ActionTypes } from './actions';
import { State } from './state';

const { path, selector, createApp, action } = createTypesafeRedux<State, AppActions>();

export { createApp, path, selector, action };

export type Creator<T extends ActionTypes> = ActionCreator<
  Extract<AppActions, { type: T }>
>;
