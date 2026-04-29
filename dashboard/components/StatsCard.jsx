'use client'

import CircularProgress from './ui/CircularProgress'
import Sparkline from './ui/Sparkline'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

const COLOR_MAP = {
  blue:   { color: '#2563eb', bg: '#eff6ff', text: '#1d4ed8' },
  green:  { color: '#10b981', bg: '#ecfdf5', text: '#059669' },
  yellow: { color: '#d97706', bg: '#fffbeb', text: '#b45309' },
  red:    { color: '#ef4444', bg: '#fef2f2', text: '#dc2626' },
  orange: { color: '#f59e0b', bg: '#fffbeb', text: '#d97706' },
  emerald:{ color: '#10b981', bg: '#ecfdf5', text: '#059669' },
  purple: { color: '#9333ea', bg: '#faf5ff', text: '#7e22ce' },
}

export default function StatsCard({
  title,
  value,
  subtitle,
  color = 'blue',
  progress,
  sparklineData,
  trend,
  icon: Icon,
}) {
  const theme = COLOR_MAP[color] ?? COLOR_MAP.blue
  const showProgress = progress !== undefined
  const showSparkline = sparklineData && sparklineData.length > 1

  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus
  const trendColor = trend > 0 ? 'text-success-600' : trend < 0 ? 'text-danger-600' : 'text-surface-400'

  return (
    <div className="bg-white rounded-2xl shadow-soft p-5 transition-all duration-300 hover:shadow-soft-md hover:-translate-y-0.5">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 mb-2">
            {Icon && (
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: theme.bg }}
              >
                <Icon className="w-5 h-5" style={{ color: theme.color }} />
              </div>
            )}
            <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">{title}</p>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <p className="text-[28px] font-bold text-surface-900 tracking-tight leading-none">{value}</p>
            {trend !== undefined && (
              <span className={`flex items-center gap-0.5 text-xs font-semibold ${trendColor}`}>
                <TrendIcon className="w-3 h-3" />
                {Math.abs(trend)}%
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-surface-400 mt-1.5 font-medium">{subtitle}</p>
          )}
        </div>

        <div className="flex flex-col items-end gap-2">
          {showProgress && (
            <CircularProgress value={progress} size={48} strokeWidth={4} color={theme.color}>
              <span className="text-[10px] font-bold" style={{ color: theme.text }}>
                {progress}%
              </span>
            </CircularProgress>
          )}
          {showSparkline && !showProgress && (
            <Sparkline data={sparklineData} color={theme.color} />
          )}
        </div>
      </div>
    </div>
  )
}
