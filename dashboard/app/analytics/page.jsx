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
        <div className="h-8 w-48 bg-surface-200 rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-surface-200 rounded-2xl" />
          ))}
        </div>
        <div className="h-72 bg-surface-200 rounded-2xl" />
      </div>
    </div>
  )

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

  const perPatient = patients
    .filter(p => p.total_reminders > 0)
    .map(p => ({
      name:  p.name.split(' ')[0],
      rate:  Number(p.compliance_rate ?? 0),
    }))
    .sort((a, b) => b.rate - a.rate)

  const totalYes = compliance.filter(r => r.answer === 'YES').length
  const totalResp = compliance.filter(r => r.answer).length
  const totalSent = compliance.length
  const overallRate = totalSent > 0 ? Math.round((totalYes / totalSent) * 100) : 0

  const stats = [
    { label: 'Total Reminder', value: totalSent, color: '#3b82f6', bg: '#eff6ff', icon: MessageSquare },
    { label: 'Respons Masuk', value: totalResp, color: '#9333ea', bg: '#faf5ff', icon: MessageSquare },
    { label: 'Sudah Minum', value: totalYes, color: '#10b981', bg: '#ecfdf5', icon: Pill },
    { label: 'Kepatuhan Overall', value: `${overallRate}%`, color: overallRate >= 80 ? '#10b981' : '#f59e0b', bg: overallRate >= 80 ? '#ecfdf5' : '#fffbeb', icon: TrendingUp },
  ]

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="mb-2">
        <h1 className="text-xl sm:text-2xl font-bold text-surface-900 tracking-tight flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-primary-600" />
          </div>
          Analitik
        </h1>
        <p className="text-sm text-surface-500 mt-2">30 hari terakhir</p>
      </div>

      {/* Summary numbers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, color, bg, icon: Icon }) => (
          <Card key={label} padding="lg" hover>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: bg }}>
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              <span className="text-xs font-bold text-surface-400 uppercase tracking-wider">{label}</span>
            </div>
            <p className="text-[28px] font-bold text-surface-900 mt-1 tracking-tight">{value}</p>
          </Card>
        ))}
      </div>

      {/* Daily trend */}
      <Card padding="lg">
        <div className="mb-5">
          <h2 className="text-sm font-bold text-surface-800">Tren Kepatuhan Harian</h2>
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
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} dy={8} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} unit="%" />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(15, 23, 42, 0.08)', fontSize: '13px' }}
                formatter={(v) => [`${v}%`, 'Kepatuhan']}
              />
              <Line type="monotone" dataKey="Kepatuhan (%)" stroke="#3b82f6" strokeWidth={2.5}
                dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }} activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Per-patient bar chart */}
      <Card padding="lg">
        <div className="mb-5">
          <h2 className="text-sm font-bold text-surface-800">Kepatuhan per Pasien</h2>
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
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} unit="%" />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} width={90} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(15, 23, 42, 0.08)', fontSize: '13px' }}
                formatter={(v) => [`${v}%`, 'Kepatuhan']}
              />
              <Bar dataKey="rate" name="Kepatuhan" fill="#3b82f6" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  )
}
