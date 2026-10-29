import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const typeStyles = {
  success: {
    container: 'bg-royal-tint border border-royal/30 text-royal',
    icon: CheckCircle2,
    iconColor: 'text-royal'
  },
  error: {
    container: 'bg-red-50 border border-red-200 text-red-900',
    icon: AlertCircle,
    iconColor: 'text-red-600'
  },
  warning: {
    container: 'bg-gold-tint border border-gold-500/40 text-slate-900',
    icon: AlertTriangle,
    iconColor: 'text-gold-600'
  },
  info: {
    container: 'bg-royal-tint border border-royal/20 text-slate-800',
    icon: Info,
    iconColor: 'text-royal'
  }
};

export const Toast = ({
  message,
  title,
  type = 'info',
  onClose,
  className = '',
  ...props
}) => {
  if (!message) return null;

  const style = typeStyles[type] || typeStyles.info;
  const Icon = style.icon;

  return (
    <div
      className={`p-4 rounded-2xl text-xs sm:text-sm flex items-start space-x-3 shadow-md ${style.container} ${className}`}
      role="alert"
      {...props}
    >
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${style.iconColor}`} />
      <div className="flex-1 space-y-0.5">
        {title && <h5 className="font-bold text-slate-900">{title}</h5>}
        <div>{message}</div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
          title="Cufi"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default Toast;