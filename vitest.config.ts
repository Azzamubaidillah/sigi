import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  // The same "@/*" -> "./*" alias tsconfig declares. Without it any module
  // importing through the alias cannot be loaded by a test at all, which is
  // the likeliest reason the login route — the only door into the application
  // — had no test until one was written for it.
  resolve: {
    alias: [
      {
        find: /^@\/(.*)$/,
        replacement: fileURLToPath(new URL("./$1", import.meta.url)),
      },
    ],
  },
  test: {
    // app/_lib holds the display formatters. How money reads is a financial
    // correctness concern, not decoration, so those tests run with the rest.
    //
    // `.tsx` is included for components rendered through `react-dom/server`,
    // which needs no DOM environment and so needs no new dependency. That
    // covers what actually goes wrong in these files — a component that throws
    // on a null figure, a legend that drops a row, a percentage at the wrong
    // scale — and not layout, which still has to be looked at.
    include: [
      "src/**/*.test.ts",
      "app/**/*.test.ts",
      "components/**/*.test.tsx",
      "app/**/*.test.tsx",
    ],
  },
});
