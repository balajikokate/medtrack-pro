import React from 'react';

export default function Modal({ open, title, onClose, children, footer }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-md">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-surface rounded-xl border border-outline-variant shadow-[0px_4px_20px_rgba(15,82,186,0.15)] w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-md border-b border-outline-variant flex justify-between items-center bg-surface-container-low rounded-t-xl sticky top-0">
          <h3 className="font-headline-sm text-headline-sm text-on-background">{title}</h3>
          <button onClick={onClose} className="text-on-surface-variant hover:text-primary p-xs rounded hover:bg-surface-container">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="p-md">{children}</div>
        {footer && <div className="p-md border-t border-outline-variant flex justify-end gap-sm">{footer}</div>}
      </div>
    </div>
  );
}
