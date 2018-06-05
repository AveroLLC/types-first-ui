import { each } from 'lodash';
import { BehaviorSubject } from 'rxjs';
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

const emptyObj = {};

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
  AppCreator<
    TOwnState,
    TAllState,
    TOwnActions,
    TAllActions,
    TFeaturesMap,
    TAllEpicDeps
  > & {
    state$: BehaviorSubject<TAllState>;
  };

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

  const state$: BehaviorSubject<TAllState> = new BehaviorSubject<TAllState>(
    emptyObj as TAllState
  );

  const { path } = createPathFactory<TAllState>(state$);
  const { selector } = createSelectorFactory<TAllState>(state$);
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
    >(state$, externalFeatures, params);
  };

  each(externalFeatures, (feature, subtreeKey: keyof TFeaturesMap) => {
    feature.wireUpState(
      path<keyof TAllState>([subtreeKey], emptyObj as TAllState[keyof TAllState])
    );
  });

  return {
    state$,
    path,
    selector,
    action,
    createApp,
  };
}
