'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

const ICONS = {
  success: <CheckCircle className="w-4 h-4 text-success-600" />,
  error: <AlertCircle className="w-4 h-4 text-danger-600" />,
  info: <Info className="w-4 h-4 text-info-600" />,
}

const STYLES = {
  success: 'border-success-200 bg-success-50',
  error: 'border-danger-200 bg-danger-50',
  info: 'border-info-200 bg-info-50',
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, duration)
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-soft-md min-w-[280px] max-w-sm ${STYLES[t.type]}`}
            >
              {ICONS[t.type]}
              <span className="text-sm font-medium text-surface-800 flex-1">{t.message}</span>
              <button
                onClick={() => removeToast(t.id)}
                className="text-surface-400 hover:text-surface-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

const ToastContext = createContext(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
