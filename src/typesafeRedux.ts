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

import {
  App,
  AppCreator,
  CombinedActions,
  CombinedEpicDependencies,
  CombinedState,
  FeaturesMap,
  CreateAppParams,
} from './createApp';
import createActionImplementer, { ActionImplementer } from './implementAction';
import createPathFactory, { PathCreator } from './paths';
import createSelectorFactory, { SelectorCreator } from './selectors';
import { Action } from './types';

export type TypesafeRedux<
  TOwnState extends object,
  TAllState extends object,
  TOwnActions extends TAllActions,
  TAllActions extends Action,
  TAllEpicDeps extends object = null,
  TFeaturesMap extends FeaturesMap<TFeaturesMap> = null
> = PathCreator<TAllState> &
  SelectorCreator<TAllState> &
  ActionImplementer<TAllState, TOwnActions, TAllActions, TAllEpicDeps> &
  AppCreator<TOwnState, TAllState, TOwnActions, TAllActions, TFeaturesMap, TAllEpicDeps>;

export default function createTypesafeRedux<
  TOwnState extends object,
  TOwnActions extends Action,
  TOwnEpicDeps extends object = {},
  TFeaturesMap extends FeaturesMap<TFeaturesMap> = null
>(
  externalFeatures: TFeaturesMap = null
): TypesafeRedux<
  TOwnState,
  CombinedState<TOwnState, TFeaturesMap>,
  TOwnActions,
  CombinedActions<TOwnActions, TFeaturesMap>,
  CombinedEpicDependencies<TOwnEpicDeps, TFeaturesMap>,
  TFeaturesMap
> {
  type TAllState = CombinedState<TOwnState, TFeaturesMap>;
  type TAllActions = CombinedActions<TOwnActions, TFeaturesMap>;
  type TAllEpicDeps = CombinedEpicDependencies<TOwnEpicDeps, TFeaturesMap>;

  const { path } = createPathFactory<TAllState>();
  const { selector } = createSelectorFactory<TAllState>();
  const { action } = createActionImplementer<
    TAllState,
    TOwnActions,
    TAllActions,
    TAllEpicDeps
  >();
  const createApp = (
    params: CreateAppParams<TOwnState, TAllState, TOwnActions, TAllActions, TAllEpicDeps>
  ) => {
    return new App<
      TOwnState,
      TAllState,
      TOwnActions,
      TAllActions,
      TFeaturesMap,
      TAllEpicDeps
    >(externalFeatures, params);
  };

  return {
    path,
    selector,
    action,
    createApp,
  };
}
