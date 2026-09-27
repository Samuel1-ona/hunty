import type { Preview } from '@storybook/nextjs-vite'
import { ThemeProvider } from 'next-themes'

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },

    a11y: {
      test: 'todo'
    }
  },

  decorators: [
    (Story) => (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <Story />
      </ThemeProvider>
    ),
  ],
}

export default preview