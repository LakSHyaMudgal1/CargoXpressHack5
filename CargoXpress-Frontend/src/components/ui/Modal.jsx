import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * CargoXpress Accessible Modal / Dialog
 * Keyboard escape handling, body lock, focus restoration, smooth entrance.
 */
export const Modal = ({
  isOpen = false,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  showClose = true,
}) => {
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);
  const onCloseRef = useRef(onClose);

  // Keep latest onClose callback in ref without re-triggering modal effect on parent state changes
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!isOpen) return;

    previousActiveElement.current = document.activeElement;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onCloseRef.current?.();
      } else if (e.key === 'Tab' && modalRef.current) {
        // Trap focus inside modal
        const focusables = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;

        const firstElement = focusables[0];
        const lastElement = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    // Focus initial form element on modal open only (never steal focus if user is already focused inside modal)
    const timer = setTimeout(() => {
      if (modalRef.current) {
        if (modalRef.current.contains(document.activeElement)) {
          return;
        }
        // Prefer an input/textarea/select or autofocus element over the close "X" button
        const formField = modalRef.current.querySelector(
          '[autofocus], input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled])'
        );
        if (formField) {
          formField.focus();
        } else {
          const firstFocusable = modalRef.current.querySelector(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          firstFocusable?.focus();
        }
      }
    }, 50);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-canvas/80 backdrop-blur-sm transition-opacity duration-200 motion-reduce:transition-none"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Surface */}
      <div
        ref={modalRef}
        className={`relative w-full ${sizes[size] || sizes.md} bg-surface-elevated border border-border-strong rounded-lg shadow-elevated-card overflow-hidden z-10 transition-all duration-200 transform scale-100 animate-in fade-in zoom-in-95 motion-reduce:transition-none motion-reduce:animate-none`}
      >
        {/* Header */}
        {(title || showClose) && (
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border/80">
            <div>
              {title && (
                <h3 className="text-base sm:text-lg font-semibold text-ink tracking-tight">
                  {title}
                </h3>
              )}
              {description && (
                <p className="text-xs sm:text-sm text-ink-muted mt-1">
                  {description}
                </p>
              )}
            </div>

            {showClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="p-1.5 rounded-lg text-ink-subtle hover:text-ink hover:bg-surface-hover transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="p-5 sm:p-6 max-h-[75vh] overflow-y-auto">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 p-4 sm:p-5 border-t border-border/60 bg-surface-subtle/50">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
