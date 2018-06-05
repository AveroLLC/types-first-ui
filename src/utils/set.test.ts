import { set } from './set';

interface State {
  a: {
    b: {
      c: {
        string: string;
        number: number;
      };
    };
  };
  counter: number;
}

const state: State = {
  a: {
    b: {
      c: {
        string: '1',
        number: 2,
      },
    },
  },
  counter: 7,
};

describe('set', () => {
  it('should set the targetted value', () => {
    const nextState = set<State>(['counter'])(2)(state);
    expect(nextState.counter).toEqual(2);
  });

  it('should not mutate the original state', () => {
    const nextState = set<State>(['counter'])(2)(state);
    expect(state.counter).not.toEqual(2);
  });

  it('should return a new object reference', () => {
    const nextState = set<State>(['counter'])(2)(state);
    expect(nextState).not.toEqual(state);
  });

  it('should maintain referential equality for parts of the subtree not affected', () => {
    const nextState = set<State>(['counter'])(2)(state);
    expect(nextState.a).toEqual(state.a);
  });

  it('should cascade reference changes', () => {
    const nextState = set<State>(['a', 'b', 'c', 'string'])('hi')(state);
    expect(nextState.a).not.toEqual(state.a);
    expect(nextState.a.b).not.toEqual(state.a.b);
    expect(nextState.a.b.c).not.toEqual(state.a.b.c);
    expect(nextState.a.b.c.string).not.toEqual(state.a.b.c.string);
    expect(nextState.a.b.c.string).toEqual('hi');
    expect(nextState.a.b.c.number).toEqual(state.a.b.c.number);
  });
});
