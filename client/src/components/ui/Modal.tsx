import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export function Modal({ open, onClose, title, children, maxWidth = '420px' }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto py-8 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div 
        className="bg-[var(--ledger-paper-bg)] border border-[var(--ledger-paper-border)] w-full my-auto rounded-md p-6 overflow-y-auto shadow-[8px_8px_0_rgba(0,0,0,0.35)] animate-in zoom-in-95 duration-200"
        style={{ maxWidth, maxHeight: 'min(100%, calc(100dvh - 4rem))' }}
      >
        {title && (
          <div className="flex items-center justify-between mb-6">
            <h2 style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '20px', color: 'var(--ink)', letterSpacing: '-0.02em' }}>
              {title}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-sm text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
