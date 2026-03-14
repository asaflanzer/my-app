import type { Config } from "tailwindcss";
import sharedPreset from "@my-app/config-tailwind/preset";

export default {
  presets: [sharedPreset as Config],
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
          border: "hsl(var(--card-border))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        "game-banner": {
          DEFAULT: "hsl(var(--game-banner))",
          foreground: "hsl(var(--game-banner-foreground))",
          border: "hsl(var(--game-banner-border))",
        },
        "btn-primary": {
          DEFAULT: "hsl(var(--btn-primary))",
          foreground: "hsl(var(--btn-primary-foreground))",
        },
        "score-dim": "hsl(var(--score-dim))",
        "score-active": "hsl(var(--score-active))",
        me: "hsl(var(--me-color))",
        "me-row": "hsl(var(--me-row-bg))",
        "tinted-btn-bg": "hsl(var(--tinted-btn-bg))",
        "tinted-btn-border": "hsl(var(--tinted-btn-border))",
        "tinted-btn-text": "hsl(var(--tinted-btn-text))",
        "rank-silver": "hsl(var(--rank-silver))",
        "table-header": "hsl(var(--table-header))",
      },
    },
  },
  plugins: [],
} satisfies Config;
