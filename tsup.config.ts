import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/generator.ts', 'src/bin.ts'],
  format: ['cjs'],
  target: 'node18',
  platform: 'node',
  sourcemap: true,
  dts: true,
  clean: true,
  splitting: false,
  outDir: 'dist',
  minify: false,
  shims: false,
  treeshake: false,
  skipNodeModulesBundle: true,
});
