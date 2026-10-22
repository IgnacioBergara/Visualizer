import { defineConfig } from "vite";

export default defineConfig({
  // En GitHub Pages la app vive en /<repo>/; el workflow define BASE_PATH.
  base: process.env.BASE_PATH ?? "/",
});
