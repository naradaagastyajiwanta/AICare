'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const nav = [
  { href: '/',            label: 'Overview',   icon: '📊' },
  { href: '/patients',    label: 'Pasien',      icon: '👥' },
  { href: '/compliance',  label: 'Kepatuhan',   icon: '✅' },
  { href: '/broadcast',   label: 'Broadcast',   icon: '📢' },
  { href: '/analytics',   label: 'Analitik',    icon: '📈' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-60 shrink-0 bg-white border-r border-gray-200 min-h-screen flex flex-col">
      <div className="px-6 py-5 border-b border-gray-200">
        <p className="text-lg font-bold text-green-600">AICare</p>
        <p className="text-xs text-gray-400 mt-0.5">Sistem Reminder Obat</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map(({ href, label, icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              pathname === href
                ? 'bg-green-50 text-green-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <span className="text-base">{icon}</span>
            {label}
          </Link>
        ))}
      </nav>

      <div className="px-6 py-4 border-t border-gray-200">
        <p className="text-xs text-gray-400">Posyandu Dashboard v1.0</p>
      </div>
    </aside>
  )
}
