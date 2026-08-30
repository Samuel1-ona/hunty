import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Header } from '@/components/Header';
import { withWalletContext } from '../support/StoryProviders';

const meta = {
  title: 'Components/Header',
  component: Header,
  tags: ['autodocs'],
  decorators: [(Story) => withWalletContext(<Story />)],
  args: {
    balance: '24.2453',
  },
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
