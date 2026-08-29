import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0B0B0B",
        panel: "#161616",
        panelHi: "#1E1E1E",
        line: "#292929",
        acid: "#F2FF3D",
        cobalt: "#1F2DD6",
        khaki: "#B7AA8A",
      },
      boxShadow: {
        sheet: "0 -24px 60px rgba(0, 0, 0, 0.65)",
        glow: "0 0 24px rgba(242, 255, 61, 0.35)",
      },
      fontFamily: {
        sans: ["Pretendard Variable", "Pretendard", "-apple-system", "BlinkMacSystemFont", "Apple SD Gothic Neo", "Noto Sans KR", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
