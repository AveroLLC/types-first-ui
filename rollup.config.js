import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import babel from 'rollup-plugin-babel';

export default {
  input: 'compiled/index.js',
  output: {
    file: 'dist/bundle.js',
    format: 'cjs',
  },
  plugins: [
    resolve(),
    commonjs({
      include: 'node_modules/**',
      namedExports: {
        'node_modules/lodash/lodash.js': [
          'isFunction',
          'mapValues',
          'each',
          'last',
          'initial',
          'map',
        ],
        'node_modules/lodash/fp.js': ['get', 'set', 'flow'],
      },
    }),
    babel({
      plugins: ['lodash'],
      presets: [['@babel/env', { targets: { node: 6 }, modules: false }]],
    }),
  ],
  // indicate which modules should be treated as external
  external: ['rxjs', 'rxjs/ajax', 'rxjs/operators', 'types-first-ui', 'react'],
};
