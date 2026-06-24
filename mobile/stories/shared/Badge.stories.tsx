import type { Meta, StoryObj } from '@storybook/react-native'
import { View } from 'react-native'
import { Badge } from '../../shared/components/native/Badge'

const meta = {
  title: 'Shared/Native/Badge',
  component: Badge,
  decorators: [
    (Story) => (
      <View style={{ padding: 16 }}>
        <Story />
      </View>
    ),
  ],
  args: { label: 'Badge' },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'success', 'warning', 'error', 'gray'],
    },
  },
} satisfies Meta<typeof Badge>

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = { args: { variant: 'primary', label: 'Primary' } }
export const Success: Story = { args: { variant: 'success', label: 'Completed' } }
export const Warning: Story = { args: { variant: 'warning', label: 'In Progress' } }
export const Error: Story = { args: { variant: 'error', label: 'Failed' } }
export const Gray: Story = { args: { variant: 'gray', label: 'Draft' } }
export const Trending: Story = { args: { variant: 'primary', label: '🔥 Trending' } }
