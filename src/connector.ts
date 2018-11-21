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

import { isFunction, mapValues } from 'lodash';
import * as React from 'react';
import { Observable, Subscription, combineLatest, of } from 'rxjs';
import { map, sample, catchError } from 'rxjs/operators';
import { Action, Arg0, Dispatch, SanitizeNull } from './types';
import { comparators } from './utils/comparators';

export type ObservableMap<TObservableMap> = {
  [K in keyof TObservableMap]: Observable<any>
};
export type ObservableProps<T extends object> = { [P in keyof T]: Observable<T[P]> };
export type ObservablePropsFactory<TObservableProps extends object, TOwnProps> = (
  ownProps?: TOwnProps
) => ObservableProps<TObservableProps>;

export type ActionCreatorsMap<TAllActions extends Action, TActionProps> = Record<
  keyof TActionProps,
  (...args: any[]) => TAllActions
>;

export class Connector<TState extends object, TActions extends Action> {
  private _state$: Observable<TState>;
  private _dispatch: Dispatch<TActions>;

  constructor(state$: Observable<TState>, dispatch: Dispatch<TActions>) {
    this._state$ = state$;
    this._dispatch = dispatch;
  }

  connect<
    TObservableProps extends object,
    TActionProps extends ActionCreatorsMap<TActions, TActionProps> = null,
    TOwnProps = null
  >(
    observablePropsFactory:
      | ObservableProps<TObservableProps>
      | ObservablePropsFactory<TObservableProps, TOwnProps>,
    actionCreatorProps: TActionProps
  ) {
    const { _state$, _dispatch } = this;

    return (
      component: React.ComponentType<
        SanitizeNull<TObservableProps> &
          SanitizeNull<TActionProps> &
          SanitizeNull<TOwnProps>
      >
    ): React.ComponentType<SanitizeNull<TOwnProps>> => {
      type ComponentState = TObservableProps & TActionProps;

      return class ConnectedComponent extends React.Component<
        SanitizeNull<TOwnProps>,
        ComponentState
      > {
        // dispatchProps and observablePropValues are passed to render the wrapped component
        // private dispatchProps: TActionProps;
        // private observablePropValues: TObservableProps;
        // state variables to track subscriptions & rendering
        private observablePropSubscription: Subscription;

        // flag to determine if state should be set through assignment or setState
        private _isConstructor = true;

        constructor(props) {
          super(props);

          this.state = {} as ComponentState;

          // Run ownprops through observable props factory
          const observableProps = this.createObservableProps(props);
          // Issue subscription to observable props
          this.subscribeObservableProps(observableProps);
          // Run ownprops through action creator factory
          const actionCreators =
            actionCreatorProps || ({} as ActionCreatorsMap<TActions, TActionProps>);
          // Bind action creators to dispatch
          this.bindDispatch(actionCreators);

          this._isConstructor = false;
        }

        shouldComponentUpdate(nextProps) {
          // If own props are equal, this is a change coming from state - we should re-render
          if (comparators.shallowEqual(this.props, nextProps)) {
            return true;
          }
          // TODO: refactor to not suck
          const obsIsFactory = isFunction(observablePropsFactory);
          if (obsIsFactory) {
            this.subscribeObservableProps(this.createObservableProps(nextProps));
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
          if (isFunction(observablePropsFactory)) {
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
              return obs$.pipe(
                catchError(err => {
                  console.error(
                    `Error evaluating observable property '${key}' of component '${
                      component.name
                    }':\n\n`,
                    err
                  );
                  return of(undefined);
                }),
                map(value => ({ [key]: value }))
              );
            })
          )
            .pipe(
              // sample(_state$),
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

        private bindDispatch = (actionCreators: TActionProps) => {
          const boundCreators = mapValues<
            (...args: any[]) => TActions,
            (...args) => void
          >(actionCreators, actionCreator => {
            return (...args) => _dispatch(actionCreator(...args));
          }) as TActionProps;

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
