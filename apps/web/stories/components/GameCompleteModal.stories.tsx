import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { GameCompleteModal } from "@/components/GameCompleteModal"
import { withQueryClient } from "../support/StoryProviders"

const meta = {
  title: "Components/GameCompleteModal",
  component: GameCompleteModal,
  tags: ["autodocs"],
  decorators: [
    (Story) => withQueryClient(<Story />),
  ],
  args: {
    isOpen: true,
    reward: 42,
    onClose: () => undefined,
    onGoHome: () => undefined,
    onReplay: () => undefined,
    onViewLeaderboard: () => undefined,
  },
} satisfies Meta<typeof GameCompleteModal>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
