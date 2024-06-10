export default {
  entry: ["src/index.ts"],
  // split CJS and ESM formats
  splitting: true,
  format: ["cjs", "esm"],
  outDir: "dist",
  sourcemap: true,
  tsconfig: "tsconfig.json",
  experimentalDts: true,
}
