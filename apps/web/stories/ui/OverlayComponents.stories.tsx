import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import CustomToggle from '@/components/ui/CustomToggle';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';

function OverlayExamples() {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <CustomToggle initialValue />
        <Checkbox defaultChecked aria-label="Email players" />
      </div>
      <Textarea defaultValue="Bring the clue card closer to the mural for the reveal." />
      <div className="space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-24 w-full max-w-md" />
      </div>
      <button
        className="rounded-lg bg-slate-900 px-4 py-2 text-white"
        onClick={() => setOpen(true)}
      >
        Open confirm dialog
      </button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Void voucher?"
        description="This action cannot be undone."
        variant="destructive"
        onConfirm={() => undefined}
      />
    </div>
  );
}

const meta = {
  title: 'UI/Controls And Feedback',
  component: OverlayExamples,
  tags: ['autodocs'],
} satisfies Meta<typeof OverlayExamples>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
