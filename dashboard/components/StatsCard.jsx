'use client'

import CircularProgress from './ui/CircularProgress'
import Sparkline from './ui/Sparkline'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

const COLOR_MAP = {
  blue:   { color: '#2563eb', bg: '#eff6ff', text: '#1d4ed8' },
  green:  { color: '#16a34a', bg: '#f0fdf4', text: '#15803d' },
  yellow: { color: '#d97706', bg: '#fffbeb', text: '#b45309' },
  red:    { color: '#dc3528', bg: '#fef2f0', text: '#b8281d' },
  orange: { color: '#ea580c', bg: '#fff7ed', text: '#c2410c' },
  emerald:{ color: '#059669', bg: '#ecfdf5', text: '#047857' },
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
  const trendColor = trend > 0 ? 'text-primary-600' : trend < 0 ? 'text-danger-600' : 'text-surface-400'

  return (
    <div className="bg-white rounded-xl border border-surface-200 shadow-sm p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {Icon && (
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: theme.bg }}
              >
                <Icon className="w-4 h-4" style={{ color: theme.color }} />
              </div>
            )}
            <p className="text-xs font-medium text-surface-500 uppercase tracking-wide">{title}</p>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-2xl font-bold text-surface-900">{value}</p>
            {trend !== undefined && (
              <span className={`flex items-center gap-0.5 text-xs font-medium ${trendColor}`}>
                <TrendIcon className="w-3 h-3" />
                {Math.abs(trend)}%
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-surface-400 mt-1">{subtitle}</p>
          )}
        </div>

        <div className="flex flex-col items-end gap-2">
          {showProgress && (
            <CircularProgress value={progress} size={44} strokeWidth={4} color={theme.color}>
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
