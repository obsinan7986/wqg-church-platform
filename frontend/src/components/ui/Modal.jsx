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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Modal dialog'}
    >
      <div
        className={`w-full ${maxWidth} rounded-t-3xl sm:rounded-2xl bg-white border-t sm:border border-slate-200 shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[90vh] h-[92dvh] sm:h-auto overflow-hidden ${className}`}
        {...props}
      >
        {/* Sticky Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 bg-white shrink-0">
          <div className="flex items-center space-x-2.5 min-w-0 pr-2">
            {Icon && <Icon className="w-5 h-5 text-gold-600 shrink-0" />}
            {title && <h3 className="text-base sm:text-lg font-bold text-royal truncate">{title}</h3>}
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Cufi (Close modal)"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-royal shrink-0"
              title="Cufi (Close)"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Scrollable Modal Body */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 text-xs sm:text-sm text-slate-700 space-y-4">
          {children}
        </div>

        {/* Sticky Modal Footer */}
        {footer && (
          <div className="px-5 sm:px-6 py-3.5 border-t border-slate-200 bg-white shrink-0 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pb-safe">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;