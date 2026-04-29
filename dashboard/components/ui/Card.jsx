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
      className={`bg-white rounded-2xl shadow-soft ${paddings[padding]} ${hover ? 'transition-all duration-300 hover:shadow-soft-md hover:-translate-y-0.5' : ''} ${className}`}
    >
      {children}
    </div>
  )
}
