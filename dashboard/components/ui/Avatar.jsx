'use client'

const COLORS = [
  'bg-primary-100 text-primary-700',
  'bg-blue-100 text-blue-700',
  'bg-success-100 text-success-700',
  'bg-warning-100 text-warning-700',
  'bg-danger-100 text-danger-700',
  'bg-indigo-100 text-indigo-700',
  'bg-teal-100 text-teal-700',
  'bg-orange-100 text-orange-700',
]

function hashString(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h)
  return Math.abs(h)
}

export default function Avatar({ name, size = 'md', className = '' }) {
  const initials = name
    ?.split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? '?'

  const colorClass = COLORS[hashString(name ?? '') % COLORS.length]

  const sizeClasses = {
    sm: 'w-7 h-7 text-[10px]',
    md: 'w-9 h-9 text-xs',
    lg: 'w-12 h-12 text-sm',
    xl: 'w-16 h-16 text-base',
  }

  return (
    <div
      className={`inline-flex items-center justify-center rounded-full font-semibold shrink-0 ${colorClass} ${sizeClasses[size]} ${className}`}
      title={name}
    >
      {initials}
    </div>
  )
}
