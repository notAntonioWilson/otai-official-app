import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        otai: {
          purple: "#7C3AED",
          "purple-hover": "#8B5CF6",
          dark: "#0D0D1A",
          darker: "#000000",
          border: "#1E1E3A",
          gold: "#D4A843",
          text: "#FFFFFF",
          "text-secondary": "#A0A0B0",
          "text-muted": "#6B6B80",
          green: "#22C55E",
          red: "#EF4444",
        },
      },
    },
  },
  plugins: [],
};
export default config;
