import type { Config } from "tailwindcss";
import sharedPreset from "@my-app/config-tailwind/preset";

export default {
  presets: [sharedPreset as Config],
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config;
