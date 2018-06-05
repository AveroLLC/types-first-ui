import actions from './actions';
import { createApp } from './interfaces/app';
import { initialState } from './interfaces/state';

const app = createApp({
  actions,
  initialState,
});

app.createStore({ epicDependencies: {}, dev: true });

export default app;
