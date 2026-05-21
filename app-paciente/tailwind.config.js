export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#840705',
        secondary: '#B8423D',
        danger: '#5A0404',
        warning: '#D9664D',
        info: '#A65652',
        muted: '#94A3B8',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

