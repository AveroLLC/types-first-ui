import { ofType } from '../../../../src';

import { delay, mapTo, tap } from 'rxjs/operators';
import { ActionTypes } from '../interfaces/actions';
import { action } from '../interfaces/app';
import { Paths } from '../paths';

const addCounterSuccess = action(ActionTypes.COUNTER_ADD_SUCCESS, {
  reducer: (state, action) => {
    const currentCount = Paths.COUNTER.get(state);
    return Paths.COUNTER.set(currentCount + action.payload.addBy)(state);
  },
});

const addCounterRequest = action(ActionTypes.COUNTER_ADD_REQUEST, {
  epic: action$ => {
    return action$.pipe(
      ofType(ActionTypes.COUNTER_ADD_REQUEST),
      tap(action => {
        console.log(action);
      }),
      delay(1000),
      mapTo(addCounterSuccess.creator({ addBy: 1 }))
    );
  },
});

const subtractCounter = action(ActionTypes.COUNTER_SUBTRACT, {
  reducer: (state, action) => {
    return { counter: state.counter - action.payload.subtractBy };
  },
});

export const implementations = {
  [ActionTypes.COUNTER_ADD_REQUEST]: addCounterRequest,
  [ActionTypes.COUNTER_ADD_SUCCESS]: addCounterSuccess,
  [ActionTypes.COUNTER_SUBTRACT]: subtractCounter,
};
