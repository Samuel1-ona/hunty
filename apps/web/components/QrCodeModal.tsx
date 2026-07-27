"use client";

import { QRCodeSVG } from 'qrcode.react';
import React from 'react';

import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

interface QrCodeModalProps {
  open: boolean;
  onClose: () => void;
  url: string;
}

export const QrCodeModal: React.FC<QrCodeModalProps> = ({ open, onClose, url }) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Scan this QR Code</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center">
          <QRCodeSVG value={url} size={200} className="mt-2" />
          <p className="mt-4 break-all text-center text-sm">{url}</p>
          <Button
            type="button"
            className="mt-6 bg-primary text-white hover:bg-primary/90"
            onClick={onClose}
            aria-label="Close QR code dialog"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
