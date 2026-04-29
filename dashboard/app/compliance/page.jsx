'use client'
import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'
import Card from '../../components/ui/Card'
import { SkeletonCard } from '../../components/ui/Skeleton'
import { Calendar, ChevronDown, CheckCircle2, XCircle, HelpCircle, Minus } from 'lucide-react'

const ANSWER_CONFIG = {
  YES:     { label: 'Sudah', variant: 'success', icon: CheckCircle2 },
  NO:      { label: 'Belum', variant: 'danger',  icon: XCircle },
  UNCLEAR: { label: 'Tidak Jelas', variant: 'warning', icon: HelpCircle },
  null:    { label: '–',       variant: 'outline', icon: Minus },
}

const ANSWER_DOT = {
  YES:     'bg-success-500',
  NO:      'bg-danger-500',
  UNCLEAR: 'bg-warning-500',
  null:    'bg-surface-300',
}

function groupByPatient(rows) {
  const map = new Map()
  const dates = new Set()

  for (const row of rows) {
    const date = row.scheduled_date?.slice(0, 10)
    dates.add(date)
    if (!map.has(row.patient_id)) {
      map.set(row.patient_id, {
        id: row.patient_id,
        name: row.patient_name,
        medicine: row.medicine_name,
        days: {},
      })
    }
    map.get(row.patient_id).days[date] = row.answer
  }

  const sortedDates = [...dates].filter(Boolean).sort().reverse()
  return { patients: [...map.values()], dates: sortedDates }
}

export default function CompliancePage() {
  const [data, setData] = useState([])
  const [days, setDays] = useState(14)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.getCompliance(days)
      .then(setData)
      .finally(() => setLoading(false))
  }, [days])

  const { patients, dates } = groupByPatient(data)

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-5 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-surface-900 tracking-tight">Kepatuhan Minum Obat</h1>
          <p className="text-sm text-surface-500 mt-1">Tracking konfirmasi minum obat per pasien</p>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : patients.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-soft p-12 text-center">
          <Calendar className="w-10 h-10 text-surface-300 mx-auto mb-3" />
          <p className="text-sm text-surface-500 font-medium">Belum ada data reminder terkirim</p>
          <p className="text-xs text-surface-400 mt-1">Reminder obat akan muncul di sini setelah dikirim</p>
        </div>
      ) : (
        <>
          {/* ─── MOBILE: Card List ─── */}
          <div className="sm:hidden space-y-3">
            {patients.map(p => {
              const total = dates.length
              const yes = dates.filter(d => p.days[d] === 'YES').length
              const pct = total > 0 ? Math.round((yes / total) * 100) : null
              return (
                <Card key={p.id} padding="md">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={p.name} size="sm" />
                      <div>
                        <p className="font-bold text-surface-900 text-sm">{p.name}</p>
                        <p className="text-xs text-surface-400">{p.medicine}</p>
                      </div>
                    </div>
                    {pct != null && (
                      <Badge variant={pct >= 80 ? 'success' : pct >= 50 ? 'warning' : 'danger'}>{pct}%</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {dates.map(d => {
                      const ans = p.days[d] ?? null
                      const config = ANSWER_CONFIG[ans]
                      const Icon = config.icon
                      return (
                        <div key={d} className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold ${
                          ans === 'YES' ? 'bg-success-50 text-success-700 ring-1 ring-success-200' :
                          ans === 'NO' ? 'bg-danger-50 text-danger-700 ring-1 ring-danger-200' :
                          ans === 'UNCLEAR' ? 'bg-warning-50 text-warning-700 ring-1 ring-warning-200' :
                          'bg-surface-100 text-surface-400'
                        }`}>
                          <Icon className="w-3 h-3" />
                          <span>{d?.slice(5)}</span>
                        </div>
                      )
                    })}
                  </div>
                </Card>
              )
            })}
          </div>

          {/* ─── DESKTOP: Table ─── */}
          <div className="hidden sm:block bg-white rounded-2xl shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="text-sm min-w-[640px] w-full">
                <thead>
                  <tr className="bg-surface-50 border-b border-surface-100">
                    <th className="px-5 py-3.5 text-left text-xs font-bold text-surface-400 uppercase tracking-wider sticky left-0 bg-surface-50 z-10 min-w-[180px]">
                      Pasien
                    </th>
                    {dates.map(d => (
                      <th key={d} className="px-3 py-3.5 text-center text-xs font-bold text-surface-400 uppercase tracking-wider whitespace-nowrap min-w-[72px]">
                        {d?.slice(5)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {patients.map(p => {
                    const total = dates.length
                    const yes = dates.filter(d => p.days[d] === 'YES').length
                    const pct = total > 0 ? Math.round((yes / total) * 100) : null

                    return (
                      <tr key={p.id} className="hover:bg-primary-50/10 transition-colors">
                        <td className="px-5 py-3.5 sticky left-0 bg-white hover:bg-primary-50/10 z-10 min-w-[180px]">
                          <div className="flex items-center gap-3">
                            <Avatar name={p.name} size="sm" />
                            <div>
                              <p className="font-bold text-surface-900">{p.name}</p>
                              <p className="text-xs text-surface-400">{p.medicine}</p>
                              {pct != null && (
                                <Badge variant={pct >= 80 ? 'success' : pct >= 50 ? 'warning' : 'danger'} className="mt-1">
                                  {pct}%
                                </Badge>
                              )}
                            </div>
                          </div>
                        </td>
                        {dates.map(d => {
                          const ans = p.days[d] ?? null
                          const config = ANSWER_CONFIG[ans]
                          const Icon = config.icon
                          return (
                            <td key={d} className="px-3 py-3.5 text-center">
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${
                                ans === 'YES' ? 'bg-success-50 text-success-700 ring-1 ring-success-200' :
                                ans === 'NO' ? 'bg-danger-50 text-danger-700 ring-1 ring-danger-200' :
                                ans === 'UNCLEAR' ? 'bg-warning-50 text-warning-700 ring-1 ring-warning-200' :
                                'bg-surface-100 text-surface-400'
                              }`}>
                                <Icon className="w-3 h-3" />
                                {config.label}
                              </span>
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-surface-500">
            <span className="font-bold text-surface-600">Keterangan:</span>
            {Object.entries(ANSWER_CONFIG).map(([key, conf]) => {
              if (key === 'null') return null
              const Icon = conf.icon
              return (
                <span key={key} className="flex items-center gap-1.5">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold ${
                    key === 'YES' ? 'bg-success-50 text-success-700 ring-1 ring-success-200' :
                    key === 'NO' ? 'bg-danger-50 text-danger-700 ring-1 ring-danger-200' :
                    'bg-warning-50 text-warning-700 ring-1 ring-warning-200'
                  }`}>
                    <Icon className="w-3 h-3" />
                    {conf.label}
                  </span>
                </span>
              )
            })}
            <span className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold bg-surface-100 text-surface-400">
                <Minus className="w-3 h-3" /> Tidak merespons
              </span>
            </span>
          </div>
        </>
      )}
    </div>
  )
}
