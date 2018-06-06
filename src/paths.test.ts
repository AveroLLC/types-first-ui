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

import { BehaviorSubject, Observable } from 'rxjs';
import { take, tap, toArray } from 'rxjs/operators';
import createPathFactory from './paths';
import { Selector } from './selectors';

interface State {
  counter: number;
  a: {
    b: {
      c: {
        number: number;
        string: string;
      };
    };
  };
  collection: number[];
}

function setup() {
  const state = {
    counter: 0,
    a: { b: { c: { number: 1, string: 'a' } } },
    collection: [],
  };
  const evalSpy = jest.fn();

  const state$ = new BehaviorSubject<State>(state);
  const { path } = createPathFactory<State>(state$.pipe(tap(evalSpy)));
  const COUNTER = path(['counter']);
  const NESTED = path(['a', 'b', 'c', 'string']);
  const COLLECTION_BY_INDEX = (i: number) => path(['collection', i]);

  return { state, evalSpy, state$, path, COUNTER, NESTED };
}

describe('paths', () => {
  let { state, evalSpy, state$, path, COUNTER, NESTED } = setup();

  beforeEach(() => {
    const s = setup();
    state = s.state;
    evalSpy = s.evalSpy;
    state$ = s.state$;
    path = s.path;
    COUNTER = s.COUNTER;
    NESTED = s.NESTED;
  });

  describe('#get', () => {
    it('should return the value at the path for shallow props', () => {
      expect(COUNTER.get(state)).toEqual(0);
    });

    it('should return the value at the path for deep props', () => {
      expect(NESTED.get(state)).toEqual('a');
    });

    it('should return a default value if the value at the path is null or undefined', () => {
      COUNTER = path(['counter'], 7);
      state.counter = null;
      expect(COUNTER.get(state)).toEqual(7);
      state.counter = undefined;
      expect(COUNTER.get(state)).toEqual(7);
    });

    it('should not return a default value if the value at the path is falsy', () => {
      COUNTER = path(['counter'], 7);
      state.counter = 0;
      expect(COUNTER.get(state)).toEqual(0);
    });

    it('should return a null default value', () => {
      COUNTER = path(['counter'], null);
      state.counter = undefined;
      expect(COUNTER.get(state)).toEqual(null);
    });
  });

  describe('#set', () => {
    it('should set the targetted value', () => {
      const nextState = COUNTER.set(2)(state);
      expect(nextState.counter).toEqual(2);
    });

    it('should not mutate the original state', () => {
      const nextState = COUNTER.set(2)(state);
      expect(state.counter).not.toEqual(2);
    });

    it('should return a new object reference', () => {
      const nextState = COUNTER.set(2)(state);
      expect(nextState).not.toEqual(state);
    });

    it('should maintain referential equality for parts of the subtree not affected', () => {
      const nextState = COUNTER.set(2)(state);
      expect(nextState.a).toEqual(state.a);
    });

    it('should cascade reference changes', () => {
      const nextState = NESTED.set('hi')(state);
      expect(nextState.a).not.toEqual(state.a);
      expect(nextState.a.b).not.toEqual(state.a.b);
      expect(nextState.a.b.c).not.toEqual(state.a.b.c);
      expect(nextState.a.b.c.string).not.toEqual(state.a.b.c.string);
      expect(nextState.a.b.c.string).toEqual('hi');
      expect(nextState.a.b.c.number).toEqual(state.a.b.c.number);
    });
  });

  describe('observable', () => {
    it('should be an observable', () => {
      expect(COUNTER).toBeInstanceOf(Observable);
    });

    describe('changes', () => {
      it('should emit the initial value of the path', () => {
        return expect(COUNTER.pipe(take(1)).toPromise()).resolves.toEqual(0);
      });

      it('should emit the most recently assigned value of the path on subscription', () => {
        let nextState = state;
        nextState = COUNTER.set(1)(nextState);
        state$.next(nextState);
        nextState = COUNTER.set(2)(nextState);
        state$.next(nextState);
        return expect(COUNTER.pipe(take(1)).toPromise()).resolves.toEqual(2);
      });

      it('should emit the value of the path each time it changes', () => {
        const emittedValues = COUNTER.pipe(
          take(3),
          toArray()
        ).toPromise();
        let nextState = state;
        nextState = COUNTER.set(1)(nextState);
        state$.next(nextState);
        nextState = COUNTER.set(2)(nextState);
        state$.next(nextState);
        return expect(emittedValues).resolves.toEqual([0, 1, 2]);
      });

      it('should not emit if another part of the state tree changes', () => {
        const emittedValues = COUNTER.pipe(
          take(3),
          toArray()
        ).toPromise();
        let nextState = state;
        nextState = COUNTER.set(1)(nextState);
        state$.next(nextState);
        nextState = NESTED.set('heyo')(nextState);
        state$.next(nextState);
        nextState = COUNTER.set(2)(nextState);
        state$.next(nextState);
        return expect(emittedValues).resolves.toEqual([0, 1, 2]);
      });
    });

    describe('default values', () => {
      beforeEach(() => {
        COUNTER = path(['counter'], 10);
      });

      it('should emit the default value if the pat is null', () => {
        let nextState = state;
        nextState = COUNTER.set(null)(nextState);
        state$.next(nextState);

        return expect(COUNTER.pipe(take(1)).toPromise()).resolves.toEqual(10);
      });

      it('should emit the default value if the pat is undefined', () => {
        let nextState = state;
        nextState = COUNTER.set(undefined)(nextState);
        state$.next(nextState);

        return expect(COUNTER.pipe(take(1)).toPromise()).resolves.toEqual(10);
      });

      it('should not emit if the assigned value changes but the result value is the same', () => {
        const emittedValues = COUNTER.pipe(
          take(3),
          toArray()
        ).toPromise();
        let nextState = state;
        // Each of the next 3 sets should result in a return value of 10, so just 1 emit:
        nextState = COUNTER.set(null)(nextState);
        state$.next(nextState);
        nextState = NESTED.set(undefined)(nextState);
        state$.next(nextState);
        nextState = COUNTER.set(10)(nextState);
        state$.next(nextState);

        nextState = COUNTER.set(2)(nextState);
        state$.next(nextState);
        return expect(emittedValues).resolves.toEqual([0, 10, 2]);
      });
    });

    describe('replay and ref counting', () => {
      let source$: Observable<State>;
      let COUNTER: Selector<any>;

      beforeEach(() => {
        // TODO: I removed withSurce
        COUNTER = path(['counter']);
      });

      it('should execute the source on initial subscription', () => {
        COUNTER.subscribe();
        expect(evalSpy).toHaveBeenCalledTimes(1);
      });

      it('should not execute the source on subsequent subscription', () => {
        COUNTER.subscribe();
        COUNTER.subscribe();
        COUNTER.subscribe();
        expect(evalSpy).toHaveBeenCalledTimes(1);
      });

      it('should unsubscribe when subscribers go to zero', () => {
        let sub = COUNTER.subscribe();
        sub.unsubscribe();
        sub = COUNTER.subscribe();
        sub.unsubscribe();
        sub = COUNTER.subscribe();
        sub.unsubscribe();
        expect(evalSpy).toHaveBeenCalledTimes(3);
      });
    });
  });
});
