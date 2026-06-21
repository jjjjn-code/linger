import type { Config } from "tailwindcss";

/**
 * Design tokens for a calm, restrained fintech aesthetic.
 * - Neutral greys do all the structural work.
 * - A single accent is used sparingly, for the primary action / priority signal.
 * - Product imagery is meant to be the only real colour on screen.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Neutral near-black to soft grey ramp.
        ink: {
          DEFAULT: "#1a1a1a", // primary text
          soft: "#3b3b3b", // strong secondary text
          muted: "#6e6e6e", // secondary data (brand, days, category)
          faint: "#9c9c9a", // tertiary / placeholder
        },
        line: {
          DEFAULT: "#e3e3e0", // dividers, card borders
          strong: "#d5d5d1", // input borders
        },
        surface: {
          DEFAULT: "#fbfbfa", // cards — tonal off-white on the grey canvas
          page: "#eaeae7", // page background — soft neutral grey
          sunken: "#f1f1ee", // image wells, subtle fills
        },
        // The single warm accent — a soft coral-red. Used sparingly for the
        // most important signal and for destructive actions. Never decorative.
        accent: {
          DEFAULT: "#e0533a",
          hover: "#c8452e",
          soft: "#fbece7",
        },
        // Destructive actions/states (let go, delete) share the warm-red family.
        danger: {
          DEFAULT: "#cf4a33",
          hover: "#b43c28",
          soft: "#fbeee9",
        },
        // A warm amber-orange, used only for time-sensitive flags.
        flag: {
          DEFAULT: "#c2740c",
          soft: "#fbf0dd",
        },
      },
      borderRadius: {
        // Soft, generous squircle radii.
        card: "20px",
        control: "12px",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        // Monospace carries all the data + technical labels.
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      fontSize: {
        // Quiet hierarchy through size + weight, not colour.
        meta: ["0.75rem", { lineHeight: "1rem", letterSpacing: "0.01em" }],
        // Smaller eyebrow label for ALL-CAPS field labels (with the wider
        // letter-spacing all-caps needs).
        label: ["0.625rem", { lineHeight: "0.875rem", letterSpacing: "0.06em" }],
      },
      boxShadow: {
        // Minimal — a single hair-soft lift for raised surfaces (modal).
        soft: "0 1px 2px rgba(16,24,40,0.04)",
        lift: "0 12px 40px -12px rgba(16,24,40,0.18)",
      },
      maxWidth: {
        shell: "1120px",
      },
    },
  },
  plugins: [],
};

export default config;
