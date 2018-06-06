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

import * as _ from 'lodash';
import * as React from 'react';
import { Observable, Subscription, combineLatest } from 'rxjs';
import { map, sample } from 'rxjs/operators';
import { Action, Arg0, Dispatch } from './types';
import shallowEqual from './utils/shallowEqual';
import { ActionCreator } from './implementAction';

// A type representing an action creator bound to the store dispatch function
export type BoundActionCreator<
  TAllActions extends Action,
  TActionType extends TAllActions['type']
> = (payload: Extract<TAllActions, { type: TActionType }>['payload']) => void;

export type ObservableMap<TObservableMap> = {
  [K in keyof TObservableMap]: Observable<any>
};
export type ObservableProps<T extends object> = { [P in keyof T]: Observable<T[P]> };
export type ObservablePropsFactory<TObservableProps extends object, TOwnProps> = (
  ownProps?: TOwnProps
) => ObservableProps<TObservableProps>;

export type UnboundActionCreator<
  TAllActions extends Action,
  TBoundCreator extends BoundActionCreator<TAllActions, any>
> = TBoundCreator extends BoundActionCreator<TAllActions, infer ActionType>
  ? ActionCreator<Extract<TAllActions, { type: ActionType }>>
  : never;
export type ActionCreatorMap<
  TActions extends Action,
  TBoundActionProps extends BoundActionProps<TActions, TBoundActionProps>
> = {
  [K in keyof TBoundActionProps]: UnboundActionCreator<TActions, TBoundActionProps[K]>
};
export type ActionCreatorFactory<
  TActions extends Action,
  TBoundActionProps extends BoundActionProps<TActions, TBoundActionProps>,
  TOwnProps
> = (ownProps?: TOwnProps) => ActionCreatorMap<TActions, TBoundActionProps>;

export type BoundActionProps<TAllActions extends Action, TActionProps> = {
  [K in keyof TActionProps]: BoundActionCreator<TAllActions, any>
};

export class Connector<TState extends object, TActions extends Action> {
  private _state$: Observable<TState>;
  private _dispatch: Dispatch<TActions>;

  constructor(state$: Observable<TState>, dispatch: Dispatch<TActions>) {
    this._state$ = state$;
    this._dispatch = dispatch;
  }

  connect<
    TObservableProps extends object,
    TBoundActionProps extends BoundActionProps<TActions, TBoundActionProps> = null,
    TOwnProps = null
  >(
    observablePropsFactory:
      | ObservableProps<TObservableProps>
      | ObservablePropsFactory<TObservableProps, TOwnProps>,
    actionCreatorPropsFactory:
      | ActionCreatorMap<TActions, TBoundActionProps>
      | ActionCreatorFactory<TActions, TBoundActionProps, TOwnProps>
  ) {
    const { _state$, _dispatch } = this;

    return (
      component: React.ComponentClass<TObservableProps & TBoundActionProps & TOwnProps>
    ): React.ComponentClass<TOwnProps> => {
      type ComponentState = TObservableProps & TBoundActionProps;

      return class ConnectedComponent extends React.Component<TOwnProps, ComponentState> {
        // dispatchProps and observablePropValues are passed to render the wrapped component
        // private dispatchProps: TActionProps;
        // private observablePropValues: TObservableProps;
        // state variables to track subscriptions & rendering
        private observablePropSubscription: Subscription;

        // flag to determine if state should be set through assignment or setState
        private _isConstructor = true;

        // private isRenderQueued = true;
        // private renderTimeout = null;

        constructor(props) {
          super(props);

          this.state = {} as ComponentState;

          // Run ownprops through observable props factory
          const observableProps = this.createObservableProps(props);
          // Issue subscription to observable props
          this.subscribeObservableProps(observableProps);
          // Run ownprops through action creator factory
          const actionCreators = this.createActionCreatorProps(props);
          // Bind action creators to dispatch
          this.bindDispatch(actionCreators);

          this._isConstructor = false;
        }

        shouldComponentUpdate(nextProps) {
          // If own props are equal, this is a change coming from state - we should re-render
          if (shallowEqual(this.props, nextProps)) {
            return true;
          }
          // TODO: refactor to not suck
          const obsIsFactory = _.isFunction(observablePropsFactory);
          const actionCreatorsIsFactory = _.isFunction(actionCreatorPropsFactory);
          if (obsIsFactory) {
            this.subscribeObservableProps(this.createObservableProps(nextProps));
          }
          if (actionCreatorsIsFactory) {
            this.bindDispatch(this.createActionCreatorProps(nextProps));
          }
          if (obsIsFactory || actionCreatorsIsFactory) {
            return false;
          }

          return true;
        }

        componentWillUnmount() {
          this.clearSubscription();
        }

        private clearSubscription() {
          if (this.observablePropSubscription != null) {
            this.observablePropSubscription.unsubscribe();
          }
        }

        private createObservableProps = (ownProps: TOwnProps) => {
          if (observablePropsFactory == null) {
            return {} as ObservableProps<TObservableProps>;
          }
          if (_.isFunction(observablePropsFactory)) {
            return observablePropsFactory(ownProps);
          }
          return observablePropsFactory;
        };

        private subscribeObservableProps = (
          observableProps: ObservableProps<TObservableProps>
        ) => {
          this.clearSubscription();

          // TODO: the keys thing is weird, I can get rid of it
          const keys = Object.keys(observableProps) as Array<keyof TObservableProps>;
          this.observablePropSubscription = combineLatest(
            ...keys.map(key => {
              const obs$ = observableProps[key];
              return obs$.pipe(map(value => ({ [key]: value })));
            })
          )
            .pipe(
              sample(_state$),
              map(changes => Object.assign({}, ...changes))
            )
            .subscribe(nextState => {
              if (this._isConstructor) {
                Object.assign(this.state, nextState);
              } else {
                this.setState(nextState);
              }
            });
        };

        private createActionCreatorProps = (ownProps: TOwnProps) => {
          if (actionCreatorPropsFactory == null) {
            return {} as ActionCreatorMap<TActions, TBoundActionProps>;
          }
          if (_.isFunction(actionCreatorPropsFactory)) {
            return actionCreatorPropsFactory(ownProps);
          }
          return actionCreatorPropsFactory;
        };

        private bindDispatch = (
          actionCreators: ActionCreatorMap<TActions, TBoundActionProps>
        ) => {
          const boundCreators = _.mapValues<ActionCreator<any>, (payload) => void>(
            actionCreators,
            actionCreator => {
              return payload => _dispatch(actionCreator(payload));
            }
          ) as TBoundActionProps;

          if (this._isConstructor) {
            Object.assign(this.state, boundCreators);
          } else {
            this.setState(boundCreators);
          }
        };

        render() {
          const childElementProps = Object.assign({}, this.props, this.state);
          // @ts-ignore TODO: can I make the typings happy?
          return React.createElement(component, childElementProps);
        }
      };
    };
  }
}
