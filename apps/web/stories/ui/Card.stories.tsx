import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@hunty/ui"
import { Button } from "@hunty/ui"

const meta = {
  title: "UI/Card",
  component: Card,
  tags: ["autodocs"],
  render: (args) => (
    <Card {...args} className="max-w-sm p-0">
      <CardHeader>
        <CardTitle>Promoted Hunt</CardTitle>
        <CardDescription>Boosted in the arcade spotlight for 24 hours.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-600">Reward pool: 250 XLM</p>
      </CardContent>
      <CardFooter>
        <Button size="sm">Open Hunt</Button>
      </CardFooter>
    </Card>
  ),
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Flat: Story = {
  args: {
    variant: "flat",
  },
}
