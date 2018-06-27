import { uglify } from 'rollup-plugin-uglify';

export default {
  input: 'compiled/index.js',
  output: {
    file: 'dist/bundle.js',
    format: 'cjs',
  },
  plugins: [uglify()],
  external: [
    'rxjs',
    'rxjs/ajax',
    'rxjs/operators',
    'types-first-ui',
    'react',
    'lodash',
    'redux-observable',
    'redux',
    'redux-devtools-extension',
  ],
};
