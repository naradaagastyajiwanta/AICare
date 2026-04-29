'use client'
import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts'
import StatsCard from '../components/StatsCard'
import Badge from '../components/ui/Badge'
import Avatar from '../components/ui/Avatar'
import Card from '../components/ui/Card'
import { SkeletonCard } from '../components/ui/Skeleton'
import { api } from '../lib/api'
import {
  Users, Pill, Activity, Utensils, Bell,
  TrendingUp, Calendar, Clock, AlertTriangle,
} from 'lucide-react'
import { format, setDefaultOptions } from 'date-fns'
import { id } from 'date-fns/locale'

setDefaultOptions({ locale: id })

const CATEGORY_COLORS = {
  medication: '#3b82f6',
  activity: '#f59e0b',
  diet: '#10b981',
}

const CATEGORY_LABELS = {
  medication: 'Obat',
  activity: 'Aktivitas',
  diet: 'Pola Makan',
}

const CATEGORY_ICONS = {
  medication: Pill,
  activity: Activity,
  diet: Utensils,
}

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

  if (error) return (
    <div className="p-8">
      <div className="bg-danger-50 border border-danger-200 rounded-2xl p-6 flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-danger-600" />
        <div>
          <p className="text-sm font-medium text-danger-800">Gagal memuat data</p>
          <p className="text-xs text-danger-600 mt-0.5">{error}</p>
        </div>
      </div>
    </div>
  )

  const today = new Date()
  const greeting = today.getHours() < 11 ? 'Selamat pagi' : today.getHours() < 15 ? 'Selamat siang' : 'Selamat sore'

  const sent = Number(stats?.today?.sent ?? 0)
  const responded = Number(stats?.today?.responded ?? 0)
  const took = Number(stats?.today?.took_medicine ?? 0)
  const rate = sent > 0 ? Math.round((took / sent) * 100) : 0
  const pending = sent - responded

  const actReports = Number(stats?.today_reports?.activity_reports ?? 0)
  const dietReports = Number(stats?.today_reports?.diet_reports ?? 0)
  const avgScore = Number(stats?.today_scores?.avg_score ?? 0)
  const catToday = stats?.category_today ?? {}

  const chartData = (stats?.weekly_trend ?? []).map(row => ({
    date: row.date?.slice(5),
    Minum: Number(row.yes_count),
    'Belum': Number(row.no_count),
  }))

  const categoryData = [
    { name: 'Obat', value: Number(catToday.medication ?? 0), color: CATEGORY_COLORS.medication },
    { name: 'Aktivitas', value: Number(catToday.activity ?? 0), color: CATEGORY_COLORS.activity },
    { name: 'Pola Makan', value: Number(catToday.diet ?? 0), color: CATEGORY_COLORS.diet },
  ].filter(d => d.value > 0)

  const medSparkline = chartData.map(d => d.Minum).slice(-7)
  const activitySparkline = [1, 2, 1, 3, 2, 1, actReports]
  const dietSparkline = [0, 1, 1, 0, 2, 1, dietReports]

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-6 lg:mb-8">
        <div>
          <h1 className="text-xl lg:text-[28px] font-bold text-surface-900 tracking-tight">{greeting}</h1>
          <p className="text-sm text-surface-500 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-surface-400" />
              {format(today, 'EEEE, d MMMM yyyy')}
            </span>
            <span className="hidden sm:inline text-surface-300">|</span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-surface-400" />
              {format(today, 'HH:mm')} WIB
            </span>
          </p>
        </div>
        {pending > 0 && (
          <div className="flex items-center gap-2 bg-danger-50 border border-danger-200 rounded-xl px-3 py-2 sm:px-4 sm:py-2.5">
            <Bell className="w-4 h-4 text-danger-600 shrink-0" />
            <span className="text-xs sm:text-sm font-semibold text-danger-700">
              {pending} pasien belum merespons obat hari ini
            </span>
          </div>
        )}
      </div>

      {/* Alert Banner */}
      {pending > 0 && (
        <div className="mb-5 lg:mb-6 bg-gradient-to-r from-danger-50 to-warning-50 border border-danger-200 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 rounded-xl bg-danger-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-danger-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-danger-800">Perhatian: Pasien Belum Merespons</p>
            <p className="text-xs text-danger-600 mt-0.5">
              {pending} pasien telah dikirimi reminder obat tapi belum mengonfirmasi.
            </p>
          </div>
          <button className="btn-primary text-xs py-2 px-3 shrink-0 w-full sm:w-auto">
            Lihat Detail
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5 sm:mb-6">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <StatsCard
              title="Pasien Aktif"
              value={stats?.patients?.active ?? 0}
              subtitle={`dari ${stats?.patients?.total ?? 0} total`}
              color="blue"
              icon={Users}
              trend={5}
            />
            <StatsCard
              title="Reminder Terkirim"
              value={sent}
              subtitle={`Obat: ${catToday.medication ?? 0} | Aktivitas: ${catToday.activity ?? 0} | Makan: ${catToday.diet ?? 0}`}
              color="blue"
              icon={Bell}
              sparklineData={medSparkline}
            />
            <StatsCard
              title="Kepatuhan Obat"
              value={`${rate}%`}
              subtitle={`${took} dari ${sent} pasien`}
              color={rate >= 80 ? 'green' : rate >= 50 ? 'yellow' : 'red'}
              icon={Pill}
              progress={rate}
              trend={rate > 70 ? 3 : -2}
            />
            <StatsCard
              title="Belum Merespons"
              value={pending}
              subtitle="perlu perhatian"
              color={pending > 0 ? 'red' : 'green'}
              icon={AlertTriangle}
            />
          </>
        )}
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6 sm:mb-8">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <StatsCard
              title="Laporan Aktivitas"
              value={actReports}
              subtitle="hari ini"
              color="orange"
              icon={Activity}
              sparklineData={activitySparkline}
            />
            <StatsCard
              title="Laporan Pola Makan"
              value={dietReports}
              subtitle="hari ini"
              color="emerald"
              icon={Utensils}
              sparklineData={dietSparkline}
            />
            <StatsCard
              title="Skor Rata-rata"
              value={`${avgScore}/300`}
              subtitle="semua pasien"
              color={avgScore >= 200 ? 'green' : avgScore >= 100 ? 'yellow' : 'red'}
              icon={TrendingUp}
              progress={avgScore > 0 ? Math.round((avgScore / 300) * 100) : 0}
            />
            <Card hover className="flex flex-col justify-center">
              <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">Breakdown Kategori</p>
              {categoryData.length > 0 ? (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width={80} height={80}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx={40}
                        cy={40}
                        innerRadius={22}
                        outerRadius={36}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5">
                    {categoryData.map(d => (
                      <div key={d.name} className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                        <span className="text-xs text-surface-500">{d.name}</span>
                        <span className="text-xs font-bold text-surface-800">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-surface-400">Belum ada reminder hari ini</p>
              )}
            </Card>
          </>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {/* Weekly Trend */}
        <Card padding="lg" className="lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-bold text-surface-800">Tren Kepatuhan Minum Obat</h2>
              <p className="text-xs text-surface-400 mt-0.5">7 hari terakhir</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-success-500" />
                Sudah Minum
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-danger-400" />
                Belum
              </span>
            </div>
          </div>
          {chartData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-surface-400">
              <TrendingUp className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-sm">Belum ada data respons</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} barCategoryGap="30%" barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} dy={8} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 16px rgba(15, 23, 42, 0.08)',
                    fontSize: '13px',
                  }}
                />
                <Bar dataKey="Minum" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Belum" fill="#ef4444" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Quick Category Stats */}
        <Card padding="lg">
          <h2 className="text-sm font-bold text-surface-800 mb-5">Status Kategori Hari Ini</h2>
          <div className="space-y-4">
            {(['medication', 'activity', 'diet']).map(cat => {
              const Icon = CATEGORY_ICONS[cat]
              const count = Number(catToday[cat] ?? 0)
              return (
                <div key={cat} className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${CATEGORY_COLORS[cat]}15` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: CATEGORY_COLORS[cat] }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-surface-800">{CATEGORY_LABELS[cat]}</p>
                    <div className="mt-1.5 h-2 bg-surface-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${sent > 0 ? Math.round((count / sent) * 100) : 0}%`,
                          background: CATEGORY_COLORS[cat],
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-lg font-bold text-surface-900">{count}</span>
                </div>
              )
            })}
          </div>
        </Card>
      </div>
    </div>
  )
}
