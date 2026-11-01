/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Arial", "sans-serif"],
        display: ["Poppins", "system-ui", "-apple-system", "Segoe UI", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};
