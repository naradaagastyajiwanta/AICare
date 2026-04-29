'use client'

const VARIANTS = {
  default: 'bg-surface-100 text-surface-700',
  primary: 'bg-primary-50 text-primary-700 ring-1 ring-primary-200',
  success: 'bg-success-50 text-success-700 ring-1 ring-success-200',
  warning: 'bg-warning-50 text-warning-700 ring-1 ring-warning-200',
  danger: 'bg-danger-50 text-danger-700 ring-1 ring-danger-200',
  info: 'bg-info-50 text-info-700 ring-1 ring-info-200',
  outline: 'bg-white text-surface-600 ring-1 ring-surface-200',
  ghost: 'bg-transparent text-surface-500',
}

const DOT_COLORS = {
  default: 'bg-surface-400',
  primary: 'bg-primary-500',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  danger: 'bg-danger-500',
  info: 'bg-info-500',
}

export default function Badge({
  children,
  variant = 'default',
  dot = false,
  pulse = false,
  className = '',
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${VARIANTS[variant]} ${className}`}>
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${DOT_COLORS[variant]} ${pulse ? 'animate-pulse' : ''}`}
        />
      )}
      {children}
    </span>
  )
}
