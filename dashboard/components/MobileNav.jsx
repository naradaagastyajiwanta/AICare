'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
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
  Menu,
  X,
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

export default function MobileNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <>
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-40 bg-surface-50/90 backdrop-blur-md border-b border-surface-200/60">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-soft">
              <HeartPulse className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-surface-900 text-sm tracking-tight">AICare</span>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="p-2 -mr-2 rounded-xl text-surface-600 hover:bg-surface-100 transition-colors"
            aria-label="Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Drawer Overlay */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden fixed inset-0 bg-black/30 backdrop-blur-sm z-50"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="lg:hidden fixed top-0 left-0 bottom-0 w-[280px] bg-surface-50 z-50 shadow-soft-lg flex flex-col"
            >
              {/* Drawer Header */}
              <div className="px-5 py-4 border-b border-surface-200/60 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-soft">
                    <HeartPulse className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-surface-900 leading-tight tracking-tight">AICare</p>
                    <p className="text-[10px] text-surface-400 leading-tight">Sistem Reminder Obat</p>
                  </div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="p-2 -mr-2 rounded-xl text-surface-400 hover:bg-surface-100 transition-colors"
                  aria-label="Tutup"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation */}
              <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {nav.map(({ href, label, icon: Icon }) => {
                  const isActive = pathname === href || pathname.startsWith(href + '/')
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-primary-50 text-primary-700 shadow-sm'
                          : 'text-surface-500 hover:bg-surface-100 hover:text-surface-800'
                      }`}
                    >
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-primary-100 text-primary-600'
                          : 'bg-transparent text-surface-400'
                      }`}>
                        <Icon className="w-[18px] h-[18px]" />
                      </span>
                      {label}
                      {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-500" />}
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
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
