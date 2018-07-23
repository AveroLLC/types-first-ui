import * as React from 'react';
import app from '../redux/connector';
import { ActionTypes, AppActions } from '../redux/interfaces/actions';
import { Paths } from '../redux/paths';
import { Creator } from '../redux/interfaces/app';

interface DataProps {
  counter: number;
}

interface ActionProps {
  add: Creator<ActionTypes.COUNTER_ADD_REQUEST>;
  subtract: Creator<ActionTypes.COUNTER_SUBTRACT>;
}

type Props = DataProps & ActionProps;

export class App extends React.PureComponent<Props> {
  add = () => {
    this.props.add({ tryAddBy: 1 });
  };

  subtract = () => {
    this.props.subtract({ subtractBy: 1 });
  };

  render() {
    return (
      <div>
        <div>{this.props.counter}</div>
        <button onClick={this.add}>Add</button>
        <button onClick={this.subtract}>Subtract</button>
      </div>
    );
  }
}

const observableProps = {
  counter: Paths.COUNTER,
};

const dispatchProps = {
  add: app.actionCreator(ActionTypes.COUNTER_ADD_REQUEST),
  subtract: app.actionCreator(ActionTypes.COUNTER_SUBTRACT),
};

export default app.connect<DataProps, ActionProps>(
  observableProps,
  dispatchProps
)(App);
