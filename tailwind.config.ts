import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#171717",
        lime: "#d7ff44",
        paper: "#f6f5ef",
        violet: "#6d4aff",
      },
      boxShadow: {
        card: "0 16px 40px rgba(23, 23, 23, 0.10)",
      },
    },
  },
  plugins: [],
} satisfies Config;
