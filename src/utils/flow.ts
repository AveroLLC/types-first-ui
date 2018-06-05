import { flow as fpFlow } from 'lodash/fp';
import { StateTransform } from '../types';

export function flow<T extends object>(set1: StateTransform<T>): (state: T) => T;
export function flow<T extends object>(
  set1: StateTransform<T>,
  set2: StateTransform<T>
): (state: T) => T;
export function flow<T extends object>(
  set1: StateTransform<T>,
  set2: StateTransform<T>,
  set3: StateTransform<T>
): (state: T) => T;
export function flow<T extends object>(
  set1: StateTransform<T>,
  set2: StateTransform<T>,
  set3: StateTransform<T>,
  set4: StateTransform<T>
): (state: T) => T;
export function flow<T extends object>(
  set1: StateTransform<T>,
  set2: StateTransform<T>,
  set3: StateTransform<T>,
  set4: StateTransform<T>,
  set5: StateTransform<T>
): (state: T) => T;
export function flow<T extends object>(
  set1: StateTransform<T>,
  set2: StateTransform<T>,
  set3: StateTransform<T>,
  set4: StateTransform<T>,
  set5: StateTransform<T>,
  set6: StateTransform<T>
): (state: T) => T;
export function flow<T extends object>(
  set1: StateTransform<T>,
  set2: StateTransform<T>,
  set3: StateTransform<T>,
  set4: StateTransform<T>,
  set5: StateTransform<T>,
  set6: StateTransform<T>,
  set7: StateTransform<T>
): (state: T) => T;
export function flow<T extends object>(
  set1: StateTransform<T>,
  set2: StateTransform<T>,
  set3: StateTransform<T>,
  set4: StateTransform<T>,
  set5: StateTransform<T>,
  set6: StateTransform<T>,
  set7: StateTransform<T>,
  set8: StateTransform<T>
): (state: T) => T;
export function flow<T extends object>(
  set1: StateTransform<T>,
  set2: StateTransform<T>,
  set3: StateTransform<T>,
  set4: StateTransform<T>,
  set5: StateTransform<T>,
  set6: StateTransform<T>,
  set7: StateTransform<T>,
  set8: StateTransform<T>,
  set9: StateTransform<T>
): (state: T) => T;
export function flow<T extends object>(
  set1: StateTransform<T>,
  set2: StateTransform<T>,
  set3: StateTransform<T>,
  set4: StateTransform<T>,
  set5: StateTransform<T>,
  set6: StateTransform<T>,
  set7: StateTransform<T>,
  set8: StateTransform<T>,
  set9: StateTransform<T>,
  set10: StateTransform<T>
): (state: T) => T;

export function flow<T extends object>(...args: any[]): (state: T) => T {
  return fpFlow(...args);
}
