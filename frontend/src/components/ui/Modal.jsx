import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export const Modal = ({
  isOpen = false,
  onClose,
  title,
  icon: Icon,
  children,
  footer,
  maxWidth = 'max-w-lg',
  className = '',
  ...props
}) => {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && onClose) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Modal dialog'}
    >
      <div
        className={`w-full ${maxWidth} rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-5 max-h-[90vh] overflow-y-auto ${className}`}
        {...props}
      >
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-200">
          <div className="flex items-center space-x-2.5 min-w-0">
            {Icon && <Icon className="w-5 h-5 text-gold-600 shrink-0" />}
            {title && <h3 className="text-base sm:text-lg font-bold text-royal truncate">{title}</h3>}
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Cufi (Close modal)"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-royal shrink-0"
              title="Cufi (Close)"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="text-xs sm:text-sm text-slate-700">
          {children}
        </div>

        {footer && (
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;