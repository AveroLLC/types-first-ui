import { get } from './get';

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
  bool: boolean;
}

describe('get', () => {
  let state: State;

  beforeEach(() => {
    state = {
      a: {
        b: {
          c: {
            string: '1',
            number: 2,
          },
        },
      },
      counter: 7,
      bool: true,
    };
  });

  it('should work on shallow props', () => {
    expect(get(['counter'])(state)).toEqual(7);
  });

  it('should work on deep props', () => {
    expect(get(['a', 'b', 'c', 'string'])(state)).toEqual('1');
  });

  it('should return default val if prop is null or undefined', () => {
    state.counter = null;
    expect(get(['counter'], 10)(state)).toEqual(10);
    state.counter = undefined;
    expect(get(['counter'], 10)(state)).toEqual(10);
  });

  it('should not return default val if prop is falsy', () => {
    state.counter = 0;
    expect(get(['counter'], 10)(state)).toEqual(0);
    state.bool = false;
    expect(get(['bool'], true)(state)).toEqual(false);
  });

  it('should return default val if prop is null or undefined', () => {
    state.counter = null;
    expect(get(['counter'], 10)(state)).toEqual(10);
    state.counter = undefined;
    expect(get(['counter'], 10)(state)).toEqual(10);
  });

  it('should return default vals of null', () => {
    state.counter = undefined;
    expect(get(['counter'], null)(state)).toEqual(null);
  });
});
