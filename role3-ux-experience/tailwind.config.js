const config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ── Week 1 Design System Palette ──────────────────────────────
        "focus-blue":     "#3B82F6",
        "success-green":  "#22C55E",
        "warning-yellow": "#EAB308",
        "critical-red":   "#EF4444",
        "bg-dark":        "#0F1117",
      },
      fontFamily: {
        sans: ["DM Sans", "Inter", "system-ui", "sans-serif"],
      },
      keyframes: {
        "pulse-slow": {
          "0%, 100%": { opacity: "1" },
          "50%":       { opacity: "0.4" },
        },
      },
      animation: {
        "pulse-slow": "pulse-slow 1.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;