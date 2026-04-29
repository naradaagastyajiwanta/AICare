'use client'

import { HeartPulse } from 'lucide-react'

export default function MobileHeader() {
  return (
    <header className="lg:hidden sticky top-0 z-40 bg-surface-50/90 backdrop-blur-md border-b border-surface-200/60">
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-soft">
            <HeartPulse className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-surface-900 text-sm tracking-tight">AICare</span>
        </div>
        <a
          href="https://NAJWorks.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-surface-300 hover:text-primary-500 transition-colors font-medium tracking-wide"
        >
          NAJWorks.com
        </a>
      </div>
    </header>
  )
}
