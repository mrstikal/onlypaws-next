import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

const config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/utils/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Funnel Sans', ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [forms],
};

export default config;