'use client'

export default function Card({ children, className = '', hover = false, padding = 'md' }) {
  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6',
  }

  return (
    <div
      className={`bg-white rounded-xl border border-surface-200 shadow-sm ${paddings[padding]} ${hover ? 'transition-all duration-200 hover:shadow-md hover:-translate-y-0.5' : ''} ${className}`}
    >
      {children}
    </div>
  )
}
