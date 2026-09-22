import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "#E2E8F0",
        input: "#E2E8F0",
        ring: "#16805B",
        background: "#F8FAFC",
        surface: "#FFFFFF",
        foreground: "#0F172A",
        primary: {
          DEFAULT: "#16805B", // Official EduConnects Emerald Teal
          hover: "#0D5C41",   // Primary Dark
          dark: "#0D5C41",
          light: "#35A979",  // Primary Light
          soft: "#F0FAF5",   // Primary Soft Background
          foreground: "#FFFFFF",
        },
        home: {
          DEFAULT: "#16805B",
          hover: "#0D5C41",
          dark: "#0D5C41",
          accent: "#35A979",
          light: "#F0FAF5",
          tint: "#DCFCE7",
          border: "#E2E8F0",
          foreground: "#FFFFFF",
        },
        accent: {
          DEFAULT: "#35A979",
          hover: "#16805B",
          light: "#F0FAF5",
          foreground: "#0F172A",
        },
        teal: {
          50: "#F0FAF5",
          100: "#E2E8F0",
          200: "#A7F3D0",
          300: "#6EE7B7",
          400: "#35A979",
          500: "#16805B",
          600: "#0D5C41",
          700: "#0A4732",
          800: "#073F3C",
          900: "#052C2A",
          950: "#031B1A",
        },
        navy: {
          900: "#0F172A",
          800: "#1E293B",
          700: "#334155",
        },
        learner: {
          DEFAULT: "#16805B",
          hover: "#0D5C41",
          dark: "#0D5C41",
          accent: "#35A979",
          light: "#F0FAF5",
          tint: "#DCFCE7",
          border: "#A7F3D0",
          foreground: "#FFFFFF",
        },
        educator: {
          DEFAULT: "#16805B",
          hover: "#0D5C41",
          dark: "#0D5C41",
          accent: "#35A979",
          emerald: "#16805B",
          light: "#F0FAF5",
          tint: "#DCFCE7",
          border: "#A7F3D0",
          foreground: "#FFFFFF",
        },
        teacher: {
          DEFAULT: "#16805B",
          hover: "#0D5C41",
          dark: "#0D5C41",
          accent: "#35A979",
          light: "#F0FAF5",
          tint: "#DCFCE7",
          border: "#A7F3D0",
          foreground: "#FFFFFF",
        },
        student: {
          DEFAULT: "#16805B",
          hover: "#0D5C41",
          dark: "#0D5C41",
          accent: "#35A979",
          light: "#F0FAF5",
          tint: "#DCFCE7",
          border: "#A7F3D0",
          foreground: "#FFFFFF",
        },
        admin: {
          DEFAULT: "#0D5C41",
          hover: "#0A4732",
          light: "#F0FAF5",
          foreground: "#FFFFFF",
        },
      },
      borderRadius: {
        lg: "1.25rem",
        md: "0.875rem",
        sm: "0.625rem",
        xl: "1.5rem",
        "2xl": "2rem",
        "3xl": "2.5rem",
        "4xl": "3rem",
      },
      keyframes: {
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-12px)" },
        },
        "float-slow": {
          "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
          "50%": { transform: "translateY(-16px) rotate(3deg)" },
        },
        "orb-spin": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.6", transform: "scale(1)" },
          "50%": { opacity: "0.9", transform: "scale(1.05)" },
        },
        "path-flow": {
          "0%": { strokeDashoffset: "100" },
          "100%": { strokeDashoffset: "0" },
        },
      },
      animation: {
        "float": "float 5s ease-in-out infinite",
        "float-slow": "float-slow 7s ease-in-out infinite",
        "orb-spin": "orb-spin 25s linear infinite",
        "pulse-glow": "pulse-glow 4s ease-in-out infinite",
        "path-flow": "path-flow 3s linear infinite",
      },
      boxShadow: {
        "glass": "0 20px 50px rgba(0, 0, 0, 0.06), 0 10px 20px rgba(37, 99, 235, 0.05), inset 0 1px 1px rgba(255, 255, 255, 0.8)",
        "glass-hover": "0 30px 60px rgba(37, 99, 235, 0.15), 0 12px 24px rgba(0, 0, 0, 0.08), inset 0 1px 2px rgba(255, 255, 255, 0.9)",
        "liquid-button": "0 10px 25px -5px rgba(37, 99, 235, 0.35), 0 4px 10px -2px rgba(0, 0, 0, 0.05)",
      },
      backdropBlur: {
        "2xl": "40px",
        "3xl": "60px",
      },
    },
  },
  plugins: [],
};

export default config;
