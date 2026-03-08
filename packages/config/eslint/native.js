import { react } from "./react.js";

/** @type {import("eslint").Linter.Config[]} */
export const native = [
  ...react,
  {
    rules: {
      "react/display-name": "off",
    },
  },
];
