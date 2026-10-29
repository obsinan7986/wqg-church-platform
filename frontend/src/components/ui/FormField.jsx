import React, { forwardRef } from 'react';

export const FormField = forwardRef(({
  as = 'input', // 'input' | 'select' | 'textarea'
  label,
  id,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  helperText,
  required = false,
  disabled = false,
  options = [], // [{ value, label }] for select
  rows = 3,
  icon: Icon,
  className = '',
  containerClassName = '',
  children,
  ...props
}, ref) => {
  const inputId = id || name;
  const hasAsterisk = typeof label === 'string' && label.includes('*');
  const baseInputStyles = `w-full bg-white border rounded-xl px-3.5 py-2.5 text-slate-900 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-royal focus-visible:ring-2 focus-visible:ring-royal/20 transition-all disabled:opacity-50 disabled:bg-slate-100 disabled:cursor-not-allowed ${
    error ? 'border-red-500 focus:border-red-600 focus-visible:ring-red-200' : 'border-slate-300'
  } ${Icon ? 'pl-10' : ''} ${className}`;

  return (
    <div className={`space-y-1.5 ${containerClassName}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-slate-700 font-bold block text-xs"
        >
          {label} {required && !hasAsterisk && <span className="text-gold-600 font-bold">*</span>}
        </label>
      )}

      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Icon className="w-4 h-4" />
          </div>
        )}

        {children && as !== 'select' ? (
          children
        ) : as === 'textarea' ? (
          <textarea
            ref={ref}
            id={inputId}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            rows={rows}
            className={`${baseInputStyles} resize-none`}
            {...props}
          />
        ) : as === 'select' ? (
          <select
            ref={ref}
            id={inputId}
            name={name}
            value={value}
            onChange={onChange}
            required={required}
            disabled={disabled}
            className={baseInputStyles}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-white text-slate-900">
                {opt.label}
              </option>
            ))}
            {children}
          </select>
        ) : (
          <input
            ref={ref}
            id={inputId}
            name={name}
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            className={baseInputStyles}
            {...props}
          />
        )}
      </div>

      {error && <p className="text-[11px] text-red-600 font-medium">{error}</p>}
      {helperText && !error && <p className="text-[11px] text-slate-500">{helperText}</p>}
    </div>
  );
});

FormField.displayName = 'FormField';

export default FormField;