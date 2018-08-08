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

import { initial, isFunction, last, memoize } from 'lodash';
import { Observable, combineLatest } from 'rxjs';
import {
  distinctUntilChanged,
  map,
  publishReplay,
  refCount,
  sample,
} from 'rxjs/operators';

function strictEquality(a, b) {
  return a === b;
}

export interface SelectorOptions<T> {
  compare: (a: T, b: T) => boolean;
}
// A selector is an observable over the state stream, which can have its source overridden
export type Selector<TState, TVal> = (state$: Observable<TState>) => Observable<TVal>;

export interface SelectorCreator<TState extends object> {
  selector<A, Result>(
    selector1: Selector<TState, A>,
    projectFn: (arg1: A) => Result,
    opts?: SelectorOptions<Result>
  ): Selector<TState, Result>;
  selector<A, B, Result>(
    selector1: Selector<TState, A>,
    selector2: Selector<TState, B>,
    projectFn: (arg1: A, arg2: B) => Result,
    opts?: SelectorOptions<Result>
  ): Selector<TState, Result>;
  selector<A, B, C, Result>(
    selector1: Selector<TState, A>,
    selector2: Selector<TState, B>,
    selector3: Selector<TState, C>,
    projectFn: (arg1: A, arg2: B, arg3: C) => Result,
    opts?: SelectorOptions<Result>
  ): Selector<TState, Result>;
  selector<A, B, C, D, Result>(
    selector1: Selector<TState, A>,
    selector2: Selector<TState, B>,
    selector3: Selector<TState, C>,
    selector4: Selector<TState, D>,
    projectFn: (arg1: A, arg2: B, arg3: C, arg4: D) => Result,
    opts?: SelectorOptions<Result>
  ): Selector<TState, Result>;
  selector<A, B, C, D, E, Result>(
    selector1: Selector<TState, A>,
    selector2: Selector<TState, B>,
    selector3: Selector<TState, C>,
    selector4: Selector<TState, D>,
    selector5: Selector<TState, E>,
    projectFn: (arg1: A, arg2: B, arg3: C, arg4: D, arg5: E) => Result,
    opts?: SelectorOptions<Result>
  ): Selector<TState, Result>;
  selector<A, B, C, D, E, F, Result>(
    selector1: Selector<TState, A>,
    selector2: Selector<TState, B>,
    selector3: Selector<TState, C>,
    selector4: Selector<TState, D>,
    selector5: Selector<TState, E>,
    selector6: Selector<TState, F>,
    projectFn: (arg1: A, arg2: B, arg3: C, arg4: D, arg5: E, arg6: F) => Result,
    opts?: SelectorOptions<Result>
  ): Selector<TState, Result>;
  selector<A, B, C, D, E, F, G, Result>(
    selector1: Selector<TState, A>,
    selector2: Selector<TState, B>,
    selector3: Selector<TState, C>,
    selector4: Selector<TState, D>,
    selector5: Selector<TState, E>,
    selector6: Selector<TState, F>,
    selector7: Selector<TState, G>,
    projectFn: (arg1: A, arg2: B, arg3: C, arg4: D, arg5: E, arg6: F, arg7: G) => Result,
    opts?: SelectorOptions<Result>
  ): Selector<TState, Result>;
  selector<A, B, C, D, E, F, G, H, Result>(
    selector1: Selector<TState, A>,
    selector2: Selector<TState, B>,
    selector3: Selector<TState, C>,
    selector4: Selector<TState, D>,
    selector5: Selector<TState, E>,
    selector6: Selector<TState, F>,
    selector7: Selector<TState, G>,
    selector8: Selector<TState, H>,
    projectFn: (
      arg1: A,
      arg2: B,
      arg3: C,
      arg4: D,
      arg5: E,
      arg6: F,
      arg7: G,
      arg8: H
    ) => Result,
    opts?: SelectorOptions<Result>
  ): Selector<TState, Result>;
  selector<A, B, C, D, E, F, G, H, I, Result>(
    selector1: Selector<TState, A>,
    selector2: Selector<TState, B>,
    selector3: Selector<TState, C>,
    selector4: Selector<TState, D>,
    selector5: Selector<TState, E>,
    selector6: Selector<TState, F>,
    selector7: Selector<TState, G>,
    selector8: Selector<TState, H>,
    selector9: Selector<TState, I>,
    projectFn: (
      arg1: A,
      arg2: B,
      arg3: C,
      arg4: D,
      arg5: E,
      arg6: F,
      arg7: G,
      arg8: H,
      arg9: I
    ) => Result,
    opts?: SelectorOptions<Result>
  ): Selector<TState, Result>;
}

export default function createSelectorFactory<TState extends object>(): SelectorCreator<
  TState
> {
  function selector(...args: any[]) {
    const lastArg = last(args);
    let inputs, projectFn, opts;
    // if the last arg is the project function, then no options were provided
    if (isFunction(lastArg)) {
      inputs = initial(args);
      projectFn = lastArg;
      opts = {
        compare: strictEquality,
      };
    } else {
      opts = lastArg;
      projectFn = args[args.length - 2];
      inputs = args.slice(0, args.length - 2);
    }

    const selector$ = memoize((state$: Observable<TState>) =>
      combineLatest(...inputs.map(input => input(state$))).pipe(
        sample(state$),
        map(args => projectFn(...args)),
        distinctUntilChanged(opts.compare),
        publishReplay(1),
        refCount()
      )
    );

    return selector$;
  }

  return { selector };
}
