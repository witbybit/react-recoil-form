import { defineConfig } from 'tsup';

export default defineConfig((options) => {
  return {
    entry: ['src/index.tsx'],
    splitting: false,
    sourcemap: false,
    clean: true,
    dts: true,
    format: ['esm', 'cjs'],
    external: 'react',
    minify: !options.watch,
  };
});
