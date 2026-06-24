import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../shared/components/web/Card'

const meta = {
  title: 'Shared/Web/Card',
  component: Card,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['default', 'flat', 'ghost'] },
  },
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

const CardExample = (args: React.ComponentProps<typeof Card>) => (
  <Card {...args}>
    <CardHeader>
      <CardTitle>Hunt Card</CardTitle>
      <CardDescription>A sample hunt card description</CardDescription>
    </CardHeader>
    <CardContent>
      <p className="text-sm">Card body content goes here.</p>
    </CardContent>
    <CardFooter>
      <span className="text-xs text-muted-foreground">Footer info</span>
    </CardFooter>
  </Card>
)

export const Default: Story = { render: (args) => <CardExample {...args} />, args: { variant: 'default' } }
export const Flat: Story = { render: (args) => <CardExample {...args} />, args: { variant: 'flat' } }
export const Ghost: Story = { render: (args) => <CardExample {...args} />, args: { variant: 'ghost' } }
export const Clickable: Story = {
  render: (args) => <CardExample {...args} />,
  args: { variant: 'default', onPress: () => alert('clicked') },
}
