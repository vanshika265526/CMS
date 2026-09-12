import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#ffffff",
        foreground: "#000000",
        surface: "#ffffff",
        "surface-container-low": "#ffffff",
        "surface-container-lowest": "#ffffff",
        "surface-container": "#fcfcfc",
        "surface-container-highest": "#f5f5f5",
        "on-surface": "#000000",
        "primary-indigo": "#000000",
        "outline-variant": "#e5e5e5",
      },
      backgroundImage: {
        "mono-gradient": "linear-gradient(to right, #000000, #333333)",
      },
      fontFamily: {
        display: ["var(--font-dm-sans)", "sans-serif"],
        utility: ["var(--font-inter)", "sans-serif"],
      },
      boxShadow: {
        ambient: "0 2px 12px rgba(0, 0, 0, 0.04)",
      },
    },
  },
  plugins: [],
};
export default config;
