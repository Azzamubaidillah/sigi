import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  globalIgnores([".next/**", "dist-worker/**", "coverage/**"]),
  {
    /**
     * Views read and shape; adapters talk to providers. A view that imports an
     * adapter has either taken on a provider's concerns or is using something
     * that was filed in the wrong place — and in the one case this caught, it
     * was the second: `asterEpochSchedule` made no request and held no client,
     * it just turned a timestamp into the protocol's weekly boundaries.
     *
     * The boundary held everywhere else on its own. This is here so that stays
     * true by construction rather than by everyone remembering.
     */
    files: ["src/views/**/*.ts", "app/**/*.ts", "app/**/*.tsx"],
    // Tests are exempt, and not as a concession: a test proving a view reads
    // what a collector wrote has to drive both sides, so seeding a fixture
    // through the real adapter is the point rather than a shortcut.
    ignores: ["**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "**/integrations/**",
                "@/src/integrations/**",
                "../integrations/**",
                "../../integrations/**",
              ],
              message:
                "Views and pages must not import from src/integrations. Adapters fetch from providers; if what you need is domain logic rather than a request, move it out of the adapter.",
            },
          ],
        },
      ],
    },
  },
]);
