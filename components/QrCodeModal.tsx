"use client";

import React from 'react';
import { Dialog, DialogContent } from './ui/dialog';
import { Button } from './ui/button';
import { QRCodeSVG } from 'qrcode.react';

interface QrCodeModalProps {
  open: boolean;
  onClose: () => void;
  url: string;
}

export const QrCodeModal: React.FC<QrCodeModalProps> = ({ open, onClose, url }) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <div className="flex flex-col items-center p-6">
          <h2 className="text-lg font-semibold mb-4">Scan this QR Code</h2>
          <QRCodeSVG value={url} size={200} />
          <p className="mt-4 break-all text-center text-sm">{url}</p>
          <Button className="mt-6 bg-primary text-white hover:bg-primary/90" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
