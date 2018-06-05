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
  epic?: SingleActionEpic<TAllActions, TAction, TEpicDependencies>;
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
