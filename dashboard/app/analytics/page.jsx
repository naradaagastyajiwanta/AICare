'use client'
import { useEffect, useState } from 'react'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts'
import { api } from '../../lib/api'

export default function AnalyticsPage() {
  const [patients, setPatients] = useState([])
  const [compliance, setCompliance] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.getPatients(), api.getCompliance(30)])
      .then(([p, c]) => { setPatients(p); setCompliance(c) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-gray-500">Memuat data...</div>

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

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Analitik (30 Hari Terakhir)</h1>

      {/* Summary numbers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Reminder',   value: totalSent,  color: 'text-blue-600' },
          { label: 'Respons Masuk',    value: totalResp,  color: 'text-gray-700' },
          { label: 'Sudah Minum',      value: totalYes,   color: 'text-green-600' },
          { label: 'Kepatuhan Overall',value: `${overallRate}%`, color: overallRate >= 80 ? 'text-green-600' : 'text-yellow-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs text-gray-500">{label}</p>
            <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Daily trend */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-700 mb-4">Tren Kepatuhan Harian (%)</h2>
        {dailyData.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Belum ada data</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
              <Tooltip formatter={(v) => `${v}%`} />
              <Line
                type="monotone"
                dataKey="Kepatuhan (%)"
                stroke="#22c55e"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Per-patient bar chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-700 mb-4">Kepatuhan per Pasien (%)</h2>
        {perPatient.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Belum ada data</p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(200, perPatient.length * 36)}>
            <BarChart data={perPatient} layout="vertical" barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Bar
                dataKey="rate"
                name="Kepatuhan"
                fill="#22c55e"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
