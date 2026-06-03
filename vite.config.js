import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Vite configuration for incremental CRA -> Vite migration (professionalization sprint).
 *
 * MODERN AGENT: This file added on sub/modern-polish.
 * - Replicates key CRA behaviors for zero app behavior change during transition.
 * - build.outDir = 'build' (not dist) so existing vercel.json, deploy scripts, build/ dir consumers unaffected.
 * - process.env shim via define + loadEnv so all existing `process.env.REACT_APP_*` references in JS/JSX continue to work unchanged (no source edits to env access required yet).
 * - envPrefix supports both REACT_APP_ and VITE_ going forward.
 * - Default npm scripts remain CRA (`npm run build`, `npm start`) for stability. Parallel: `npm run build:vite`, `npm run dev:vite`.
 * - Other parallel agents (data-layer, workbench, polish): if you edit package.json, keep changes additive and leave default "build" + "start" alone. You can test Vite path post `npm install`.
 * - Vite migration in progress - default still CRA for stability. See PROFESSIONALIZATION_REMAINING.md and package.json "modernization" key.
 * - Later: can flip default, update vercel buildCommand if needed, move to dist/, full TS, remove CRA.
 *
 * To use: after `npm install`, `npm run dev:vite` or `npm run build:vite`.
 * Verify: both `npm run build` (CRA) and `npm run build:vite` should succeed and produce runnable build/.
 */

export default defineConfig(({ mode }) => {
  // Load all env (no prefix filter) so we can shim REACT_APP_ ones for process.env compat
  const env = loadEnv(mode, process.cwd(), '');

  // Build a process.env-like object containing only our app env vars (REACT_APP_* and VITE_*)
  const processEnv = {};
  for (const [key, value] of Object.entries(env)) {
    if (key.startsWith('REACT_APP_') || key.startsWith('VITE_')) {
      processEnv[key] = value;
    }
  }

  return {
    plugins: [
      react(),
      // Future: add vite-plugin-svgr() here if we adopt SVG-as-component imports (current assets are static in public/)
    ],
    // Allow importing env as import.meta.env.REACT_APP_FOO or VITE_FOO too (future proof)
    envPrefix: ['REACT_APP_', 'VITE_'],
    // CRITICAL for no source changes: replace process.env.XXX at build time with values
    // so CRA-style code using process.env.REACT_APP_* "just works" under Vite.
    define: {
      'process.env': {
        ...processEnv,
        // Standard
        NODE_ENV: mode === 'production' ? 'production' : 'development',
      },
    },
    build: {
      outDir: 'build', // TEMP: keep CRA output dir for vercel.json rewrites, existing CI, no vercel change needed yet
      emptyOutDir: true,
      sourcemap: false, // match "GENERATE_SOURCEMAP=false" in CRA build script
      // rollupOptions if chunking needed later
    },
    server: {
      port: 3000,
      open: false,
      // proxy not required; /api/* handled by vercel.json rewrites in prod + backend
    },
    preview: {
      port: 3000,
    },
    // Vitest config (not activated in "test" script yet; future `npm run test:vite` or switch)
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/setupTests.js',
      // include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
      // css: true,
    },
    // resolve: { alias: {} } // none from CRA config currently
  };
});
