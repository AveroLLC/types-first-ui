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

import { Observable } from 'rxjs';

// function that takes a state instance and returns a new, transformed state instance
export type StateTransform<T extends object> = (state: T) => T;

// we differ from redux action defintion in that we require a payload
// having a uniform structure gives us nice inference capabilities
export interface Action {
  type: string;
  payload: object;
}

export type Dispatch<TActions extends Action> = (a: TActions) => void;

export type IReducer<TState extends object, TAction extends Action> = (
  state: TState,
  action: TAction
) => TState;

export type Epic<
  TWatchedAction extends Action,
  TReturnedAction extends Action,
  TState extends object,
  TEpicDependencies extends object
> = (
  action$: Observable<TWatchedAction>,
  state$: Observable<TState>,
  deps: TEpicDependencies
) => Observable<TReturnedAction>;

export type MiddlewareEpic<
  TAllActions extends Action,
  TState extends object,
  TEpicDependencies extends object
> = Epic<TAllActions, never, TState, TEpicDependencies>;

export type AllActionsEpic<
  TAllActions extends Action,
  TState extends object,
  TEpicDependencies extends object
> = Epic<TAllActions, TAllActions, TState, TEpicDependencies>;

export type SingleActionEpic<
  TAllActions extends Action,
  TAction extends TAllActions,
  TState extends object,
  TEpicDependencies extends object
> = (
  action$: Observable<TAction>,
  state$: Observable<TState>,
  deps: TEpicDependencies,
  allActions$: Observable<TAllActions>
) => Observable<TAllActions>;

// Utility - infers the type of the first argument of a function
export type Arg0<T> = T extends (args0: infer R, ...any: any[]) => any ? R : never;
