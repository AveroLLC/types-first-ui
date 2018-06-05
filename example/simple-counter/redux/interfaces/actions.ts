export enum ActionTypes {
  COUNTER_ADD_REQUEST = 'COUNTER_ADD_REQUEST',
  COUNTER_ADD_SUCCESS = 'COUNTER_ADD_SUCCESS',
  COUNTER_SUBTRACT = 'COUNTER_SUBTRACT',
}

export interface ActionInterfaces {
  [ActionTypes.COUNTER_ADD_REQUEST]: {
    type: ActionTypes.COUNTER_ADD_REQUEST;
    payload: { tryAddBy: number };
  };
  [ActionTypes.COUNTER_ADD_SUCCESS]: {
    type: ActionTypes.COUNTER_ADD_SUCCESS;
    payload: { addBy: number };
  };
  [ActionTypes.COUNTER_SUBTRACT]: {
    type: ActionTypes.COUNTER_SUBTRACT;
    payload: { subtractBy: number };
  };
}

export type AppActions = ActionInterfaces[keyof ActionInterfaces];
