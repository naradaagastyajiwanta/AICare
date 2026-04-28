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

  const actReports = Number(stats.today_reports?.activity_reports ?? 0)
  const dietReports = Number(stats.today_reports?.diet_reports ?? 0)
  const avgScore = Number(stats.today_scores?.avg_score ?? 0)
  const catToday = stats.category_today ?? {}

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
          subtitle={`Obat: ${catToday.medication ?? 0} | Aktivitas: ${catToday.activity ?? 0} | Makan: ${catToday.diet ?? 0}`}
          color="green"
        />
        <StatsCard
          title="Sudah Minum Obat"
          value={took}
          subtitle={`${rate}% kepatuhan`}
          color={rate >= 80 ? 'green' : rate >= 50 ? 'yellow' : 'red'}
        />
        <StatsCard
          title="Belum Merespons Obat"
          value={pending}
          subtitle="perlu perhatian"
          color={pending > 0 ? 'yellow' : 'green'}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          title="Laporan Aktivitas"
          value={actReports}
          subtitle="hari ini"
          color="orange"
        />
        <StatsCard
          title="Laporan Pola Makan"
          value={dietReports}
          subtitle="hari ini"
          color="emerald"
        />
        <StatsCard
          title="Skor Rata-rata"
          value={`${avgScore}/300`}
          subtitle="semua pasien"
          color={avgScore >= 200 ? 'green' : avgScore >= 100 ? 'yellow' : 'red'}
        />
        <StatsCard
          title="Laporan Luar Biasa"
          value="–"
          subtitle="semua target tercapai"
          color="purple"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-700 mb-4">Tren Kepatuhan Minum Obat 7 Hari Terakhir</h2>
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
