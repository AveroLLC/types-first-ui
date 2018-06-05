import { initial, isFunction, last } from 'lodash';
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
export type Selector<TVal> = Observable<TVal>;

export interface SelectorCreator<TState extends object> {
  selector<A, Result>(
    selector1: Observable<A>,
    projectFn: (arg1: A) => Result,
    opts?: SelectorOptions<Result>
  ): Selector<Result>;
  selector<A, B, Result>(
    selector1: Observable<A>,
    selector2: Observable<B>,
    projectFn: (arg1: A, arg2: B) => Result,
    opts?: SelectorOptions<Result>
  ): Selector<Result>;
  selector<A, B, C, Result>(
    selector1: Observable<A>,
    selector2: Observable<B>,
    selector3: Observable<C>,
    projectFn: (arg1: A, arg2: B, arg3: C) => Result,
    opts?: SelectorOptions<Result>
  ): Selector<Result>;
  selector<A, B, C, D, Result>(
    selector1: Observable<A>,
    selector2: Observable<B>,
    selector3: Observable<C>,
    selector4: Observable<D>,
    projectFn: (arg1: A, arg2: B, arg3: C, arg4: D) => Result,
    opts?: SelectorOptions<Result>
  ): Selector<Result>;
  selector<A, B, C, D, E, Result>(
    selector1: Observable<A>,
    selector2: Observable<B>,
    selector3: Observable<C>,
    selector4: Observable<D>,
    selector5: Observable<E>,
    projectFn: (arg1: A, arg2: B, arg3: C, arg4: D, arg5: E) => Result,
    opts?: SelectorOptions<Result>
  ): Selector<Result>;
  selector<A, B, C, D, E, F, Result>(
    selector1: Observable<A>,
    selector2: Observable<B>,
    selector3: Observable<C>,
    selector4: Observable<D>,
    selector5: Observable<E>,
    selector6: Observable<F>,
    projectFn: (arg1: A, arg2: B, arg3: C, arg4: D, arg5: E, arg6: F) => Result,
    opts?: SelectorOptions<Result>
  ): Selector<Result>;
  selector<A, B, C, D, E, F, G, Result>(
    selector1: Observable<A>,
    selector2: Observable<B>,
    selector3: Observable<C>,
    selector4: Observable<D>,
    selector5: Observable<E>,
    selector6: Observable<F>,
    selector7: Observable<G>,
    projectFn: (arg1: A, arg2: B, arg3: C, arg4: D, arg5: E, arg6: F, arg7: G) => Result,
    opts?: SelectorOptions<Result>
  ): Selector<Result>;
  selector<A, B, C, D, E, F, G, H, Result>(
    selector1: Observable<A>,
    selector2: Observable<B>,
    selector3: Observable<C>,
    selector4: Observable<D>,
    selector5: Observable<E>,
    selector6: Observable<F>,
    selector7: Observable<G>,
    selector8: Observable<H>,
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
  ): Selector<Result>;
  selector<A, B, C, D, E, F, G, H, I, Result>(
    selector1: Observable<A>,
    selector2: Observable<B>,
    selector3: Observable<C>,
    selector4: Observable<D>,
    selector5: Observable<E>,
    selector6: Observable<F>,
    selector7: Observable<G>,
    selector8: Observable<H>,
    selector9: Observable<I>,
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
  ): Selector<Result>;
}

export default function createSelectorFactory<TState extends object>(
  state$: Observable<TState>
): SelectorCreator<TState> {
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

    const selector$ = combineLatest(...inputs).pipe(
      sample(state$),
      map(args => projectFn(...args)),
      distinctUntilChanged(opts.compare),
      publishReplay(1),
      refCount()
    );

    return selector$;
  }

  return { selector };
}
