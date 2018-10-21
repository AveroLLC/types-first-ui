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

import { unset } from './unset';

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

describe('unset', () => {
  it('should remove the targetted value', () => {
    const nextState = unset<State>(['counter'])(state);
    expect(nextState.counter).toBeUndefined();
  });

  it('should not mutate the original state', () => {
    const nextState = unset<State>(['counter'])(state);
    expect(state.counter).toEqual(7);
  });

  it('should return a new object reference', () => {
    const nextState = unset<State>(['counter'])(state);
    expect(nextState).not.toBe(state);
  });

  it('should maintain referential equality for parts of the subtree not affected', () => {
    const nextState = unset<State>(['counter'])(state);
    expect(nextState.a).toBe(state.a);
  });

  it('should cascade reference changes', () => {
    const nextState = unset<State>(['a', 'b', 'c', 'string'])(state);

    expect(nextState.a).not.toBe(state.a);
    expect(nextState.a.b).not.toBe(state.a.b);
    expect(nextState.a.b.c).not.toBe(state.a.b.c);
    expect(nextState.a.b.c.string).not.toBe(state.a.b.c.string);
    expect(nextState.a.b.c.string).toBeUndefined();
    expect(nextState.a.b.c.number).toBe(state.a.b.c.number);
  });
});
