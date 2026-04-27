const palette = {
  green:  'bg-green-50  text-green-700  border-green-100',
  blue:   'bg-blue-50   text-blue-700   border-blue-100',
  yellow: 'bg-yellow-50 text-yellow-700 border-yellow-100',
  red:    'bg-red-50    text-red-700    border-red-100',
  gray:   'bg-gray-50   text-gray-700   border-gray-100',
}

export default function StatsCard({ title, value, subtitle, color = 'green' }) {
  return (
    <div className={`rounded-xl border p-5 ${palette[color]}`}>
      <p className="text-sm font-medium opacity-75">{title}</p>
      <p className="text-3xl font-bold mt-1">{value ?? '–'}</p>
      {subtitle && <p className="text-xs mt-1 opacity-60">{subtitle}</p>}
    </div>
  )
}
