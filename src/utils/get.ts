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
