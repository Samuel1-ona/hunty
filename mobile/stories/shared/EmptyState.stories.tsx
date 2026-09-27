import type { Meta, StoryObj } from '@storybook/react-native'
import { View } from 'react-native'
import { EmptyState } from '../../shared/components/native/EmptyState'

const meta = {
  title: 'Shared/Native/EmptyState',
  component: EmptyState,
  decorators: [
    (Story) => (
      <View style={{ flex: 1, padding: 16 }}>
        <Story />
      </View>
    ),
  ],
  args: {
    icon: '🗺️',
    title: 'No hunts found',
    description: 'There are no active hunts right now. Check back soon or create your own!',
  },
} satisfies Meta<typeof EmptyState>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const WithAction: Story = {
  args: {
    action: { label: 'Create a Hunt', onPress: () => {} },
  },
}
export const NoResults: Story = {
  args: {
    icon: '🔍',
    title: 'No results',
    description: 'Your search did not match any hunts.',
  },
}
