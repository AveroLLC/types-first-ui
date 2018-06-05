import { Observable } from 'rxjs';
import { distinctUntilChanged, map, publishReplay, refCount } from 'rxjs/operators';
import { Selector } from './selectors';
import { StateTransform } from './types';
import { get } from './utils/get';
import { set } from './utils/set';

// A path is a selector that additionally has utility functions to to immutably get & reassign values
// on the state tree
export interface PathAPI<TState extends object, TVal> {
  get: (state: TState) => TVal;
  set: (nextVal: TVal) => StateTransform<TState>;
}
export type Path<TState extends object, TVal> = Selector<TVal> & PathAPI<TState, TVal>;

export interface PathCreator<TState extends object> {
  path<K extends keyof TState>(ks: [K], defaultVal?: TState[K]): Path<TState, TState[K]>;
  path<K extends keyof TState, K1 extends keyof TState[K]>(
    ks: [K, K1],
    defaultVal?: TState[K][K1]
  ): Path<TState, TState[K][K1]>;
  path<
    K extends keyof TState,
    K1 extends keyof TState[K],
    K2 extends keyof TState[K][K1]
  >(
    ks: [K, K1, K2],
    defaultVal?: TState[K][K1][K2]
  ): Path<TState, TState[K][K1][K2]>;
  path<
    K extends keyof TState,
    K1 extends keyof TState[K],
    K2 extends keyof TState[K][K1],
    K3 extends keyof TState[K][K1][K2]
  >(
    ks: [K, K1, K2, K3],
    defaultVal?: TState[K][K1][K2][K3]
  ): Path<TState, TState[K][K1][K2][K3]>;
  path<
    K extends keyof TState,
    K1 extends keyof TState[K],
    K2 extends keyof TState[K][K1],
    K3 extends keyof TState[K][K1][K2],
    K4 extends keyof TState[K][K1][K2][K3]
  >(
    ks: [K, K1, K2, K3, K4],
    defaultVal?: TState[K][K1][K2][K3][K4]
  ): Path<TState, TState[K][K1][K2][K3][K4]>;
  path<
    K extends keyof TState,
    K1 extends keyof TState[K],
    K2 extends keyof TState[K][K1],
    K3 extends keyof TState[K][K1][K2],
    K4 extends keyof TState[K][K1][K2][K3],
    K5 extends keyof TState[K][K1][K2][K3][K4]
  >(
    ks: [K, K1, K2, K3, K4, K5],
    defaultVal?: TState[K][K1][K2][K3][K4][K5]
  ): Path<TState, TState[K][K1][K2][K3][K4][K5]>;
  path<
    K extends keyof TState,
    K1 extends keyof TState[K],
    K2 extends keyof TState[K][K1],
    K3 extends keyof TState[K][K1][K2],
    K4 extends keyof TState[K][K1][K2][K3],
    K5 extends keyof TState[K][K1][K2][K3][K4],
    K6 extends keyof TState[K][K1][K2][K3][K4][K5]
  >(
    ks: [K, K1, K2, K3, K4, K5, K6],
    defaultVal?: TState[K][K1][K2][K3][K4][K5][K6]
  ): Path<TState, TState[K][K1][K2][K3][K4][K5][K6]>;
  path<
    K extends keyof TState,
    K1 extends keyof TState[K],
    K2 extends keyof TState[K][K1],
    K3 extends keyof TState[K][K1][K2],
    K4 extends keyof TState[K][K1][K2][K3],
    K5 extends keyof TState[K][K1][K2][K3][K4],
    K6 extends keyof TState[K][K1][K2][K3][K4][K5],
    K7 extends keyof TState[K][K1][K2][K3][K4][K5][K6]
  >(
    ks: [K, K1, K2, K3, K4, K5, K6, K7],
    defaultVal?: TState[K][K1][K2][K3][K4][K5][K6][K7]
  ): Path<TState, TState[K][K1][K2][K3][K4][K5][K6][K7]>;
  path<
    K extends keyof TState,
    K1 extends keyof TState[K],
    K2 extends keyof TState[K][K1],
    K3 extends keyof TState[K][K1][K2],
    K4 extends keyof TState[K][K1][K2][K3],
    K5 extends keyof TState[K][K1][K2][K3][K4],
    K6 extends keyof TState[K][K1][K2][K3][K4][K5],
    K7 extends keyof TState[K][K1][K2][K3][K4][K5][K6],
    K8 extends keyof TState[K][K1][K2][K3][K4][K5][K6][K7]
  >(
    ks: [K, K1, K2, K3, K4, K5, K6, K7, K8],
    defaultVal?: TState[K][K1][K2][K3][K4][K5][K6][K7][K8]
  ): Path<TState, TState[K][K1][K2][K3][K4][K5][K6][K7][K8]>;
  path<
    K extends keyof TState,
    K1 extends keyof TState[K],
    K2 extends keyof TState[K][K1],
    K3 extends keyof TState[K][K1][K2],
    K4 extends keyof TState[K][K1][K2][K3],
    K5 extends keyof TState[K][K1][K2][K3][K4],
    K6 extends keyof TState[K][K1][K2][K3][K4][K5],
    K7 extends keyof TState[K][K1][K2][K3][K4][K5][K6],
    K8 extends keyof TState[K][K1][K2][K3][K4][K5][K6][K7],
    K9 extends keyof TState[K][K1][K2][K3][K4][K5][K6][K7][K8]
  >(
    ks: [K, K1, K2, K3, K4, K5, K6, K7, K8, K9],
    defaultVal?: TState[K][K1][K2][K3][K4][K5][K6][K7][K8][K9]
  ): Path<TState, TState[K][K1][K2][K3][K4][K5][K6][K7][K8][K9]>;
  path<
    K extends keyof TState,
    K1 extends keyof TState[K],
    K2 extends keyof TState[K][K1],
    K3 extends keyof TState[K][K1][K2],
    K4 extends keyof TState[K][K1][K2][K3],
    K5 extends keyof TState[K][K1][K2][K3][K4],
    K6 extends keyof TState[K][K1][K2][K3][K4][K5],
    K7 extends keyof TState[K][K1][K2][K3][K4][K5][K6],
    K8 extends keyof TState[K][K1][K2][K3][K4][K5][K6][K7],
    K9 extends keyof TState[K][K1][K2][K3][K4][K5][K6][K7][K8],
    K10 extends keyof TState[K][K1][K2][K3][K4][K5][K6][K7][K8][K9]
  >(
    ks: [K, K1, K2, K3, K4, K5, K6, K7, K8, K9, K10],
    defaultVal?: TState[K][K1][K2][K3][K4][K5][K6][K7][K8][K9][K10]
  ): Path<TState, TState[K][K1][K2][K3][K4][K5][K6][K7][K8][K9][K10]>;
}

export default function createPathFactory<TState extends object>(
  state$: Observable<TState>
): PathCreator<TState> {
  const path = (keys: any, defaultVal: any) => {
    const _get = get(keys, defaultVal);
    const _set = set(keys);
    const obs$ = state$.pipe(
      map(_get),
      distinctUntilChanged(),
      publishReplay(1),
      refCount()
    );

    return Object.assign(obs$, {
      get: _get,
      set: _set,
    });
  };

  return { path } as PathCreator<TState>;
}
