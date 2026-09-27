import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { WalletModal } from "@/components/WalletModal"

const meta = {
  title: "Components/WalletModal",
  component: WalletModal,
  tags: ["autodocs"],
  args: {
    isOpen: true,
    onClose: () => undefined,
    onConnect: async () => ({}),
  },
} satisfies Meta<typeof WalletModal>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
