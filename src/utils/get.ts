import { get as fpGet } from 'lodash/fp';

export function get<T extends object>(path: string[], defaultVal?: any) {
  return function(state: T) {
    const val = fpGet(path.join('.'), state);
    if (defaultVal !== undefined && val == null) {
      return defaultVal;
    }
    return val;
  };
}
