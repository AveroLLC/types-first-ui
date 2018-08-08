/*
   Copyright Avero, LLC

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
 */

import { createTypesafeRedux } from '../src';
import { map } from 'rxjs/operators';

export interface CounterState {
  counter: number;
}

export enum CounterActionTypes {
  increment = 'COUNTER::INCREMENT',
  decrement = 'COUNTER::DECREMENT',
  incrementEpic = 'COUNTER::INCREMENT_EPIC',
}

interface CounterActions {
  [CounterActionTypes.increment]: {
    type: CounterActionTypes.increment;
    payload: { amount: number };
  };
  [CounterActionTypes.decrement]: {
    type: CounterActionTypes.decrement;
    payload: { amount: number };
  };
  [CounterActionTypes.incrementEpic]: {
    type: CounterActionTypes.incrementEpic;
    payload: {};
  };
}

export interface CounterEpicDeps {
  getValue: () => number;
}

export function makeLib(subTreeKey: string) {
  const redux = createTypesafeRedux<
    CounterState,
    CounterActions[keyof CounterActions],
    CounterEpicDeps
  >();

  function createPaths() {
    const COUNTER = redux.path(['counter']);
  }

  const increment = redux.action(CounterActionTypes.increment, {
    reducer: (state, action) => {
      const currentValue = COUNTER.get(state);
      return COUNTER.set(currentValue + action.payload.amount)(state);
    },
  });
  const decrement = redux.action(CounterActionTypes.decrement, {
    reducer: (state, action) => {
      const currentValue = COUNTER.get(state);
      return COUNTER.set(currentValue - action.payload.amount)(state);
    },
  });
  const incrementEpic = redux.action(CounterActionTypes.incrementEpic, {
    epic: (action$, state$, deps) => {
      return action$.pipe(
        map(v => {
          return increment.creator({ amount: deps.getValue() });
        })
      );
    },
  });

  const COUNTER = redux.path(['counter']);

  const COUNTER_AS_STRING = redux.selector(COUNTER, counter => {
    return `Counter Value is ${counter}`;
  });

  const counterLib = redux.createApp({
    initialState: { counter: 0 },
    actions: {
      [CounterActionTypes.increment]: increment,
      [CounterActionTypes.decrement]: decrement,
      [CounterActionTypes.incrementEpic]: incrementEpic,
    },
  });

  return {
    COUNTER,
    COUNTER_AS_STRING,
    counterLib,
  };
}
