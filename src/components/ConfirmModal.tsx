'use client';

import { useEffect, useRef } from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Focus trap and escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };

    document.addEventListener('keydown', handleEscape);
    modalRef.current?.focus();

    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onCancel}
      />
      
      {/* Modal */}
      <div 
        ref={modalRef}
        tabIndex={-1}
        className="card relative w-full max-w-sm p-6 animate-fade-in"
      >
        <div className="flex flex-col items-center text-center">
          {/* Icon */}
          <div className="icon-container w-14 h-14 mb-4">
            <svg className="w-7 h-7 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          
          {/* Title */}
          <h2 id="modal-title" className="text-lg font-semibold text-zinc-100 mb-2">
            {title}
          </h2>
          
          {/* Message */}
          <p className="text-sm text-zinc-400 mb-6">
            {message}
          </p>
          
          {/* Actions */}
          <div className="flex gap-3 w-full">
            <button
              onClick={onCancel}
              className="btn-secondary flex-1 py-2.5"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className="btn-primary flex-1 py-2.5"
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
