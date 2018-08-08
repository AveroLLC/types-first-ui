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

import { Action, IReducer, SingleActionEpic } from './types';

export type ActionCreator<TAction extends Action> = (
  payload: TAction['payload']
) => TAction;

export interface ActionImplementation<
  TAction extends TAllActions,
  TState extends object,
  TAllActions extends Action,
  TEpicDependencies extends object
> {
  constant: TAction['type'];
  creator: ActionCreator<TAction>;
  reducer?: IReducer<TState, TAction>;
  epic?: SingleActionEpic<TAllActions, TAction, TState, TEpicDependencies>;
}

export interface ActionImplementer<
  TState extends object,
  TOwnActions extends TAllActions,
  TAllActions extends Action,
  TEpicDependencies extends object = {}
> {
  action<K extends TOwnActions['type']>(
    constant: K,
    implementation?: {
      reducer?: IReducer<TState, Extract<TOwnActions, { type: K }>>;
      epic?: SingleActionEpic<
        TAllActions,
        Extract<TOwnActions, { type: K }>,
        TState,
        TEpicDependencies
      >;
    }
  ): ActionImplementation<
    Extract<TOwnActions, { type: K }>,
    TState,
    TAllActions,
    TEpicDependencies
  >;
}

export default function createActionImplementer<
  TState extends object,
  TOwnActions extends TAllActions,
  TAllActions extends Action,
  TEpicDependencies extends object = {}
>(): ActionImplementer<TState, TOwnActions, TAllActions, TEpicDependencies> {
  return {
    action: (constant, implementation = {}) => {
      return {
        constant,
        creator: payload =>
          ({ type: constant, payload } as Extract<
            TOwnActions,
            { type: typeof constant }
          >),
        reducer: implementation.reducer,
        epic: implementation.epic,
      };
    },
  };
}
