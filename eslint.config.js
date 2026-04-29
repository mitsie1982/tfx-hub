const tseslint = require('typescript-eslint');

module.exports = tseslint.config({
  files: ['**/*.{ts,tsx,js,jsx}'],
  ignores: ['node_modules', 'dist', 'build', '**/*.d.ts'],
  languageOptions: {
    parser: tseslint.parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: {
    '@typescript-eslint': tseslint.plugin,
  },
  rules: {
    // Add your rules here
  },
});
