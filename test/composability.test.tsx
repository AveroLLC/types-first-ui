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

import Enzyme from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import * as React from 'react';
import { ActionTypes, makeApp } from './app';
import { RaceOperator } from 'rxjs/internal/observable/race';
import { CounterActionTypes } from './lib';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

Enzyme.configure({ adapter: new Adapter() });
const { shallow, render, mount } = Enzyme;

/**
 * Testing plan:
 * - [X] epic dependency injection
 * - [X] Component connected to the library
 * - [X] Paths and selectors from libs
 * - [X] Paths and selectors from app
 * - Epics using with source
 * - [X] Middleware
 * - [X] Extra epics
 */

// TODO: epic dependencies in create store?
// Update type of epic dependencies to allow null if it is null or {}
// epics api:
//   [X] typesafe redux returns ref to state$ stream
//   [X] typesafe epic api takes $action, deps, $actions
//   [X] "extra epics" for binding to libs functionality
// Think about the name of create store
// Collisions in epic deps
// Collisions in features vs state tree
// remove withsource

interface ObservableProps {
  counter: number;
  counterString: string;
  sum: number;
  name: string;
}

const renderSpy = jest.fn();
class TestComponent extends React.Component<ObservableProps> {
  render() {
    renderSpy(this.props);
    return (
      <div>
        <div id="counter_from_lib">{this.props.counter}</div>
        <div id="sum">{this.props.sum}</div>
        <div id="counter_from_string">{this.props.counterString}</div>
      </div>
    );
  }
}

describe('compasability', () => {
  let ConnectedComponent: React.ComponentClass;
  let middlewareSpy = jest.fn();
  let { app, counterLib, COUNTER, COUNTER_AS_STRING } = makeApp(middlewareSpy);

  beforeEach(() => {
    renderSpy.mockReset();
    middlewareSpy = jest.fn();
    const a = makeApp(middlewareSpy);
    const { SUM, NUMBERS, NAME } = a;
    app = a.app;
    counterLib = a.counterLib;
    COUNTER = a.COUNTER;
    COUNTER_AS_STRING = a.COUNTER_AS_STRING;

    app.createStore({
      epicDependencies: {
        lib: {
          getValue: () => 7,
        },
      },
      dev: false,
    });

    ConnectedComponent = app.connect<ObservableProps, {}>(
      {
        counter: COUNTER,
        counterString: COUNTER_AS_STRING,
        sum: SUM,
        name: NAME,
      },
      null
    )(TestComponent);
  });

  it('should execute selectors from the lib', () => {
    mount(<ConnectedComponent />);
    expect(renderSpy).toHaveBeenCalledTimes(1);
    const props = renderSpy.mock.calls[0][0];
    expect(props.counter).toEqual(0);
    expect(props.sum).toEqual(0);
  });

  it('should allow dispatcing of app actions', () => {
    mount(<ConnectedComponent />);

    app.dispatch(app.actionCreator(ActionTypes.SET_NAME)({ name: 'ted' }));

    expect(renderSpy).toHaveBeenCalledTimes(2);
    const props = renderSpy.mock.calls[1][0];
    expect(props.name).toEqual('ted');
  });

  it('should allow dispatcing of lib actions from app', () => {
    mount(<ConnectedComponent />);

    app.dispatch(app.actionCreator(CounterActionTypes.increment)({ amount: 1 }));

    expect(renderSpy).toHaveBeenCalledTimes(2);
    const props = renderSpy.mock.calls[1][0];
    expect(props.counter).toEqual(1);
  });

  it('should allow dispatcing of lib actions from lib', () => {
    mount(<ConnectedComponent />);

    app.dispatch(counterLib.actionCreator(CounterActionTypes.increment)({ amount: 1 }));

    expect(renderSpy).toHaveBeenCalledTimes(2);
    const props = renderSpy.mock.calls[1][0];
    expect(props.counter).toEqual(1);
  });

  it('should allow components to be connected through the lib', () => {
    ConnectedComponent = counterLib.connect<ObservableProps, {}>(
      {
        counter: COUNTER,
        counterString: COUNTER_AS_STRING,
        sum: of(0),
        name: of('asdf'),
      },
      null
    )(TestComponent);
    mount(<ConnectedComponent />);

    app.dispatch(app.actionCreator(CounterActionTypes.increment)({ amount: 10 }));

    expect(renderSpy).toHaveBeenCalledTimes(2);
    const props = renderSpy.mock.calls[1][0];
    expect(props.counter).toEqual(10);
  });

  it('should allow selectors combined from the app and the lib', () => {
    mount(<ConnectedComponent />);

    app.dispatch(app.actionCreator(CounterActionTypes.increment)({ amount: 10 }));

    expect(renderSpy).toHaveBeenCalledTimes(2);
    const props = renderSpy.mock.calls[1][0];
    expect(props.sum).toEqual(10);
  });

  it('should respect epic dependencies injected into the parent app', () => {
    mount(<ConnectedComponent />);
    app.dispatch(app.actionCreator(CounterActionTypes.incrementEpic)({}));
    expect(renderSpy).toHaveBeenCalledTimes(2);
    const props = renderSpy.mock.calls[1][0];
  });

  it('should invoke middleware epics provided to the app', () => {
    mount(<ConnectedComponent />);
    expect(middlewareSpy).toHaveBeenCalledTimes(0);
    app.dispatch(app.actionCreator(ActionTypes.SET_NAME)({ name: 'a' }));
    expect(middlewareSpy).toHaveBeenCalledTimes(1);
    app.dispatch(app.actionCreator(ActionTypes.SET_NAME)({ name: 'b' }));
    expect(middlewareSpy).toHaveBeenCalledTimes(2);
  });

  it('should invoke extra epics provided to the app', () => {
    mount(<ConnectedComponent />);
    app.dispatch(app.actionCreator(CounterActionTypes.increment)({ amount: 7 }));
    app.dispatch(app.actionCreator(CounterActionTypes.increment)({ amount: 7 }));
    app.dispatch(app.actionCreator(CounterActionTypes.increment)({ amount: 34 }));
    app.dispatch(app.actionCreator(CounterActionTypes.decrement)({ amount: 34 }));

    expect(renderSpy).toHaveBeenCalledTimes(6);
    const props = renderSpy.mock.calls[5][0];
    expect(props.name).toEqual('7734');
  });
});
