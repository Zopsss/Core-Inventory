/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["'DM Sans'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
        display: ["'Syne'", "sans-serif"],
      },
      colors: {
        surface: {
          50:  "#f8f8f6",
          100: "#f0efec",
          200: "#e2e0da",
          800: "#1c1b18",
          900: "#141412",
          950: "#0d0c0a",
        },
        accent: {
          DEFAULT: "#c8f135",
          dark:    "#aad420",
          dim:     "#8fb81a",
        },
        ink: {
          DEFAULT: "#1c1b18",
          muted:   "#6b6960",
          faint:   "#9b9890",
        },
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "6px",
        md: "8px",
        lg: "12px",
        xl: "16px",
      },
      animation: {
        "fade-in":    "fadeIn 0.2s ease-out",
        "slide-up":   "slideUp 0.25s ease-out",
        "slide-in":   "slideIn 0.2s ease-out",
        "pulse-slow": "pulse 3s ease-in-out infinite",
      },
      keyframes: {
        fadeIn:  { from: { opacity: "0" },                      to: { opacity: "1" } },
        slideUp: { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        slideIn: { from: { opacity: "0", transform: "translateX(-8px)" }, to: { opacity: "1", transform: "translateX(0)" } },
      },
    },
  },
  plugins: [],
};
