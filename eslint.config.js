// @ts-check
import js from '@eslint/js';
import astro from 'eslint-plugin-astro';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { defineConfig } from 'eslint/config';

export default defineConfig(
  { ignores: ['dist/', '.astro/', 'node_modules/', 'gate-reports/'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  ...astro.configs.recommended,
  ...astro.configs['jsx-a11y-strict'],
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  {
    files: ['**/*.astro'],
    rules: {
      // A labelled scroll region (role="region") must be focusable so keyboard users can scroll
      // it (axe: scrollable-region-focusable), e.g. the review specs table.
      'astro/jsx-a11y/no-noninteractive-tabindex': ['error', { roles: ['tabpanel', 'region'] }],
    },
  },
);
