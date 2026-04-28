'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  CheckSquare,
  BookOpen,
  Megaphone,
  Brain,
  BarChart3,
  MessageCircle,
  HeartPulse,
} from 'lucide-react'

const nav = [
  { href: '/',             label: 'Overview',       icon: LayoutDashboard },
  { href: '/patients',     label: 'Pasien',         icon: Users },
  { href: '/self-reports', label: 'Laporan Harian', icon: ClipboardList },
  { href: '/compliance',   label: 'Kepatuhan',      icon: CheckSquare },
  { href: '/education',    label: 'Edukasi',        icon: BookOpen },
  { href: '/broadcast',    label: 'Broadcast',      icon: Megaphone },
  { href: '/knowledge',    label: 'Knowledge Base', icon: Brain },
  { href: '/analytics',    label: 'Analitik',       icon: BarChart3 },
  { href: '/whatsapp',     label: 'WhatsApp',       icon: MessageCircle },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 shrink-0 bg-white border-r border-surface-200 min-h-screen flex flex-col sticky top-0">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-surface-100 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-sm">
          <HeartPulse className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-[15px] font-bold text-surface-900 leading-tight">AICare</p>
          <p className="text-[11px] text-surface-400 leading-tight mt-0.5">Sistem Reminder Obat</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                isActive
                  ? 'bg-primary-50 text-primary-700 shadow-sm'
                  : 'text-surface-600 hover:bg-surface-50 hover:text-surface-900'
              }`}
            >
              <Icon className={`w-[18px] h-[18px] transition-colors ${isActive ? 'text-primary-600' : 'text-surface-400 group-hover:text-surface-600'}`} />
              {label}
              {isActive && (
                <span className="ml-auto w-1 h-1 rounded-full bg-primary-500" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-surface-100">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
          <p className="text-xs text-surface-400">Sistem aktif</p>
        </div>
        <p className="text-[10px] text-surface-300 mt-1">Dashboard v1.2</p>
      </div>
    </aside>
  )
}
