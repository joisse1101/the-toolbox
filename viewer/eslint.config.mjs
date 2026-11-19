import tseslint from 'typescript-eslint';
import boundaries from 'eslint-plugin-boundaries';
import reactHooks from 'eslint-plugin-react-hooks';

const same = (...keys) => Object.fromEntries(keys.map((k) => [k, `{{ from.captured.${k} }}`]));

export default [
  { ignores: ['**/node_modules/**', '**/dist/**', 'viewer/data/**', '.trees/**', '.scratch/**', '**/.venv/**'] },
  {
    files: ['viewer/{shared,backend,frontend}/**/*.{ts,tsx,js,jsx,mjs}', 'toolkit/**/*.{ts,tsx,js,jsx,mjs}'],
    languageOptions: { parser: tseslint.parser, parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { boundaries },
    settings: {
      'import/resolver': { typescript: { project: false, alwaysTryTypes: false } },
      'boundaries/elements': [
        { type: 'shared', pattern: 'viewer/shared/**', partialMatch: false },
        { type: 'backend', pattern: 'viewer/backend/**', partialMatch: false },
        { type: 'fe-feature', pattern: 'viewer/frontend/src/tools/*/features/*/**', partialMatch: false, capture: ['tool', 'feature'] },
        { type: 'fe-tool-shared', pattern: 'viewer/frontend/src/tools/*/shared/**', partialMatch: false, capture: ['tool'] },
        { type: 'fe-tool', pattern: 'viewer/frontend/src/tools/*/**', partialMatch: false, capture: ['tool'] },
        { type: 'fe-shared', pattern: 'viewer/frontend/src/shared/**', partialMatch: false },
        { type: 'fe-app', pattern: 'viewer/frontend/src/app/**', partialMatch: false },
        { type: 'fe-root', pattern: 'viewer/frontend/**', partialMatch: false },
        { type: 'toolkit', pattern: 'toolkit/**', partialMatch: false },
      ],
    },
    rules: {
      // A file in a zone folder that no element above matches is an error, so a new folder cannot escape the zone rules.
      'boundaries/no-unknown-files': 2,
      'boundaries/dependencies': [2, {
        default: 'disallow',
        policies: [
          { from: { element: { type: 'shared' } }, allow: { to: { element: { type: 'shared' } } } },
          { from: { element: { type: 'backend' } }, allow: { to: { element: { types: ['backend', 'shared'] } } } },
          { from: { element: { type: 'toolkit' } }, allow: { to: { element: { type: 'toolkit' } } } },
          { from: { element: { type: 'fe-shared' } }, allow: { to: { element: { types: ['fe-shared', 'shared'] } } } },
          { from: { element: { type: 'fe-app' } }, allow: { to: { element: { types: ['fe-app', 'fe-tool', 'fe-tool-shared', 'fe-feature', 'fe-shared', 'fe-root', 'shared'] } } } },
          { from: { element: { type: 'fe-root' } }, allow: { to: { element: { types: ['fe-root', 'fe-app', 'fe-tool', 'fe-tool-shared', 'fe-feature', 'fe-shared', 'shared'] } } } },
          { from: { element: { types: ['fe-tool', 'fe-tool-shared'] } }, allow: [
            { to: { element: { types: ['fe-tool', 'fe-tool-shared', 'fe-feature'], captured: same('tool') } } },
            { to: { element: { types: ['fe-app', 'fe-root', 'fe-shared', 'shared'] } } },
          ] },
          { from: { element: { type: 'fe-feature' } }, allow: [
            { to: { element: { type: 'fe-feature', captured: same('tool', 'feature') } } },
            { to: { element: { types: ['fe-tool', 'fe-tool-shared'], captured: same('tool') } } },
            { to: { element: { types: ['fe-app', 'fe-root', 'fe-shared', 'shared'] } } },
          ] },
        ],
      }],
    },
  },
  // General rules: typescript-eslint recommended without type information. no-unused-vars covers unused variables and imports.
  ...tseslint.configs.recommended.map((c) => ({
    ...c,
    files: ['viewer/{shared,backend,frontend,scripts,test}/**/*.{ts,tsx,js,jsx,mjs}', 'toolkit/**/*.{ts,tsx,js,jsx,mjs}'],
  })),
  {
    files: ['viewer/frontend/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 2,
      'react-hooks/exhaustive-deps': 2,
    },
  },
  // These effects leave a dependency out on purpose: one runs once on load, one reveals only when the selected id or its
  // epic/feature changes, and one fits the graph only when the backlog or level changes, and one resets the form only when the saved term's signature changes (the term itself is not the trigger). Adding the dependency would change
  // when they run, so the rule reports noise here and stays on for the rest of the frontend.
  {
    files: ['viewer/frontend/src/tools/backlog/BacklogTool.tsx', 'viewer/frontend/src/tools/backlog/features/graph/GraphTab.tsx', 'viewer/frontend/src/tools/backlog/features/lexicon/LexiconTab.tsx'],
    rules: { 'react-hooks/exhaustive-deps': 0 },
  },
  // The test helper types Response.json() as any on purpose (a global type augmentation), see the comment in the file.
  {
    files: ['viewer/test/helpers/response-json.d.ts'],
    rules: { '@typescript-eslint/no-explicit-any': 0 },
  },
];
