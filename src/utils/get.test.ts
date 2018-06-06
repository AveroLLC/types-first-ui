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
