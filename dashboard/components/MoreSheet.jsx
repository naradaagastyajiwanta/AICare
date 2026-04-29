'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen,
  Megaphone,
  Brain,
  BarChart3,
  MessageCircle,
  BookOpenText,
  X,
} from 'lucide-react'

const OVERFLOW_NAV = [
  { href: '/education', label: 'Edukasi',      icon: BookOpen },
  { href: '/broadcast', label: 'Broadcast',    icon: Megaphone },
  { href: '/knowledge', label: 'Knowledge',    icon: Brain },
  { href: '/analytics', label: 'Analitik',     icon: BarChart3 },
  { href: '/whatsapp',  label: 'WhatsApp',     icon: MessageCircle },
  { href: '/guide',     label: 'Panduan',      icon: BookOpenText },
]

export default function MoreSheet({ open, onClose }) {
  const pathname = usePathname()

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="lg:hidden fixed bottom-0 left-0 right-0 z-[70] bg-white rounded-t-3xl shadow-soft-lg max-h-[70vh] flex flex-col"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-surface-300 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-5 py-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-surface-800">Menu Lainnya</h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-surface-400 hover:bg-surface-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Watermark */}
            <div className="px-5 pb-1">
              <a
                href="https://NAJWorks.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-surface-300 hover:text-primary-500 transition-colors font-medium tracking-wide"
              >
                Dibuat oleh NAJWorks.com
              </a>
            </div>

            {/* Grid */}
            <div className="px-5 pb-8 pt-2 grid grid-cols-3 gap-3 overflow-y-auto">
              {OVERFLOW_NAV.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href || pathname.startsWith(href + '/')
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={onClose}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all duration-200 ${
                      isActive
                        ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-200'
                        : 'bg-surface-50 text-surface-600 hover:bg-surface-100'
                    }`}
                  >
                    <Icon
                      className={`w-6 h-6 ${isActive ? 'text-primary-600' : 'text-surface-400'}`}
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                    <span className="text-xs font-semibold text-center leading-tight">{label}</span>
                  </Link>
                )
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
