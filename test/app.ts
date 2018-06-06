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

import { ofType } from '../src';
import { createTypesafeRedux } from '../src';

import { CounterActionTypes, makeLib } from './lib';
import {
  map,
  mapTo,
  flatMap,
  tap,
  takeUntil,
  toArray,
  sample,
  buffer,
} from 'rxjs/operators';
import { never } from 'rxjs';

export interface AppState {
  name: string;
  numbers: number[];
}

export enum ActionTypes {
  SET_NAME = 'SET_NAME',
  ADD_NUMBER = 'ADD_NUMBER',
  REMOVE_NUMBER = 'REMOVE_NUMBER',
}

interface Actions {
  [ActionTypes.SET_NAME]: {
    type: ActionTypes.SET_NAME;
    payload: {
      name: string;
    };
  };
  [ActionTypes.ADD_NUMBER]: {
    type: ActionTypes.ADD_NUMBER;
    payload: {
      number: number;
    };
  };
  [ActionTypes.REMOVE_NUMBER]: {
    type: ActionTypes.REMOVE_NUMBER;
    payload: {};
  };
}

export function makeApp(middlewareSpy: () => void) {
  const lib = makeLib();
  const { counterLib, COUNTER } = lib;

  interface Features {
    lib: typeof counterLib;
  }

  const redux = createTypesafeRedux<AppState, Actions[keyof Actions], null, Features>({
    lib: counterLib,
  });

  const NAME = redux.path(['name']);
  const NUMBERS = redux.path(['numbers']);

  const SUM = redux.selector(NUMBERS, COUNTER, (numbers, counter) => {
    return numbers.reduce((sum, n) => sum + n, 0) + counter;
  });

  const setName = redux.action(ActionTypes.SET_NAME, {
    reducer: (state, action) => {
      return NAME.set(action.payload.name)(state);
    },
  });
  const addNumber = redux.action(ActionTypes.ADD_NUMBER, {
    reducer: (state, action) => {
      const numbers = NUMBERS.get(state);
      return NUMBERS.set(numbers.concat(action.payload.number))(state);
    },
    epic: (action$, deps) => {
      return action$.pipe(
        mapTo(counterLib.actionCreator(CounterActionTypes.increment)({ amount: 1 }))
      );
    },
  });
  const removeNumber = redux.action(ActionTypes.REMOVE_NUMBER, {
    reducer: (state, action) => {
      const numbers = NUMBERS.get(state);
      return NUMBERS.set(numbers.slice(0, -1))(state);
    },
    epic: action$ => {
      return action$.pipe(
        mapTo(counterLib.actionCreator(CounterActionTypes.decrement)({ amount: 1 }))
      );
    },
  });

  const app = redux.createApp({
    initialState: {
      name: 'Steve',
      numbers: [],
    },
    actions: {
      [ActionTypes.SET_NAME]: setName,
      [ActionTypes.ADD_NUMBER]: addNumber,
      [ActionTypes.REMOVE_NUMBER]: removeNumber,
    },
    middleware: [
      actions$ => {
        return actions$.pipe(ofType(ActionTypes.SET_NAME)).pipe(
          tap(middlewareSpy),
          flatMap(() => never())
        );
      },
    ],
    extraEpics: [
      (actions$, deps) => {
        return actions$.pipe(
          ofType(CounterActionTypes.increment),
          buffer(actions$.pipe(ofType(CounterActionTypes.decrement))),
          map(amounts => {
            return setName.creator({
              name: amounts.map(a => a.payload.amount).join(''),
            });
          })
        );
      },
    ],
  });

  return {
    state$: redux.state$,
    app,
    NAME,
    NUMBERS,
    SUM,
    setName,
    addNumber,
    removeNumber,
    ...lib,
  };
}
