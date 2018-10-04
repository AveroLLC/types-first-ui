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

import { makeApp, AppState } from './app';
import { noop } from 'lodash';
import { take, toArray } from 'rxjs/operators';
import { CounterActionTypes } from './lib';
import { of } from 'rxjs';

const initialState = {
  name: '',
  numbers: [],
  lib: {
    counter: 0,
  },
};

describe('app testability', () => {
  let { state$, NUMBERS, NAME, SUM, setName, addNumber, removeNumber } = makeApp(noop);

  beforeEach(() => {
    const a = makeApp(noop);

    state$ = a.state$;
    NUMBERS = a.NUMBERS;
    NAME = a.NAME;
    SUM = a.SUM;
    setName = a.setName;
    addNumber = a.addNumber;
    removeNumber = a.removeNumber;

    state$.next(initialState);
  });

  describe('paths', () => {
    it('should be testable by interacting with the state$ stream', () => {
      state$.next({
        ...initialState,
        name: 'Elliot',
      });

      return expect(NAME.pipe(take(1)).toPromise()).resolves.toEqual('Elliot');
    });
  });

  describe('selectors', () => {
    it('should be testable by interacting with the state$ stream', () => {
      state$.next({
        ...initialState,
        numbers: [1, 2, 3],
        lib: {
          counter: 10,
        },
      });

      const expected = SUM.pipe(
        take(3),
        toArray()
      ).toPromise();

      state$.next({
        ...initialState,
        numbers: [1, 2, 3],
        lib: {
          counter: 20,
        },
      });
      state$.next({
        ...initialState,
        numbers: [5],
        lib: {
          counter: 20,
        },
      });

      return expect(expected).resolves.toEqual([16, 26, 25]);
    });
  });

  describe('reducers', () => {
    it('should allow testing of reducers as pure functions', () => {
      const nextState = setName.reducer(initialState, setName.creator({ name: 'bob' }));

      expect(nextState).not.toBe(initialState);
      expect(nextState.name).toEqual('bob');
    });
  });

  describe('epics', () => {
    it('should allow testing of epics', () => {
      const { epic, creator } = addNumber;

      const emittedAction = epic(
        of(creator({ number: 10 })),
        {
          lib: {
            getValue: () => 7,
          },
        },
        null
      );

      return expect(emittedAction.toPromise()).resolves.toEqual({
        type: CounterActionTypes.increment,
        payload: { amount: 1 },
      });
    });
  });
});
