'use client'
import { useEffect, useState } from 'react'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts'
import { api } from '../../lib/api'
import Card from '../../components/ui/Card'
import CircularProgress from '../../components/ui/CircularProgress'
import { BarChart3, Pill, MessageSquare, TrendingUp, AlertTriangle } from 'lucide-react'

export default function AnalyticsPage() {
  const [patients, setPatients] = useState([])
  const [compliance, setCompliance] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.getPatients(), api.getCompliance(30)])
      .then(([p, c]) => { setPatients(p); setCompliance(c) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 bg-surface-200 rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-surface-200 rounded-xl" />
          ))}
        </div>
        <div className="h-72 bg-surface-200 rounded-xl" />
      </div>
    </div>
  )

  // Daily compliance trend (last 30 days)
  const dailyMap = new Map()
  for (const row of compliance) {
    const date = row.scheduled_date?.slice(0, 10)
    if (!date) continue
    if (!dailyMap.has(date)) dailyMap.set(date, { date: date.slice(5), total: 0, yes: 0 })
    const d = dailyMap.get(date)
    d.total++
    if (row.answer === 'YES') d.yes++
  }
  const dailyData = [...dailyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => ({
      date: v.date,
      'Kepatuhan (%)': v.total > 0 ? Math.round((v.yes / v.total) * 100) : 0,
    }))

  // Per-patient compliance rate
  const perPatient = patients
    .filter(p => p.total_reminders > 0)
    .map(p => ({
      name:  p.name.split(' ')[0],
      rate:  Number(p.compliance_rate ?? 0),
    }))
    .sort((a, b) => b.rate - a.rate)

  // Summary stats
  const totalYes = compliance.filter(r => r.answer === 'YES').length
  const totalNo  = compliance.filter(r => r.answer === 'NO').length
  const totalResp = compliance.filter(r => r.answer).length
  const totalSent = compliance.length
  const overallRate = totalSent > 0 ? Math.round((totalYes / totalSent) * 100) : 0

  const stats = [
    { label: 'Total Reminder', value: totalSent, color: 'blue', icon: MessageSquare },
    { label: 'Respons Masuk', value: totalResp, color: 'purple', icon: MessageSquare },
    { label: 'Sudah Minum', value: totalYes, color: 'green', icon: Pill },
    { label: 'Kepatuhan Overall', value: `${overallRate}%`, color: overallRate >= 80 ? 'green' : 'yellow', icon: TrendingUp },
  ]

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="mb-2">
        <h1 className="text-xl sm:text-2xl font-bold text-surface-900 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-primary-600" />
          </div>
          Analitik
        </h1>
        <p className="text-sm text-surface-500 mt-2">30 hari terakhir</p>
      </div>

      {/* Summary numbers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, color, icon: Icon }) => {
          const colorMap = {
            blue:   '#2563eb',
            purple: '#9333ea',
            green:  '#16a34a',
            yellow: '#d97706',
          }
          const c = colorMap[color] ?? colorMap.blue
          return (
            <Card key={label} padding="lg" hover>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${c}15` }}>
                  <Icon className="w-4 h-4" style={{ color: c }} />
                </div>
                <span className="text-xs font-medium text-surface-500 uppercase tracking-wide">{label}</span>
              </div>
              <p className="text-2xl font-bold text-surface-900 mt-1">{value}</p>
            </Card>
          )
        })}
      </div>

      {/* Daily trend */}
      <Card padding="lg">
        <div className="mb-5">
          <h2 className="text-sm font-semibold text-surface-800">Tren Kepatuhan Harian</h2>
          <p className="text-xs text-surface-400 mt-0.5">Persentase pasien yang mengonfirmasi minum obat</p>
        </div>
        {dailyData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-surface-400">
            <AlertTriangle className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-sm">Belum ada data</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e0" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#73736b' }} axisLine={false} tickLine={false} dy={8} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#73736b' }} axisLine={false} tickLine={false} unit="%" />
              <Tooltip
                contentStyle={{ borderRadius: '10px', border: '1px solid #e8e8e0', boxShadow: '0 4px 12px rgba(20,20,18,0.08)', fontSize: '13px' }}
                formatter={(v) => [`${v}%`, 'Kepatuhan']}
              />
              <Line type="monotone" dataKey="Kepatuhan (%)" stroke="#16a34a" strokeWidth={2.5}
                dot={{ r: 3, fill: '#16a34a', strokeWidth: 0 }} activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Per-patient bar chart */}
      <Card padding="lg">
        <div className="mb-5">
          <h2 className="text-sm font-semibold text-surface-800">Kepatuhan per Pasien</h2>
          <p className="text-xs text-surface-400 mt-0.5">Diurutkan dari yang tertinggi</p>
        </div>
        {perPatient.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-surface-400">
            <AlertTriangle className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-sm">Belum ada data</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(240, perPatient.length * 36)}>
            <BarChart data={perPatient} layout="vertical" barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e0" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12, fill: '#73736b' }} axisLine={false} tickLine={false} unit="%" />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#73736b' }} axisLine={false} tickLine={false} width={90} />
              <Tooltip
                contentStyle={{ borderRadius: '10px', border: '1px solid #e8e8e0', boxShadow: '0 4px 12px rgba(20,20,18,0.08)', fontSize: '13px' }}
                formatter={(v) => [`${v}%`, 'Kepatuhan']}
              />
              <Bar dataKey="rate" name="Kepatuhan" fill="#16a34a" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  )
}
