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

import { each, map, mapValues } from 'lodash';
import { applyMiddleware, createStore, Store } from 'redux';
import { composeWithDevTools } from 'redux-devtools-extension';
import {
  ActionsObservable,
  combineEpics,
  createEpicMiddleware,
  Epic as ReduxEpic,
} from 'redux-observable';
import { BehaviorSubject, Observable } from 'rxjs';
import { pluck } from 'rxjs/operators';
import { Connector } from './connector';
import { ActionCreator, ActionImplementation } from './implementAction';
import { Action, Dispatch, Epic, IReducer, MiddlewareEpic } from './types';
import { get } from './utils/get';
import { set } from './utils/set';

// TODO: check for collisions between state tree and features map?
export type FeaturesMap<TFeaturesMap> = {
  [K in keyof TFeaturesMap]: App<any, any, any, any, any, any>
};

// first we need to gather all feature properties from the map (FeaturesMap[keyof FeaturesMap])
// then, given a union type of features, we need to extract the state generic type from it
export type FeatureState<T> = T extends App<any, infer R, any, any, any, any> ? R : never;
export type FeatureActions<T> = T extends App<any, any, any, infer R, any, any>
  ? R
  : never;
export type FeatureEpicDependencies<T> = T extends App<any, any, any, any, any, infer R>
  ? R
  : never;

export type FeaturesMapState<T extends FeaturesMap<T>> = {
  [K in keyof T]: FeatureState<T[K]>
};
export type FeaturesMapActions<T extends FeaturesMap<T>> = T extends null
  ? never
  : { [K in keyof T]: FeatureActions<T[K]> }[keyof T];
export type FeaturesMapEpicDependencies<T extends FeaturesMap<T>> = {
  [K in keyof T]: FeatureEpicDependencies<T[K]>
};

export type CombinedState<
  TState extends object,
  TFeaturesMap extends FeaturesMap<TFeaturesMap>
> = TFeaturesMap extends null ? TState : TState & FeaturesMapState<TFeaturesMap>;

export type CombinedActions<
  TActions extends Action,
  TFeaturesMap extends FeaturesMap<TFeaturesMap>
> = TActions | FeaturesMapActions<TFeaturesMap>;

export type CombinedEpicDependencies<
  TEpicDependencies extends object,
  TFeaturesMap extends FeaturesMap<TFeaturesMap>
> = TFeaturesMap extends null
  ? TEpicDependencies
  : TEpicDependencies & FeaturesMapEpicDependencies<TFeaturesMap>;

export type ReducerMap<TAllState extends object, TAllActions extends Action> = {
  [K in keyof Partial<TAllActions>]: IReducer<
    TAllState,
    Extract<TAllActions, { type: K }>
  >
};

// An exhaustive map of implementations for all defined action types
export type ActionImplementationMap<
  TState extends object,
  TOwnActions extends TAllActions,
  TAllActions extends Action,
  EpicDependencies extends object
> = {
  [K in TOwnActions['type']]: ActionImplementation<
    Extract<TOwnActions, { type: K }>,
    TState,
    TAllActions,
    EpicDependencies
  >
};

export interface AppCreator<
  TOwnState extends object,
  TAllState extends object,
  TOwnActions extends TAllActions,
  TAllActions extends Action,
  TFeaturesMap extends FeaturesMap<TFeaturesMap> = null,
  TAllEpicDeps extends object = null
> {
  createApp: (
    params: CreateAppParams<TOwnState, TAllState, TOwnActions, TAllActions, TAllEpicDeps>
  ) => App<TOwnState, TAllState, TOwnActions, TAllActions, TFeaturesMap, TAllEpicDeps>;
}

export interface CreateAppParams<
  TOwnState extends object,
  TAllState extends object,
  TOwnActions extends TAllActions,
  TAllActions extends Action,
  TAllEpicDeps extends object
> {
  initialState: TOwnState;
  actions: ActionImplementationMap<TAllState, TOwnActions, TAllActions, TAllEpicDeps>;
  extraEpics?: Array<Epic<TAllActions, TAllActions, TAllEpicDeps>>;
  middleware?: Array<MiddlewareEpic<TAllActions, TAllEpicDeps>>;
}

export class App<
  TOwnState extends object,
  TAllState extends object,
  TOwnActions extends TAllActions,
  TAllActions extends Action,
  TFeatures extends FeaturesMap<TFeatures>,
  TAllEpicDeps extends object
> {
  private _features: TFeatures;
  private _initialState: TOwnState;
  private _implementation: ActionImplementationMap<
    TAllState,
    TOwnActions,
    TAllActions,
    TAllEpicDeps
  >;
  private _extraEpics: Array<Epic<TAllActions, TAllActions, TAllEpicDeps>>;

  private _state$: BehaviorSubject<TAllState>;

  private _dispatch: Dispatch<TAllActions>;
  private _store: Store<TAllState>;

  // TODO: type connector, initialize in constructor
  private _connector: Connector<TAllState, TAllActions>;

  constructor(
    state$: BehaviorSubject<TAllState>,
    features: TFeatures,
    createAppParams: CreateAppParams<
      TOwnState,
      TAllState,
      TOwnActions,
      TAllActions,
      TAllEpicDeps
    >
  ) {
    this._state$ = state$;
    this._features = features;
    this._initialState = createAppParams.initialState;
    this._implementation = createAppParams.actions;
    this._extraEpics = [
      ...(createAppParams.extraEpics || []),
      ...(createAppParams.middleware || []),
    ];

    this._connector = new Connector(this._state$, this.dispatch);
  }

  private getReducers = (): ReducerMap<TAllState, TAllActions> => {
    let reducers = {} as ReducerMap<TAllState, TAllActions>;
    each(this._implementation, (actionImpl, type) => {
      if (actionImpl.reducer == null) {
        return;
      }
      return (reducers[type] = actionImpl.reducer);
    });

    each(this._features, (feature, subTreeKey) => {
      const featureReducers = mapValues(feature.getReducers(), reducer => {
        return (state, action) => {
          const currentState = get([subTreeKey])(state);
          const nextState = reducer(currentState, action);
          return nextState === currentState ? state : set([subTreeKey])(nextState)(state);
        };
      });
      reducers = Object.assign({}, reducers, featureReducers);
    });

    return reducers;
  };

  private getEpics = (): ReduxEpic<
    TAllActions,
    TAllActions,
    TAllState,
    TAllEpicDeps
  >[] => {
    let epics: ReduxEpic<
      TAllActions,
      TAllActions,
      TAllState,
      TAllEpicDeps
    >[] = this._extraEpics.map(epic => (allActions$, state$, deps) =>
      epic(allActions$, deps)
    );

    each(this._implementation, (actionImpl, type) => {
      if (actionImpl.epic == null) {
        return;
      }
      type actionType = typeof actionImpl.constant;
      epics = epics.concat((allActions$, state$, deps) => {
        return actionImpl.epic(
          allActions$.ofType(actionImpl.constant) as ActionsObservable<any>,
          deps,
          allActions$
        );
      });
    });

    each(this._features, (feature, subtreeKey) => {
      const featureEpics = map(feature.getEpics(), epic => {
        return (action$, state$: Observable<TAllState>, epicDependencies) => {
          const stateSubTree$ = state$.pipe(pluck(subtreeKey));
          return epic(action$, stateSubTree$ as any, epicDependencies[subtreeKey]);
        };
      });

      epics = [...epics, ...featureEpics];
    });

    return epics;
  };

  private getInitialState = (): TAllState => {
    const featureInitialState = mapValues<TFeatures, object>(this._features, feature => {
      return feature.getInitialState();
    });

    const allState = Object.assign({}, this._initialState, featureInitialState) as object;
    return allState as TAllState;
  };

  public wireUpState = (state$: Observable<TAllState>) => {
    each(this._features, (app, subtreeKey) => {
      app.wireUpState(state$.pipe(pluck(subtreeKey)));
    });
    state$.subscribe(this._state$);
  };

  private wireUpDispatch = (dispatch: Dispatch<TAllActions>) => {
    each(this._features, (app, subtreeKey) => {
      app.wireUpDispatch(dispatch);
    });

    this._dispatch = dispatch;
  };

  public actionCreator = <K extends TAllActions['type']>(
    type: K
  ): ActionCreator<Extract<TAllActions, { type: K }>> => payload =>
    ({ type, payload } as Extract<TAllActions, { type: K }>);

  // this function makes it "real"
  public createStore = (params: {
    epicDependencies: TAllEpicDeps;
    dev: boolean;
  }): void => {
    const reducerMap = this.getReducers();
    const rootReducer: IReducer<TAllState, TAllActions> = (
      state = this.getInitialState(),
      action: Action
    ) => {
      return reducerMap[action.type] ? reducerMap[action.type](state, action) : state;
    };
    // Create singular root epic that encompases Epics & Middleware (epics that never emit)
    const epics = this.getEpics();
    const rootEpic = combineEpics(...epics);
    const epicMiddleware = createEpicMiddleware<
      TAllActions,
      TAllActions,
      TAllState,
      TAllEpicDeps
    >({
      dependencies: params.epicDependencies
        ? params.epicDependencies
        : ({} as TAllEpicDeps),
    });

    const reduxMiddleware = params.dev
      ? composeWithDevTools(applyMiddleware(epicMiddleware))
      : applyMiddleware(epicMiddleware);

    const store = createStore<TAllState, TAllActions, {}, {}>(
      rootReducer,
      reduxMiddleware
    );

    epicMiddleware.run(rootEpic);
    let currentState = store.getState();
    this._state$.next(currentState);
    store.subscribe(() => {
      const nextState = store.getState();
      if (currentState === nextState) {
        return;
      }
      this._state$.next(nextState);
      currentState = nextState;
    });

    this.wireUpDispatch(store.dispatch);
  };

  public connect: Connector<TAllState, TAllActions>['connect'] = (...args: any[]) => {
    return this._connector.connect.apply(this._connector, args);
  };

  public dispatch: Dispatch<TAllActions> = action => {
    if (this._dispatch == null) {
      throw new Error(
        'Dispatch is undefined. Initiallize the app instance by calling `app.createStore()`'
      );
    }
    return this._dispatch(action);
  };
}
