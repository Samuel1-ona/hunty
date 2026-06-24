import type { Meta, StoryObj } from '@storybook/react-native'
import { View } from 'react-native'
import { ThemedCustomText } from '../../components/themed/ThemedCustomText'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../shared/components/native/Card'

const meta = {
  title: 'Shared/Native/Card',
  component: Card,
  decorators: [
    (Story) => (
      <View style={{ padding: 16 }}>
        <Story />
      </View>
    ),
  ],
  argTypes: {
    variant: { control: 'select', options: ['default', 'flat', 'ghost'] },
  },
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

const children = (
  <>
    <CardHeader><CardTitle><ThemedCustomText variant="h3">Hunt Card</ThemedCustomText></CardTitle></CardHeader>
    <CardContent><ThemedCustomText variant="body">Card body content.</ThemedCustomText></CardContent>
    <CardFooter><ThemedCustomText variant="caption">Footer info</ThemedCustomText></CardFooter>
  </>
)

export const Default: Story = { args: { variant: 'default', children } }
export const Flat: Story = { args: { variant: 'flat', children } }
export const Ghost: Story = { args: { variant: 'ghost', children } }
export const Clickable: Story = { args: { variant: 'default', onPress: () => {}, children } }
