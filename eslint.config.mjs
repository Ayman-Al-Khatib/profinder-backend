import globals from 'globals';
import pluginJs from '@eslint/js';

export default [
  {
    files: ['**/*.js'],

    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        ...globals.browser,
        __dirname: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
      },
    },
  },
  pluginJs.configs.recommended,
];
