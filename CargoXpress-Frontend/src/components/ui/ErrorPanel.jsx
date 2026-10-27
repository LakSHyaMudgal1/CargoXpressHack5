import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import Button from './Button';

/**
 * CargoXpress ErrorPanel Component
 * Clear error feedback with optional retry action.
 */
export const ErrorPanel = ({
  title = 'Failed to load data',
  message,
  onRetry,
  className = '',
}) => {
  return (
    <div className={`p-4 sm:p-5 rounded-lg border border-signal-coral/30 bg-signal-coral/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-md bg-signal-coral/10 border border-signal-coral/20 flex items-center justify-center text-signal-coral shrink-0 mt-0.5 sm:mt-0">
          <AlertCircle className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-ink tracking-tight">
            {title}
          </h4>
          {message && (
            <p className="text-xs sm:text-sm text-ink-muted mt-0.5 leading-relaxed">
              {message}
            </p>
          )}
        </div>
      </div>

      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onRetry}
          leftIcon={RotateCcw}
          className="shrink-0"
        >
          Retry
        </Button>
      )}
    </div>
  );
};

export default ErrorPanel;
