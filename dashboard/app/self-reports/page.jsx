'use client'
import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'
import Card from '../../components/ui/Card'
import CircularProgress from '../../components/ui/CircularProgress'
import { SkeletonCard } from '../../components/ui/Skeleton'
import { Calendar, ChevronDown, Pill, Activity, Utensils, Star } from 'lucide-react'

const SCORE_COLORS = {
  green:  { color: '#10b981', bg: '#ecfdf5' },
  yellow: { color: '#d97706', bg: '#fffbeb' },
  red:    { color: '#ef4444', bg: '#fef2f2' },
}

function scoreClass(total) {
  if (total >= 200) return 'green'
  if (total >= 100) return 'yellow'
  return 'red'
}

function ScoreGauge({ value, max = 100, label, color, size = 44 }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <CircularProgress value={Math.round((value / max) * 100)} size={size} strokeWidth={4} color={color}>
        <span className="text-[10px] font-bold" style={{ color }}>{value}</span>
      </CircularProgress>
      <span className="text-[10px] text-surface-400 font-medium">{label}</span>
    </div>
  )
}

export default function SelfReportsPage() {
  const [data, setData] = useState([])
  const [days, setDays] = useState(7)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.getSelfReports(days)
      .then(setData)
      .finally(() => setLoading(false))
  }, [days])

  const byDate = {}
  for (const row of data) {
    const d = row.score_date?.slice(0, 10)
    if (!byDate[d]) byDate[d] = []
    byDate[d].push(row)
  }
  const dates = Object.keys(byDate).sort().reverse()

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-surface-900 tracking-tight">Laporan Harian Pasien</h1>
          <p className="text-sm text-surface-500 mt-1">Skor kesehatan harian: obat, aktivitas, dan pola makan</p>
        </div>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <select
            value={days}
            onChange={e => setDays(Number(e.target.value))}
            className="input pl-9 pr-8 appearance-none cursor-pointer w-44"
          >
            <option value={7}>7 hari terakhir</option>
            <option value={14}>14 hari terakhir</option>
            <option value={30}>30 hari terakhir</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 pointer-events-none" />
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : dates.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-soft p-12 text-center">
          <Star className="w-10 h-10 text-surface-300 mx-auto mb-3" />
          <p className="text-sm text-surface-500 font-medium">Belum ada data laporan</p>
          <p className="text-xs text-surface-400 mt-1">Laporan akan muncul setelah pasien mulai merespons</p>
        </div>
      ) : (
        <div className="space-y-5">
          {dates.map(date => (
            <Card key={date} padding="none" className="overflow-hidden">
              <div className="px-5 py-3.5 bg-surface-50 border-b border-surface-100 flex items-center justify-between">
                <h2 className="text-sm font-bold text-surface-800">
                  {new Date(date + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </h2>
                <Badge variant="outline">{byDate[date].length} pasien</Badge>
              </div>

              <div className="divide-y divide-surface-100">
                {byDate[date].map(row => {
                  const theme = SCORE_COLORS[scoreClass(row.total_score)]
                  return (
                    <div key={row.id} className="px-4 sm:px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-surface-50/40 transition-colors">
                      <div className="flex items-center gap-3 min-w-[180px]">
                        <Avatar name={row.patient_name} size="md" />
                        <div>
                          <p className="text-sm font-bold text-surface-900">{row.patient_name}</p>
                          <p className="text-xs text-surface-400">Total skor</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-5 flex-1">
                        <ScoreGauge
                          value={row.medication_score}
                          max={100}
                          label="Obat"
                          color={row.medication_score >= 100 ? '#10b981' : '#94a3b8'}
                          size={40}
                        />
                        <ScoreGauge
                          value={row.activity_score}
                          max={100}
                          label="Aktivitas"
                          color={row.activity_score >= 100 ? '#f59e0b' : row.activity_score >= 50 ? '#d97706' : '#94a3b8'}
                          size={40}
                        />
                        <ScoreGauge
                          value={row.diet_score}
                          max={100}
                          label="Makan"
                          color={row.diet_score >= 100 ? '#3b82f6' : '#94a3b8'}
                          size={40}
                        />
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <span className="text-lg font-bold" style={{ color: theme.color }}>
                              {row.total_score}
                            </span>
                            <span className="text-xs text-surface-400">/ 300</span>
                          </div>
                          <div className="h-1.5 w-24 bg-surface-100 rounded-full overflow-hidden mt-1">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${(row.total_score / 300) * 100}%`, background: theme.color }}
                            />
                          </div>
                        </div>

                        {row.all_positive ? (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-success-50 text-success-700 text-xs font-bold ring-1 ring-success-200">
                            <Star className="w-3.5 h-3.5 fill-success-500 text-success-500" />
                            Luar Biasa
                          </div>
                        ) : (
                          <div className="w-20" />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
