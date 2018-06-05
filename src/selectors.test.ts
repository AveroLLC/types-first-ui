import _ from 'lodash';
import { BehaviorSubject, Observable } from 'rxjs';
import { take, toArray } from 'rxjs/operators';
import createPathFactory from './paths';
import createSelectorFactory from './selectors';
import { flow } from './utils/flow';

interface State {
  counter: number;
  greeting: string;
  users: {
    [id: string]: {
      name: string;
    };
  };
}

function setup() {
  const state: State = {
    counter: 0,
    greeting: 'hello',
    users: {
      1: {
        name: 'Harry',
      },
      2: {
        name: 'Ron',
      },
      3: {
        name: 'Hermione',
      },
    },
  };
  const state$ = new BehaviorSubject<State>(state);

  const { path } = createPathFactory(state$);
  const { selector } = createSelectorFactory(state$);

  const COUNTER = path(['counter']);
  const GREETING = path(['greeting']);
  const USERS = path(['users']);

  return { state, state$, selector, COUNTER, GREETING, USERS };
}

describe('selectors', () => {
  let { state, state$, selector, COUNTER, GREETING, USERS } = setup();
  let projectFn: jest.Mock;

  beforeEach(() => {
    const s = setup();
    state = s.state;
    state$ = s.state$;
    selector = s.selector;
    COUNTER = s.COUNTER;
    GREETING = s.GREETING;
    USERS = s.USERS;

    projectFn = jest.fn(() => 1);
  });

  describe('observable', () => {
    it('should be an observable', () => {
      const doubledCounter = selector(COUNTER, counter => counter * 2);
      expect(doubledCounter).toBeInstanceOf(Observable);
    });

    describe('replay & ref count', () => {
      it('should not evaluate the project function until there is a subscriber', () => {
        const s = selector(COUNTER, GREETING, USERS, projectFn);
        expect(projectFn).not.toHaveBeenCalled();
      });

      it('should evaluate the project function with the input selectors once there is a subscriber', () => {
        const s = selector(COUNTER, GREETING, USERS, projectFn);
        s.subscribe();
        expect(projectFn).toHaveBeenCalledTimes(1);
        const [counter, greeting, users] = projectFn.mock.calls[0];
        expect(counter).toBe(state.counter);
        expect(greeting).toBe(state.greeting);
        expect(users).toBe(state.users);
      });

      it('should not re-evaluate the projector on subsequent subscriptions', () => {
        const s = selector(COUNTER, GREETING, USERS, projectFn);
        s.subscribe();
        expect(projectFn).toHaveBeenCalledTimes(1);
        s.subscribe();
        s.subscribe();
        expect(projectFn).toHaveBeenCalledTimes(1);
      });

      it('should re-evaluate the projector each time subscriptions go to zero', () => {
        const s = selector(COUNTER, GREETING, USERS, projectFn);
        let sub = s.subscribe();
        expect(projectFn).toHaveBeenCalledTimes(1);
        sub.unsubscribe();
        sub = s.subscribe();
        expect(projectFn).toHaveBeenCalledTimes(2);
        sub.unsubscribe();
        sub = s.subscribe();
        expect(projectFn).toHaveBeenCalledTimes(3);
      });
    });

    describe('sample', () => {
      it('should not evaluate the projector if the input observables do not emit', () => {
        const s = selector(COUNTER, projectFn);
        s.subscribe();
        expect(projectFn).toHaveBeenCalledTimes(1);
        let nextState = state;
        // state emits a change to a different part of the state tree
        nextState = GREETING.set('heyoooo')(nextState);
        state$.next(nextState);
        // state emits a non-change to the watched part of the state tree
        nextState = COUNTER.set(state.counter)(nextState);
        state$.next(nextState);
        expect(projectFn).toHaveBeenCalledTimes(1);
      });

      it('should evaluate the projector at most once each time the source emits, with all the latest input values', () => {
        const s = selector(COUNTER, GREETING, USERS, projectFn);
        s.subscribe();
        expect(projectFn).toHaveBeenCalledTimes(1);
        let nextState = state;
        // state emits a change to a different part of the state tree
        nextState = flow(COUNTER.set(1), GREETING.set('heyo'))(nextState);
        state$.next(nextState);
        expect(projectFn).toHaveBeenCalledTimes(2);
        const [counter, greeting, users] = projectFn.mock.calls[1];
        expect(counter).toBe(1);
        expect(greeting).toBe('heyo');
        expect(users).toBe(state.users);
      });

      it('should accept any arbitrary observable as an input', () => {
        const ticker$ = new BehaviorSubject<number>(100);
        const s = selector(COUNTER, ticker$, projectFn);
        s.subscribe();
        expect(projectFn).toHaveBeenCalledTimes(1);
        const [counter, ticker] = projectFn.mock.calls[0];
        expect(counter).toBe(0);
        expect(ticker).toBe(100);
      });

      it('should evaluate the projector only when the source emits', () => {
        const ticker$ = new BehaviorSubject<number>(100);
        const s = selector(COUNTER, ticker$, projectFn);
        s.subscribe();
        expect(projectFn).toHaveBeenCalledTimes(1);
        const [counter, ticker] = projectFn.mock.calls[0];
        expect(counter).toBe(0);
        expect(ticker).toBe(100);

        ticker$.next(200);
        ticker$.next(300);
        ticker$.next(400);
        expect(projectFn).toHaveBeenCalledTimes(1);
        state$.next(state);
        expect(projectFn).toHaveBeenCalledTimes(2);
      });
    });

    describe('distinct until changed', () => {
      it('should only emit a new value each time the result of the projection function changes', () => {
        const s = selector(
          COUNTER,
          GREETING,
          (counter, greeting) => counter + greeting.length
        );
        const emittedValues = s.pipe(take(3), toArray()).toPromise();

        let nextState = state;
        nextState = COUNTER.set(1)(nextState);
        state$.next(nextState);
        nextState = COUNTER.set(1)(nextState);
        state$.next(nextState);
        nextState = GREETING.set('hella')(nextState);
        state$.next(nextState);
        nextState = GREETING.set('hellos')(nextState);
        state$.next(nextState);

        return expect(emittedValues).resolves.toEqual([5, 6, 7]);
      });

      it('should use referential equality by default', () => {
        const tableTest = [
          {
            input: selector(GREETING, greeting => greeting.length),
            output: [5, 2, 5],
          },
          {
            input: selector(GREETING, greeting => greeting[0]),
            output: ['h', 'o', 'a'],
          },
          {
            input: selector(GREETING, greeting => greeting.length > 4),
            output: [true, false, true],
          },
          {
            input: selector(GREETING, () => {
              return [1, 2];
            }),
            output: [[1, 2], [1, 2], [1, 2], [1, 2]],
          },
        ];

        const expectations = _.map(tableTest, ({ input, output }) => {
          return expect(
            (input as Observable<any>).pipe(take(output.length), toArray()).toPromise()
          ).resolves.toEqual(output);
        });

        let nextState = state;
        nextState = GREETING.set('hi')(nextState);
        state$.next(nextState);

        nextState = GREETING.set('oh')(nextState);
        state$.next(nextState);

        nextState = GREETING.set('arrgh')(nextState);
        state$.next(nextState);

        return Promise.all(expectations);
      });

      it('should accept an optional comparator to determine if next values are distinct', () => {
        const s = selector(
          GREETING,
          USERS,
          (greeting, users) => _.map(users, user => `${greeting}, ${user.name}`),
          { compare: (a, b) => a.length === b.length }
        );
        const output = s.pipe(take(2), toArray()).toPromise();
        let nextState = state;
        // This will not change the length, so will not emit
        nextState = GREETING.set('hi')(nextState);
        state$.next(nextState);
        // this will
        nextState = USERS.set(
          Object.assign({}, nextState.users, { 4: { name: 'Draco' } })
        )(nextState);
        state$.next(nextState);

        return expect(output).resolves.toEqual([
          ['hello, Harry', 'hello, Ron', 'hello, Hermione'],
          ['hi, Harry', 'hi, Ron', 'hi, Hermione', 'hi, Draco'],
        ]);
      });
    });
  });
});
