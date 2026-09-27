import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { EmptyState } from '../shared/components/web/EmptyState'

const meta = {
  title: 'Shared/Web/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
  args: {
    icon: '🗺️',
    title: 'No hunts found',
    description: 'There are no active hunts right now. Check back soon or create your own!',
  },
  parameters: {
    backgrounds: { default: 'light' },
  },
} satisfies Meta<typeof EmptyState>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const WithAction: Story = {
  args: {
    action: { label: 'Create a Hunt', onPress: () => alert('create') },
  },
}
export const NoResults: Story = {
  args: {
    icon: '🔍',
    title: 'No results',
    description: 'Your search did not match any hunts.',
  },
}

export const DefaultDark: Story = { parameters: { backgrounds: { default: 'dark' } } }
export const NoResultsDark: Story = {
  args: {
    icon: '🔍',
    title: 'No results',
    description: 'Your search did not match any hunts.',
  },
  parameters: { backgrounds: { default: 'dark' } },
}
