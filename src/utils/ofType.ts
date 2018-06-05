import { ofType as rxOfType } from 'redux-observable';
import { Action } from '../types';
import { Observable } from 'rxjs';

export default function ofType<T extends Action, K extends string>(...key: K[]) {
  return (source: Observable<T>): Observable<Extract<T, { type: K }>> => {
    return source.pipe(rxOfType(...key));
  };
}
