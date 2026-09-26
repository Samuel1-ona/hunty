import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { HuntCards } from "@/components/HuntCards"

const meta = {
  title: "Components/HuntCards",
  component: HuntCards,
  tags: ["autodocs"],
  args: {
    hunts: [
      {
        id: 1,
        title: "Harbor Lantern Trail",
        description: "Decode harbor markings to unlock the next waypoint.",
        code: "lantern",
        mediaCid: "ipfs://bafybeigdyrztu4example?type=image",
        hint: "Look for the oldest painted dock number.",
        hintCost: 2,
        difficulty: "Medium",
      },
    ],
    isActive: true,
    playerCount: 14,
    currentIndex: 1,
    totalHunts: 4,
    points: 10,
  },
} satisfies Meta<typeof HuntCards>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Solved: Story = {
  args: {
    solved: true,
  },
}
