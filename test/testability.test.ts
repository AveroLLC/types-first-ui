import { makeApp, AppState } from './app';
import _ from 'lodash';
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
  let { state$, NUMBERS, NAME, SUM, setName, addNumber, removeNumber } = makeApp(_.noop);

  beforeEach(() => {
    const a = makeApp(_.noop);

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

      const expected = SUM.pipe(take(3), toArray()).toPromise();

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

      const emittedAction = epic(of(creator({ number: 10 })), {
        getValue: () => 7,
      });

      return expect(emittedAction.toPromise()).resolves.toEqual({
        type: CounterActionTypes.increment,
        payload: { amount: 1 },
      });
    });
  });
});
