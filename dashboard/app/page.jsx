'use client'
import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import StatsCard from '../components/StatsCard'
import { api } from '../lib/api'

export default function OverviewPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.getStats()
      .then(setStats)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-gray-500">Memuat data...</div>
  if (error)   return <div className="p-8 text-red-500">Gagal memuat: {error}</div>

  const sent   = Number(stats.today?.sent ?? 0)
  const responded = Number(stats.today?.responded ?? 0)
  const took   = Number(stats.today?.took_medicine ?? 0)
  const rate   = sent > 0 ? Math.round((took / sent) * 100) : 0
  const pending = sent - responded

  const chartData = (stats.weekly_trend ?? []).map(row => ({
    date:    row.date?.slice(5),   // MM-DD
    Minum:   Number(row.yes_count),
    'Belum': Number(row.no_count),
  }))

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Overview Hari Ini</h1>
      <p className="text-sm text-gray-400 mb-6">
        {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          title="Pasien Aktif"
          value={stats.patients?.active ?? 0}
          subtitle={`dari ${stats.patients?.total ?? 0} total`}
          color="blue"
        />
        <StatsCard
          title="Reminder Terkirim"
          value={sent}
          subtitle="hari ini"
          color="green"
        />
        <StatsCard
          title="Sudah Minum"
          value={took}
          subtitle={`${rate}% kepatuhan`}
          color={rate >= 80 ? 'green' : rate >= 50 ? 'yellow' : 'red'}
        />
        <StatsCard
          title="Belum Merespons"
          value={pending}
          subtitle="perlu perhatian"
          color={pending > 0 ? 'yellow' : 'green'}
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-700 mb-4">Tren Kepatuhan 7 Hari Terakhir</h2>
        {chartData.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Belum ada data respons</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Minum"  fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Belum"  fill="#f87171" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
