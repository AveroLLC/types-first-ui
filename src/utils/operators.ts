import * as _ from 'lodash';
import { combineLatest, EMPTY, Observable, OperatorFunction } from 'rxjs';
import {
  debounce,
  distinctUntilChanged,
  map,
  publishReplay,
  refCount,
} from 'rxjs/operators';

// Thanks to our lord and savior, kpdonn:
// https://github.com/Microsoft/TypeScript/issues/16656#issuecomment-373974378
type InferredTuple<T> = T[] & { '0': any };

type ExtractObs<T> = T extends Observable<infer R> ? R : never;
type ResultTypes<T extends Observable<any>[]> = { [K in keyof T]: ExtractObs<T[K]> };

export function latestBatched<T extends InferredTuple<Observable<any>>>(
  inputs: T
): Observable<ResultTypes<T>> {
  // @ts-ignore
  return combineLatest(inputs).pipe(
    // pass through the value and index
    map((v, i) => ({ v, i })),
    // do not debounce for the very first emission, batch synchronous change together
    // for all subsequent emissions
    debounce(next => (next.i == 0 ? EMPTY : Promise.resolve())),
    // map back to the raw value
    map(next => next.v)
  );
}

export function reuse<T>(): OperatorFunction<T, T> {
  return src => {
    return src.pipe(
      distinctUntilChanged(),
      publishReplay(1),
      refCount()
    );
  };
}

export function selector<T extends InferredTuple<Observable<any>>, R>(
  inputs: T,
  operator: OperatorFunction<ResultTypes<T>, R>
) {
  return latestBatched(inputs).pipe(
    operator as OperatorFunction<any, R>,
    reuse()
  );
}

export type ParameterizedSelector<P extends any[], R> = (...inputs: P) => Observable<R>;
export type MemoizedSelector<P extends any[], R> = ParameterizedSelector<P, R> & {
  _cache: Map<P, Observable<R>>;
};
export function memoizedSelector<P extends any[], R>(
  selector: ParameterizedSelector<P, R>
): MemoizedSelector<P, R> {
  const cache = new Map<P, Observable<R>>();

  function memoized(...inputs: P) {
    let cacheHit: Observable<R> = null;

    for (let key of cache.keys()) {
      if (_.isEqual(key, inputs)) {
        cacheHit = cache.get(key);
        break;
      }
    }

    if (cacheHit == null) {
      cacheHit = selector(...inputs).pipe(
        src => {
          return new Observable<R>(subscriber => {
            const sub = src.subscribe(subscriber);

            return () => {
              sub.unsubscribe();
              cache.delete(inputs);
            };
          });
        },
        reuse<R>()
      );

      cache.set(inputs, cacheHit);
    }

    return cacheHit;
  }

  memoized._cache = cache;

  return memoized;
}
