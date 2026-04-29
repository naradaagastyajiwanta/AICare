'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  ClipboardList,
  Grid3X3,
} from 'lucide-react'

const PRIMARY_NAV = [
  { href: '/',             label: 'Overview',       icon: LayoutDashboard },
  { href: '/patients',     label: 'Pasien',         icon: Users },
  { href: '/compliance',   label: 'Kepatuhan',      icon: CheckSquare },
  { href: '/self-reports', label: 'Laporan',        icon: ClipboardList },
]

const OVERFLOW_PATHS = ['/education', '/broadcast', '/knowledge', '/analytics', '/whatsapp']

export default function BottomNav({ onMoreOpen }) {
  const pathname = usePathname()
  const isOverflowActive = OVERFLOW_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-t border-surface-200/60 safe-area-pb">
      <div className="flex items-center justify-around h-16">
        {PRIMARY_NAV.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-center gap-0.5 w-full h-full relative select-none"
            >
              {/* Active indicator */}
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary-500 rounded-full" />
              )}
              <Icon
                className={`w-5 h-5 transition-colors duration-200 ${
                  isActive ? 'text-primary-600' : 'text-surface-400'
                }`}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span
                className={`text-[10px] font-semibold transition-colors duration-200 ${
                  isActive ? 'text-primary-700' : 'text-surface-400'
                }`}
              >
                {label}
              </span>
            </Link>
          )
        })}

        {/* More trigger */}
        <button
          onClick={onMoreOpen}
          className="flex flex-col items-center justify-center gap-0.5 w-full h-full relative select-none"
        >
          {isOverflowActive && (
            <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary-500 rounded-full" />
          )}
          <Grid3X3
            className={`w-5 h-5 transition-colors duration-200 ${
              isOverflowActive ? 'text-primary-600' : 'text-surface-400'
            }`}
            strokeWidth={isOverflowActive ? 2.5 : 2}
          />
          <span
            className={`text-[10px] font-semibold transition-colors duration-200 ${
              isOverflowActive ? 'text-primary-700' : 'text-surface-400'
            }`}
          >
            Lainnya
          </span>
        </button>
      </div>
    </nav>
  )
}
