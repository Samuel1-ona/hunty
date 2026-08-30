import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';

function DialogAndMenusExample() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-4">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>Open dialog</Button>
        </DialogTrigger>
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>Creator spotlight purchase</DialogTitle>
            <DialogDescription>
              Confirm the 1 XLM spotlight placement for the next 24 hours.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      <div className="w-56">
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button variant="outline" className="w-full">
              Open menu
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Duplicate Hunt</DropdownMenuItem>
            <DropdownMenuItem>Archive Hunt</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost">Hover tooltip</Button>
          </TooltipTrigger>
          <TooltipContent>Referral bonus applies after first completion.</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

const meta = {
  title: 'UI/Dialog And Menus',
  component: DialogAndMenusExample,
  tags: ['autodocs'],
} satisfies Meta<typeof DialogAndMenusExample>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
