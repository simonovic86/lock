'use client';

import { useEffect, useRef, useState } from 'react';
import QRCodeLib from 'qrcode';

interface QRCodeProps {
  value: string;
  size?: number;
  className?: string;
}

export function QRCode({ value, size = 200, className = '' }: QRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (canvasRef.current && value) {
      QRCodeLib.toCanvas(canvasRef.current, value, {
        width: size,
        margin: 2,
        color: {
          dark: '#18181b', // zinc-900
          light: '#fafafa', // zinc-50
        },
      }).catch(() => setError(true));
    }
  }, [value, size]);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-zinc-800 rounded-lg ${className}`} style={{ width: size, height: size }}>
        <p className="text-xs text-zinc-500">QR generation failed</p>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={`rounded-lg ${className}`}
    />
  );
}

interface QRCodeModalProps {
  url: string;
  isOpen: boolean;
  onClose: () => void;
}

export function QRCodeModal({ url, isOpen, onClose }: QRCodeModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-sm mx-4 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-zinc-100">Scan to Open</h3>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex justify-center mb-4">
          <QRCode value={url} size={240} />
        </div>
        
        <p className="text-xs text-zinc-500 text-center">
          Scan this QR code with your phone to open the vault
        </p>
      </div>
    </div>
  );
}

