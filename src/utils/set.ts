import { set as fpSet } from 'lodash/fp';
import { StateTransform } from '../types';

export function set<T extends object>(path: string[]) {
  return function(value: any): StateTransform<T> {
    return fpSet(path.join('.'), value) as StateTransform<T>;
  };
}
