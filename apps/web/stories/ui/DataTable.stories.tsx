import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { DataTable, type Column } from '@/components/ui/data-table';

type VoucherRow = {
  id: string;
  owner: string;
  balance: number;
  status: string;
};

const columns: Column<VoucherRow>[] = [
  { key: 'owner', header: 'Owner', sortable: true, filterable: true },
  { key: 'balance', header: 'Balance', sortable: true },
  { key: 'status', header: 'Status', sortable: true, filterable: true },
];

const data: VoucherRow[] = [
  { id: '1', owner: 'GABCD...1234', balance: 100, status: 'Issued' },
  { id: '2', owner: 'GZXCV...9999', balance: 0, status: 'Redeemed' },
  { id: '3', owner: 'GQWER...4567', balance: 25, status: 'Void' },
];

function VoucherTableStory() {
  return (
    <DataTable
      columns={columns}
      data={data}
      selectable
      getRowId={(row) => row.id}
      onExport={() => undefined}
    />
  );
}

const meta = {
  title: 'UI/DataTable',
  component: VoucherTableStory,
  tags: ['autodocs'],
} satisfies Meta<typeof VoucherTableStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
