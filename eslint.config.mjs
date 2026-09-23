import next from "eslint-config-next";

const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
      // Generated from openapi.json by `npm run gen:api`. Never hand-edited, so
      // never linted: a style complaint about a generated file is noise.
      "lib/api/api-types.ts",
    ],
  },
  ...next,
];

export default config;
