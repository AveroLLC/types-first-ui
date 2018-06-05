import Enzyme from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import * as React from 'react';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BoundActionCreator } from './connector';
import createTypesafeRedux from './typesafeRedux';

Enzyme.configure({ adapter: new Adapter() });
const { shallow, render, mount } = Enzyme;

interface State {
  counter: number;
}

enum ActionTypes {
  INCREMENT = 'INCREMENT',
  DECREMENT = 'DECREMENT',
}

interface ActionsMap {
  [ActionTypes.INCREMENT]: {
    type: ActionTypes.INCREMENT;
    payload: { amount: number };
  };
  [ActionTypes.DECREMENT]: {
    type: ActionTypes.DECREMENT;
    payload: { amount: number };
  };
}

type Actions = ActionsMap[keyof ActionsMap];

function setup() {
  const { action, createApp, selector, path } = createTypesafeRedux<
    State,
    Actions,
    {},
    {}
  >();

  const PATHS = {
    COUNTER: path(['counter'], 0),
  };

  const increment = action(ActionTypes.INCREMENT, {
    reducer: (state, action) => {
      const currentVal = PATHS.COUNTER.get(state);
      return PATHS.COUNTER.set(currentVal + action.payload.amount)(state);
    },
  });
  const decrement = action(ActionTypes.DECREMENT, {
    reducer: (state, action) => {
      const currentVal = PATHS.COUNTER.get(state);
      return PATHS.COUNTER.set(currentVal - action.payload.amount)(state);
    },
  });

  const actionImplementations = {
    [ActionTypes.INCREMENT]: increment,
    [ActionTypes.DECREMENT]: decrement,
  };

  const app = createApp({
    actions: actionImplementations,
    initialState: { counter: 0 },
  });

  app.createStore({
    epicDependencies: {},
    dev: false,
  });

  type BoundCreator<T extends ActionTypes> = BoundActionCreator<Actions, T>;

  interface OwnProps {
    amount?: number;
  }

  interface ObservableProps {
    counter: number;
    counterPlusAmount: number;
  }

  interface ActionCreatorProps {
    increment: BoundCreator<ActionTypes.INCREMENT>;
    decrement: BoundCreator<ActionTypes.DECREMENT>;
  }

  type Props = OwnProps & ObservableProps & ActionCreatorProps;

  const renderSpy = jest.fn();

  class TestComponent extends React.Component<Props> {
    increment = () => {
      this.props.increment({ amount: 1 });
    };

    decrement = () => {
      this.props.decrement({ amount: 1 });
    };

    render() {
      renderSpy(this.props);
      return (
        <div>
          <div id="counter">{this.props.counter}</div>
          <button onClick={this.increment}>increment</button>
          <button onClick={this.decrement}>decrement</button>
        </div>
      );
    }
  }

  return {
    TestComponent,
    renderSpy,
    app,
    actionImplementations,
    PATHS,
  };
}

/**
 * Connector tests:
 * X Component initially renders with the correct values for observable props
 * X When an observable prop emits, component is re-rendered
 * X When an observable prop emits, component is gets the correct value
 * X It subscribes to observable props on mount
 * X It unsubscribes when unmounted
 * - If obs props factory:
 *  X It unsubs & resubs when ownprops change
 * - If OTHER props change
 *  X It keeps same subs as props change
 * - If action creator factory:
 *  - It unsubs & resubs when ownprops change
 * - If OTHER props change
 *  - It keeps same subs as props change
 * X When action creator props are called, the correct action is dispatched

 */

describe('connector', () => {
  let { TestComponent, renderSpy, app, actionImplementations, PATHS } = setup();

  beforeEach(() => {
    const t = setup();
    TestComponent = t.TestComponent;
    renderSpy = t.renderSpy;
    app = t.app;
    actionImplementations = t.actionImplementations;
    PATHS = t.PATHS;
  });

  describe('with factory functions', () => {
    let ConnectedComponent;
    let subscribeSpy;
    let unsubscribeSpy;
    let actionPropsFactorySpy;

    beforeEach(() => {
      subscribeSpy = jest.fn();
      unsubscribeSpy = jest.fn();
      actionPropsFactorySpy = jest.fn();

      const observableProp = new Observable(subscriber => {
        subscribeSpy();

        const sub = PATHS.COUNTER.subscribe(subscriber);

        return () => {
          sub.unsubscribe();
          unsubscribeSpy();
        };
      });

      const observablePropsFactory = ownProps => ({
        counter: observableProp,
        counterPlusAmount: PATHS.COUNTER.pipe(map(val => val + (ownProps.amount || 0))),
      });

      const actionPropsFactory = ownProps => {
        actionPropsFactorySpy();
        return {
          increment: app.actionCreator(ActionTypes.INCREMENT),
          decrement: () => {
            return app.actionCreator(ActionTypes.DECREMENT)({
              amount: ownProps.amount,
            });
          },
        };
      };

      ConnectedComponent = app.connect(observablePropsFactory, actionPropsFactory)(
        TestComponent
      );
    });

    describe('initialization', () => {
      it('issues a subscription to the oberservable props', () => {
        mount(<ConnectedComponent />);
        expect(subscribeSpy).toHaveBeenCalledTimes(1);
      });

      it('renders the component with the initial value from state', () => {
        mount(<ConnectedComponent />);

        expect(renderSpy).toHaveBeenCalledTimes(1);
        const props = renderSpy.mock.calls[0][0];
        expect(props.counter).toEqual(0);
      });

      it('renders the component with latest emitted value', () => {
        app.dispatch(app.actionCreator(ActionTypes.INCREMENT)({ amount: 10 }));
        mount(<ConnectedComponent />);

        expect(renderSpy).toHaveBeenCalledTimes(1);
        const props = renderSpy.mock.calls[0][0];
        expect(props.counter).toEqual(10);
      });
    });

    describe('observable props', () => {
      it('re-renders the component when the observable emits', () => {
        mount(<ConnectedComponent />);

        expect(renderSpy).toHaveBeenCalledTimes(1);
        let props = renderSpy.mock.calls[0][0];
        expect(props.counter).toEqual(0);

        app.dispatch(app.actionCreator(ActionTypes.INCREMENT)({ amount: 12 }));

        expect(renderSpy).toHaveBeenCalledTimes(2);
        props = renderSpy.mock.calls[1][0];
        expect(props.counter).toEqual(12);
      });

      it('re-issues subscriptions when ownProps change', () => {
        const component = mount(<ConnectedComponent />);

        expect(renderSpy).toHaveBeenCalledTimes(1);
        let props = renderSpy.mock.calls[0][0];
        expect(props.counter).toEqual(0);
        expect(props.amount).toEqual(undefined);

        component.setProps({ amount: 7 });

        expect(renderSpy).toHaveBeenCalledTimes(2);
        props = renderSpy.mock.calls[1][0];
        expect(props.counter).toEqual(0);
        expect(props.amount).toEqual(7);

        expect(unsubscribeSpy).toHaveBeenCalledTimes(1);
        expect(subscribeSpy).toHaveBeenCalledTimes(2);
      });

      it('should correctly inject own props into observable props factory', () => {
        app.dispatch(app.actionCreator(ActionTypes.INCREMENT)({ amount: 1 }));
        mount(<ConnectedComponent amount={7} />);

        expect(renderSpy).toHaveBeenCalledTimes(1);
        let props = renderSpy.mock.calls[0][0];
        expect(props.counterPlusAmount).toEqual(8);
      });

      it('maintains existing subscriptions when observable rops emit', () => {
        mount(<ConnectedComponent />);

        app.dispatch(app.actionCreator(ActionTypes.INCREMENT)({ amount: 12 }));
        expect(renderSpy).toHaveBeenCalledTimes(2);

        expect(unsubscribeSpy).toHaveBeenCalledTimes(0);
        expect(subscribeSpy).toHaveBeenCalledTimes(1);
      });
    });

    describe('action creators', () => {
      it('should dispatch actions from action creators', () => {
        mount(<ConnectedComponent />);

        expect(renderSpy).toHaveBeenCalledTimes(1);
        let props = renderSpy.mock.calls[0][0];
        props.increment({ amount: 1 });

        expect(renderSpy).toHaveBeenCalledTimes(2);
        props = renderSpy.mock.calls[1][0];
        expect(props.counter).toEqual(1);
      });

      it('should correctly inject own props into action creator factory', () => {
        mount(<ConnectedComponent amount={7} />);

        expect(renderSpy).toHaveBeenCalledTimes(1);
        let props = renderSpy.mock.calls[0][0];
        props.decrement();

        expect(renderSpy).toHaveBeenCalledTimes(2);
        props = renderSpy.mock.calls[1][0];
        expect(props.counter).toEqual(-7);
      });

      it('should re-run the action props factory when ownprops change', () => {
        const component = mount(<ConnectedComponent />);
        expect(actionPropsFactorySpy).toHaveBeenCalledTimes(1);

        component.setProps({ amount: 7 });
        expect(actionPropsFactorySpy).toHaveBeenCalledTimes(2);
      });

      it('should not re-run the action props factory when other props change', () => {
        mount(<ConnectedComponent />);
        expect(actionPropsFactorySpy).toHaveBeenCalledTimes(1);

        app.dispatch(app.actionCreator(ActionTypes.INCREMENT)({ amount: 12 }));
        expect(actionPropsFactorySpy).toHaveBeenCalledTimes(1);
      });
    });

    describe('teardown', () => {
      it('unsubscribes a subscription to the oberservable props', () => {
        const component = mount(<ConnectedComponent />);
        expect(subscribeSpy).toHaveBeenCalledTimes(1);

        component.unmount();
        expect(unsubscribeSpy).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('without factory functions', () => {
    let ConnectedComponent;
    let subscribeSpy;
    let unsubscribeSpy;

    beforeEach(() => {
      subscribeSpy = jest.fn();
      unsubscribeSpy = jest.fn();

      const observableProp = new Observable(subscriber => {
        subscribeSpy();

        const sub = PATHS.COUNTER.subscribe(subscriber);

        return () => {
          sub.unsubscribe();
          unsubscribeSpy();
        };
      });

      const observablePropsFactory = {
        counter: observableProp,
      };

      const actionPropsFactory = {
        increment: app.actionCreator(ActionTypes.INCREMENT),
      };

      ConnectedComponent = app.connect(observablePropsFactory, actionPropsFactory)(
        TestComponent
      );
    });

    describe('initialization', () => {
      it('issues a subscription to the oberservable props', () => {
        mount(<ConnectedComponent />);
        expect(subscribeSpy).toHaveBeenCalledTimes(1);
      });

      it('renders the component with the initial value from state', () => {
        mount(<ConnectedComponent />);

        expect(renderSpy).toHaveBeenCalledTimes(1);
        const props = renderSpy.mock.calls[0][0];
        expect(props.counter).toEqual(0);
      });

      it('renders the component with latest emitted value', () => {
        app.dispatch(app.actionCreator(ActionTypes.INCREMENT)({ amount: 10 }));
        mount(<ConnectedComponent />);

        expect(renderSpy).toHaveBeenCalledTimes(1);
        const props = renderSpy.mock.calls[0][0];
        expect(props.counter).toEqual(10);
      });
    });

    describe('observable props', () => {
      it('re-renders the component when the observable emits', () => {
        mount(<ConnectedComponent />);

        expect(renderSpy).toHaveBeenCalledTimes(1);
        let props = renderSpy.mock.calls[0][0];
        expect(props.counter).toEqual(0);

        app.dispatch(app.actionCreator(ActionTypes.INCREMENT)({ amount: 12 }));

        expect(renderSpy).toHaveBeenCalledTimes(2);
        props = renderSpy.mock.calls[1][0];
        expect(props.counter).toEqual(12);
      });

      it('does not re-issue subscriptions when ownProps change', () => {
        const component = mount(<ConnectedComponent />);

        expect(renderSpy).toHaveBeenCalledTimes(1);
        let props = renderSpy.mock.calls[0][0];
        expect(props.counter).toEqual(0);
        expect(props.amount).toEqual(undefined);

        component.setProps({ amount: 7 });

        expect(renderSpy).toHaveBeenCalledTimes(2);
        props = renderSpy.mock.calls[1][0];
        expect(props.counter).toEqual(0);
        expect(props.amount).toEqual(7);

        expect(unsubscribeSpy).toHaveBeenCalledTimes(0);
        expect(subscribeSpy).toHaveBeenCalledTimes(1);
      });

      it('maintains existing subscriptions when observable props emit', () => {
        mount(<ConnectedComponent />);

        app.dispatch(app.actionCreator(ActionTypes.INCREMENT)({ amount: 12 }));
        expect(renderSpy).toHaveBeenCalledTimes(2);

        expect(unsubscribeSpy).toHaveBeenCalledTimes(0);
        expect(subscribeSpy).toHaveBeenCalledTimes(1);
      });

      it('re-renders when own props emit', () => {
        const component = mount(<ConnectedComponent amount={2} />);

        expect(renderSpy).toHaveBeenCalledTimes(1);
        let props = renderSpy.mock.calls[0][0];
        expect(props.amount).toEqual(2);

        component.setProps({ amount: 7 });

        expect(renderSpy).toHaveBeenCalledTimes(2);
        props = renderSpy.mock.calls[1][0];
        expect(props.amount).toEqual(7);
      });
    });

    describe('action creators', () => {
      it('should dispatch actions from action creators', () => {
        mount(<ConnectedComponent />);

        expect(renderSpy).toHaveBeenCalledTimes(1);
        let props = renderSpy.mock.calls[0][0];
        props.increment({ amount: 1 });

        expect(renderSpy).toHaveBeenCalledTimes(2);
        props = renderSpy.mock.calls[1][0];
        expect(props.counter).toEqual(1);
      });
    });

    describe('teardown', () => {
      it('unsubscribes a subscription to the oberservable props', () => {
        const component = mount(<ConnectedComponent />);
        expect(subscribeSpy).toHaveBeenCalledTimes(1);

        component.unmount();
        expect(unsubscribeSpy).toHaveBeenCalledTimes(1);
      });
    });
  });
});
