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
  BookOpenText,
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
  { href: '/guide',        label: 'Panduan',        icon: BookOpenText },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 shrink-0 bg-surface-50/90 border-r border-surface-200/60 min-h-screen flex flex-col sticky top-0 backdrop-blur-sm">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-surface-200/60 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-soft">
          <HeartPulse className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-[15px] font-bold text-surface-900 leading-tight tracking-tight">AICare</p>
          <p className="text-[11px] text-surface-400 leading-tight mt-0.5">Sistem Reminder Obat</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? 'bg-primary-50 text-primary-700 shadow-sm'
                  : 'text-surface-500 hover:bg-surface-100 hover:text-surface-800'
              }`}
            >
              <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary-100 text-primary-600'
                  : 'bg-transparent text-surface-400 group-hover:text-surface-500 group-hover:bg-surface-100'
              }`}>
                <Icon className="w-[18px] h-[18px]" />
              </span>
              {label}
              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-500" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-surface-200/60">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-success-500 animate-pulse" />
          <p className="text-xs text-surface-400 font-medium">Sistem aktif</p>
        </div>
        <div className="mt-2 pt-2 border-t border-surface-100">
          <a
            href="https://NAJWorks.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-surface-300 hover:text-primary-500 transition-colors font-medium tracking-wide"
          >
            NAJWorks.com
          </a>
        </div>
      </div>
    </aside>
  )
}
